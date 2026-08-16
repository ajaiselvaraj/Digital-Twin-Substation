"use client"

import { Button } from "@/components/ui/button"
import { useRouter, usePathname } from "next/navigation"
import { BookOpen, Home } from "lucide-react"
import { useCourse } from "./course-context"

export function CourseTopNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { isSimulationUnlocked } = useCourse()
  const isComponentPage = pathname?.includes("/resources/") && pathname !== "/resources"

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="flex h-16 items-center px-4 gap-4">
        <div className="mr-4 hidden md:flex">
          <span className="hidden font-bold sm:inline-block text-xl tracking-tight">
            OCEANBERG <span className="text-blue-600">DIGITAL TWIN</span>
          </span>
        </div>

        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-sky-600" />
            <span className="font-semibold text-gray-900">
              {isComponentPage ? "Component Course" : "Substation Components Course"}
            </span>
          </div>

          <nav className="flex items-center space-x-2">
            {isComponentPage && (
              <Button
                variant="outline"
                onClick={() => router.push("/resources")}
                className="shadow-sm"
              >
                <Home className="h-4 w-4 mr-2" />
                Back to Courses
              </Button>
            )}
            {isSimulationUnlocked() && (
              <Button
                variant="default"
                onClick={() => router.push("/simulation")}
                className="shadow-md bg-purple-600 hover:bg-purple-700"
              >
                Go to Simulation
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}

