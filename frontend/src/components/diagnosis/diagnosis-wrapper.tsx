"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { DiagnosisProvider } from "./diagnosis-context"

export function DiagnosisWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isDiagnosis = pathname?.startsWith("/diagnosis")

  if (isDiagnosis) {
    return <DiagnosisProvider>{children}</DiagnosisProvider>
  }

  return <>{children}</>
}

