"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import type { ComponentType } from "@/lib/course-data"

export type ProgressStatus = "notStarted" | "inProgress" | "completed"

export interface VideoProgress {
  videoId: string
  watched: boolean
  progress: number // 0-100
  completedAt?: number
}

export interface ComponentProgress {
  componentId: ComponentType
  status: ProgressStatus
  videos: VideoProgress[]
  quizAttempts: number
  quizPassed: boolean
  quizScore?: number
  quizPassedAt?: number
}

interface CourseContextType {
  progress: Record<ComponentType, ComponentProgress>
  updateVideoProgress: (componentId: ComponentType, videoId: string, progress: number) => void
  markVideoComplete: (componentId: ComponentType, videoId: string) => void
  submitQuiz: (componentId: ComponentType, score: number, passed: boolean) => void
  isSimulationUnlocked: () => boolean
  getOverallProgress: () => number
  resetProgress: () => void
}

const CourseContext = createContext<CourseContextType | undefined>(undefined)

const STORAGE_KEY = "course-progress"

function loadProgressFromStorage(): Record<ComponentType, ComponentProgress> {
  if (typeof window === "undefined") return getInitialProgress()

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      const initial = getInitialProgress()
      const merged: Record<ComponentType, ComponentProgress> = { ...initial }

      Object.keys(parsed).forEach((key) => {
        if (key in initial) {
          merged[key as ComponentType] = {
            ...initial[key as ComponentType],
            ...parsed[key],
            componentId: key as ComponentType,
          }
        }
      })

      return merged
    }
  } catch (error) {
    console.error("Failed to load course progress:", error)
  }

  return getInitialProgress()
}

function getInitialProgress(): Record<ComponentType, ComponentProgress> {
  return {
    transformer: {
      componentId: "transformer",
      status: "notStarted",
      videos: [],
      quizAttempts: 0,
      quizPassed: false,
    },
    bayLines: {
      componentId: "bayLines",
      status: "notStarted",
      videos: [],
      quizAttempts: 0,
      quizPassed: false,
    },
    isolator: {
      componentId: "isolator",
      status: "notStarted",
      videos: [],
      quizAttempts: 0,
      quizPassed: false,
    },
    circuitBreaker: {
      componentId: "circuitBreaker",
      status: "notStarted",
      videos: [],
      quizAttempts: 0,
      quizPassed: false,
    },
  }
}

function saveProgressToStorage(progress: Record<ComponentType, ComponentProgress>) {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch (error) {
    console.error("Failed to save course progress:", error)
  }
}

export function CourseProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Record<ComponentType, ComponentProgress>>(getInitialProgress)

  // Load once on mount to avoid state updates before the client is ready
  useEffect(() => {
    setProgress(loadProgressFromStorage())
  }, [])

  // Save to localStorage whenever progress changes (after initial load)
  useEffect(() => {
    saveProgressToStorage(progress)
  }, [progress])

  const updateVideoProgress = (componentId: ComponentType, videoId: string, progressValue: number) => {
    setProgress((prev) => {
      const component = { ...prev[componentId] }
      const videoIndex = component.videos.findIndex((v) => v.videoId === videoId)

      if (videoIndex >= 0) {
        component.videos[videoIndex] = {
          ...component.videos[videoIndex],
          progress: progressValue,
        }
      } else {
        component.videos.push({
          videoId,
          watched: false,
          progress: progressValue,
        })
      }

      // Update status
      if (progressValue > 0 && component.status === "notStarted") {
        component.status = "inProgress"
      }

      return {
        ...prev,
        [componentId]: component,
      }
    })
  }

  const markVideoComplete = (componentId: ComponentType, videoId: string) => {
    setProgress((prev) => {
      const component = { ...prev[componentId] }
      const videoIndex = component.videos.findIndex((v) => v.videoId === videoId)

      if (videoIndex >= 0) {
        component.videos[videoIndex] = {
          ...component.videos[videoIndex],
          watched: true,
          progress: 100,
          completedAt: Date.now(),
        }
      } else {
        component.videos.push({
          videoId,
          watched: true,
          progress: 100,
          completedAt: Date.now(),
        })
      }

      // Check if all videos are complete
      // Note: We'll need to import courseData to check total videos
      // For now, we'll update status based on completion

      return {
        ...prev,
        [componentId]: component,
      }
    })
  }

  const submitQuiz = (componentId: ComponentType, score: number, passed: boolean) => {
    setProgress((prev) => {
      const component = { ...prev[componentId] }
      component.quizAttempts += 1
      component.quizScore = score

      if (passed) {
        component.quizPassed = true
        component.quizPassedAt = Date.now()
        component.status = "completed"
      }

      return {
        ...prev,
        [componentId]: component,
      }
    })
  }

  const isSimulationUnlocked = (): boolean => {
    // User must pass all component quizzes to unlock simulation
    return Object.values(progress).every((comp) => comp.quizPassed)
  }

  const getOverallProgress = (): number => {
    const totalComponents = Object.keys(progress).length
    const completedComponents = Object.values(progress).filter((comp) => comp.status === "completed").length
    return totalComponents > 0 ? Math.round((completedComponents / totalComponents) * 100) : 0
  }

  const resetProgress = () => {
    const initial = getInitialProgress()
    setProgress(initial)
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return (
    <CourseContext.Provider
      value={{
        progress,
        updateVideoProgress,
        markVideoComplete,
        submitQuiz,
        isSimulationUnlocked,
        getOverallProgress,
        resetProgress,
      }}
    >
      {children}
    </CourseContext.Provider>
  )
}

export function useCourse() {
  const context = useContext(CourseContext)
  if (!context) {
    throw new Error("useCourse must be used within CourseProvider")
  }
  return context
}

