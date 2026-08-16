"use client"

import { useState } from "react"
import { Upload, X, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ComponentType, VideoType } from "@/lib/course-data"

interface VideoUploadFormProps {
  componentId: ComponentType
  onUploadSuccess?: () => void
}

const VIDEO_TYPES: { value: VideoType; label: string }[] = [
  { value: "workingPrinciple", label: "Working Principle" },
  { value: "operation", label: "Operation" },
  { value: "faults", label: "Faults" },
  { value: "safety", label: "Safety" },
]

export function VideoUploadForm({ componentId, onUploadSuccess }: VideoUploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [videoType, setVideoType] = useState<VideoType>("workingPrinciple")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })
  const [isOpen, setIsOpen] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (!selectedFile.type.startsWith("video/")) {
        setUploadStatus({
          type: "error",
          message: "Please select a video file",
        })
        return
      }
      setFile(selectedFile)
      setUploadStatus({ type: null, message: "" })
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus({
        type: "error",
        message: "Please select a video file",
      })
      return
    }

    setIsUploading(true)
    setUploadStatus({ type: null, message: "" })

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("componentType", componentId)
      formData.append("videoType", videoType)

      const response = await fetch("/api/course-video", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to upload video")
      }

      setUploadStatus({
        type: "success",
        message: `Video uploaded successfully! ${componentId} ${videoType} video is now available.`,
      })

      // Reset form
      setFile(null)
      setVideoType("workingPrinciple")
      
      // Call success callback
      if (onUploadSuccess) {
        setTimeout(() => {
          onUploadSuccess()
          setIsOpen(false)
        }, 2000)
      } else {
        setTimeout(() => {
          setIsOpen(false)
          window.location.reload() // Reload to show new video
        }, 2000)
      }
    } catch (error) {
      console.error("Error uploading video:", error)
      setUploadStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to upload video. Please try again.",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="w-full border-dashed"
      >
        <Upload className="h-4 w-4 mr-2" />
        Upload Video
      </Button>
    )
  }

  return (
    <Card className="border-2 border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Upload Course Video</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsOpen(false)
              setFile(null)
              setUploadStatus({ type: null, message: "" })
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="component-type">Equipment</Label>
          <Input
            id="component-type"
            value={componentId}
            disabled
            className="bg-gray-50"
          />
          <p className="text-xs text-gray-500">
            Equipment name: <span className="font-medium capitalize">{componentId}</span>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="video-type">Video Type</Label>
          <Select value={videoType} onValueChange={(value) => setVideoType(value as VideoType)}>
            <SelectTrigger id="video-type">
              <SelectValue placeholder="Select video type" />
            </SelectTrigger>
            <SelectContent>
              {VIDEO_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Example: "{componentId} {videoType === "workingPrinciple" ? "working principle" : videoType === "operation" ? "operation" : videoType}"
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="video-file">Video File</Label>
          <Input
            id="video-file"
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="cursor-pointer file:cursor-pointer"
          />
          {file && (
            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-gray-500">
                Size: {formatFileSize(file.size)} | Type: {file.type}
              </p>
            </div>
          )}
        </div>

        {uploadStatus.type && (
          <Alert variant={uploadStatus.type === "error" ? "destructive" : "default"}>
            {uploadStatus.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{uploadStatus.message}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Upload className="h-4 w-4 mr-2 animate-pulse" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Video
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

