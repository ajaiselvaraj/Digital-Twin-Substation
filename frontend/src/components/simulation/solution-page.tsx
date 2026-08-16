"use client"

import { useState, useEffect, Suspense, useCallback } from "react"
import type { MouseEvent } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { doc, getDoc, updateDoc, collectionGroup, getDocs, query, limit, deleteField } from "firebase/firestore"
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  FolderOpen,
  Trash2,
  ArrowRight,
  Clock,
  ShieldCheck,
  X,
  Cpu,
  Wrench,
  TrendingUp,
  Package,
  CalendarClock,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

import { db } from "@/lib/firebase"
import { cn } from "@/lib/utils"
import type { SimulationData } from "./analysis-page"
import { useToast } from "@/hooks/use-toast"
import {
  generateSolutionPackage,
  type SolutionData,
  type ComponentInfoSummary,
  type AiInsight,
  type MaintenanceBlock,
  type FailureForecastEntry,
  type ReplacementRecommendation,
  type PreventiveScheduleEntry,
  type SolutionSummary,
  type RiskLevel,
} from "@/lib/simulation-solution"

const COMPONENT_LABELS: Record<SimulationData["componentType"], string> = {
  transformer: "Transformer",
  bayLines: "Bay",
  circuitBreaker: "Circuit Breaker",
  isolator: "Isolator",
  busbar: "Busbar",
}

type ComponentKind = SimulationData["componentType"]
type RiskLevel = "Low" | "Medium" | "High" | "Critical"

interface FaultSummary {
  type: string
  probability: number
  severity: string
  eta?: string | null
}

interface SolutionHistoryEntry {
  id: string
  substationId: string
  componentType: ComponentKind
  solution: SolutionData
  assetMetadata?: SimulationData["assetMetadata"]
  simulationTimestamp?: string
}

const HISTORY_FETCH_LIMIT = 120
const HISTORY_DISPLAY_LIMIT = 30

const severityBadge = (level: RiskLevel) => {
  switch (level) {
    case "Low":
      return "bg-emerald-100 text-emerald-700"
    case "Medium":
      return "bg-yellow-100 text-yellow-700"
    case "High":
      return "bg-orange-100 text-orange-700"
    case "Critical":
      return "bg-red-100 text-red-700"
  }
}

function SolutionPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const [simulation, setSimulation] = useState<(SimulationData & { solution?: SolutionData }) | null>(null)
  const [solution, setSolution] = useState<SolutionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<SolutionHistoryEntry[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const simulationId = searchParams.get("simulationId")
  const substationId = searchParams.get("substationId")
  const source = searchParams.get("source")
  const detailMode = Boolean(simulationId && substationId)

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true)
    setHistoryError(null)
    try {
      const historyQuery = query(collectionGroup(db, "simulations"), limit(HISTORY_FETCH_LIMIT))
      const snapshot = await getDocs(historyQuery)
      const records: SolutionHistoryEntry[] = []
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SimulationData & { solution?: SolutionData }
        if (!data.solution) return
        const parentSubstationId = docSnap.ref.parent.parent?.id ?? data.substationId ?? "unknown"
        records.push({
          id: docSnap.id,
          substationId: parentSubstationId,
          componentType: data.componentType,
          solution: data.solution,
          assetMetadata: data.assetMetadata,
          simulationTimestamp: data.timestamp,
        })
      })
      const sortedByGeneratedAt = records
        .filter((entry) => entry.solution.generatedAt)
        .sort(
          (a, b) =>
            new Date(b.solution.generatedAt).getTime() -
            new Date(a.solution.generatedAt).getTime(),
        )
      setHistory(sortedByGeneratedAt.slice(0, HISTORY_DISPLAY_LIMIT))
    } catch (err) {
      console.error("Error loading history:", err)
      setHistoryError("Unable to load previously generated solutions.")
    } finally {
      setIsHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (simulationId && substationId) {
      void loadSolution(substationId, simulationId)
    }
  }, [simulationId, substationId])

  useEffect(() => {
    if (!detailMode) {
      void loadHistory()
    }
  }, [detailMode, loadHistory])

  const loadSolution = async (subId: string, simId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const docRef = doc(db, `substations/${subId}/simulations`, simId)
      const docSnap = await getDoc(docRef)
      if (!docSnap.exists()) {
        setError("Simulation record not found.")
        setSimulation(null)
        setSolution(null)
        return
      }
      const data = { id: docSnap.id, substationId: subId, ...docSnap.data() } as SimulationData & { solution?: SolutionData }
      setSimulation(data)
      if (data.solution) {
        setSolution(data.solution)
      } else {
        await generateSolution(subId, simId, data)
      }
    } catch (err) {
      console.error("Error loading solution:", err)
      setError("Unable to load solution data.")
    } finally {
      setIsLoading(false)
    }
  }

  const generateSolution = async (subId: string, simId: string, simData: SimulationData) => {
    setIsGenerating(true)
    setError(null)
    try {
      const aiSolution = await generateSolutionPackage(simData)
      const docRef = doc(db, `substations/${subId}/simulations`, simId)
      await updateDoc(docRef, { solution: aiSolution })
      setSolution(aiSolution)
      setSimulation((prev) => (prev ? { ...prev, solution: aiSolution } : prev))
    } catch (err) {
      console.error("Error generating solution:", err)
      setError("Failed to generate solution. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleHistoryOpen = useCallback(
    (entry: SolutionHistoryEntry) => {
      const params = new URLSearchParams()
      params.set("tab", "solution")
      params.set("substationId", entry.substationId)
      params.set("simulationId", entry.id)
      params.set("source", "history")
      router.push(`/simulation?${params.toString()}`)
    },
    [router],
  )

  const handleHistoryDelete = useCallback(
    async (entry: SolutionHistoryEntry) => {
      try {
        const simRef = doc(db, `substations/${entry.substationId}/simulations`, entry.id)
        await updateDoc(simRef, { solution: deleteField() })
        setHistory((prev) => prev.filter((item) => item.id !== entry.id))
        toast({
          title: "Solution removed",
          description: `${COMPONENT_LABELS[entry.componentType]} package deleted.`,
        })
      } catch (err) {
        console.error("Error deleting solution:", err)
        toast({
          title: "Unable to delete solution",
          description: "Please try again in a moment.",
          variant: "destructive",
        })
      }
    },
    [toast],
  )

  const handleCloseDetail = useCallback(() => {
    setSimulation(null)
    setSolution(null)
    router.push("/simulation?tab=solution")
  }, [router])

  const insightsVisible = source === "analysis"

  if (!detailMode) {
    return (
      <SolutionHistoryList
        items={history}
        isLoading={isHistoryLoading}
        error={historyError}
        onRefresh={loadHistory}
        onSelect={handleHistoryOpen}
        onDelete={handleHistoryDelete}
      />
    )
  }

  if (!simulationId || !substationId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-orange-500" />
        <p className="text-sm text-muted-foreground">
          Select a simulation from the Analysis tab to generate a tailored solution.
        </p>
      </div>
    )
  }

  if (isLoading || !simulation || !solution) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-3 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        <p className="text-sm text-muted-foreground">
          {isGenerating ? "Generating fresh solution package..." : "Loading latest solution package..."}
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">AI Maintenance Solution</h1>
          <p className="text-xs text-muted-foreground">
            Generated {new Date(solution.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCloseDetail}>
            <X className="mr-1 h-4 w-4" />
            Close
          </Button>
          <Button
            size="sm"
            disabled={isGenerating || !simulation}
            onClick={() => simulation && generateSolution(substationId, simulationId, simulation)}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate Solution
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border rounded-lg bg-muted/20 px-3 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          {COMPONENT_LABELS[simulation.componentType]} • {simulation.assetMetadata?.substationName ?? substationId}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/simulation?tab=analysis&substationId=${substationId}`)}
        >
          <ArrowRight className="mr-1 h-4 w-4" />
          Back to analysis
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-6 pb-10">
          <ComponentInfoCard data={solution.componentInfo} />

          {insightsVisible && solution.aiInsights.length > 0 && (
            <AiInsightsCard insights={solution.aiInsights} />
          )}

          <MaintenanceCard blocks={solution.maintenancePlan} component={simulation.componentType} />

          <FailureForecastCard entries={solution.failureForecast} />

          <ReplacementCard items={solution.replacementPlan} />

          <PreventiveScheduleCard schedule={solution.preventiveSchedule} />

          <SummaryCard summary={solution.summary} />
        </div>
      </div>
    </div>
  )
}

export function SolutionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      }
    >
      <SolutionPageContent />
    </Suspense>
  )
}

function ComponentInfoCard({ data }: { data: ComponentInfoSummary }) {
  const infoGrid = [
    { label: "Component Type", value: data.componentType },
    { label: "Asset ID", value: data.assetId },
    { label: "Manufacturer", value: data.manufacturer },
    { label: "Model", value: data.model },
    { label: "Commissioned Year", value: data.commissionedYear },
    { label: "Last Maintenance", value: data.lastMaintenanceDate },
    { label: "Health Score", value: `${data.healthScore.toFixed(0)}%` },
    { label: "Risk Level", value: data.riskLevel },
  ]

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Cpu className="h-5 w-5 text-sky-500" />
        <CardTitle>Component Info Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {infoGrid.map((item) => (
            <div key={item.label} className="rounded-lg border bg-muted/30 px-3 py-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{item.label}</p>
              <p className="text-sm font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Condition Summary</p>
          <p className="text-sm">{data.conditionSummary}</p>
        </div>

        {data.finalStateSummary.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Final State Snapshot</p>
            <div className="flex flex-wrap gap-2">
              {data.finalStateSummary.map((entry) => (
                <span key={entry.label} className="rounded-full border px-3 py-1 text-xs bg-white">
                  <span className="font-semibold">{entry.label}:</span> {entry.value}
                </span>
              ))}
            </div>
          </div>
        )}

        <Separator />

        <div>
          <p className="text-sm font-semibold mb-2">Fault Predictions</p>
          {data.faultPredictions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No outstanding faults predicted.</p>
          ) : (
            <div className="space-y-2">
              {data.faultPredictions.map((fault) => (
                <div key={fault.type} className="rounded-lg border px-3 py-2 text-sm flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{fault.type}</span>
                  <Badge variant="secondary">{fault.severity}</Badge>
                  <span className="text-muted-foreground">{fault.probability}% chance</span>
                  {fault.eta && <span className="text-muted-foreground">• ETA {fault.eta}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function AiInsightsCard({ insights }: { insights: AiInsight[] }) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-emerald-500" />
        <CardTitle>AI-Generated Engineering Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => (
          <div
            key={insight.title}
            className="rounded-lg border px-4 py-3 bg-gradient-to-r from-slate-50 to-white flex flex-col gap-1"
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold">{insight.title}</p>
              <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", severityBadge(insight.severity))}>
                {insight.severity}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{insight.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function MaintenanceCard({ blocks, component }: { blocks: MaintenanceBlock[]; component: ComponentKind }) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-indigo-500" />
          <CardTitle>Maintenance Recommendations</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">{COMPONENT_LABELS[component]} maintenance blueprint</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {blocks.map((block) => (
          <div key={block.title} className="rounded-lg border p-3 bg-white">
            <p className="text-sm font-semibold mb-1">{block.title}</p>
            <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
              {block.tasks.map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function FailureForecastCard({ entries }: { entries: FailureForecastEntry[] }) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-orange-500" />
        <CardTitle>Failure Forecast</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.window} className="rounded-lg border p-3 bg-muted/20">
            <p className="text-xs uppercase text-muted-foreground tracking-wide">{entry.window}</p>
            <p className="text-sm font-semibold">{entry.outlook}</p>
            <p className="text-xs text-muted-foreground mt-1">{entry.recommendation}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function ReplacementCard({ items }: { items: ReplacementRecommendation[] }) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Package className="h-5 w-5 text-purple-500" />
        <CardTitle>Replacement Recommendations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.item} className="rounded-lg border px-3 py-2 flex flex-wrap items-center gap-2 bg-white">
            <div className="flex-1 min-w-[160px]">
              <p className="text-sm font-semibold">{item.item}</p>
              <p className="text-xs text-muted-foreground">{item.rul}</p>
            </div>
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", severityBadge(item.urgency))}>
              {item.urgency} urgency
            </span>
            {item.cost && <p className="text-xs text-muted-foreground">{item.cost}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function PreventiveScheduleCard({ schedule }: { schedule: PreventiveScheduleEntry[] }) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-rose-500" />
        <CardTitle>Preventive Maintenance Schedule</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {schedule.map((slot) => (
          <div key={slot.cadence} className="rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-semibold">{slot.cadence}</p>
            <ul className="list-disc pl-5 text-xs text-muted-foreground mt-2 space-y-1">
              {slot.tasks.map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function SummaryCard({ summary }: { summary: SolutionSummary }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <CardTitle>Solution Summary</CardTitle>
        </div>
        <Badge variant="outline" className="text-xs">
          Expected Improvement: +{summary.expectedImprovement}%
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-center">
            <p className="text-xs uppercase text-muted-foreground">Health</p>
            <p className="text-2xl font-bold text-emerald-600">{summary.overallHealth.toFixed(0)}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase text-muted-foreground">Failure Probability</p>
            <p className="text-2xl font-bold text-red-500">{summary.failureProbability.toFixed(0)}%</p>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase text-muted-foreground mb-1">Root Cause Summary</p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            {summary.rootCauses.map((cause) => (
              <li key={cause}>{cause}</li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs uppercase text-muted-foreground mb-1">Top Recommended Actions</p>
          <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
            {summary.topActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}

function SolutionHistoryList({
  items,
  isLoading,
  error,
  onRefresh,
  onSelect,
  onDelete,
}: {
  items: SolutionHistoryEntry[]
  isLoading: boolean
  error: string | null
  onRefresh: () => void | Promise<void>
  onSelect: (entry: SolutionHistoryEntry) => void
  onDelete: (entry: SolutionHistoryEntry) => void
}) {
  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-emerald-700">
            <Sparkles className="h-6 w-6" />
            AI Solution Library
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onRefresh()} disabled={isLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      <div className="flex-1 overflow-y-auto pr-2">
        {isLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
            Loading latest solutions...
          </div>
        ) : items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-muted-foreground">
            <FolderOpen className="h-10 w-10 text-slate-400" />
            <div>
              <p className="font-semibold text-slate-700">No saved solutions yet</p>
              <p className="text-sm">Run a simulation and convert it to a solution to see it listed here.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-8">
            {items.map((entry) => (
              <SolutionHistoryCard key={`${entry.substationId}-${entry.id}`} entry={entry} onSelect={onSelect} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SolutionHistoryCard({
  entry,
  onSelect,
  onDelete,
}: {
  entry: SolutionHistoryEntry
  onSelect: (entry: SolutionHistoryEntry) => void
  onDelete: (entry: SolutionHistoryEntry) => void
}) {
  const componentLabel = COMPONENT_LABELS[entry.componentType]
  const generatedAgo = formatDistanceToNow(new Date(entry.solution.generatedAt), { addSuffix: true })

  const handleSelect = () => onSelect(entry)
  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onDelete(entry)
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      className="h-full w-full cursor-pointer border border-slate-200 transition hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground tracking-wide">Component</p>
          <p className="text-lg font-semibold">{componentLabel}</p>
          <p className="text-xs text-muted-foreground">
            {entry.assetMetadata?.substationName ?? `Substation ${entry.substationId}`}
          </p>
        </div>
        <Badge variant="outline" className="capitalize">
          {entry.solution.componentInfo.riskLevel} risk
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {generatedAgo}
          </span>
          <span className="font-semibold text-slate-800">
            {entry.solution.summary.overallHealth.toFixed(0)}% health
          </span>
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase text-muted-foreground">Top insights</p>
          <div className="flex flex-wrap gap-2">
            {entry.solution.summary.rootCauses.slice(0, 2).map((cause) => (
              <Badge key={cause} variant="secondary" className="text-xs">
                {cause}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <Button
            size="sm"
            variant="secondary"
            onClick={(event) => {
              event.stopPropagation()
              onSelect(entry)
            }}
          >
            View details
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function getHealthScore(data: SimulationData): number {
  const fromScores = data.healthScores?.overall
  if (typeof fromScores === "number" && fromScores > 0) {
    return Math.min(100, Math.max(0, fromScores))
  }
  if (typeof data.overallHealth === "number" && data.overallHealth > 0) {
    return Math.min(100, Math.max(0, data.overallHealth))
  }
  return 70
}

function deriveRiskLevel(health: number, faults: SimulationData["faultPredictions"] = []): RiskLevel {
  if (health >= 80 && (!faults || faults.length === 0)) return "Low"
  if (health >= 65) return "Medium"
  if (health >= 45) return "High"
  return "Critical"
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "—"
    if (Math.abs(value) >= 1000) return value.toFixed(0)
    if (Math.abs(value) >= 100) return value.toFixed(1)
    if (Math.abs(value) >= 10) return value.toFixed(1)
    if (Math.abs(value) >= 1) return value.toFixed(2)
    return value.toFixed(3)
  }
  return String(value)
}

async function generateAISolution(simulationData: SimulationData): Promise<SolutionData> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const componentType = simulationData.componentType
  const componentLabel = COMPONENT_LABELS[componentType]
  const healthScore = getHealthScore(simulationData)
  const faults = simulationData.faultPredictions ?? []
  const riskLevel = deriveRiskLevel(healthScore, faults)
  const failureProbability =
    typeof simulationData.faultProbability === "number"
      ? (simulationData.faultProbability <= 1
          ? simulationData.faultProbability * 100
          : simulationData.faultProbability)
      : Math.min(95, Math.max(5, (100 - healthScore) * 0.7 + faults.length * 6))

  const assetMeta = (simulationData.assetMetadata ?? {}) as SimulationData["assetMetadata"] & {
    lastMaintenanceDate?: string
    conditionSummary?: string
    substation?: Record<string, any>
  }
  const contextAssetId = simulationData.assetContext?.id
  const derivedAssetId =
    typeof assetMeta.assetId === "string" && assetMeta.assetId.length > 0
      ? assetMeta.assetId
      : contextAssetId
        ? String(contextAssetId)
        : "Not tagged"
  const finalStateEntries = Object.entries(simulationData.finalState ?? {}).slice(0, 4)
  const finalStateSummary =
    finalStateEntries.length > 0
      ? finalStateEntries.map(([key, value]) => ({
          label: key.replace(/([A-Z])/g, " $1").replace(/\b\w/g, (c) => c.toUpperCase()),
          value: formatValue(value),
        }))
      : []

  const componentInfo: ComponentInfoSummary = {
    componentType: componentLabel,
    assetId: derivedAssetId,
    manufacturer: assetMeta.manufacturer ?? "Not specified",
    model: assetMeta.model ?? "Unknown model",
    commissionedYear: assetMeta.installationYear ? String(assetMeta.installationYear) : "—",
    lastMaintenanceDate: assetMeta.lastMaintenanceDate ?? "Not recorded",
    conditionSummary:
      assetMeta.conditionSummary ??
      simulationData.diagnosis?.split("\n")[0] ??
      "Asset condition summary not provided.",
    finalStateSummary,
    healthScore,
    riskLevel,
    faultPredictions: faults.map((fault) => ({
      type: fault.type,
      probability: Number(((fault.probability ?? 0) * 100).toFixed(0)),
      severity: fault.severity,
      eta: fault.timeToFailure ? `${fault.timeToFailure.toFixed(1)} h` : null,
    })),
  }

  const aiInsights = buildInsights(componentType, faults, simulationData)
  const maintenancePlan = buildMaintenance(componentType)
  const failureForecast = buildFailureForecast(componentType, healthScore, riskLevel)
  const replacementPlan = buildReplacementPlan(componentType)
  const preventiveSchedule = buildPreventiveSchedule(componentType)

  const summary: SolutionSummary = {
    overallHealth: healthScore,
    failureProbability,
    rootCauses: aiInsights.slice(0, 3).map((item) => item.description),
    topActions: maintenancePlan.flatMap((block) => block.tasks).slice(0, 5),
    expectedImprovement: componentType === "transformer" ? 18 : 12,
  }

  const promptPayload = {
    substationMetadata: assetMeta.substation ?? { id: simulationData.substationId },
    assetMetadata: assetMeta,
    componentType,
    simulationInput: simulationData.inputValues,
    simulationTimeline: simulationData.timeline ?? [],
    finalState: simulationData.finalState ?? {},
    healthScores: simulationData.healthScores ?? {},
    faultPredictions: simulationData.faultPredictions ?? [],
    diagnosis: simulationData.diagnosis ?? "",
    request: {
      generate: [
        "fault_diagnosis",
        "maintenance_recommendations",
        "failure_forecast",
        "replacement_recommendations",
        "preventive_maintenance_plan",
        "executive_summary",
      ],
      useIndustryStandards: true,
      equipmentScope: ["transformer", "breaker", "bayLine", "busbar", "isolator"],
      includeTechnicalReasoning: true,
      optimizeForSubstationType: true,
    },
  }

  return {
    generatedAt: new Date().toISOString(),
    componentInfo,
    aiInsights,
    maintenancePlan,
    failureForecast,
    replacementPlan,
    preventiveSchedule,
    summary,
    promptPayload,
  }
}

function buildInsights(
  component: ComponentKind,
  faults: SimulationData["faultPredictions"],
  data: SimulationData,
): AiInsight[] {
  const withSeverity = (title: string, severity: RiskLevel, description: string): AiInsight => ({
    title,
    severity,
    description,
  })

  const maps: Record<ComponentKind, AiInsight[]> = {
    transformer: [
      withSeverity(
        "Winding overheating from high load",
        "High",
        "Load exceeds safe band causing hotspot >110°C. Enforce immediate load shedding.",
      ),
      withSeverity(
        "Oil health degradation",
        "Medium",
        "Moisture and reduced BDV detected. Execute filtration and silica gel replacement.",
      ),
    ],
    circuitBreaker: [
      withSeverity(
        "SF6 pressure trending below threshold",
        "High",
        "Density <6.2 bar compromises arc quenching. Schedule refill and leak detection.",
      ),
      withSeverity(
        "Mechanism wear increasing",
        "Medium",
        "Operation counts & timing drift indicate lubrication and spring maintenance is due.",
      ),
    ],
    bayLines: [
      withSeverity(
        "CT burden saturation risk",
        "High",
        "Measured burden exceeds 90% capacity leading to inaccurate relay inputs.",
      ),
      withSeverity(
        "PF & frequency drift",
        "Medium",
        "Persistent PF <0.92 increases current heating. Investigate capacitor banks.",
      ),
    ],
    busbar: [
      withSeverity(
        "Hotspot likelihood at joints",
        "High",
        "Thermal trend indicates localized heating. IR scan and clamp tightening required.",
      ),
      withSeverity(
        "Mechanical vibration",
        "Medium",
        "Spacer fatigue noted. Re-tension supports to avoid conductor fretting.",
      ),
    ],
    isolator: [
      withSeverity(
        "Torque rise on drive mechanism",
        "Medium",
        "Higher torque suggests lubrication loss and potential shaft wear.",
      ),
      withSeverity(
        "Contact alignment drift",
        "Low",
        "Minor blade pressure imbalance, schedule contact cleaning and adjustment.",
      ),
    ],
  }

  return (faults && faults.length > 0 ? maps[component] : [withSeverity("Stable operation", "Low", "No anomalies raised")])
}

function buildMaintenance(component: ComponentKind): MaintenanceBlock[] {
  // definitions same as earlier replaced.

  const maintenanceMap: Record<ComponentKind, MaintenanceBlock[]> = {
    transformer: [
      {
        title: "Thermal Stress",
        tasks: ["Reduce loading to <85%", "Run cooling fans continuously", "Perform IR scanning at radiator fins"],
      },
      {
        title: "Oil Health",
        tasks: ["Full oil filtration", "Conduct BDV test", "Replace silica gel", "Inspect conservator tank & oil level"],
      },
      {
        title: "DGA Gas",
        tasks: [
          "DGA test within 48 hrs",
          "Compare against Duval Triangle signature",
          "Inspect for overheating or localized arcing",
        ],
      },
      {
        title: "Winding & Core",
        tasks: ["Perform winding resistance test", "Run SFRA on HV/LV windings", "Torque and tighten core clamps"],
      },
      {
        title: "OLTC",
        tasks: [
          "Check diverter switch wear",
          "Perform timing signature test",
          "Replace contacts if deviation > 8 ms",
          "Re-grease mechanism linkages",
        ],
      },
    ],
    circuitBreaker: [
      {
        title: "SF6 Health",
        tasks: ["Refill SF6 to nameplate pressure", "Run ultrasonic leak test", "Replace moisture absorbent"],
      },
      {
        title: "Mechanism",
        tasks: ["Lubricate linkages", "Check spring charging time", "Replace worn springs"],
      },
      {
        title: "Operation Count / Timing",
        tasks: ["Conduct timing tests", "Inspect trip coils", "Clean arcing contacts"],
      },
    ],
    bayLines: [
      {
        title: "CT Issues",
        tasks: ["Reduce burden", "Run secondary injection test", "Verify CT polarity marks"],
      },
      {
        title: "VT Issues",
        tasks: ["Re-calibrate VT ratios", "Inspect VT fuses", "Replace insulation if drift >20%"],
      },
      {
        title: "Frequency & PF",
        tasks: ["Activate capacitor banks", "Check harmonic filters", "Investigate source of PF drift"],
      },
    ],
    busbar: [
      {
        title: "Thermal",
        tasks: ["IR scan for hotspots", "Tighten clamps", "Verify sag & vibration"],
      },
      {
        title: "Mechanical",
        tasks: ["Replace corroded bolts", "Apply anti-oxidation coating", "Re-tension supports"],
      },
      {
        title: "Electrical",
        tasks: ["Balance load", "Check bolted joints", "Compare operation to thermal limit"],
      },
    ],
    isolator: [
      {
        title: "Mechanical Wear",
        tasks: ["Lubricate shaft", "Tighten drive rods", "Replace worn bearings"],
      },
      {
        title: "Contact Alignment",
        tasks: ["Check pressure", "Inspect blade for discoloration", "Replace eroded copper contacts"],
      },
    ],
  }

  return maintenanceMap[component]
}

function buildFailureForecast(component: ComponentKind, health: number, risk: RiskLevel): FailureForecastEntry[] {
  const highRisk = risk === "High" || risk === "Critical"
  const healthLabel = health.toFixed(0)

  const defaults: FailureForecastEntry[] = [
    {
      window: "0-6 months",
      outlook: highRisk
        ? `Elevated outage probability with health at ${healthLabel}%.`
        : `Stable operation with watch points identified.`,
      recommendation: highRisk
        ? "Schedule focused inspections and reduce loading where possible."
        : "Continue thermography and oil sampling cadence.",
    },
    {
      window: "6-12 months",
      outlook: highRisk ? "Maintenance debt likely to trigger nuisance trips." : "Minor degradation trend detected.",
      recommendation: "Plan targeted maintenance window and verify KPIs after completion.",
    },
    {
      window: "1-3 years",
      outlook: highRisk ? "Component may hit end-of-life envelope." : "Plan for mid-life refurbishment.",
      recommendation: "Align spares, procurement, and outage windows for proactive replacement.",
    },
    {
      window: ">3 years",
      outlook: highRisk ? "Asset replacement should be budgeted now." : "Long-term performance depends on adherence to PM.",
      recommendation: "Update asset roadmap and digital twin assumptions annually.",
    },
  ]

  const componentOverrides: Partial<Record<ComponentKind, FailureForecastEntry[]>> = {
    transformer: [
      {
        window: "0-6 months",
        outlook: highRisk ? "Hotspot temperatures approaching 110°C band." : "Thermal margins tightening under peak load.",
        recommendation: highRisk ? "Shift load within weeks and verify cooling auxiliaries weekly." : "Increase IR scans and DGA cadence.",
      },
      {
        window: "6-12 months",
        outlook: "Oil aging accelerating; Duval profile indicates emerging thermal fault.",
        recommendation: "Schedule filtration, BDV testing, and OLTC inspection in the next outage.",
      },
      {
        window: "1-3 years",
        outlook: "Insulation endurance drops ~3% per quarter without intervention.",
        recommendation: "Plan major refurbishment or retrofill program before the third year horizon.",
      },
      {
        window: ">3 years",
        outlook: "Digital twin predicts residual life only if derating is maintained.",
        recommendation: "Budget for replacement transformer or advanced life-extension kit.",
      },
    ],
    circuitBreaker: [
      {
        window: "0-6 months",
        outlook: highRisk ? "SF6 density nearing lockout threshold." : "Density trending slightly low.",
        recommendation: "Top up SF6, run leak detection, and verify density switch calibration.",
      },
      {
        window: "6-12 months",
        outlook: "Mechanism wear may add >10 ms to clearing time.",
        recommendation: "Overhaul operating mechanism, replace dashpots, and perform timing test shots.",
      },
      {
        window: "1-3 years",
        outlook: "Contact erosion projected to exceed IEC limits without intervention.",
        recommendation: "Secure spare interrupter and plan retrofit in the next major shutdown.",
      },
      {
        window: ">3 years",
        outlook: "Legacy mechanism will require full modernization kit.",
        recommendation: "Include breaker replacement or refurbishment in capital plan.",
      },
    ],
  }

  return componentOverrides[component] ?? defaults
}

function buildReplacementPlan(component: ComponentKind): ReplacementRecommendation[] {
  const map: Record<ComponentKind, ReplacementRecommendation[]> = {
    transformer: [
      { item: "Forced-air fan assembly", urgency: "Medium", rul: "18 months", cost: "$18k" },
      { item: "Radiator isolation valve", urgency: "Low", rul: "24 months", cost: "$6k" },
      { item: "OLTC diverter switch kit", urgency: "High", rul: "9 months", cost: "$22k" },
      { item: "LV/HV bushing set", urgency: "Medium", rul: "15 months", cost: "$28k" },
    ],
    circuitBreaker: [
      { item: "Spring operating mechanism", urgency: "Medium", rul: "12 months", cost: "$30k" },
      { item: "SF6 nozzle kit", urgency: "High", rul: "6 months", cost: "$9k" },
      { item: "Trip coil assembly", urgency: "Medium", rul: "18 months", cost: "$3k" },
    ],
    bayLines: [
      { item: "CT core stack", urgency: "Medium", rul: "12 months", cost: "$7k" },
      { item: "VT measurement unit", urgency: "Low", rul: "24 months", cost: "$5k" },
      { item: "Feeder clamp hardware", urgency: "Low", rul: "30 months" },
    ],
    busbar: [
      { item: "Clamp hardware kit", urgency: "High", rul: "6 months", cost: "$4k" },
      { item: "Spacer replacement kit", urgency: "Medium", rul: "14 months", cost: "$8k" },
      { item: "Joint bolts pack", urgency: "Low", rul: "24 months" },
    ],
    isolator: [
      { item: "Drive gear assembly", urgency: "Medium", rul: "16 months", cost: "$6k" },
      { item: "Contact blade set", urgency: "High", rul: "10 months", cost: "$5k" },
    ],
  }

  return map[component]
}

function buildPreventiveSchedule(component: ComponentKind): PreventiveScheduleEntry[] {
  const scheduleMap: Record<ComponentKind, PreventiveScheduleEntry[]> = {
    transformer: [
      {
        cadence: "Weekly",
        tasks: ["Visual walkdown for leaks", "Check fan/pump alarm logs", "Validate winding temperature trends"],
      },
      {
        cadence: "Monthly",
        tasks: ["Cooling system functional test", "Spot DGA sample", "Clean breather silica gel"],
      },
      {
        cadence: "Quarterly",
        tasks: ["Full oil diagnostics", "Protection relay coordination check", "Thermal scan of terminations"],
      },
      {
        cadence: "Annual",
        tasks: ["OLTC refurbishment", "Insulation resistance benchmarking", "Update digital twin parameters"],
      },
      {
        cadence: "Predictive",
        tasks: ["Trend Duval Triangle movement", "Update transformer loading model", "Calibrate digital twin inputs"],
      },
    ],
    circuitBreaker: [
      {
        cadence: "Weekly",
        tasks: ["Review SF6 density logs", "Exercise mechanism in local mode", "Check control cabinet heaters"],
      },
      {
        cadence: "Monthly",
        tasks: ["SF6 density logging", "Drive mechanism exercise", "Auxiliary contact verification"],
      },
      {
        cadence: "Semi-Annual",
        tasks: ["DLRO contact resistance test", "Timing test shot", "Trip coil health assessment"],
      },
      {
        cadence: "Annual",
        tasks: ["Mechanism strip-down inspection", "Update event logger firmware", "Calibrate protection relays"],
      },
      {
        cadence: "Predictive",
        tasks: ["Trend closing/opening time drift", "Monitor mechanism vibration signatures", "Model SF6 leakage rate"],
      },
    ],
    bayLines: [
      {
        cadence: "Weekly",
        tasks: ["Scan feeder load profiles", "Verify PF correction status", "Check alarms from bay protection IEDs"],
      },
      {
        cadence: "Quarterly",
        tasks: ["Protection relay self-test", "CT secondary insulation check", "Line walkdown"],
      },
      {
        cadence: "Annual",
        tasks: ["Power quality audit", "Update PMU calibration", "Grounding resistance measurement"],
      },
      {
        cadence: "Predictive",
        tasks: ["Model harmonic impact", "Review breaker duty cycle vs feeder stress", "Tune capacitor switching logic"],
      },
    ],
    busbar: [
      {
        cadence: "Weekly",
        tasks: ["Check temperature alarms", "Verify differential relay metering", "Listen for abnormal vibration"],
      },
      {
        cadence: "Bi-Monthly",
        tasks: ["Infrared scan", "Spacer vibration check", "Clean insulators"],
      },
      {
        cadence: "Annual",
        tasks: ["Partial discharge test", "Joint torque audit", "Protection logic review"],
      },
      {
        cadence: "Condition-Based",
        tasks: ["Deploy portable PD sensors on abnormal joints", "Update busbar thermal model after upgrades"],
      },
    ],
    isolator: [
      {
        cadence: "Monthly",
        tasks: ["Operate through full stroke", "Lubricate moving parts", "Check auxiliary feedback"],
      },
      {
        cadence: "Quarterly",
        tasks: ["Measure contact resistance", "Inspect drive rods for play", "Verify interlocks"],
      },
      {
        cadence: "Annual",
        tasks: ["Contact silver plating inspection", "Measure alignment tolerances", "Dielectric withstand test"],
      },
      {
        cadence: "Predictive",
        tasks: ["Trend operating torque", "Correlate weather vs sticking incidents", "Update maintenance triggers"],
      },
    ],
  }

  return scheduleMap[component]
}
