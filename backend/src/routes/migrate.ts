import { Router, Request, Response } from "express"
import { collection, addDoc, getDocs, query, where } from "firebase/firestore"
import { db } from "../lib/firebase.js"
import { DUMMY_SUBSTATIONS } from "../lib/dummy-data.js"

const router = Router()

router.post("/migrate", async (req: Request, res: Response) => {
  try {
    console.log("[Migration Route] Starting migration of dummy data to Firebase...")

    // Check if data already exists
    const existingDocs = await getDocs(collection(db, "substations"))
    if (existingDocs.size > 0) {
      return res.json({
        success: false,
        error: `Found ${existingDocs.size} existing substations. Migration skipped to avoid duplicates.`,
      })
    }

    let successCount = 0
    let skippedCount = 0

    // Add each dummy substation to Firebase
    for (const substation of DUMMY_SUBSTATIONS) {
      try {
        const q = query(
          collection(db, "substations"),
          where("master.substationCode", "==", substation.master.substationCode)
        )
        const existing = await getDocs(q)

        if (existing.empty) {
          const { id, ...substationData } = substation
          const docRef = await addDoc(collection(db, "substations"), {
            ...substationData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          console.log(`✓ Added substation: ${substation.master.name} (ID: ${docRef.id})`)
          successCount++
        } else {
          console.log(`⊘ Skipped (already exists): ${substation.master.name}`)
          skippedCount++
        }
      } catch (error) {
        console.error(`✗ Error adding substation ${substation.master.name}:`, error)
      }
    }

    return res.json({
      success: true,
      message: `Migration completed! Added ${successCount} substations. ${skippedCount} skipped.`,
    })
  } catch (error: any) {
    console.error("[Migration Route] Error:", error)
    return res.status(500).json({
      success: false,
      error: error.message || "Migration failed"
    })
  }
})

export default router
