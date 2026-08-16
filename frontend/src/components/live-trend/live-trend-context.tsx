"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface SelectedAreaContext {
  key: string // Transformed key for realtime DB paths
  label: string
  areaCode: string // Actual area code for Firebase API calls (substationCode or areaName)
  metadata?: {
    areaName?: string
    substationCode?: string
    installationYear?: number
    latitude?: number
    longitude?: number
  }
}

interface LiveTrendContextType {
  activeCategory: string
  setActiveCategory: (category: string) => void
  selectedArea: SelectedAreaContext | null
  setSelectedArea: (area: SelectedAreaContext | null) => void
}

const LiveTrendContext = createContext<LiveTrendContextType | undefined>(undefined)

export function LiveTrendProvider({ children }: { children: ReactNode }) {
  const [activeCategory, setActiveCategory] = useState("substation")
  const [selectedArea, setSelectedArea] = useState<SelectedAreaContext | null>(null)

  return (
    <LiveTrendContext.Provider value={{ activeCategory, setActiveCategory, selectedArea, setSelectedArea }}>
      {children}
    </LiveTrendContext.Provider>
  )
}

export function useLiveTrend(optional = false) {
  const context = useContext(LiveTrendContext)
  if (context === undefined) {
    if (optional) {
      return null
    }
    throw new Error("useLiveTrend must be used within a LiveTrendProvider")
  }
  return context
}

