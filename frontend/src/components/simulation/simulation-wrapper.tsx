"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { SimulationProvider } from "./simulation-context"

export function SimulationWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isSimulationPage = pathname?.startsWith("/simulation")

  if (isSimulationPage) {
    return <SimulationProvider>{children}</SimulationProvider>
  }

  return <>{children}</>
}

