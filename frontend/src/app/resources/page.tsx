"use client"

import { useRouter } from "next/navigation"
import { Trophy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ComponentCard } from "@/components/course/component-card"
import { useCourse } from "@/components/course/course-context"
import { courseData } from "@/lib/course-data"
import type { ComponentType } from "@/lib/course-data"

export default function CoursePage() {
  const router = useRouter()
  const { progress } = useCourse()

  const handleWatchCourse = (componentId: ComponentType) => {
    router.push(`/resources/${componentId}`)
  }

  const handleTakeQuiz = (componentId: ComponentType) => {
    router.push(`/resources/${componentId}?mode=quiz`)
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] space-y-6">
      {/* Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courseData.map((course) => {
          const componentProgress = progress[course.id]
          return (
            <ComponentCard
              key={course.id}
              course={course}
              progress={componentProgress}
              onWatchCourse={() => handleWatchCourse(course.id)}
              onTakeQuiz={() => handleTakeQuiz(course.id)}
            />
          )
        })}
      </div>

      {/* Course Information */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Course Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">What You'll Learn</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Working principles of each component</li>
                <li>• Operational procedures and best practices</li>
                <li>• Fault identification and troubleshooting</li>
                <li>• Safety protocols and maintenance</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Course Structure</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• 2 videos per component (Working Principle, Operation)</li>
                <li>• Interactive quiz after completing videos</li>
                <li>• 10-15 questions per quiz</li>
                <li>• 70% passing score required</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

