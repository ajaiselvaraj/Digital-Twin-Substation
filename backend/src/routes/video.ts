import { Router, Request, Response, NextFunction } from "express"
import multer from "multer"
import express from "express"
import { Binary, ObjectId } from "mongodb"
import { getMongoDb, getCourseVideoBucket, getSimulationVideoBucket } from "../lib/mongodb.js"

const router = Router()

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
})

// Middleware for parsing raw binary bodies of WebM simulation videos
const rawBodyParser = express.raw({
  type: ["video/webm", "video/mp4", "application/octet-stream"],
  limit: "100mb"
})

// Helper to handle Range Requests for video streaming
function handleRangeRequest(req: Request, res: Response, buffer: Buffer, mimeType: string) {
  const range = req.headers.range
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1
    const chunkSize = end - start + 1
    const chunk = buffer.subarray(start, end + 1)

    res.status(206).set({
      "Content-Range": `bytes ${start}-${end}/${buffer.length}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize.toString(),
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=3600",
    })
    return res.end(chunk)
  }

  res.status(200).set({
    "Content-Type": mimeType,
    "Content-Length": buffer.length.toString(),
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
  })
  return res.end(buffer)
}

/* ==========================================
   COURSE VIDEO ROUTES
   ========================================== */

// 1. GET /api/course-video
router.get("/course-video", async (req: Request, res: Response) => {
  try {
    const componentId = req.query.componentId as string
    const videoType = req.query.videoType as string

    if (!componentId) {
      return res.status(400).json({ error: "Missing componentId" })
    }

    const db = await getMongoDb()
    const collectionNames = ["Digitaltwin", "digitaltwin", "DigitalTwin"]
    let doc: any = null
    let usedCollection = ""
    
    const filter: Record<string, any> = { componentType: componentId.toLowerCase() }
    if (videoType) {
      filter.videoType = videoType
    }
    
    console.log("[Course Video GET] Searching video:", { componentId, videoType, filter })
    
    for (const name of collectionNames) {
      try {
        const collection = db.collection(name)
        doc = await collection.findOne(filter, { sort: { createdAt: -1 } })
        if (doc) {
          usedCollection = name
          break
        }
      } catch (err) {
        // Continue to check other collections
      }
    }

    if (!doc) {
      console.error("[Course Video GET] Video reference not found", { componentId, videoType })
      return res.status(404).json({ error: "Video not found", details: `No video found for componentId: ${componentId}` })
    }

    const mimeType = doc.mimeType || "video/webm"
    
    // 1a. GridFS Storage path
    const gridfsFileId = doc.gridfsFileId
    if (gridfsFileId) {
      try {
        const bucket = await getCourseVideoBucket()
        const fileId = new ObjectId(gridfsFileId)
        
        const files = await bucket.find({ _id: fileId }).toArray()
        if (files.length === 0) {
          console.error("[Course Video GET] GridFS file missing for ID:", gridfsFileId)
          return res.status(404).json({ error: "Video file not found in GridFS", gridfsFileId })
        }
        
        const downloadStream = bucket.openDownloadStream(fileId)
        const chunks: Buffer[] = []
        for await (const chunk of downloadStream) {
          chunks.push(chunk)
        }
        const buffer = Buffer.concat(chunks)
        return handleRangeRequest(req, res, buffer, mimeType)
      } catch (err: any) {
        console.error("[Course Video GET] GridFS download failed:", err)
        return res.status(500).json({ error: "Failed to download course video from GridFS", details: err.message })
      }
    }
    
    // 1b. Document binary storage path
    const data = doc.data
    let buffer: Buffer | null = null

    if (data instanceof Binary) {
      const binaryBuffer = data.buffer as any
      if (Buffer.isBuffer(binaryBuffer)) {
        buffer = binaryBuffer
      } else if (binaryBuffer instanceof Uint8Array || binaryBuffer instanceof ArrayBuffer) {
        buffer = Buffer.from(binaryBuffer as any)
      }
    } else if (Buffer.isBuffer(data)) {
      buffer = data
    } else if (data instanceof Uint8Array) {
      buffer = Buffer.from(data)
    }

    if (!buffer) {
      console.error("[Course Video GET] Binary buffer is empty in document storage")
      return res.status(404).json({ error: "Empty video binary data" })
    }

    return handleRangeRequest(req, res, buffer, mimeType)
  } catch (error: any) {
    console.error("[Course Video GET] API Error:", error)
    return res.status(500).json({ error: "Failed to retrieve course video", details: error.message })
  }
})

// 2. POST /api/course-video (Upload)
router.post("/course-video", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file
    const { componentType, videoType } = req.body

    if (!file) {
      return res.status(400).json({ error: "No video file provided" })
    }
    if (!componentType) {
      return res.status(400).json({ error: "componentType is required" })
    }
    if (!videoType) {
      return res.status(400).json({ error: "videoType is required" })
    }

    const db = await getMongoDb()
    const isLargeFile = file.size > 15 * 1024 * 1024 // > 15MB
    const collectionNames = ["Digitaltwin", "digitaltwin", "DigitalTwin"]
    
    // Resolve collection
    let collection = db.collection(collectionNames[0])
    for (const name of collectionNames) {
      try {
        await db.collection(name).countDocuments({})
        collection = db.collection(name)
        break
      } catch {
        // Continue
      }
    }

    // Remove existing video entries for this configuration
    await collection.deleteMany({
      componentType: componentType.toLowerCase(),
      videoType: videoType
    })

    if (isLargeFile) {
      // Store in GridFS
      const bucket = await getCourseVideoBucket()
      const fileName = `${componentType.toLowerCase()}_${videoType}_${Date.now()}`
      
      const uploadStream = bucket.openUploadStream(fileName, {
        contentType: file.mimetype,
        metadata: {
          componentType: componentType.toLowerCase(),
          videoType
        }
      })

      const fileId = uploadStream.id
      
      await new Promise<void>((resolve, reject) => {
        uploadStream.on("error", (err) => reject(err))
        uploadStream.on("finish", () => resolve())
        uploadStream.end(file.buffer)
      })

      // Insert record document reference
      await collection.insertOne({
        componentType: componentType.toLowerCase(),
        videoType,
        mimeType: file.mimetype,
        gridfsFileId: fileId.toString(),
        gridfsFileName: fileName,
        createdAt: new Date()
      })

      return res.json({
        success: true,
        message: "Video uploaded successfully (GridFS)",
        id: fileId.toString(),
        componentType: componentType.toLowerCase(),
        videoType,
        storageType: "gridfs"
      })
    } else {
      // Small file: store directly as document Binary
      const binaryData = new Binary(file.buffer, 0)
      
      const result = await collection.insertOne({
        componentType: componentType.toLowerCase(),
        videoType,
        mimeType: file.mimetype,
        data: binaryData,
        createdAt: new Date()
      })

      return res.json({
        success: true,
        message: "Video uploaded successfully (Document)",
        id: result.insertedId.toString(),
        componentType: componentType.toLowerCase(),
        videoType,
        storageType: "document"
      })
    }
  } catch (error: any) {
    console.error("[Course Video POST] Upload Error:", error)
    return res.status(500).json({ error: "Failed to upload course video", details: error.message })
  }
})

// 3. DELETE /api/course-video
router.delete("/course-video", async (req: Request, res: Response) => {
  try {
    const componentId = req.query.componentId as string
    const videoType = req.query.videoType as string

    if (!componentId) {
      return res.status(400).json({ error: "Missing componentId" })
    }

    const db = await getMongoDb()
    const collectionNames = ["Digitaltwin", "digitaltwin", "DigitalTwin"]
    let doc: any = null
    let usedCollection = ""

    const filter: Record<string, any> = { componentType: componentId.toLowerCase() }
    if (videoType) {
      filter.videoType = videoType
    }

    for (const name of collectionNames) {
      const col = db.collection(name)
      doc = await col.findOne(filter)
      if (doc) {
        usedCollection = name
        break
      }
    }

    if (!doc) {
      return res.status(404).json({ error: "Video record not found" })
    }

    const col = db.collection(usedCollection)
    
    // Delete GridFS file if configured
    if (doc.gridfsFileId) {
      const bucket = await getCourseVideoBucket()
      try {
        await bucket.delete(new ObjectId(doc.gridfsFileId))
      } catch (err) {
        console.warn("[Course Video DELETE] GridFS delete failed:", err)
      }
    }

    await col.deleteOne({ _id: doc._id })
    return res.json({ success: true, message: "Course video deleted successfully" })
  } catch (error: any) {
    console.error("[Course Video DELETE] Error:", error)
    return res.status(500).json({ error: "Failed to delete course video", details: error.message })
  }
})

/* ==========================================
   SIMULATION VIDEO ROUTES
   ========================================== */

// 4. GET /api/simulation-video
router.get("/simulation-video", async (req: Request, res: Response) => {
  try {
    const simulationId = req.query.simulationId as string

    if (!simulationId) {
      return res.status(400).json({ error: "simulationId is required" })
    }

    const bucket = await getSimulationVideoBucket()
    const files = await bucket
      .find({ "metadata.simulationId": simulationId })
      .sort({ uploadDate: -1 })
      .limit(1)
      .toArray()

    if (!files.length) {
      return res.status(404).json({ error: "Simulation video not found" })
    }

    const file = files[0]
    const downloadStream = bucket.openDownloadStream(new ObjectId(file._id))
    
    const chunks: Buffer[] = []
    for await (const chunk of downloadStream) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    
    return handleRangeRequest(req, res, buffer, file.contentType || "video/webm")
  } catch (error: any) {
    console.error("[Simulation Video GET] Error:", error)
    return res.status(500).json({ error: "Failed to load simulation video", details: error.message })
  }
})

// 5. POST /api/simulation-video (Raw Binary Upload)
router.post("/simulation-video", rawBodyParser, async (req: Request, res: Response) => {
  try {
    const simulationId = req.query.simulationId as string
    const componentType = (req.query.componentType as string) ?? "generic"

    if (!simulationId) {
      return res.status(400).json({ error: "simulationId is required" })
    }

    const buffer = req.body
    if (!buffer || !Buffer.isBuffer(buffer)) {
      return res.status(400).json({ error: "Invalid video body buffer" })
    }

    const contentType = req.headers["content-type"] as string || "video/webm"
    const bucket = await getSimulationVideoBucket()

    // Delete existing video for this simulationId to overwrite
    const existing = await bucket.find({ "metadata.simulationId": simulationId }).toArray()
    for (const file of existing) {
      if (file._id) {
        await bucket.delete(new ObjectId(file._id))
      }
    }

    const uploadStream = bucket.openUploadStream(simulationId, {
      contentType,
      metadata: {
        simulationId,
        componentType
      }
    })

    await new Promise<void>((resolve, reject) => {
      uploadStream.on("error", (err) => reject(err))
      uploadStream.on("finish", () => resolve())
      uploadStream.end(buffer)
    })

    // URL to access the streamed video
    const videoUrl = `/api/simulation-video?simulationId=${encodeURIComponent(simulationId)}`
    return res.json({ videoUrl })
  } catch (error: any) {
    console.error("[Simulation Video POST] Error saving WebM to GridFS:", error)
    return res.status(500).json({ error: "Failed to save simulation video", details: error.message })
  }
})

// 6. DELETE /api/simulation-video
router.delete("/api/simulation-video", async (req: Request, res: Response) => {
  try {
    const simulationId = req.query.simulationId as string

    if (!simulationId) {
      return res.status(400).json({ error: "simulationId is required" })
    }

    const bucket = await getSimulationVideoBucket()
    const files = await bucket.find({ "metadata.simulationId": simulationId }).toArray()

    for (const file of files) {
      if (file._id) {
        await bucket.delete(new ObjectId(file._id))
      }
    }

    return res.json({ success: true, deleted: files.length })
  } catch (error: any) {
    console.error("[Simulation Video DELETE] Error:", error)
    return res.status(500).json({ error: "Failed to delete simulation video", details: error.message })
  }
})

export default router
