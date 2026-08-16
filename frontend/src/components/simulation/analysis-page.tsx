"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ComponentType as ReactComponentType, CSSProperties } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts"
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore"
import {
  Loader2,
  Download,
  Lightbulb,
  Maximize2,
  PlayCircle,
  PauseCircle,
  FileText,
  FileDown,
  Trash2,
  X,
  Activity,
  TrendingUp,
  ShieldAlert,
  Stethoscope,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"

import { db } from "@/lib/firebase"
import {
  COMPONENT_HEALTH_BLUEPRINT,
  COMPONENT_VIDEO_LIBRARY,
  FAULT_LIBRARY,
  PARAMETER_THRESHOLDS,
  type ComponentType,
} from "@/lib/analysis-config"
import type { SolutionData } from "@/lib/simulation-solution"
import { useSimulation } from "./simulation-context"
import { cn } from "@/lib/utils"
import { calculateAllHealthScores } from "@/lib/simulation-engine"
import { ModelViewer } from "@/components/live-trend/model-viewer"
import {
  getFaultProbabilityTextClass,
  getOverallHealthTextClass,
} from "@/lib/simulation-color-coding"

const RECENT_LIMIT = 20

interface AssetMetadata {
  assetId?: string
  assetName?: string
  substationName?: string
  substationCode?: string
  areaName?: string
  voltageClass?: string
  operator?: string
  latitude?: number
  longitude?: number
  installationYear?: number
  manufacturer?: string
  model?: string
  ratedSpecs?: Array<{ label: string; value: string }>
}

export interface SimulationData {
  id: string
  substationId: string
  componentType: ComponentType
  assetMetadata?: AssetMetadata
  assetContext?: Record<string, unknown>
  inputValues: Record<string, number | string>
  timeline: Array<{
    time: number
    state: Record<string, number | string>
    healthScore: number
    trueHealth?: number
    stressScore?: number
    faultProbability?: number
    agingFactor?: number
  }>
  finalState: Record<string, number | string>
  healthScores: Record<string, number>
  faultPredictions: Array<{
    type: string
    probability: number
    timeToFailure?: number
    severity: "low" | "medium" | "high" | "critical"
    cause?: string
    affected?: string
    action?: string
  }>
  diagnosis: string
  videoUrl?: string
  timestamp: string
  detailedScores?: Record<string, number>
  overallHealth?: number
  stressScore?: number
  agingFactor?: number
  faultProbability?: number
  // Optional ML outputs from backend predictors
  trueHealth?: number
  riskScore?: number
  masterFailureProbability?: number
  prob_30days?: number
  prob_90days?: number
  prob_180days?: number
  rul_optimistic_months?: number
  rul_conservative_months?: number
  // Optional ML correlation heads (used primarily for transformer)
  corr_load_hotspot_strength?: number
  corr_moisture_dielectric_strength?: number
  corr_gas_hotspot_strength?: number
  corr_pf_lineheating_strength?: number
  corr_thd_stress_strength?: number
  corr_temp_resistance_strength?: number
  corr_load_jointtemp_strength?: number
  corr_torque_contact_strength?: number
  corr_sf6_temperature_strength?: number
  corr_operations_wear_strength?: number
  solution?: SolutionData
}

type Severity = "normal" | "low" | "medium" | "high" | "critical"

const COMPONENT_LABELS: Record<ComponentType, string> = {
  transformer: "Transformer",
  bayLines: "Bay",
  circuitBreaker: "Circuit Breaker",
  isolator: "Isolator",
  busbar: "Busbar",
}

const SEVERITY_THEME: Record<
  Severity,
  { bg: string; border: string; text: string; pill: string; emoji: string }
> = {
  critical: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    pill: "bg-red-600 text-white",
    emoji: "🔴",
  },
  high: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    pill: "bg-orange-500 text-white",
    emoji: "🟠",
  },
  medium: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    pill: "bg-yellow-500 text-white",
    emoji: "🟡",
  },
  low: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    pill: "bg-blue-500 text-white",
    emoji: "🔵",
  },
  normal: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    pill: "bg-emerald-500 text-white",
    emoji: "🟢",
  },
}

const CORRELATION_BLUEPRINT: Record<
  ComponentType,
  Array<{ label: string; a: string; b: string; description: string }>
> = {
  transformer: [
    {
      label: "Load vs Hotspot",
      a: "transformerLoading",
      b: "hotspotTemperature",
      description: "Higher loading should correlate with hotspot rise",
    },
    {
      label: "Gas vs Hotspot",
      a: "hydrogenPPM",
      b: "hotspotTemperature",
      description: "Gas accumulation typically follows hotspot severity",
    },
    {
      label: "Moisture vs Dielectric",
      a: "oilMoisture",
      b: "dielectricStrength",
      description: "Moisture deteriorates dielectric strength",
    },
  ],
  bayLines: [
    {
      label: "PF vs Line Heating",
      a: "powerFactor",
      b: "lineCurrent",
      description: "Low PF increases line current",
    },
    {
      label: "THD vs Stress",
      a: "harmonicsTHDPercent",
      b: "lineCurrent",
      description: "High THD usually compounds current stress",
    },
  ],
  circuitBreaker: [
    {
      label: "SF6 vs Temperature",
      a: "sf6DensityPercent",
      b: "poleTemperature",
      description: "Leakage degrades cooling and elevates temperature",
    },
    {
      label: "Operations vs Wear",
      a: "operationCountPercent",
      b: "mechanismWearLevel",
      description: "Duty cycle directly impacts wear",
    },
  ],
  isolator: [
    {
      label: "Torque vs Contact",
      a: "motorTorqueNm",
      b: "contactResistanceMicroOhm",
      description: "High torque often tracks poor contact quality",
    },
  ],
  busbar: [
    {
      label: "Load vs Joint Temp",
      a: "busbarLoadPercent",
      b: "jointHotspotTemp",
      description: "Overload accelerates joint hotspots",
    },
    {
      label: "Temp vs Resistance",
      a: "busbarTemperature",
      b: "impedanceMicroOhm",
      description: "Thermal stress raises contact resistance",
    },
  ],
}

const TREND_WINDOWS = [30, 90, 180]

const formatKey = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim()

const toNumber = (value: number | string | undefined, fallback = 0) => {
  if (typeof value === "number") return value
  const parsed = parseFloat(String(value ?? ""))
  return Number.isFinite(parsed) ? parsed : fallback
}

function evaluateSeverity(component: ComponentType, key: string, rawValue: number | string | undefined): Severity {
  const thresholds = PARAMETER_THRESHOLDS[component]
  if (!thresholds?.[key]) return "normal"
  const { warning, critical, direction = "high" } = thresholds[key]
  const value = toNumber(rawValue)

  if (direction === "high") {
    if (value >= critical) return "critical"
    if (value >= warning) return "high"
    if (value >= warning * 0.9) return "medium"
    return "normal"
  }

  if (direction === "low") {
    if (value <= critical) return "critical"
    if (value <= warning) return "high"
    if (value <= warning + (warning - critical) * 0.3) return "medium"
    return "normal"
  }

  return "normal"
}

function getWorstSeverity(faults: SimulationData["faultPredictions"] = []): Severity {
  const priority: Severity[] = ["critical", "high", "medium", "low", "normal"]
  const found = faults.reduce<Severity>((acc, fault) => {
    const currentIndex = priority.indexOf(acc)
    const candidate = fault.severity as Severity
    const candidateIndex = priority.indexOf(candidate)
    return candidateIndex < currentIndex ? candidate : acc
  }, "normal")
  return found
}

function downloadBlob(filename: string, data: string, type: string) {
  const blob = new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

async function downloadPdfReport(simulation: SimulationData) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text("Simulation Analysis Report", 14, 20)
  doc.setFontSize(10)
  // deriveOverallHealth already returns inverted score
  const overallHealth = deriveOverallHealth(simulation)

  const summary = [
    `Component: ${COMPONENT_LABELS[simulation.componentType]}`,
    `Asset: ${simulation.assetMetadata?.assetName ?? simulation.assetMetadata?.assetId ?? "N/A"}`,
    `Substation: ${simulation.assetMetadata?.substationName ?? simulation.substationId}`,
    `Run at: ${format(new Date(simulation.timestamp), "PPpp")}`,
    `Overall Health: ${overallHealth.toFixed(1)}%`,
  ]

  summary.forEach((text, idx) => doc.text(text, 14, 30 + idx * 6))
  doc.text("Diagnosis Snapshot:", 14, 70)
  doc.text(doc.splitTextToSize(simulation.diagnosis ?? "N/A", 180) as string[], 14, 78)
  doc.text("Faults:", 14, 120)

  simulation.faultPredictions?.slice(0, 5).forEach((fault, idx) => {
    doc.text(
      `${fault.type} (${fault.severity}) – ${(fault.probability * 100).toFixed(0)}%`,
      14,
      130 + idx * 6,
    )
  })

  doc.save(`simulation-${simulation.id}.pdf`)
}

function createCsvFromTimeline(simulation: SimulationData) {
  const headers = new Set<string>()
  simulation.timeline?.forEach((step) => {
    Object.keys(step.state).forEach((key) => headers.add(key))
  })
  const headerArray = ["time", "healthScore", ...Array.from(headers)]
  const rows = simulation.timeline?.map((step) => {
    const row: Array<string | number> = [step.time, step.healthScore]
    headerArray.slice(2).forEach((key) => {
      row.push(step.state[key] ?? "")
    })
    return row
  })
  return [headerArray.join(","), ...(rows ?? []).map((row) => row.join(","))].join("\n")
}

function getHealthColor(score: number) {
  if (score >= 80) return "text-emerald-600"
  if (score >= 60) return "text-yellow-600"
  if (score >= 40) return "text-orange-600"
  return "text-red-600"
}

const clampHealth = (value: number) => Math.min(100, Math.max(0, value))
const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

// Note: Removed invertHealthScore function - now using actual values from backend
// Backend ML models output health scores directly (higher = better health)
// All scores are now displayed as-is without any inversion

const formatMetricValue = (value: number | string | undefined) => {
  if (typeof value === "number") {
    if (Math.abs(value) >= 1000) return value.toFixed(0)
    if (Math.abs(value) >= 100) return value.toFixed(1)
    return value.toFixed(2)
  }
  if (value === null || value === undefined) return "-"
  return String(value)
}

const getLatestState = (simulation?: SimulationData | null) => {
  if (!simulation) return {}
  const finalState = simulation.finalState ?? {}
  if (Object.keys(finalState).length > 0) {
    return finalState
  }
  const timelineState = simulation.timeline?.[simulation.timeline.length - 1]?.state
  if (timelineState && Object.keys(timelineState).length > 0) {
    return timelineState
  }
  return simulation.inputValues ?? {}
}

function deriveOverallHealth(simulation?: SimulationData | null) {
  if (!simulation) return 0
  // Only trust ML-provided overallHealth/trueHealth. Do not synthesize scores
  // from local simulation heuristics when ML is unavailable.
  const overall =
    typeof simulation.overallHealth === "number"
      ? simulation.overallHealth
      : typeof simulation.trueHealth === "number"
        ? simulation.trueHealth
        : undefined

  if (typeof overall === "number" && Number.isFinite(overall)) {
    const normalized = overall <= 1 ? overall * 100 : overall
    // Use actual value from ML - no inversion needed
    return clampHealth(normalized)
  }

  return 0
}

const useVideoControls = () => {
  const MAX_RUNTIME_SECONDS = 15
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    
    const handleLoaded = () => {
      const clippedDuration =
        video.duration && Number.isFinite(video.duration)
          ? Math.min(video.duration, MAX_RUNTIME_SECONDS)
          : MAX_RUNTIME_SECONDS
      setDuration(clippedDuration)
      console.log("[VideoControls] Video loaded, duration:", clippedDuration)
    }
    
    const handleTime = () => {
      const safeTime = Math.min(video.currentTime || 0, MAX_RUNTIME_SECONDS)
      if (safeTime >= MAX_RUNTIME_SECONDS) {
        video.pause()
        video.currentTime = 0 // Reset to beginning instead of staying at end
        setIsPlaying(false)
        setCurrentTime(0)
      } else {
        setCurrentTime(safeTime)
      }
    }
    
    const handleEnded = () => {
      // Reset video to beginning when it ends
      video.currentTime = 0
      setIsPlaying(false)
      setCurrentTime(0)
    }
    
    const handleCanPlay = () => {
      // Fallback: if duration is still not set after canplay, use MAX_RUNTIME_SECONDS
      if (!duration || duration === 0) {
        console.log("[VideoControls] Using fallback duration:", MAX_RUNTIME_SECONDS)
        setDuration(MAX_RUNTIME_SECONDS)
      }
    }
    
    const handleLoadStart = () => {
      console.log("[VideoControls] Video load started")
      // Reset states when video starts loading
      setCurrentTime(0)
      setIsPlaying(false)
    }
    
    video.addEventListener("loadedmetadata", handleLoaded)
    video.addEventListener("timeupdate", handleTime)
    video.addEventListener("canplay", handleCanPlay)
    video.addEventListener("loadstart", handleLoadStart)
    video.addEventListener("ended", handleEnded)
    
    // Initial check if video is already loaded
    if (video.readyState >= 1) {
      handleLoaded()
    }
    
    return () => {
      video.removeEventListener("loadedmetadata", handleLoaded)
      video.removeEventListener("timeupdate", handleTime)
      video.removeEventListener("canplay", handleCanPlay)
      video.removeEventListener("loadstart", handleLoadStart)
      video.removeEventListener("ended", handleEnded)
    }
  }, [duration])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) {
      video.pause()
      setIsPlaying(false)
      return
    }
    // If video is at the end, reset to beginning before playing
    if (video.currentTime >= MAX_RUNTIME_SECONDS) {
      video.currentTime = 0
      setCurrentTime(0)
    }
    video.play()
    setIsPlaying(true)
  }

  const updateTime = (value: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = value
    setCurrentTime(value)
  }

  const changeSpeed = (value: number) => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = value
    setPlaybackRate(value)
  }

  return {
    videoRef,
    isPlaying,
    duration,
    currentTime,
    playbackRate,
    togglePlay,
    updateTime,
    changeSpeed,
  }
}

const deriveVideoSources = (src: string) => {
  const trimmed = (src ?? "").trim()
  if (!trimmed) {
    return []
  }
  try {
    const [base] = trimmed.split("?")
    const normalized = base?.toLowerCase() ?? ""
    if (normalized.endsWith(".mp4")) {
      return [{ src: trimmed, type: "video/mp4" }]
    }
    if (normalized.endsWith(".webm")) {
      return [{ src: trimmed, type: "video/webm" }]
    }
  } catch {
    // Fallback to dual sources below
  }
  return [
    { src: trimmed, type: "video/webm" },
    { src: trimmed, type: "video/mp4" },
  ]
}

const downloadVideo = async (videoUrl: string | undefined, filename: string) => {
  if (!videoUrl) {
    console.warn("No video URL provided for download")
    return
  }

  try {
    console.log("[VideoDownload] Starting download:", videoUrl)
    
    // Fetch the video blob
    const response = await fetch(videoUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`)
    }
    
    const blob = await response.blob()
    
    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    
    // Trigger download
    document.body.appendChild(link)
    link.click()
    
    // Cleanup
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    console.log("[VideoDownload] Download completed:", filename)
  } catch (error) {
    console.error("[VideoDownload] Download failed:", error)
    // You could add a toast notification here
  }
}

function useCorrelationInsights(simulation: SimulationData | null) {
  return useMemo(() => {
    if (!simulation) return []
    const component = simulation.componentType
    const pairs = CORRELATION_BLUEPRINT[component] || []
    const timeline = simulation.timeline || []
    const insights: Array<{ label: string; description: string; value: number }> = []

    const pearson = (seriesA: number[], seriesB: number[]) => {
      if (!seriesA.length || !seriesB.length) return 0
      const meanA = seriesA.reduce((sum, val) => sum + val, 0) / seriesA.length
      const meanB = seriesB.reduce((sum, val) => sum + val, 0) / seriesB.length
      const numerator = seriesA.reduce(
        (sum, val, idx) => sum + (val - meanA) * (seriesB[idx] - meanB),
        0,
      )
      const denomA = Math.sqrt(seriesA.reduce((sum, val) => sum + (val - meanA) ** 2, 0))
      const denomB = Math.sqrt(seriesB.reduce((sum, val) => sum + (val - meanB) ** 2, 0))
      if (denomA === 0 || denomB === 0) return 0
      return numerator / (denomA * denomB)
    }

    // Prefer ML-provided correlation heads when available so the UI
    // reflects true model outputs instead of synthetic values.
    const mlInsights: Array<{ label: string; description: string; value: number }> = []

    if (component === "transformer") {
      const mlCorrMap: Record<string, number | undefined> = {
        loadHotspot: simulation.corr_load_hotspot_strength,
        moistureDielectric: simulation.corr_moisture_dielectric_strength,
        gasHotspot: simulation.corr_gas_hotspot_strength,
      }

      pairs.forEach((pair) => {
        let key: keyof typeof mlCorrMap | null = null
        if (pair.label.includes("Load vs Hotspot")) key = "loadHotspot"
        else if (pair.label.includes("Moisture vs Dielectric")) key = "moistureDielectric"
        else if (pair.label.includes("Gas vs Hotspot")) key = "gasHotspot"

        if (key) {
          const raw = mlCorrMap[key]
          if (typeof raw === "number" && Number.isFinite(raw)) {
            mlInsights.push({
              label: pair.label,
              description: pair.description,
              value: raw,
            })
          }
        }
      })
    } else if (component === "bayLines") {
      const mlCorrMap: Record<string, number | undefined> = {
        pfLineHeating: simulation.corr_pf_lineheating_strength,
        thdStress: simulation.corr_thd_stress_strength,
      }

      pairs.forEach((pair) => {
        let key: keyof typeof mlCorrMap | null = null
        if (pair.label.includes("PF vs Line Heating")) key = "pfLineHeating"
        else if (pair.label.includes("THD vs Stress")) key = "thdStress"

        if (key) {
          const raw = mlCorrMap[key]
          if (typeof raw === "number" && Number.isFinite(raw)) {
            mlInsights.push({
              label: pair.label,
              description: pair.description,
              value: raw,
            })
          }
        }
      })
    } else if (component === "busbar") {
      const mlCorrMap: Record<string, number | undefined> = {
        tempResistance: simulation.corr_temp_resistance_strength,
        loadJointTemp: simulation.corr_load_jointtemp_strength,
      }

      pairs.forEach((pair) => {
        let key: keyof typeof mlCorrMap | null = null
        if (pair.label.includes("Temp vs Resistance")) key = "tempResistance"
        else if (pair.label.includes("Load vs Joint Temp")) key = "loadJointTemp"

        if (key) {
          const raw = mlCorrMap[key]
          if (typeof raw === "number" && Number.isFinite(raw)) {
            mlInsights.push({
              label: pair.label,
              description: pair.description,
              value: raw,
            })
          }
        }
      })
    } else if (component === "isolator") {
      const mlCorrMap: Record<string, number | undefined> = {
        torqueContact: simulation.corr_torque_contact_strength,
      }

      pairs.forEach((pair) => {
        let key: keyof typeof mlCorrMap | null = null
        if (pair.label.includes("Torque vs Contact")) key = "torqueContact"

        if (key) {
          const raw = mlCorrMap[key]
          if (typeof raw === "number" && Number.isFinite(raw)) {
            mlInsights.push({
              label: pair.label,
              description: pair.description,
              value: raw,
            })
          }
        }
      })
    } else if (component === "circuitBreaker") {
      const mlCorrMap: Record<string, number | undefined> = {
        sf6Temp: simulation.corr_sf6_temperature_strength,
        operationsWear: simulation.corr_operations_wear_strength,
      }

      pairs.forEach((pair) => {
        let key: keyof typeof mlCorrMap | null = null
        if (pair.label.includes("SF6 vs Temperature")) key = "sf6Temp"
        else if (pair.label.includes("Operations vs Wear")) key = "operationsWear"

        if (key) {
          const raw = mlCorrMap[key]
          if (typeof raw === "number" && Number.isFinite(raw)) {
            mlInsights.push({
              label: pair.label,
              description: pair.description,
              value: raw,
            })
          }
        }
      })
    }

    if (mlInsights.length > 0) {
      return mlInsights.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 4)
    }

    // Fallback: derive correlations directly from the local timeline.
    pairs.forEach((pair) => {
      const aSeries: number[] = []
      const bSeries: number[] = []
      timeline.forEach((step) => {
        const a = toNumber(step.state[pair.a])
        const b = toNumber(step.state[pair.b])
        if (Number.isFinite(a) && Number.isFinite(b)) {
          aSeries.push(a)
          bSeries.push(b)
        }
      })
      if (aSeries.length > 2) {
        insights.push({
          label: pair.label,
          description: pair.description,
          value: pearson(aSeries, bSeries),
        })
      }
    })

    return insights.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 4)
  }, [simulation])
}

function generateTrendPrediction(simulation: SimulationData | null, overallOverride?: number) {
  if (!simulation) return []
  const overall = (typeof overallOverride === "number" ? overallOverride : deriveOverallHealth(simulation)) || 0

  // Prefer ML model horizon probabilities if present on the document
  const ml = simulation as any
  const raw30 = ml?.prob_30days as number | undefined
  const raw90 = ml?.prob_90days as number | undefined
  const raw180 = ml?.prob_180days as number | undefined

  const normalizeProb = (value: number | undefined): number | undefined => {
    if (typeof value !== "number" || !Number.isFinite(value)) return undefined
    // Models may output either 0–1 or 0–100
    if (value <= 1) return clamp01(value) * 100
    return clampHealth(value)
  }

  const p30 = normalizeProb(raw30)
  const p90 = normalizeProb(raw90)
  const p180 = normalizeProb(raw180)

  // If we have at least one ML probability, derive the trend purely from ML outputs
  if (p30 !== undefined || p90 !== undefined || p180 !== undefined) {
    const map: Record<number, number | undefined> = {
      30: p30,
      90: p90,
      180: p180,
    }

    return TREND_WINDOWS.map((days) => {
      const prob = map[days]
      const effectiveProb = typeof prob === "number" ? clampHealth(prob) : undefined
      // Higher probability of failure → stronger health drop
      const degradation = effectiveProb !== undefined ? effectiveProb / 120 : 0 // 0–~0.8
      const projected = Math.max(5, Math.min(100, overall * (1 - degradation)))

      return {
        horizon: `${days} days`,
        projected: Math.round(projected * 10) / 10,
        severity: projected >= 70 ? "low" : projected >= 50 ? "medium" : "high",
      }
    })
  }

  // No ML probabilities → no trend prediction instead of synthetic values
  return []
}

function interpolateTimelineState(simulation: SimulationData | null, playbackProgress: number) {
  if (!simulation?.timeline?.length) return null
  const timeline = simulation.timeline
  const first = timeline[0]
  const last = timeline[timeline.length - 1]
  const firstTime = toNumber(first.time, 0)
  const lastTime = toNumber(last.time, firstTime)
  const span = Math.max(0, lastTime - firstTime)
  if (span === 0) {
    return { ...last.state }
  }

  const target = firstTime + clamp01(playbackProgress) * span
  let previous = first
  let next = last
  for (let i = 0; i < timeline.length; i += 1) {
    const step = timeline[i]
    const stepTime = toNumber(step.time, firstTime)
    if (stepTime <= target) {
      previous = step
    }
    if (stepTime >= target) {
      next = step
      break
    }
  }

  const prevTime = toNumber(previous.time, firstTime)
  const nextTime = toNumber(next.time, prevTime)
  const denom = nextTime - prevTime || 1
  const ratio = clamp01((target - prevTime) / denom)
  const interpolated: Record<string, number | string> = {}
  const keys = new Set([...Object.keys(previous.state ?? {}), ...Object.keys(next.state ?? {})])
  keys.forEach((key) => {
    const prevVal = previous.state?.[key]
    const nextVal = next.state?.[key]
    if (typeof prevVal === "number" && typeof nextVal === "number") {
      interpolated[key] = prevVal + (nextVal - prevVal) * ratio
    } else {
      interpolated[key] = ratio < 0.5 ? (prevVal ?? nextVal) : (nextVal ?? prevVal)
    }
  })
  return interpolated
}

function computeRiskScore(simulation: SimulationData | null, overallOverride?: number) {
  if (!simulation) return { riskScore: 0, shortTerm: 0, mediumTerm: 0, longTerm: 0 }
  const health = (typeof overallOverride === "number" ? overallOverride : deriveOverallHealth(simulation)) || 0
  const ml = simulation as any

  // Prefer ML risk score and horizon probabilities if provided by backend models
  const rawRisk = ml?.riskScore as number | undefined
  const masterFailureProb = ml?.masterFailureProbability as number | undefined
  const raw30 = ml?.prob_30days as number | undefined
  const raw90 = ml?.prob_90days as number | undefined
  const raw180 = ml?.prob_180days as number | undefined

  const normalizeProb = (value: number | undefined): number | undefined => {
    if (typeof value !== "number" || !Number.isFinite(value)) return undefined
    if (value <= 1) return clamp01(value) * 100
    return clampHealth(value)
  }

  const p30 = normalizeProb(raw30)
  const p90 = normalizeProb(raw90)
  const p180 = normalizeProb(raw180)

  if (
    (typeof rawRisk === "number" && Number.isFinite(rawRisk)) ||
    p30 !== undefined ||
    p90 !== undefined ||
    p180 !== undefined ||
    (typeof masterFailureProb === "number" && Number.isFinite(masterFailureProb))
  ) {
    // riskScore from ML is assumed 0–10; if it looks like 0–100 we normalise
    let riskScore = typeof rawRisk === "number" && Number.isFinite(rawRisk) ? rawRisk : 0
    if (riskScore > 10) {
      riskScore = riskScore / 10
    }

    const fallbackFromMaster =
      typeof masterFailureProb === "number" && Number.isFinite(masterFailureProb)
        ? clamp01(masterFailureProb) * 10
        : undefined

    if (riskScore <= 0 && fallbackFromMaster !== undefined) {
      riskScore = fallbackFromMaster
    }

    const shortTerm = p30 ?? clampHealth((riskScore / 10) * 70 + (100 - health) * 0.4)
    const mediumTerm = p90 ?? clampHealth((riskScore / 10) * 80 + (100 - health) * 0.5)
    const longTerm = p180 ?? clampHealth((riskScore / 10) * 90 + (100 - health) * 0.6)

    return {
      riskScore: Number(Math.max(0, Math.min(10, riskScore)).toFixed(1)),
      shortTerm,
      mediumTerm,
      longTerm,
    }
  }

  return {
    riskScore: 0,
    shortTerm: 0,
    mediumTerm: 0,
    longTerm: 0,
  }
}

function computeRul(simulation: SimulationData | null, overallOverride?: number) {
  if (!simulation) return { optimistic: 0, conservative: 0 }
  const ml = simulation as any
  const rawOpt = ml?.rul_optimistic_months as number | undefined
  const rawCons = ml?.rul_conservative_months as number | undefined

  // Prefer direct ML RUL outputs when present
  if (
    (typeof rawOpt === "number" && Number.isFinite(rawOpt) && rawOpt > 0) ||
    (typeof rawCons === "number" && Number.isFinite(rawCons) && rawCons > 0)
  ) {
    const optimistic = typeof rawOpt === "number" && Number.isFinite(rawOpt) && rawOpt > 0 ? rawOpt : rawCons! * 1.3
    const conservative =
      typeof rawCons === "number" && Number.isFinite(rawCons) && rawCons > 0 ? rawCons : optimistic * 0.7

    return {
      optimistic: Math.round(Math.max(1, optimistic)),
      conservative: Math.round(Math.max(1, conservative)),
    }
  }

  // Fallback: legacy heuristic if ML RUL is not available
  return { 
    optimistic: 0, 
    conservative: 0 
  }
}

function ManualSimulationList({
  simulations,
  filterComponent,
  setFilterComponent,
  filterSeverity,
  setFilterSeverity,
  onSelect,
  onGoToSolution,
  selectedId,
}: {
  simulations: SimulationData[]
  filterComponent: string
  setFilterComponent: (value: string) => void
  filterSeverity: string
  setFilterSeverity: (value: string) => void
  onSelect: (simulation: SimulationData) => void
  onGoToSolution: (simulation: SimulationData) => void
  selectedId?: string | null
}) {
  const filtered = simulations.filter((sim) => {
    if (filterComponent !== "all" && sim.componentType !== filterComponent) return false
    if (filterSeverity !== "all") {
      const match = sim.faultPredictions?.some(
        (fault) => fault.severity.toLowerCase() === filterSeverity.toLowerCase(),
      )
      return match
    }
    return true
  })

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="whitespace-nowrap">Recent Simulations (Last {RECENT_LIMIT})</CardTitle>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">Component</span>
              <Select value={filterComponent} onValueChange={setFilterComponent}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {Object.entries(COMPONENT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">Severity</span>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden px-0">
        <ScrollArea className="h-full pr-2">
          <div className="space-y-3 px-4 pb-4">
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No simulations match the filters</p>
            )}
            {filtered.map((sim) => {
              const worst = getWorstSeverity(sim.faultPredictions)
              const derivedHealth = deriveOverallHealth(sim)
              const hasHealthData =
                (sim.healthScores && Object.keys(sim.healthScores).length > 0) || (sim.timeline?.length ?? 0) > 0
              const healthLabel = hasHealthData ? `${derivedHealth.toFixed(0)}%` : "—"
              return (
                <div
                  key={sim.id}
                  className={cn(
                    "rounded-xl border p-4 transition hover:border-primary/40 cursor-pointer bg-background",
                    selectedId === sim.id && "border-primary shadow-sm",
                  )}
                  onClick={() => onSelect(sim)}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold tracking-tight">
                          {COMPONENT_LABELS[sim.componentType]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(sim.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={SEVERITY_THEME[worst].pill}>
                          {worst.toUpperCase()}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation()
                            onGoToSolution(sim)
                          }}
                          aria-label="View solution recommendations"
                        >
                          <Lightbulb className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={getHealthColor(derivedHealth)}>
                        {healthLabel === "—" ? "Health —" : `Health ${healthLabel}`}
                      </span>
                      <span className="text-muted-foreground">
                        {sim.faultPredictions?.length ?? 0} predicted faults
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}


export function SimulationDetail({
  simulation,
  onGoToSolution,
  onDelete,
  showPlayback = true,
}: {
  simulation: SimulationData
  onGoToSolution: () => void
  onDelete: () => void
  showPlayback?: boolean
}) {
  const componentType = simulation.componentType
  const stressPercent = useMemo(() => {
    if (typeof simulation.stressScore !== "number") return null
    const raw = simulation.stressScore <= 1 ? simulation.stressScore * 100 : simulation.stressScore
    // For transformer model viewer: subtract from 40, for other equipment: show exact value
    if (componentType === "transformer") {
      return clampHealth(40 - raw)
    }
    // Show exact value from backend for other equipment
    return clampHealth(raw)
  }, [simulation.stressScore, componentType])
  const agingPercent = useMemo(() => {
    if (typeof simulation.agingFactor !== "number") return null
    const raw = simulation.agingFactor <= 1 ? simulation.agingFactor * 100 : simulation.agingFactor
    // Show exact value from backend
    return clampHealth(raw)
  }, [simulation.agingFactor])
  const faultProbabilityPercent = useMemo(() => {
    if (typeof simulation.faultProbability !== "number") return null
    const raw = simulation.faultProbability <= 1 ? simulation.faultProbability * 100 : simulation.faultProbability
    // Show exact value from backend
    return clampHealth(raw)
  }, [simulation.faultProbability])
  const blueprint = COMPONENT_HEALTH_BLUEPRINT[componentType] ?? []
  const correlations = useCorrelationInsights(simulation)
  const latestState = useMemo(() => getLatestState(simulation), [simulation])
  const initialState = useMemo(() => {
    if (simulation.timeline?.length) {
      return simulation.timeline[0]?.state ?? simulation.inputValues ?? latestState
    }
    if (simulation.inputValues && Object.keys(simulation.inputValues).length > 0) {
      return simulation.inputValues
    }
    return latestState
  }, [simulation.timeline, simulation.inputValues, latestState])
  const storedHealthScores = simulation.healthScores
  const healthScores = useMemo(() => {
    const computed =
      Object.keys(latestState).length > 0 ? calculateAllHealthScores(componentType, latestState) : {}
    const resolved: Record<string, number> = { ...computed }
    // Transformer uses 130, other components use 110
    const subtractValue = componentType === "transformer" ? 130 : 110
    
    if (storedHealthScores) {
      Object.entries(storedHealthScores).forEach(([key, value]) => {
        if (typeof value === "number" && value > 0) {
          // Subtract from subtractValue for display (other than Stress Score, Fault Probability, Aging Factor)
          resolved[key] = clampHealth(subtractValue - value)
        }
      })
    }
    if (simulation.detailedScores) {
      Object.entries(simulation.detailedScores).forEach(([key, value]) => {
        if (typeof value === "number" && value >= 0) {
          const normalized = value <= 1 ? value * 100 : value
          // Subtract from subtractValue for display (other than Stress Score, Fault Probability, Aging Factor)
          resolved[key] = clampHealth(subtractValue - normalized)
        }
      })
    }
    // Subtract from subtractValue for computed scores
    Object.keys(resolved).forEach((key) => {
      resolved[key] = clampHealth(subtractValue - resolved[key])
    })
    return resolved
  }, [componentType, latestState, storedHealthScores, simulation.detailedScores])
  const overallHealth = useMemo(() => {
    // Overall / true health should only come from ML predictors (or legacy
    // stored ML fields on the document). 
    // The stored value is already inverted (110 - actual or 130 - actual), so we use it directly
    const raw = deriveOverallHealth(simulation)
    // Transformer uses 130, other components use 110
    // Since the stored value is already inverted, we just use it as-is
    return clampHealth(raw)
  }, [simulation, componentType])
  const trend = useMemo(() => generateTrendPrediction(simulation, overallHealth), [simulation, overallHealth])
  const risk = useMemo(() => computeRiskScore(simulation, overallHealth), [simulation, overallHealth])
  const rul = useMemo(() => computeRul(simulation, overallHealth), [simulation, overallHealth])
  const videoControls = useVideoControls()
  const rates = [0.5, 1, 1.5, 2]
  const [selectedMetricKey, setSelectedMetricKey] = useState<string | null>(null)
  const [hasDismissedMetric, setHasDismissedMetric] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [syntheticTime, setSyntheticTime] = useState(0)
  const [isModelPlaying, setIsModelPlaying] = useState(false)
  
  // Fixed 15 seconds duration for simulation playback
  const SIMULATION_DURATION = 15
  
  // Use video time if available, otherwise use simulation duration
  const currentPlaybackTime = videoControls.currentTime || 0
  const playbackDuration = videoControls.duration > 0 ? videoControls.duration : SIMULATION_DURATION
  const fallbackPlaybackSrc = COMPONENT_VIDEO_LIBRARY[componentType]
  const [videoSource, setVideoSource] = useState<string>(fallbackPlaybackSrc)
  const [hasCustomVideo, setHasCustomVideo] = useState(false)
  const videoSources = useMemo(() => deriveVideoSources(videoSource), [videoSource])
  const shouldUseModelViewer = videoSources.length === 0 || videoError
  const effectiveDuration = shouldUseModelViewer ? SIMULATION_DURATION : playbackDuration
  const effectiveCurrentTime = shouldUseModelViewer ? syntheticTime : currentPlaybackTime
  const playbackProgress = effectiveDuration > 0 ? effectiveCurrentTime / effectiveDuration : 0
  const videoRotationStyle = useMemo<CSSProperties>(() => {
    const clamped = clamp01(playbackProgress)
    const angle = clamped * 60 // slow rotation towards final view
    return {
      transform: `perspective(1400px) rotateX(2deg) rotateY(${angle}deg)`,
      transition: "transform 0.25s linear",
      transformOrigin: "center",
      transformStyle: "preserve-3d",
    }
  }, [playbackProgress])
  useEffect(() => {
    if (!shouldUseModelViewer) {
      setIsModelPlaying(false)
      setSyntheticTime(0)
      return
    }
    if (!isModelPlaying) return
    const interval = window.setInterval(() => {
      setSyntheticTime((prev) => {
        const next = prev + 0.05
        if (next >= SIMULATION_DURATION) {
          window.clearInterval(interval)
          setIsModelPlaying(false)
          // Reset to beginning after completion
          setTimeout(() => setSyntheticTime(0), 100)
          return SIMULATION_DURATION
        }
        return next
      })
    }, 50)
    return () => window.clearInterval(interval)
  }, [isModelPlaying, shouldUseModelViewer])
  const metricSeries = useMemo(() => {
    const series: Record<string, Array<{ time: number; value: number }>> = {}
    if (simulation.timeline?.length) {
      simulation.timeline.forEach((step) => {
        const scores = calculateAllHealthScores(componentType, step.state)
        Object.entries(scores).forEach(([key, value]) => {
          if (!series[key]) {
            series[key] = []
          }
          // Use actual health scores for timeline visualization
          series[key].push({ time: step.time, value: clampHealth(value) })
        })
        
        // Add new parameter metrics to timeline (use actual values)
        if (typeof step.trueHealth === "number") {
          if (!series.trueHealth) series.trueHealth = []
          const normalized = step.trueHealth <= 1 ? step.trueHealth * 100 : step.trueHealth
          series.trueHealth.push({ time: step.time, value: clampHealth(normalized) })
        }
        if (typeof step.stressScore === "number") {
          if (!series.stressScore) series.stressScore = []
          const normalized = step.stressScore <= 1 ? step.stressScore * 100 : step.stressScore
          // Display as (100 - value) to show remaining health
          series.stressScore.push({ time: step.time, value: clampHealth(100 - normalized) })
        }
        if (typeof step.faultProbability === "number") {
          if (!series.faultProbability) series.faultProbability = []
          const normalized = step.faultProbability <= 1 ? step.faultProbability * 100 : step.faultProbability
          // Display as (100 - value) to show remaining health
          series.faultProbability.push({ time: step.time, value: clampHealth(100 - normalized) })
        }
        if (typeof step.agingFactor === "number") {
          if (!series.agingFactor) series.agingFactor = []
          const normalized = step.agingFactor <= 1 ? step.agingFactor * 100 : step.agingFactor
          // Display as (100 - value) to show remaining health
          series.agingFactor.push({ time: step.time, value: clampHealth(100 - normalized) })
        }
      })
    } else {
      Object.entries(healthScores).forEach(([key, value]) => {
        if (typeof value === "number") {
          // healthScores are already inverted in the useMemo above
          series[key] = [{ time: 0, value }]
        }
      })
      
      // Add static values for new parameters if available (use actual values)
      if (typeof simulation.overallHealth === "number") {
        const normalized = simulation.overallHealth <= 1 ? simulation.overallHealth * 100 : simulation.overallHealth
        series.trueHealth = [{ time: 0, value: clampHealth(normalized) }]
      }
      if (typeof simulation.stressScore === "number") {
        const stressValue = simulation.stressScore <= 1 ? simulation.stressScore * 100 : simulation.stressScore
        // Display as (100 - value) to show remaining health
        series.stressScore = [{ time: 0, value: clampHealth(100 - stressValue) }]
      }
      if (typeof simulation.faultProbability === "number") {
        const faultValue = simulation.faultProbability <= 1 ? simulation.faultProbability * 100 : simulation.faultProbability
        // Display as (100 - value) to show remaining health
        series.faultProbability = [{ time: 0, value: clampHealth(100 - faultValue) }]
      }
      if (typeof simulation.agingFactor === "number") {
        const agingValue = simulation.agingFactor <= 1 ? simulation.agingFactor * 100 : simulation.agingFactor
        // Display as (100 - value) to show remaining health
        series.agingFactor = [{ time: 0, value: clampHealth(100 - agingValue) }]
      }
    }
    return series
  }, [componentType, healthScores, simulation.timeline, simulation.overallHealth, simulation.stressScore, simulation.faultProbability, simulation.agingFactor])
  const playbackState = useMemo(() => {
    if (!simulation.timeline?.length) {
      return latestState
    }
    const progress = playbackDuration > 0 ? videoControls.currentTime / playbackDuration : 0
    return interpolateTimelineState(simulation, progress) ?? latestState
  }, [simulation, latestState, playbackDuration, videoControls.currentTime])
  const playbackParameters = useMemo(() => {
    const thresholds = PARAMETER_THRESHOLDS[componentType] ?? {}
    const state = playbackState ?? latestState
    const keys = Object.keys(thresholds)
    if (!keys.length) return []
    return keys
      .map((key) => {
        const current = toNumber(state?.[key], NaN)
        const start = toNumber(initialState?.[key], NaN)
        const target = toNumber(latestState?.[key], NaN)
        if (!Number.isFinite(current) || !Number.isFinite(start) || !Number.isFinite(target)) {
          return null
        }
        const delta = target - start
        const progress =
          delta === 0 ? 100 : Math.round(clamp01((current - start) / (delta || 1)) * 100)
        const trend = delta === 0 ? "stable" : delta > 0 ? "up" : "down"
        return {
          key,
          label: formatKey(key),
          unit: thresholds[key].unit,
          current,
          start,
          target,
          progress,
          trend,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => Math.abs(b.target - b.start) - Math.abs(a.target - a.start))
      .slice(0, 8)
  }, [componentType, playbackState, latestState, initialState])
  const modelViewerHudMetrics = useMemo(() => {
    // Get final values from simulation
    // overallHealth/trueHealth are stored inverted (110 or 130 - value), so we use it directly
    const rawOverall = deriveOverallHealth(simulation)
    // The stored value is already inverted, so we use it directly as the final True Health
    const finalTrueHealth = rawOverall > 0 ? rawOverall : 100 // If no value, default to 100
    // For transformer: Stress Score is subtracted from 40, for other equipment: exact value
    const finalStress = componentType === "transformer" 
      ? (stressPercent !== null ? stressPercent : 0) // Already subtracted from 40 in stressPercent
      : (stressPercent ?? 0)
    const finalFault = faultProbabilityPercent ?? 0
    const finalAging = agingPercent ?? 0
    
    // Interpolate from start values to final values based on playback progress
    const progress = clamp01(playbackProgress)
    
    // True Health: starts at 100, reduces to final value (which is already inverted)
    const startTrueHealth = 100
    const animatedTrueHealth = startTrueHealth + (finalTrueHealth - startTrueHealth) * progress
    
    // For transformer: correctly animate to final values (can increase or decrease)
    // For other components: Stress Score, Fault Probability, Aging Factor start at 0, increase to final value
    let animatedStress, animatedFault, animatedAging
    
    if (componentType === "transformer") {
      // Transformer: Stress Score starts at 0, increases to final value (which is 40 - actual)
      // For transformer, Stress Score final value is already (40 - actual), so we animate from 0 to that
      animatedStress = 0 + (finalStress - 0) * progress
      animatedFault = 0 + (finalFault - 0) * progress
      animatedAging = 0 + (finalAging - 0) * progress
    } else {
      // Other components: same logic
      animatedStress = 0 + (finalStress - 0) * progress
      animatedFault = 0 + (finalFault - 0) * progress
      animatedAging = 0 + (finalAging - 0) * progress
    }
    
    return {
      overall: clampHealth(animatedTrueHealth),
      stress: clampHealth(animatedStress),
      fault: clampHealth(animatedFault),
      aging: clampHealth(animatedAging),
    }
  }, [
    playbackProgress,
    simulation,
    componentType,
    stressPercent,
    faultProbabilityPercent,
    agingPercent,
  ])
  const modelViewerTimelineSnapshot = useMemo(() => {
    // Get final values from simulation
    // overallHealth/trueHealth are stored inverted (110 or 130 - value), so we use it directly
    const rawOverall = deriveOverallHealth(simulation)
    // The stored value is already inverted, so we use it directly as the final True Health
    const finalTrueHealth = rawOverall > 0 ? rawOverall : 100 // If no value, default to 100
    // For transformer: Stress Score is subtracted from 40, for other equipment: exact value
    const finalStress = componentType === "transformer" 
      ? (stressPercent !== null ? stressPercent : 0) // Already subtracted from 40 in stressPercent
      : (stressPercent ?? 0)
    const finalFault = faultProbabilityPercent ?? 0
    const finalAging = agingPercent ?? 0
    
    // Interpolate from start values to final values based on playback progress
    const progress = clamp01(playbackProgress)
    
    // True Health: starts at 100, reduces to final value (which is already inverted)
    const startTrueHealth = 100
    const animatedTrueHealth = startTrueHealth + (finalTrueHealth - startTrueHealth) * progress
    
    // For transformer: correctly animate to final values (can increase or decrease)
    // For other components: Stress Score, Fault Probability, Aging Factor start at 0, increase to final value
    let animatedStress, animatedFault, animatedAging
    
    if (componentType === "transformer") {
      // Transformer: Stress Score starts at 0, increases to final value (which is 40 - actual)
      // For transformer, Stress Score final value is already (40 - actual), so we animate from 0 to that
      animatedStress = 0 + (finalStress - 0) * progress
      animatedFault = 0 + (finalFault - 0) * progress
      animatedAging = 0 + (finalAging - 0) * progress
    } else {
      // Other components: same logic
      animatedStress = 0 + (finalStress - 0) * progress
      animatedFault = 0 + (finalFault - 0) * progress
      animatedAging = 0 + (finalAging - 0) * progress
    }
    
    return {
      trueHealth: clampHealth(animatedTrueHealth),
      stressScore: clampHealth(animatedStress),
      faultProbability: clampHealth(animatedFault),
      agingFactor: clampHealth(animatedAging),
    }
  }, [playbackProgress, simulation, componentType, stressPercent, faultProbabilityPercent, agingPercent])

  const activeMetric = useMemo(
    () => blueprint.find((metric) => metric.key === selectedMetricKey) ?? null,
    [blueprint, selectedMetricKey],
  )
  const activeSeries = useMemo(
    () => (selectedMetricKey ? metricSeries[selectedMetricKey] ?? [] : []),
    [metricSeries, selectedMetricKey],
  )

  useEffect(() => {
    const trimmed = typeof simulation.videoUrl === "string" ? simulation.videoUrl.trim() : ""
    const hasAnyCustomVideo = trimmed.length > 0
    const isHttpUrl = /^https?:\/\//i.test(trimmed)
    console.log("[Analysis] Resolving video source", {
      simulationId: simulation.id,
      rawVideoUrl: simulation.videoUrl,
      trimmed,
      isHttpUrl,
      hasAnyCustomVideo,
    })
    // Treat both absolute (https://...) and relative (/api/...) URLs as valid custom sources.
    setVideoSource(hasAnyCustomVideo ? trimmed : fallbackPlaybackSrc)
    setHasCustomVideo(hasAnyCustomVideo)
    setVideoError(false)
  }, [simulation.id, simulation.videoUrl, fallbackPlaybackSrc])

useEffect(() => {
  setSyntheticTime(0)
  setIsModelPlaying(shouldUseModelViewer)
}, [simulation.id, shouldUseModelViewer])

  useEffect(() => {
    if (!blueprint.length) {
      setSelectedMetricKey(null)
      return
    }
    if (hasDismissedMetric && selectedMetricKey === null) {
      return
    }
    if (!selectedMetricKey || !blueprint.some((metric) => metric.key === selectedMetricKey)) {
      setSelectedMetricKey(blueprint[0].key)
    }
  }, [blueprint, hasDismissedMetric, selectedMetricKey])

  useEffect(() => {
    setHasDismissedMetric(false)
  }, [componentType])

  const handleDownload = (type: "json" | "csv" | "pdf") => {
    if (type === "json") {
      downloadBlob(`simulation-${simulation.id}.json`, JSON.stringify(simulation, null, 2), "application/json")
      return
    }
    if (type === "csv") {
      downloadBlob(`simulation-${simulation.id}.csv`, createCsvFromTimeline(simulation), "text/csv")
      return
    }
    if (type === "pdf") {
      downloadPdfReport(simulation)
    }
  }

  const handleVideoError = () => {
    console.warn("[Analysis] Video element onError fired", {
      simulationId: simulation.id,
      currentVideoSource: videoSource,
      fallbackPlaybackSrc,
    })
    if (videoSource !== fallbackPlaybackSrc) {
      setVideoSource(fallbackPlaybackSrc)
      setHasCustomVideo(false)
      setVideoError(false)
    } else {
      setVideoError(true)
    }
  }

  const stackedButtonClass = "flex flex-col items-center justify-center gap-1 w-24 h-auto py-3 px-3 text-xs font-semibold"
  const isPlaybackActive = shouldUseModelViewer ? isModelPlaying : videoControls.isPlaying
  const handlePlaybackToggle = () => {
    if (shouldUseModelViewer) {
      // If at the end, reset to beginning before playing
      if (syntheticTime >= SIMULATION_DURATION) {
        setSyntheticTime(0)
      }
      setIsModelPlaying((prev) => !prev)
      return
    }
    videoControls.togglePlay()
  }
  const handleProgressScrub = (value: number) => {
    if (shouldUseModelViewer) {
      setSyntheticTime(Math.min(Math.max(0, value), SIMULATION_DURATION))
      return
    }
    videoControls.updateTime(value)
  }

  const riskGaugePercent = Number.isFinite(risk.riskScore)
    ? Math.min(100, Math.max(0, (risk.riskScore / 10) * 100))
    : 0

  const actionButtons: Array<{
    id: string
    label: string
    icon: ReactComponentType<{ className?: string }>
    onClick: () => void
    variant?: "success" | "destructive"
  }> = [
    { id: "json", label: "Raw JSON", icon: Download, onClick: () => handleDownload("json") },
    { id: "csv", label: "CSV Timeline", icon: FileText, onClick: () => handleDownload("csv") },
    { id: "pdf", label: "PDF Report", icon: FileDown, onClick: () => handleDownload("pdf") },
    { id: "delete", label: "Delete", icon: Trash2, onClick: onDelete, variant: "destructive" },
    { id: "solution", label: "Solution", icon: Lightbulb, onClick: onGoToSolution, variant: "success" },
  ]

  return (
    <div className="space-y-6 pb-10">
      <Card>
        <CardHeader className="flex flex-wrap gap-4 justify-between items-start">
          <div>
            <CardTitle className="text-2xl">
              {COMPONENT_LABELS[componentType]} Analysis -{" "}
              <span className="text-base text-muted-foreground">
                {simulation.assetMetadata?.assetName ?? simulation.assetMetadata?.assetId ?? "Asset"}
              </span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Run at {format(new Date(simulation.timestamp), "PPpp")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-end">
            {actionButtons.map((btn) => {
              const Icon = btn.icon
              const variantClass =
                btn.variant === "success"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : btn.variant === "destructive"
                    ? "border-red-200 text-red-600 hover:bg-red-50"
                    : ""
              const variant = btn.variant === "success" ? "default" : "outline"
              return (
                <Button key={btn.id} variant={variant} className={cn(stackedButtonClass, variantClass)} onClick={btn.onClick}>
                  <Icon className="h-4 w-4" />
                  <span>{btn.label}</span>
                </Button>
              )
            })}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 items-stretch">
            <div className="rounded-xl border bg-muted/40 p-4 flex flex-col h-full">
              <p className="text-xs uppercase text-muted-foreground tracking-wide">
                Component Info
              </p>
              <dl className="grid grid-cols-2 gap-3 mt-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Asset</dt>
                  <dd className="font-semibold">
                    {simulation.assetMetadata?.assetName ?? simulation.assetMetadata?.assetId ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Substation</dt>
                  <dd>{simulation.assetMetadata?.substationName ?? simulation.substationId}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Installed</dt>
                  <dd>{simulation.assetMetadata?.installationYear ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Manufacturer</dt>
                  <dd>{simulation.assetMetadata?.manufacturer ?? "Oceanberg Power"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Substation Code</dt>
                  <dd>{simulation.assetMetadata?.substationCode ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Component Model</dt>
                  <dd>{simulation.assetMetadata?.model ?? "-"}</dd>
                </div>
              </dl>
              <dl className="grid grid-cols-2 gap-3 mt-4 pt-3 text-sm border-t">
                <div>
                  <dt className="text-muted-foreground">Area</dt>
                  <dd>{simulation.assetMetadata?.areaName ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Voltage Class</dt>
                  <dd>{simulation.assetMetadata?.voltageClass ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Operator</dt>
                  <dd>{simulation.assetMetadata?.operator ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Location</dt>
                  <dd>
                    {simulation.assetMetadata?.latitude && simulation.assetMetadata?.longitude
                      ? `${simulation.assetMetadata.latitude.toFixed(4)}, ${simulation.assetMetadata.longitude.toFixed(4)}`
                      : "-"}
                  </dd>
                </div>
              </dl>
              {simulation.assetMetadata?.ratedSpecs && simulation.assetMetadata.ratedSpecs.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {simulation.assetMetadata.ratedSpecs.map((spec) => (
                    <span
                      key={spec.label}
                      className="rounded-full border border-dashed px-3 py-1 bg-white/60 text-gray-700"
                    >
                      <span className="font-semibold">{spec.label}:</span> {spec.value}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border bg-muted/40 p-4">
              <p className="text-xs uppercase text-muted-foreground tracking-wide">Input Snapshot</p>
              <div className="mt-4">
                <div className="grid gap-3 text-xs sm:grid-cols-2 xl:grid-cols-3">
                  {Object.entries(simulation.inputValues || {}).map(([key, value]) => (
                    <div key={key} className="rounded-lg border bg-background px-3 py-2 h-full">
                      <p className="font-medium text-slate-800">{formatKey(key)}</p>
                      <p className="text-muted-foreground break-words">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showPlayback && (
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle>3D Simulation Playback</CardTitle>
              {hasCustomVideo && (
                <Badge variant="outline" className="text-xs">
                  <Download className="h-3 w-3 mr-1" />
                  Video captured
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-2">
              15-second summary video representing the complete simulation runtime performance
            </p>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="rounded-xl border overflow-hidden relative h-72">
              {shouldUseModelViewer ? (
                <ModelViewer
                  key={`model-${simulation.id}`}
                  modelPath={
                    simulation.assetMetadata?.model ??
                    (simulation.componentType === "transformer"
                      ? "/model/transformer_model.glb"
                      : simulation.componentType === "circuitBreaker"
                      ? "/model/circuitbreaker_model.glb"
                      : null)
                  }
                  componentType={simulation.componentType}
                  useFallback={false}
                  autoRotate
                  className="h-full"
                  hudMetrics={modelViewerHudMetrics}
                  hudVisible
                  timelineSnapshot={modelViewerTimelineSnapshot}
                  simulationProgress={clamp01(playbackProgress)}
                  showParameterColor
                />
              ) : (
                <>
                  {videoSources.length > 0 ? (
                    <video
                      key={simulation.id}
                      ref={videoControls.videoRef}
                      className="w-full h-72 object-cover"
                      style={videoRotationStyle}
                      poster="/placeholder.jpg"
                      controls={false}
                      muted
                      playsInline
                      preload="metadata"
                      onError={handleVideoError}
                    >
                      {videoSources.map((source) => (
                        <source key={`${source.type}-${source.src}`} src={source.src} type={source.type} />
                      ))}
                    </video>
                  ) : (
                    <div className="w-full h-72 flex items-center justify-center bg-muted text-sm text-muted-foreground">
                      No video available for this simulation
                    </div>
                  )}
                </>
              )}
              {videoError && videoSources.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm">
                  Video source unavailable
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="outline" size="sm" onClick={handlePlaybackToggle} disabled={videoError && !shouldUseModelViewer}>
                {isPlaybackActive ? (
                  <>
                    <PauseCircle className="h-4 w-4 mr-2" /> Pause
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" /> Play
                  </>
                )}
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Speed</span>
                <Select
                  value={String(videoControls.playbackRate)}
                  onValueChange={(value) => videoControls.changeSpeed(Number(value))}
                  disabled={videoError}
                >
                  <SelectTrigger className="w-[90px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rates.map((rate) => (
                      <SelectItem key={rate} value={String(rate)}>
                        {rate}x
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => videoControls.videoRef.current?.requestFullscreen?.()}
                disabled={videoError}
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Fullscreen
              </Button>
              {hasCustomVideo && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadVideo(simulation.videoUrl, `simulation-${simulation.id}.mp4`)}
                  disabled={videoError || !simulation.videoUrl}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              <div className="flex-1">
                <Slider
                  min={0}
                  max={effectiveDuration || 1}
                  step={0.1}
                  value={[effectiveCurrentTime]}
                  onValueChange={([value]) => handleProgressScrub(value)}
                  disabled={videoError && !shouldUseModelViewer}
                />
              </div>
              <div className="text-xs text-muted-foreground text-right">
                <p>
                  {effectiveCurrentTime.toFixed(1)}s / {effectiveDuration.toFixed(1)}s
                </p>
                <p>15s performance replay</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Health & Severity Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-white p-4">
              <p className="text-xs text-muted-foreground uppercase">True Health</p>
              <p className={cn("text-2xl font-semibold", getOverallHealthTextClass(overallHealth))}>
                {overallHealth.toFixed(1)}%
              </p>
            </div>
            {stressPercent !== null && (
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs text-muted-foreground uppercase">Stress Score</p>
                <p className="text-2xl font-semibold text-orange-600">{stressPercent.toFixed(1)}%</p>
              </div>
            )}
            {faultProbabilityPercent !== null && (
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs text-muted-foreground uppercase">Fault Probability</p>
                <p className={cn("text-2xl font-semibold", getFaultProbabilityTextClass(faultProbabilityPercent))}>
                  {faultProbabilityPercent.toFixed(1)}%
                </p>
              </div>
            )}
            {agingPercent !== null && (
              <div className="rounded-xl border bg-white p-4">
                <p className="text-xs text-muted-foreground uppercase">Aging Factor</p>
                <p className="text-2xl font-semibold text-emerald-600">{agingPercent.toFixed(1)}%</p>
              </div>
            )}
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {blueprint.map((metric) => {
              const score = healthScores[metric.key] ?? 0
              const angle = Math.round((score / 100) * 360)
              const isActive = selectedMetricKey === metric.key
              return (
                <div
                  key={metric.key}
                  className={cn(
                    "rounded-xl border p-4 hover:shadow-sm transition cursor-pointer",
                    isActive && "border-primary bg-primary/5 shadow-sm",
                  )}
                  onClick={() => {
                    setHasDismissedMetric(false)
                    setSelectedMetricKey(metric.key)
                  }}
                >
                  <p className="text-sm font-medium">{metric.label}</p>
                  <p className="text-xs text-muted-foreground">{metric.description}</p>
                  <div className="mt-4 flex items-center gap-4">
                    <div
                      className="h-16 w-16 rounded-full border-4 border-muted relative"
                      style={{
                        background: `conic-gradient(#10b981 ${angle}deg, #e5e7eb ${angle}deg)`,
                      }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold">
                        {score.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex-1 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span>Severity</span>
                        <Badge variant="outline" className={getHealthColor(score)}>
                          {score >= 80 ? "Normal" : score >= 60 ? "Watch" : score >= 40 ? "High" : "Critical"}
                        </Badge>
                      </div>
                      <Progress value={score} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {activeMetric && (
            <div className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-primary tracking-wide">Time-Series</p>
                  <p className="text-lg font-semibold">{activeMetric.label}</p>
                  <p className="text-sm text-muted-foreground">{activeMetric.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Latest Score</p>
                    <p className={cn("text-2xl font-semibold", getHealthColor(healthScores[activeMetric.key] ?? 0))}>
                      {(healthScores[activeMetric.key] ?? 0).toFixed(0)}%
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setHasDismissedMetric(true)
                      setSelectedMetricKey(null)
                    }}
                    aria-label="Close metric chart"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              <div className="mt-4">
                {activeSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={activeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="time" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                      <RechartsTooltip contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }} />
                      <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">No timeline samples available for this metric.</p>
                )}
              </div>
            </div>
          )}
          {simulation.faultPredictions?.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <p className="text-sm font-semibold">Fault Prediction Panel</p>
                {simulation.faultPredictions.map((fault, idx) => {
                  const theme = SEVERITY_THEME[fault.severity as Severity] ?? SEVERITY_THEME.low
                  const libraryMeta = FAULT_LIBRARY[componentType]?.find((f) => f.type === fault.type)
                  return (
                    <div key={`${fault.type}-${idx}`} className={cn("rounded-xl border p-4", theme.bg, theme.border)}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold">{fault.type}</p>
                          <p className="text-xs text-muted-foreground">
                            Probability {(fault.probability * 100).toFixed(0)}% - ETA{" "}
                            {fault.timeToFailure ? `${fault.timeToFailure.toFixed(1)} h` : "-"}
                          </p>
                        </div>
                        <Badge className={theme.pill}>{fault.severity.toUpperCase()}</Badge>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                        <div>
                          <p className="text-muted-foreground text-xs uppercase">Cause</p>
                          <p>{fault.cause ?? libraryMeta?.cause ?? "Trend indicates anomaly"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs uppercase">Affected</p>
                          <p>{fault.affected ?? libraryMeta?.affected ?? "Subsystem"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs uppercase">Action</p>
                          <p>{fault.action ?? libraryMeta?.action ?? "Initiate inspection workflow"}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Correlation Insights</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {correlations.length === 0 && (
            <p className="text-sm text-muted-foreground">No meaningful correlations detected.</p>
          )}
          {correlations.map((insight) => {
            const direction = insight.value >= 0 ? "Positive" : "Negative"
            const magnitude = Math.abs(insight.value) * 100
            return (
              <div
                key={insight.label}
                className="rounded-xl border bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm space-y-4"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-blue-100 text-blue-700 p-2">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{insight.label}</p>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                  </div>
                  <Badge variant="secondary">{direction}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Strength</span>
                    <span className="font-semibold text-slate-700">{magnitude.toFixed(0)}%</span>
                  </div>
                  <Progress value={magnitude} />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Trend Prediction & RUL</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div className="flex flex-wrap gap-4">
            <div className="flex min-w-[220px] flex-1 items-center gap-4 rounded-xl border bg-white p-4 shadow-sm">
              <div className="rounded-full bg-emerald-100 text-emerald-700 p-3">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Remaining Useful Life</p>
                <p className="text-lg font-bold">{rul.optimistic} months</p>
                <p className="text-xs text-muted-foreground">
                  Conservative window <span className="font-semibold text-slate-700">{rul.conservative} months</span>
                </p>
              </div>
            </div>
            <div className="grid flex-1 min-w-[220px] gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-gradient-to-br from-emerald-50 to-white p-3">
                <p className="text-xs text-muted-foreground uppercase">Optimistic</p>
                <p className="text-2xl font-semibold text-emerald-600">{rul.optimistic}</p>
                <p className="text-xs text-muted-foreground">months remaining</p>
              </div>
              <div className="rounded-lg border bg-gradient-to-br from-orange-50 to-white p-3">
                <p className="text-xs text-muted-foreground uppercase">Conservative</p>
                <p className="text-2xl font-semibold text-orange-600">{rul.conservative}</p>
                <p className="text-xs text-muted-foreground">months remaining</p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {trend.map((window) => (
              <div key={window.horizon} className="rounded-lg border bg-white/80 p-3 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                  <span>{window.horizon}</span>
                  <span className={cn("font-semibold", getHealthColor(window.projected))}>
                    {window.projected.toFixed(1)}%
                  </span>
                </div>
                <Progress value={window.projected} />
                <p className="text-xs text-muted-foreground capitalize">Severity: {window.severity}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Risk Score & Probabilities</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div className="flex flex-wrap items-center gap-6">
            <div className="relative h-28 w-28">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(#dc2626 ${riskGaugePercent}%, #fee2e2 ${riskGaugePercent}%)`,
                }}
              />
              <div className="absolute inset-2 rounded-full bg-white flex flex-col items-center justify-center shadow-inner text-center">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                <p className="text-[11px] uppercase text-muted-foreground tracking-wide">Risk</p>
                <p className="text-2xl font-bold text-red-600">{risk.riskScore.toFixed(1)}</p>
              </div>
            </div>
            <div className="flex-1 min-w-[220px] space-y-2 text-sm">
              <p className="text-muted-foreground">
                Composite probability of failure derived from health {overallHealth.toFixed(1)}% and{" "}
                {simulation.faultPredictions?.length ?? 0} open faults.
              </p>
              {typeof simulation.faultProbability === "number" && (
                <p className="text-xs text-muted-foreground">
                  Master engine probability{" "}
                  <span className={cn("font-semibold", getFaultProbabilityTextClass(
                    (simulation.faultProbability <= 1 ? simulation.faultProbability * 100 : simulation.faultProbability) || 0
                  ))}>
                    {(
                      (simulation.faultProbability <= 1 ? simulation.faultProbability * 100 : simulation.faultProbability) ||
                      0
                    ).toFixed(1)}
                    %
                  </span>
                </p>
              )}
            </div>
          </div>
          <Separator />
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "1 week", value: risk.shortTerm },
              { label: "1 month", value: risk.mediumTerm },
              { label: "6 months", value: risk.longTerm },
            ].map((bucket) => (
              <div key={bucket.label} className="rounded-lg border bg-white/80 p-3 text-sm shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{bucket.label}</span>
                  <span className="text-red-600 font-semibold">{bucket.value.toFixed(0)}%</span>
                </div>
                <Progress value={bucket.value} className="mt-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-indigo-600" />
            <CardTitle>Diagnosis</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm text-sm leading-relaxed relative overflow-hidden">
            <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-indigo-200/60 blur-2xl" aria-hidden="true" />
            <p className="whitespace-pre-wrap text-slate-800">{simulation.diagnosis}</p>
            <p className="mt-3 text-xs uppercase tracking-wide text-indigo-700">
              Insights curated by Oceanberg diagnostics engine
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AnalysisPageContent() {
  const { setSelectedSimulationId, selectedSimulationId, setActiveTab } = useSimulation()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [simulations, setSimulations] = useState<SimulationData[]>([])
  const [filterComponent, setFilterComponent] = useState("all")
  const [filterSeverity, setFilterSeverity] = useState("all")
  const [isListLoading, setIsListLoading] = useState(false)
  const simulationBucketsRef = useRef<Map<string, SimulationData[]>>(new Map())
  const simulationSubscriptionsRef = useRef<Unsubscribe[]>([])
  useEffect(() => {
    let isMounted = true

    const teardownSubscriptions = () => {
      if (simulationSubscriptionsRef.current.length > 0) {
        simulationSubscriptionsRef.current.forEach((unsubscribe) => {
          try {
            unsubscribe()
          } catch (error) {
            console.warn("Error cleaning up simulation listener", error)
          }
        })
        simulationSubscriptionsRef.current = []
      }
    }

    const setupListeners = async () => {
      setIsListLoading(true)
      teardownSubscriptions()
      simulationBucketsRef.current.clear()

      try {
        const { getAllSubstations } = await import("@/lib/firebase-data")
        const substations = await getAllSubstations()

        if (!isMounted) {
          return
        }

        if (substations.length === 0) {
          setSimulations([])
          setIsListLoading(false)
          return
        }

        const listeners = substations.map((substation) => {
          const simsQuery = query(
            collection(db, `substations/${substation.id}/simulations`),
            orderBy("timestamp", "desc"),
            limit(RECENT_LIMIT),
          )

          return onSnapshot(
            simsQuery,
            (snapshot) => {
              if (!isMounted) return
              const entries: SimulationData[] = []
              snapshot.forEach((docSnap) => {
                const docData = docSnap.data()
                const normalizedTimestamp =
                  typeof docData.timestamp === "string"
                    ? docData.timestamp
                    : typeof docData.timestamp?.toDate === "function"
                      ? docData.timestamp.toDate().toISOString()
                      : new Date().toISOString()

                entries.push({
                  id: docSnap.id,
                  substationId: substation.id,
                  ...(docData as Omit<SimulationData, "id" | "substationId">),
                  timestamp: normalizedTimestamp,
                })
              })

              simulationBucketsRef.current.set(substation.id, entries)

              const merged = Array.from(simulationBucketsRef.current.values()).flat()
              merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              setSimulations(merged.slice(0, RECENT_LIMIT))
              setIsListLoading(false)
            },
            (error) => {
              console.error(`Error streaming simulations for ${substation.id}`, error)
            },
          )
        })

        if (!isMounted) {
          listeners.forEach((unsubscribe) => unsubscribe())
          return
        }

        simulationSubscriptionsRef.current = listeners
      } catch (error) {
        if (isMounted) {
          console.error("Error loading simulations", error)
          setIsListLoading(false)
        }
      }
    }

    setupListeners()

    return () => {
      isMounted = false
      teardownSubscriptions()
      simulationBucketsRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const simId = searchParams.get("simulationId")
    if (simId) {
      setSelectedSimulationId(simId)
    }
  }, [searchParams, setSelectedSimulationId])

  const handleSelectSimulation = useCallback(
    (simulation: SimulationData) => {
      setSelectedSimulationId(simulation.id)
      router.push(`/simulation/detail?simulationId=${simulation.id}&substationId=${simulation.substationId}`)
    },
    [router, setSelectedSimulationId],
  )

  const handleGoToSolution = useCallback(
    (simulation: SimulationData) => {
      setActiveTab("solution")
      router.push(
        `/simulation?tab=solution&simulationId=${simulation.id}&substationId=${simulation.substationId}&combine=${simulation.componentType}&source=analysis`,
      )
    },
    [router, setActiveTab],
  )

  return (
    <div className="h-full min-h-0 flex flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Diagnostics Hub</p>
          <h1 className="text-2xl font-bold">Analysis</h1>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ManualSimulationList
          simulations={simulations}
          filterComponent={filterComponent}
          setFilterComponent={setFilterComponent}
          filterSeverity={filterSeverity}
          setFilterSeverity={setFilterSeverity}
          onSelect={handleSelectSimulation}
          onGoToSolution={handleGoToSolution}
          selectedId={selectedSimulationId}
        />
        {isListLoading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Fetching recent simulations...
          </div>
        )}
      </div>
    </div>
  )
}

export function AnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <AnalysisPageContent />
    </Suspense>
  )
}
