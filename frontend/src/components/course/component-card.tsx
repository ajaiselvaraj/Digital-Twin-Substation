"use client"

import { Play, FileQuestion, Lock, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProgressTracker } from "./progress-tracker"
import { cn } from "@/lib/utils"
import type { ComponentCourse } from "@/lib/course-data"
import type { ComponentProgress } from "@/components/course/course-context"

interface ComponentCardProps {
  course: ComponentCourse
  progress: ComponentProgress
  onWatchCourse: () => void
  onTakeQuiz: () => void
  className?: string
}

export function ComponentCard({
  course,
  progress,
  onWatchCourse,
  onTakeQuiz,
  className,
}: ComponentCardProps) {
  const allVideosWatched = progress.videos.length >= course.videos.length &&
    progress.videos.every((v) => v.watched)
  const canTakeQuiz = allVideosWatched || progress.quizAttempts > 0

  return (
    <Card className={cn("hover:shadow-lg transition-shadow", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{course.icon}</div>
            <div>
              <CardTitle className="text-xl">{course.name}</CardTitle>
              <CardDescription className="mt-1">{course.description}</CardDescription>
            </div>
          </div>
          {progress.quizPassed && (
            <div className="rounded-full bg-green-100 p-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProgressTracker progress={progress} totalVideos={course.videos.length} />

        <div className="flex gap-2 pt-2">
          <Button
            variant="default"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            onClick={onWatchCourse}
          >
            <Play className="h-4 w-4 mr-2" />
            Watch Course
          </Button>
          <Button
            variant={canTakeQuiz ? "default" : "outline"}
            className={cn(
              "flex-1",
              canTakeQuiz ? "bg-purple-600 hover:bg-purple-700 text-white shadow-md" : ""
            )}
            onClick={onTakeQuiz}
            disabled={!canTakeQuiz}
          >
            {canTakeQuiz ? (
              <>
                <FileQuestion className="h-4 w-4 mr-2" />
                Take Quiz
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Locked
              </>
            )}
          </Button>
        </div>

        {progress.quizAttempts > 0 && !progress.quizPassed && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
            Previous attempt: {progress.quizScore ? Math.round(progress.quizScore) : 0}% (Need 70% to pass)
          </div>
        )}
      </CardContent>
    </Card>
  )
}

