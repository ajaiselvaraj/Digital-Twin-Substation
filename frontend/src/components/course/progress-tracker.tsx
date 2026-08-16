"use client"

import { CheckCircle2, Circle, PlayCircle, Lock } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ComponentProgress, ProgressStatus } from "@/components/course/course-context"

interface ProgressTrackerProps {
  progress: ComponentProgress
  totalVideos: number
  className?: string
}

export function ProgressTracker({ progress, totalVideos, className }: ProgressTrackerProps) {
  const watchedVideos = progress.videos.filter((v) => v.watched).length
  const videoProgress = totalVideos > 0 ? (watchedVideos / totalVideos) * 100 : 0
  const overallProgress = progress.quizPassed
    ? 100
    : videoProgress > 0
      ? Math.min(videoProgress, 80) // Cap at 80% until quiz is passed
      : 0

  const getStatusBadge = (status: ProgressStatus) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )
      case "inProgress":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            <PlayCircle className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 hover:bg-gray-50">
            <Circle className="h-3 w-3 mr-1" />
            Not Started
          </Badge>
        )
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Overall Progress</span>
        <span className="text-sm font-semibold text-gray-900">{Math.round(overallProgress)}%</span>
      </div>
      <Progress value={overallProgress} className="h-2" />

      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Videos</span>
            <span className="font-semibold">
              {watchedVideos} / {totalVideos}
            </span>
          </div>
          <Progress value={videoProgress} className="h-1.5" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Quiz</span>
            {progress.quizPassed ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                Passed
              </Badge>
            ) : progress.quizAttempts > 0 ? (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                Failed
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs">
                <Lock className="h-2.5 w-2.5 mr-1" />
                Locked
              </Badge>
            )}
          </div>
          <Progress
            value={progress.quizPassed ? 100 : progress.quizAttempts > 0 ? 50 : 0}
            className="h-1.5"
          />
        </div>
      </div>

      <div className="pt-2">{getStatusBadge(progress.status)}</div>
    </div>
  )
}

