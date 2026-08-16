"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { DiagnosisComponentKey } from "@/lib/diagnosis/types"

interface DiagnosisContextValue {
  activeComponent: DiagnosisComponentKey
  setActiveComponent: (component: DiagnosisComponentKey) => void
}

const DiagnosisContext = createContext<DiagnosisContextValue | undefined>(undefined)

export function DiagnosisProvider({ children }: { children: ReactNode }) {
  const [activeComponent, setActiveComponent] = useState<DiagnosisComponentKey>("bayLines")

  return (
    <DiagnosisContext.Provider value={{ activeComponent, setActiveComponent }}>{children}</DiagnosisContext.Provider>
  )
}

export function useDiagnosisNav() {
  const value = useContext(DiagnosisContext)
  if (!value) {
    throw new Error("useDiagnosisNav must be used within DiagnosisProvider")
  }
  return value
}

