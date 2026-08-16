"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { ArrowLeft, Play, FileQuestion, CheckCircle2, Lock, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { VideoPlayer } from "@/components/course/video-player"
import { QuizEngine } from "@/components/course/quiz-engine"
import { VideoUploadForm } from "@/components/course/video-upload-form"
import { useCourse } from "@/components/course/course-context"
import { courseData, getRandomQuizQuestions } from "@/lib/course-data"
import type { ComponentType, VideoType, QuizQuestion } from "@/lib/course-data"
import { Loader2 } from "lucide-react"

function ComponentCourseContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { progress, updateVideoProgress, markVideoComplete, submitQuiz } = useCourse()
  
  const componentId = (params?.componentId as string) as ComponentType | null
  const mode = searchParams?.get("mode") || "videos"
  
  const [showQuiz, setShowQuiz] = useState(mode === "quiz")
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [activeTab, setActiveTab] = useState<VideoType>("workingPrinciple")

  const course = componentId ? courseData.find((c) => c.id === componentId) : null
  const componentProgress = componentId ? progress[componentId] : null

  useEffect(() => {
    if (componentId && course) {
      // Generate quiz questions when component is loaded
      const questions = getRandomQuizQuestions(componentId, 12)
      setQuizQuestions(questions)
    }
  }, [componentId])

  if (!componentId || !course || !componentProgress) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Component not found</p>
          <Button onClick={() => router.push("/resources")}>Back to Courses</Button>
        </div>
      </div>
    )
  }

  const handleVideoProgress = (videoId: string, progressValue: number) => {
    updateVideoProgress(componentId, videoId, progressValue)
  }

  const handleVideoComplete = (videoId: string) => {
    markVideoComplete(componentId, videoId)
  }

  const handleQuizComplete = (score: number, passed: boolean) => {
    submitQuiz(componentId, score, passed)
    setShowQuiz(false)
  }

  const allVideosWatched = componentProgress.videos.length >= course.videos.length &&
    componentProgress.videos.every((v) => v.watched)

  const canTakeQuiz = allVideosWatched || componentProgress.quizAttempts > 0

  // Group videos by type
  const videosByType: Record<VideoType, typeof course.videos> = {
    workingPrinciple: [],
    operation: [],
    faults: [],
    safety: [],
  }

  course.videos.forEach((video) => {
    videosByType[video.type].push(video)
  })

  const getVideoProgress = (videoId: string) => {
    const videoProgress = componentProgress.videos.find((v) => v.videoId === videoId)
    return videoProgress?.progress || 0
  }

  const isVideoWatched = (videoId: string) => {
    const videoProgress = componentProgress.videos.find((v) => v.videoId === videoId)
    return videoProgress?.watched || false
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const videosWatchedCount = componentProgress.videos.filter((v) => v.watched).length
  const progressPercentage = course.videos.length > 0 
    ? (videosWatchedCount / course.videos.length) * 100 
    : 0

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/resources")}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <span className="text-2xl">{course.icon}</span>
              <h1 className="text-xl font-bold text-gray-900">{course.name}</h1>
              <span className="text-gray-400">|</span>
              <div className="flex-1 flex gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("workingPrinciple")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "workingPrinciple"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  suppressHydrationWarning
                >
                  Working Principle
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("operation")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "operation"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  suppressHydrationWarning
                >
                  Operation
                </button>
              </div>
            </div>
            {componentProgress.quizPassed && (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 px-3 py-1">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {showQuiz && canTakeQuiz ? (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Quiz: {course.name}</CardTitle>
                <p className="text-gray-600">
                  Answer the following questions to test your knowledge. You need 70% to pass.
                </p>
              </CardHeader>
              <CardContent>
                {quizQuestions.length > 0 ? (
                  <QuizEngine
                    questions={quizQuestions}
                    onComplete={handleQuizComplete}
                    passingScore={70}
                  />
                ) : (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-sky-600" />
                    <p className="text-gray-600">Loading quiz questions...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr,320px] gap-8">
            {/* Main Content Area */}
            <div className="space-y-6">
              {/* Course Description */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-700">{course.description}</p>
              </div>

              <div className="space-y-6">
                {Object.entries(videosByType)
                  .filter(([type]) => type === "workingPrinciple" || type === "operation")
                  .filter(([type]) => type === activeTab)
                  .map(([type, videos]) => (
                    <div key={type} className="space-y-6">
                      {videos.length === 0 ? (
                        <Card>
                          <CardContent className="py-12 text-center text-gray-500">
                            <p>No videos available for this category.</p>
                          </CardContent>
                        </Card>
                      ) : (
                        videos.map((video) => (
                          <div key={video.id} className="space-y-4">
                            {/* Video Title & Description */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold text-gray-900">{video.title}</h2>
                                {isVideoWatched(video.id) && (
                                  <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-gray-600">{video.description}</p>
                            </div>

                            {/* Video Player */}
                            <Card className="overflow-hidden border-gray-200 shadow-md">
                              <CardContent className="p-0">
                                <VideoPlayer
                                  video={video}
                                  initialProgress={getVideoProgress(video.id)}
                                  onProgress={(progress) => handleVideoProgress(video.id, progress)}
                                  onComplete={() => handleVideoComplete(video.id)}
                                />
                              </CardContent>
                            </Card>
                          </div>
                        ))
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-4">
              {/* Video Upload Form */}
              <VideoUploadForm 
                componentId={componentId} 
                onUploadSuccess={() => {
                  // Optionally refresh the page or update state
                  window.location.reload()
                }}
              />

              {/* Course Content Sidebar */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="text-lg font-semibold">Course Content</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-100">
                    {course.videos.map((video) => {
                      const watched = isVideoWatched(video.id)
                      const videoProgress = getVideoProgress(video.id)
                      return (
                        <div
                          key={video.id}
                          className={`p-4 hover:bg-gray-50 transition-colors ${
                            watched ? "bg-green-50/50" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {watched ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${watched ? "text-gray-900" : "text-gray-700"}`}>
                                {video.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">{formatDuration(video.duration)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Course Progress Card */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <span>📊</span>
                    Course Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">Videos completed</span>
                      <span className="font-semibold text-gray-900">
                        {videosWatchedCount} / {course.videos.length}
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm pt-2 border-t">
                    <span className="text-gray-700">Quiz attempts</span>
                    <span className="font-semibold text-gray-900">{componentProgress.quizAttempts}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">Status</span>
                    <Badge variant={componentProgress.quizPassed ? "default" : "secondary"}>
                      {componentProgress.quizPassed ? "Completed" : "In progress"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Quiz Unlock Card */}
              {!showQuiz && (
                <Card className={`border-2 ${allVideosWatched ? "border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50" : "border-gray-200 bg-gray-50"}`}>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${allVideosWatched ? "bg-sky-100" : "bg-gray-200"}`}>
                        {allVideosWatched ? (
                          <FileQuestion className="h-5 w-5 text-sky-700" />
                        ) : (
                          <Lock className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold mb-2 ${allVideosWatched ? "text-gray-900" : "text-gray-700"}`}>
                          {allVideosWatched ? "🔓 Quiz Unlocked" : "🔒 Quiz Locked"}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {allVideosWatched
                            ? "You've completed all videos! Test your knowledge with our interactive quiz."
                            : "Watch all learning videos to unlock the quiz."}
                        </p>
                        <p className="text-sm font-medium text-gray-700">
                          Progress: {videosWatchedCount} / {course.videos.length} videos completed
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowQuiz(true)}
                      disabled={!canTakeQuiz}
                      size="lg"
                      className={`w-full ${
                        canTakeQuiz
                          ? "bg-sky-600 hover:bg-sky-700 text-white"
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {canTakeQuiz ? (
                        <>
                          <FileQuestion className="h-5 w-5 mr-2" />
                          Take Quiz
                        </>
                      ) : (
                        <>
                          <Lock className="h-5 w-5 mr-2" />
                          Complete videos to unlock quiz
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ComponentCoursePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
        </div>
      }
    >
      <ComponentCourseContent />
    </Suspense>
  )
}

