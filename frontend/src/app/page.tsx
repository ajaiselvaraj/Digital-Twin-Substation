"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    router.push("/view-substations")
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-500">Redirecting to View Substations...</p>
    </div>
  )
}
