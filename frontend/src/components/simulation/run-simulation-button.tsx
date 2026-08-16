"use client"

import { Button } from "@/components/ui/button"
import { Loader2, Play } from "lucide-react"
import type { DummySubstation } from "@/lib/dummy-data"

interface RunSimulationButtonProps {
  substation: DummySubstation | null
  isRunning: boolean
  onRun: () => void
}

export function RunSimulationButton({ substation, isRunning, onRun }: RunSimulationButtonProps) {
  return (
    <Button
      onClick={onRun}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md"
      disabled={!substation || isRunning}
    >
      {isRunning ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Running Simulation...
        </>
      ) : (
        <>
          <Play className="mr-2 h-4 w-4" />
          Run Simulation
        </>
      )}
    </Button>
  )
}

