"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { doc, getDoc, deleteDoc } from "firebase/firestore"
import { Loader2, ArrowLeft, X } from "lucide-react"

import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SimulationDetail, type SimulationData } from "@/components/simulation/analysis-page"

function SimulationDetailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [simulation, setSimulation] = useState<SimulationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const simId = searchParams.get("simulationId")
    const substationId = searchParams.get("substationId")
    if (!simId || !substationId) {
      setSimulation(null)
      setIsLoading(false)
      return
    }

    const fetchSimulation = async () => {
      setIsLoading(true)
      try {
        const docRef = doc(db, `substations/${substationId}/simulations`, simId)
        const snapshot = await getDoc(docRef)
        if (snapshot.exists()) {
          setSimulation({ id: snapshot.id, substationId, ...snapshot.data() } as SimulationData)
        } else {
          setSimulation(null)
        }
      } catch (error) {
        console.error("Error loading simulation", error)
        setSimulation(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSimulation()
  }, [searchParams])

  const handleGoBack = useCallback(() => {
    router.push("/simulation?tab=analysis")
  }, [router])

  const handleGoToSolution = useCallback(() => {
    if (!simulation) return
    router.push(
      `/simulation?tab=solution&simulationId=${simulation.id}&substationId=${simulation.substationId}&combine=${simulation.componentType}&source=analysis`,
    )
  }, [router, simulation])

  const handleDelete = useCallback(async () => {
    if (!simulation) return
    const confirmDelete = window.confirm("Delete this simulation permanently?")
    if (!confirmDelete) return
    try {
      try {
        await fetch(`/api/simulation-video?simulationId=${encodeURIComponent(simulation.id)}`, {
          method: "DELETE",
        })
      } catch (videoError) {
        console.warn("Error deleting simulation video from MongoDB (non-fatal):", videoError)
      }
      await deleteDoc(doc(db, `substations/${simulation.substationId}/simulations`, simulation.id))
      handleGoBack()
    } catch (error) {
      console.error("Error deleting simulation", error)
    }
  }, [handleGoBack, simulation])

  return (
    <div className="h-[calc(100vh-8rem)] overflow-y-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Analysis
        </Button>
        <Button variant="ghost" size="icon" onClick={handleGoBack} aria-label="Close details">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && !simulation && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">Simulation not found.</CardContent>
        </Card>
      )}

      {simulation && (
        <SimulationDetail
          simulation={simulation}
          onGoToSolution={handleGoToSolution}
          onDelete={handleDelete}
          showPlayback
        />
      )}
    </div>
  )
}

export default function SimulationDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SimulationDetailContent />
    </Suspense>
  )
}


