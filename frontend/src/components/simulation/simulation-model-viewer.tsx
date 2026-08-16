"use client"

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ModelViewer } from "@/components/live-trend/model-viewer"
import { useSimulation } from "./simulation-context"
import type { ComponentType } from "@/lib/analysis-config"
import { captureVideoFromCanvas } from "@/lib/video-capture"
import type { SimulationResult } from "@/lib/simulation-engine"
import { calculateAllHealthScores } from "@/lib/simulation-engine"
import { applyTimelineColorTransition } from "@/lib/live-trend/parameter-color-mapping"

interface SimulationModelViewerProps {
  inputValues?: Record<string, number | string>
}

export type SimulationModelViewerHandle = {
  captureVideo: (options?: {
    duration?: number
    onProgress?: (progress: number) => void
    timeline?: SimulationResult["timeline"]
  }) => Promise<Blob>
}

const MODEL_PATHS: Partial<Record<ComponentType, string>> = {
  transformer: "/model/transformer_model.glb",
  bayLines: "/models/bay-lines/bay-lines.glb",
  circuitBreaker: "/model/circuitbreaker_model.glb",
  isolator: "/models/isolator/isolator.glb",
  busbar: "/models/busbar/busbar.glb",
}

const BASELINE_METRICS = {
  trueHealth: 100,
  stressScore: 0,
  faultProbability: 0,
  agingFactor: 100,
  healthScore: 100,
}

export const SimulationModelViewer = forwardRef<SimulationModelViewerHandle, SimulationModelViewerProps>(
  function SimulationModelViewer({ inputValues = {} }: SimulationModelViewerProps, ref) {
    const { selectedComponent } = useSimulation()
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const isMountedRef = useRef(true)
    const [timelineSnapshot, setTimelineSnapshot] = useState<Record<string, number | string> | null>({ ...BASELINE_METRICS })
    const [isTimelinePlaybackActive, setIsTimelinePlaybackActive] = useState(false)
    const [playbackProgress, setPlaybackProgress] = useState(0)
    const timelinePlaybackCleanupRef = useRef<(() => void) | null>(null)
    const [visualStats, setVisualStats] = useState<{
      overall: number
      fault: number
      stress: number
      aging: number
    } | null>(null)

    useEffect(() => {
      return () => {
        isMountedRef.current = false
        timelinePlaybackCleanupRef.current?.()
        timelinePlaybackCleanupRef.current = null
      }
    }, [])

    const stopTimelinePlayback = useCallback(() => {
      timelinePlaybackCleanupRef.current?.()
      timelinePlaybackCleanupRef.current = null
    }, [])

    const lerpNumber = useCallback((a: number | undefined, b: number | undefined, t: number) => {
      if (typeof a === "number" && typeof b === "number") {
        return a + (b - a) * t
      }
      if (typeof a === "number") return a
      if (typeof b === "number") return b
      return undefined
    }, [])

    const interpolateTimelineState = useCallback(
      (fromStep: SimulationResult["timeline"][number], toStep: SimulationResult["timeline"][number], mix: number) => {
        const interpolatedState: Record<string, number | string> = {}
        const keys = new Set([
          ...Object.keys(fromStep.state ?? {}),
          ...Object.keys(toStep.state ?? {}),
          "trueHealth",
          "stressScore",
          "faultProbability",
          "agingFactor",
          "healthScore",
        ])

        keys.forEach((key) => {
          const fromVal = (fromStep.state ?? {})[key]
          const toVal = (toStep.state ?? {})[key]

          if (typeof fromVal === "number" || typeof toVal === "number") {
            const blended = lerpNumber(
              typeof fromVal === "number" ? fromVal : undefined,
              typeof toVal === "number" ? toVal : undefined,
              mix,
            )
            if (typeof blended === "number") {
              interpolatedState[key] = Number.isFinite(blended) ? blended : 0
              return
            }
          }

          if (mix < 0.5) {
            if (typeof fromVal !== "undefined") {
              interpolatedState[key] = fromVal
              return
            }
          } else if (typeof toVal !== "undefined") {
            interpolatedState[key] = toVal
            return
          }
        })

        const trueHealth =
          lerpNumber(fromStep.trueHealth, toStep.trueHealth, mix) ??
          lerpNumber(fromStep.healthScore, toStep.healthScore, mix) ??
          BASELINE_METRICS.trueHealth
        const stressScore = lerpNumber(fromStep.stressScore, toStep.stressScore, mix) ?? BASELINE_METRICS.stressScore
        const faultProbability =
          lerpNumber(fromStep.faultProbability, toStep.faultProbability, mix) ?? BASELINE_METRICS.faultProbability
        const agingFactor = lerpNumber(fromStep.agingFactor, toStep.agingFactor, mix) ?? BASELINE_METRICS.agingFactor

        return {
          ...interpolatedState,
          trueHealth,
          stressScore,
          faultProbability,
          agingFactor,
          healthScore: lerpNumber(fromStep.healthScore, toStep.healthScore, mix) ?? trueHealth,
          time: lerpNumber(fromStep.time, toStep.time, mix) ?? toStep.time ?? fromStep.time,
        }
      },
      [lerpNumber],
    )

    const createBaselineStep = useCallback(
      (reference?: SimulationResult["timeline"][number]) => {
        const referenceState = reference?.state ?? {}
        return {
          state: referenceState,
          trueHealth: BASELINE_METRICS.trueHealth,
          stressScore: BASELINE_METRICS.stressScore,
          faultProbability: BASELINE_METRICS.faultProbability,
          agingFactor: BASELINE_METRICS.agingFactor,
          healthScore: BASELINE_METRICS.healthScore,
          time: 0,
        }
      },
      [],
    )

    const startTimelinePlayback = useCallback(
      (timeline: SimulationResult["timeline"], clipDuration: number) => {
        stopTimelinePlayback()
        if (!timeline || timeline.length === 0) {
          return
        }

        const baselineStep = createBaselineStep(timeline[0])
        const timelineSteps = [baselineStep, ...timeline]
        const durationMs = Math.max(1000, clipDuration * 1000)
        const playbackStart = performance.now()
        let frameId: number | null = null
        let lastIndex = -1
        let lastMix = 0
        let lastProgress = -1
        let lastUpdateTime = performance.now()

        if (isMountedRef.current) {
          setTimelineSnapshot({
            ...baselineStep.state,
            trueHealth: baselineStep.trueHealth,
            stressScore: baselineStep.stressScore,
            faultProbability: baselineStep.faultProbability,
            agingFactor: baselineStep.agingFactor,
            healthScore: baselineStep.healthScore,
            time: baselineStep.time,
          })
          setIsTimelinePlaybackActive(true)
          setPlaybackProgress(0)
        }

        const cleanup = (completed = false) => {
          if (frameId !== null) {
            cancelAnimationFrame(frameId)
            frameId = null
          }
          if (isMountedRef.current) {
            setIsTimelinePlaybackActive(false)
            setPlaybackProgress(completed ? 1 : 0)
          }
        }

        const tick = () => {
          const elapsed = performance.now() - playbackStart
          const progress = Math.min(1, elapsed / durationMs)
          const floatIndex = progress * (timelineSteps.length - 1)
          const lowerIndex = Math.max(0, Math.floor(floatIndex))
          const upperIndex = Math.min(timelineSteps.length - 1, lowerIndex + 1)
          const mix = upperIndex === lowerIndex ? 0 : floatIndex - lowerIndex

          if (!isMountedRef.current) return

          const now = performance.now()
          const timeSinceLastUpdate = now - lastUpdateTime

          // Update snapshot when index changes or mix changes significantly (throttled to prevent loops)
          const shouldUpdateSnapshot = (lowerIndex !== lastIndex || Math.abs(mix - lastMix) > 0.01) && timeSinceLastUpdate >= 50

          // Throttle progress updates to prevent infinite loops (update every ~50ms = 20fps)
          const shouldUpdateProgress = timeSinceLastUpdate >= 50 || progress === 1 || progress === 0

          if (shouldUpdateSnapshot) {
            lastIndex = lowerIndex
            lastMix = mix
            const interpolatedSnapshot = interpolateTimelineState(
              timelineSteps[lowerIndex],
              timelineSteps[upperIndex],
              mix,
            )

            setTimelineSnapshot(interpolatedSnapshot)
            lastUpdateTime = now
          }

          if (shouldUpdateProgress && Math.abs(progress - lastProgress) > 0.01) {
            lastProgress = progress
            lastUpdateTime = now
            setPlaybackProgress(progress)
          }

          if (progress < 1) {
            frameId = requestAnimationFrame(tick)
          } else {
            cleanup(true)
          }
        }

        frameId = requestAnimationFrame(tick)
        timelinePlaybackCleanupRef.current = () => cleanup(false)
      },
      [createBaselineStep, interpolateTimelineState, stopTimelinePlayback],
    )

    // Generate glow data from input values for visual feedback
    const activeInputs = useMemo(() => {
      const base: Record<string, number | string> = { ...inputValues }
      if (timelineSnapshot) {
        return { ...base, ...timelineSnapshot }
      }
      return { ...base, ...BASELINE_METRICS }
    }, [inputValues, timelineSnapshot])
    const glowData = useMemo(() => {
      const glow: Record<string, number | string> = {}

      const inputs = activeInputs as Record<string, number | string>

      if (selectedComponent === "transformer") {
        // Map to transformer-specific parameter names for glow effects
        // These will be mapped to the correct part names in the model viewer
        if (typeof inputs.oilLevel === "number") {
          glow.oilLevel = inputs.oilLevel
        }
        if (typeof inputs.oilTemperature === "number" || typeof inputs.oilTemp === "number") {
          glow.oilTemp = inputs.oilTemperature ?? inputs.oilTemp
        }
        if (typeof inputs.windingTemperature === "number" || typeof inputs.windingTemp === "number") {
          glow.windingTemp = inputs.windingTemperature ?? inputs.windingTemp
        }
        if (typeof inputs.hydrogenPPM === "number" || typeof inputs.gasLevel === "number" || typeof inputs.hydrogen === "number") {
          glow.gasLevel = inputs.hydrogenPPM ?? inputs.gasLevel ?? inputs.hydrogen
        }
        if (typeof inputs.tapPosition === "number" || typeof inputs.tapPos === "number") {
          glow.tapPos = inputs.tapPosition ?? inputs.tapPos
        }
      } else if (selectedComponent === "bayLines") {
        if (
          typeof inputs.ctBurdenPercent === "number" &&
          inputs.ctBurdenPercent > 70
        ) {
          glow.ctBurdenPercent = inputs.ctBurdenPercent
        }
        if (
          typeof inputs.frequencyHz === "number" &&
          (inputs.frequencyHz < 49.8 || inputs.frequencyHz > 50.2)
        ) {
          glow.frequencyHz = inputs.frequencyHz
        }
      } else if (selectedComponent === "circuitBreaker") {
        // Map to circuit breaker-specific parameter names for glow effects
        // These will be mapped to the correct part names in the model viewer
        if (typeof inputs.sf6Density === "number" || typeof inputs.sf6DensityPercent === "number") {
          glow.sf6Density = inputs.sf6Density ?? inputs.sf6DensityPercent
        }
      } else if (selectedComponent === "busbar") {
        if (
          typeof inputs.busbarTemperature === "number" &&
          inputs.busbarTemperature > 80
        ) {
          glow.busbarTemperature = inputs.busbarTemperature
        }
        if (
          typeof inputs.busbarLoadPercent === "number" &&
          inputs.busbarLoadPercent > 90
        ) {
          glow.busbarLoadPercent = inputs.busbarLoadPercent
        }
      }

      // Don't add simulation parameters to glowData - no glow effect needed
      // Parameter values will still update in HUD display

      return glow
    }, [selectedComponent, activeInputs])

    const modelPath = MODEL_PATHS[selectedComponent as ComponentType] ?? null
    // Start with false (try GLB first) - will be set to true only if GLB doesn't exist
    const [forceFallbackModel, setForceFallbackModel] = useState(false)

    useEffect(() => {
      if (typeof window === "undefined") {
        setForceFallbackModel(true)
        return
      }

      let cancelled = false
      let timeoutId: number | null = null
      if (!modelPath) {
        setForceFallbackModel(true)
        return
      }
      const controller = new AbortController()

      const resolveUrl = (path: string) => {
        if (/^(https?:)?\/\//i.test(path)) {
          return path
        }
        return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`
      }

      const verifyModelAvailability = async () => {
        try {
          const response = await fetch(resolveUrl(modelPath), {
            method: "HEAD",
            signal: controller.signal,
          })
          if (cancelled) return
          setForceFallbackModel(!response.ok)
        } catch (error) {
          if (cancelled) return
          console.warn("3D GLB unavailable, using fallback model instead.", error)
          setForceFallbackModel(true)
        }
      }

      setForceFallbackModel(false)
      timeoutId = window.setTimeout(() => {
        if (!cancelled) {
          console.warn("Model availability check timed out, will try to load GLB anyway")
          // Don't force fallback on timeout - let the ModelViewer try to load the GLB
          // It will fallback automatically if the file doesn't exist
          setForceFallbackModel(false)
          controller.abort()
        }
      }, 8000)
      verifyModelAvailability().finally(() => {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId)
        }
      })

      return () => {
        cancelled = true
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId)
        }
        controller.abort()
      }
    }, [modelPath])

    // Use timeline snapshot data for visual stats - update whenever timelineSnapshot changes
    useEffect(() => {
      try {
        if (timelineSnapshot) {
          // Use actual timeline data when available - allows smooth parameter updates
          const overall = Number(timelineSnapshot.trueHealth ?? 100)
          const fault = Number(timelineSnapshot.faultProbability ?? 0)
          const stress = Number(timelineSnapshot.stressScore ?? 0)
          const aging = Number(timelineSnapshot.agingFactor ?? 100)

          setVisualStats({
            overall: Number.isFinite(overall) ? overall : 100,
            fault: Number.isFinite(fault) ? fault : 0,
            stress: Number.isFinite(stress) ? stress : 0,
            aging: Number.isFinite(aging) ? aging : 100,
          })
        } else {
          // Fallback to calculated values when no timeline data
          const scores = calculateAllHealthScores(selectedComponent as any, activeInputs as any)
          const overallTarget = typeof scores.overall === "number" ? scores.overall : 100

          setVisualStats({
            overall: overallTarget,
            fault: Math.max(0, 100 - overallTarget),
            stress: Math.max(0, Math.min(100, (100 - overallTarget) * 1.2)),
            aging: Math.max(0, overallTarget * 0.9),
          })
        }
      } catch (error) {
        console.warn("[VisualStats] Error calculating stats:", error)
        setVisualStats(null)
      }
    }, [selectedComponent, activeInputs, timelineSnapshot])

    useImperativeHandle(
      ref,
      () => ({
        async captureVideo(options) {
          if (!canvasRef.current) {
            throw new Error("Simulation viewer not ready for video capture")
          }
          const duration = options?.duration ?? 14
          
          console.log("[VideoCapture] Starting video capture with timeline:", options?.timeline?.length, "steps")
          
          if (options?.timeline?.length) {
            // Start timeline playback
            startTimelinePlayback(options.timeline, duration)

            // Wait a moment for the animation to start
            await new Promise((resolve) => setTimeout(resolve, 120))
          } else {
            setIsTimelinePlaybackActive(true)
            setPlaybackProgress(0)
          }
          
          try {
            console.log("[VideoCapture] Beginning canvas capture...")
            return await captureVideoFromCanvas({
              canvas: canvasRef.current,
              duration,
              onProgress: options?.onProgress,
            })
          } finally {
            console.log("[VideoCapture] Cleaning up timeline playback...")
            if (options?.timeline?.length) {
              stopTimelinePlayback()
            } else {
              setIsTimelinePlaybackActive(false)
              setPlaybackProgress(0)
            }
          }
        },
      }),
      [startTimelinePlayback, stopTimelinePlayback],
    )

    return (
      <Card className="h-full overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>3D Model View</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0">
          <div className="relative w-full h-full">
            <ModelViewer
              modelPath={modelPath}
              className="w-full h-full"
              componentType={selectedComponent as any}
              useFallback={forceFallbackModel}
              autoRotate={isTimelinePlaybackActive || playbackProgress > 0}
              glowData={glowData}
              showGlow={false}
              timelineSnapshot={timelineSnapshot}
              simulationProgress={playbackProgress}
              hudMetrics={visualStats}
              hudVisible={Boolean(visualStats)}
              onCanvasReady={(canvas) => {
                canvasRef.current = canvas
              }}
            />
          </div>
        </CardContent>
      </Card>
    )
  },
)

