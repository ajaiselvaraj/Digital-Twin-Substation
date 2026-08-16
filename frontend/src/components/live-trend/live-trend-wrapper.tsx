"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { LiveTrendProvider } from "./live-trend-context"

export function LiveTrendWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLiveTrendPage = pathname?.startsWith("/live-trend")

  if (isLiveTrendPage) {
    return <LiveTrendProvider>{children}</LiveTrendProvider>
  }

  return <>{children}</>
}

