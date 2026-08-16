"use client"

import { SimulationProvider } from "@/components/simulation/simulation-context"

export default function SimulationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SimulationProvider>{children}</SimulationProvider>
}

