"use client"

import { useEffect, Suspense } from "react"
import { useSimulation } from "@/components/simulation/simulation-context"
import { RunSimulationPage } from "@/components/simulation/run-simulation-page"
import { AnalysisPage } from "@/components/simulation/analysis-page"
import { SolutionPage } from "@/components/simulation/solution-page"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

function SimulationPageContent() {
  const { activeTab, setActiveTab } = useSimulation()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && (tab === "run" || tab === "analysis" || tab === "solution")) {
      setActiveTab(tab)
    }
  }, [searchParams, setActiveTab])

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
      {activeTab === "run" && <RunSimulationPage />}
      {activeTab === "analysis" && <AnalysisPage />}
      {activeTab === "solution" && <SolutionPage />}
    </div>
  )
}

export default function SimulationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      }
    >
      <SimulationPageContent />
    </Suspense>
  )
}

