"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface SimulationContextType {
  activeTab: "run" | "analysis" | "solution"
  setActiveTab: (tab: "run" | "analysis" | "solution") => void
  selectedComponent: "transformer" | "bayLines" | "circuitBreaker" | "isolator" | "busbar"
  setSelectedComponent: (component: "transformer" | "bayLines" | "circuitBreaker" | "isolator" | "busbar") => void
  selectedSimulationId: string | null
  setSelectedSimulationId: (id: string | null) => void
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined)

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<"run" | "analysis" | "solution">("run")
  const [selectedComponent, setSelectedComponent] = useState<"transformer" | "bayLines" | "circuitBreaker" | "isolator" | "busbar">("transformer")
  const [selectedSimulationId, setSelectedSimulationId] = useState<string | null>(null)

  return (
    <SimulationContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedComponent,
        setSelectedComponent,
        selectedSimulationId,
        setSelectedSimulationId,
      }}
    >
      {children}
    </SimulationContext.Provider>
  )
}

export function useSimulation() {
  const context = useContext(SimulationContext)
  if (!context) {
    throw new Error("useSimulation must be used within SimulationProvider")
  }
  return context
}

