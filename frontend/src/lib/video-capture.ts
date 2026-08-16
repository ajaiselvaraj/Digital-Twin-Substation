/**
 * Video capture utility for 3D simulation playback
 * Captures canvas frames and creates a summary video
 */

export interface VideoCaptureOptions {
  canvas: HTMLCanvasElement
  duration: number // seconds
  fps?: number
  onProgress?: (progress: number) => void
}

const VIDEO_MIME_CANDIDATES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
  "video/mp4",
]

const pickSupportedMimeType = () => {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return null
  }
  return VIDEO_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null
}

/**
 * Capture frames from canvas and create a video Blob
 */
export async function captureVideoFromCanvas({
  canvas,
  duration,
  fps = 30,
  onProgress,
}: VideoCaptureOptions): Promise<Blob> {
  if (typeof window === "undefined") {
    throw new Error("Video capture is only available in the browser")
  }
  if (typeof MediaRecorder === "undefined") {
    throw new Error("MediaRecorder API is not supported in this environment")
  }

  const canvasWithStream = canvas as HTMLCanvasElement & {
    captureStream?: (frameRate?: number) => MediaStream
  }

  if (typeof canvasWithStream.captureStream !== "function") {
    throw new Error("Canvas captureStream API is not supported")
  }

  return new Promise((resolve, reject) => {
    console.log("[VideoCapture] captureVideoFromCanvas start", {
      durationSeconds: duration,
      fps,
    })
    const stream = canvasWithStream.captureStream!(fps)
    const preferredMime = pickSupportedMimeType()

    const recorderOptions: MediaRecorderOptions =
      preferredMime !== null
        ? { mimeType: preferredMime, videoBitsPerSecond: 8_000_000 } // Increased bitrate for better quality
        : { videoBitsPerSecond: 8_000_000 }

    let mediaRecorder: MediaRecorder
    try {
      mediaRecorder = new MediaRecorder(stream, recorderOptions)
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop())
      reject(error)
      return
    }

    const chunks: Blob[] = []
    const durationMs = Math.max(1000, duration * 1000)
    const startTime = performance.now()
    let progressInterval: number | null = null
    let stopTimeout: number | null = null

    const cleanup = () => {
      if (progressInterval !== null) {
        window.clearInterval(progressInterval)
        progressInterval = null
      }
      if (stopTimeout !== null) {
        window.clearTimeout(stopTimeout)
        stopTimeout = null
      }
      stream.getTracks().forEach((track) => track.stop())
    }

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        console.log("[VideoCapture] ondataavailable chunk size=", event.data.size)
        chunks.push(event.data)
      }
    }

    mediaRecorder.onerror = (event: Event) => {
      console.error("MediaRecorder error:", event)
      cleanup()
      const anyEvent = event as any
      reject(anyEvent?.error ?? new Error("Unknown MediaRecorder error"))
    }

    mediaRecorder.onstop = () => {
      cleanup()
      try {
        const blob = new Blob(chunks, { type: preferredMime ?? "video/webm" })
        console.log("[VideoCapture] capture complete, total size(bytes)=", blob.size)
        onProgress?.(100)
        resolve(blob)
      } catch (error) {
        reject(error)
      }
    }

    // timeslice controls how often ondataavailable fires
    mediaRecorder.start(Math.round(1000 / fps))

    // progress UI
    progressInterval = window.setInterval(() => {
      const elapsed = performance.now() - startTime
      const percent = Math.min(100, (elapsed / durationMs) * 100)
      onProgress?.(percent)
      if (elapsed >= durationMs && mediaRecorder.state === "recording") {
        mediaRecorder.stop()
      }
    }, 200)

    // hard stop safety
    stopTimeout = window.setTimeout(() => {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop()
      }
    }, durationMs + 200)
  })
}

/**
 * Upload a captured simulation video to local MongoDB (via Next.js API) and return a URL
 */
export async function uploadSimulationVideo(
  videoBlob: Blob,
  simulationId: string,
  componentType: string,
): Promise<string> {
  try {
    console.log("[VideoCapture] uploadSimulationVideo (MongoDB) start", {
      simulationId,
      componentType,
      size: videoBlob.size,
      type: videoBlob.type,
    })

    const mimeType = videoBlob.type || "video/webm"
    const query = new URLSearchParams({
      simulationId,
      componentType,
    })

    const response = await fetch(`/api/simulation-video?${query.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": mimeType,
      },
      body: videoBlob,
    })

    if (!response.ok) {
      const text = await response.text()
      console.error("Failed to upload simulation video via API:", response.status, text)
      throw new Error("Failed to upload simulation video")
    }

    const data = (await response.json()) as { videoUrl?: string }
    if (!data.videoUrl) {
      throw new Error("API did not return videoUrl")
    }

    console.log("[VideoCapture] uploadSimulationVideo (MongoDB) success, videoUrl=", data.videoUrl)
    return data.videoUrl
  } catch (error) {
    console.error("Error uploading simulation video:", error)
    throw new Error("Failed to upload simulation video")
  }
}

/**
 * Capture video from canvas and upload to Firebase; returns download URL
 */
export async function captureAndUploadSimulationVideo(
  canvas: HTMLCanvasElement,
  simulationId: string,
  componentType: string,
  duration = 15,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const videoBlob = await captureVideoFromCanvas({
    canvas,
    duration,
    fps: 30,
    onProgress,
  })

  const downloadURL = await uploadSimulationVideo(videoBlob, simulationId, componentType)
  return downloadURL
}

