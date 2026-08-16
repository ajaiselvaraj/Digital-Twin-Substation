"use client"

import { ReactNode } from "react"
import { CourseProvider } from "./course-context"

export function CourseWrapper({ children }: { children: ReactNode }) {
  return <CourseProvider>{children}</CourseProvider>
}

