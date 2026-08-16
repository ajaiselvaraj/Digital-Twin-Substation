"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSimulation } from "./simulation-context"
import { SubstationSearchBar } from "./substation-search-bar"
import { ComponentSelectorNav } from "./component-selector-nav"
import { SimulationInputFields } from "./simulation-input-fields"
import { SimulationModelViewer, type SimulationModelViewerHandle } from "./simulation-model-viewer"
import { RunSimulationButton } from "./run-simulation-button"
import type { DummySubstation } from "@/lib/dummy-data"
import { runSimulation } from "@/lib/simulation-engine"
import { collection, doc, setDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { COMPONENT_RATED_SPECS, COMPONENT_VIDEO_LIBRARY, type ComponentType } from "@/lib/analysis-config"
import { uploadSimulationVideo } from "@/lib/video-capture"
import { generateSolutionPackage } from "@/lib/simulation-solution"
import type { SimulationData } from "./analysis-page"

const ASSET_COLLECTION_LOOKUP: Record<ComponentType, keyof DummySubstation["assets"]> = {
  transformer: "transformers",
  bayLines: "powerFlowLines",
  circuitBreaker: "breakers",
  isolator: "isolators",
  busbar: "busbars",
}

const toNumberOr = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function removeUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => removeUndefined(item))
      .filter((item) => item !== undefined)
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, val]) => {
      const cleaned = removeUndefined(val)
      if (cleaned !== undefined) {
        acc[key] = cleaned
      }
      return acc
    }, {})
  }
  return value === undefined ? undefined : value
}

export function RunSimulationPage() {
  const { selectedComponent, setActiveTab } = useSimulation()
  const [substation, setSubstation] = useState<DummySubstation | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const router = useRouter()
  const modelViewerRef = useRef<SimulationModelViewerHandle | null>(null)

  // Input states for each component type (start from conservative, lower operating ranges)
  const [transformerInputs, setTransformerInputs] = useState({
    va: 380, vb: 380, vc: 380,
    ampa: 600, ampb: 600, ampc: 600,
    frequency: 50,
    loadUnbalancePercent: 3,
    neutralCurrent: 20,
    windingTemperature: 65,
    hotspotTemperature: 75,
    oilTemperature: 55,
    ambientTemperature: 30,
    oilLevel: 92,
    oilMoisture: 12,
    oilAcidity: 0.05,
    dielectricStrength: 60,
    hydrogenPPM: 60,
    methanePPM: 20,
    acetylenePPM: 2,
    ethylenePPM: 10,
    CO_PPM: 150,
    transformerLoading: 65,
    oltcTapPosition: 9,
    oltcDeviation: 1,
    oltcMotorStatus: "ON",
    oltcOpsCount: 3000,
    vibrationLevel: 2,
    noiseLevel: 60,
    buchholzAlarm: "NORMAL",
    gasAccumulationRate: 2,
    timeOfSimulation: 12,
  })

  const [bayLinesInputs, setBayLinesInputs] = useState({
    ctBurdenPercent: 50,
    ctPrimaryCurrent: 600,
    ctSecondaryCurrent: 1,
    ctTemperature: 35,
    vtVoltageDriftPercent: 100,
    vtOutputVoltage: 100,
    vtTemperature: 30,
    frequencyHz: 50,
    powerFactor: 0.99,
    lineCurrent: 500,
    harmonicsTHDPercent: 1.8,
    timeOfSimulation: 12,
  })

  const [circuitBreakerInputs, setCircuitBreakerInputs] = useState({
    sf6DensityPercent: 98,
    sf6LeakRatePercentPerYear: 1,
    sf6MoisturePPM: 60,
    operationCountPercent: 30,
    lastTripTimeMs: 40,
    closeCoilResistance: 8,
    poleTemperature: 30,
    mechanismWearLevel: 20,
    timeOfSimulation: 12,
  })

  const [isolatorInputs, setIsolatorInputs] = useState({
    status: "CLOSED",
    bladeAngleDeg: 0,
    contactResistanceMicroOhm: 40,
    motorTorqueNm: 180,
    positionMismatchPercent: 0.5,
    timeOfSimulation: 12,
  })

  const [busbarInputs, setBusbarInputs] = useState({
    busbarTemperature: 50,
    ambientTemperature: 30,
    busbarLoadPercent: 60,
    busbarCurrentA: 1600,
    jointHotspotTemp: 60,
    impedanceMicroOhm: 45,
    timeOfSimulation: 12,
  })

  const selectedAsset = useMemo(() => {
    if (!substation) return null
    const collectionKey = ASSET_COLLECTION_LOOKUP[selectedComponent]
    const assets = substation.assets?.[collectionKey]
    if (!Array.isArray(assets) || assets.length === 0) return null
    return assets[0]
  }, [selectedComponent, substation])

  const buildSpecsFromAsset = (asset: any) => {
    if (!asset) return COMPONENT_RATED_SPECS[selectedComponent] || []
    const specs: Array<{ label: string; value: string }> = []

    switch (selectedComponent) {
      case "transformer":
        if (asset.ratedMVA) specs.push({ label: "Rated MVA", value: `${asset.ratedMVA} MVA` })
        if (asset.HV_kV && asset.LV_kV) specs.push({ label: "Voltage", value: `${asset.HV_kV}/${asset.LV_kV} kV` })
        if (asset.coolingType) specs.push({ label: "Cooling", value: asset.coolingType })
        if (asset.vectorGroup) specs.push({ label: "Vector Group", value: asset.vectorGroup })
        break
      case "bayLines":
        if (asset.lineVoltage_kV) specs.push({ label: "Line Voltage", value: `${asset.lineVoltage_kV} kV` })
        if (asset.length_km) specs.push({ label: "Length", value: `${asset.length_km} km` })
        if (asset.thermalLimit_A) specs.push({ label: "Thermal Limit", value: `${asset.thermalLimit_A} A` })
        break
      case "circuitBreaker":
        if (asset.ratedVoltage_kV) specs.push({ label: "Rated Voltage", value: `${asset.ratedVoltage_kV} kV` })
        if (asset.ratedCurrent_A) specs.push({ label: "Rated Current", value: `${asset.ratedCurrent_A} A` })
        if (asset.sf6Pressure) specs.push({ label: "SF6 Pressure", value: `${asset.sf6Pressure} bar` })
        if (asset.operatingTime_ms) specs.push({ label: "Operating Time", value: `${asset.operatingTime_ms} ms` })
        break
      case "isolator":
        if (asset.type) specs.push({ label: "Type", value: asset.type })
        if (asset.driveMechanism) specs.push({ label: "Drive", value: asset.driveMechanism })
        if (asset.installationYear) specs.push({ label: "Installed", value: `${asset.installationYear}` })
        break
      case "busbar":
        if (asset.capacity_A) specs.push({ label: "Capacity", value: `${asset.capacity_A} A` })
        if (asset.material) specs.push({ label: "Material", value: asset.material })
        if (asset.lastIRScanDate) specs.push({ label: "Last IR Scan", value: new Date(asset.lastIRScanDate).toLocaleDateString() })
        break
    }

    return specs.length > 0 ? specs : COMPONENT_RATED_SPECS[selectedComponent] || []
  }

  const getCurrentInputs = () => {
    switch (selectedComponent) {
      case "transformer":
        return transformerInputs
      case "bayLines":
        return bayLinesInputs
      case "circuitBreaker":
        return circuitBreakerInputs
      case "isolator":
        return isolatorInputs
      case "busbar":
        return busbarInputs
    }
  }

  // Get default values for each component type
  const getDefaultInputs = (): Record<string, number | string> => {
    switch (selectedComponent) {
      case "transformer":
        return {
          va: 380,
          vb: 380,
          vc: 380,
          ampa: 600,
          ampb: 600,
          ampc: 600,
          frequency: 50,
          loadUnbalancePercent: 3,
          neutralCurrent: 20,
          windingTemperature: 65,
          hotspotTemperature: 75,
          oilTemperature: 55,
          ambientTemperature: 30,
          oilLevel: 92,
          oilMoisture: 12,
          oilAcidity: 0.05,
          dielectricStrength: 60,
          hydrogenPPM: 60,
          methanePPM: 20,
          acetylenePPM: 2,
          ethylenePPM: 10,
          CO_PPM: 150,
          transformerLoading: 65,
          oltcTapPosition: 9,
          oltcDeviation: 1,
          oltcMotorStatus: "ON",
          oltcOpsCount: 3000,
          vibrationLevel: 2,
          noiseLevel: 60,
          buchholzAlarm: "NORMAL",
          gasAccumulationRate: 2,
          timeOfSimulation: 12,
        }
      case "bayLines":
        return {
          ctBurdenPercent: 50,
          ctPrimaryCurrent: 600,
          ctSecondaryCurrent: 1,
          ctTemperature: 35,
          vtVoltageDriftPercent: 100,
          vtOutputVoltage: 100,
          vtTemperature: 30,
          frequencyHz: 50,
          powerFactor: 0.99,
          lineCurrent: 500,
          harmonicsTHDPercent: 1.8,
          timeOfSimulation: 12,
        }
      case "circuitBreaker":
        return {
          sf6DensityPercent: 98,
          sf6LeakRatePercentPerYear: 1,
          sf6MoisturePPM: 60,
          operationCountPercent: 30,
          lastTripTimeMs: 40,
          closeCoilResistance: 8,
          poleTemperature: 30,
          mechanismWearLevel: 20,
          timeOfSimulation: 12,
        }
      case "isolator":
        return {
          status: "CLOSED",
          bladeAngleDeg: 0,
          contactResistanceMicroOhm: 40,
          motorTorqueNm: 180,
          positionMismatchPercent: 0.5,
          timeOfSimulation: 12,
        }
      case "busbar":
        return {
          busbarTemperature: 50,
          ambientTemperature: 30,
          busbarLoadPercent: 60,
          busbarCurrentA: 1600,
          jointHotspotTemp: 60,
          impedanceMicroOhm: 45,
          timeOfSimulation: 12,
        }
      default:
        return {}
    }
  }

  // Fill in default values for any empty or missing fields
  const getCurrentInputsWithDefaults = (inputs: Record<string, number | string>): Record<string, number | string> => {
    const defaults = getDefaultInputs()
    const result: Record<string, number | string> = { ...inputs }

    // For each default field, use default if input is empty, null, undefined, or 0 (for numeric fields that shouldn't be 0)
    Object.entries(defaults).forEach(([key, defaultValue]) => {
      const currentValue = result[key]
      
      // If field is missing, empty string, null, undefined, or NaN, use default
      if (
        currentValue === undefined ||
        currentValue === null ||
        currentValue === "" ||
        (typeof currentValue === "number" && (isNaN(currentValue) || currentValue === 0 && defaultValue !== 0))
      ) {
        result[key] = defaultValue
      }
    })

    return result
  }


  const buildAssetMetadata = () => {
    if (!substation) return null
    const master = substation.master
    const asset = selectedAsset
    return {
      assetId: asset?.id ?? `${selectedComponent.toUpperCase()}-${master?.substationCode || substation.id}`,
      assetName:
        asset?.assetName ?? asset?.name ?? `${selectedComponent.toUpperCase()} @ ${master?.name || "Substation"}`,
      substationName: master?.name,
      areaName: master?.areaName,
      substationCode: master?.substationCode,
      voltageClass: master?.voltageClass,
      operator: master?.operator,
      latitude: master?.latitude,
      longitude: master?.longitude,
      installationYear: asset?.installationYear ?? master?.installationYear ?? 2012,
      manufacturer: asset?.manufacturer ?? master?.operator ?? "Oceanberg Power Systems",
      model: asset?.model ?? `${selectedComponent.toUpperCase()}-DX`,
      ratedSpecs: buildSpecsFromAsset(asset),
    }
  }

  // Simple input update function - no auto-population
  const updateInput = (key: string, value: number | string) => {
    switch (selectedComponent) {
      case "transformer":
        setTransformerInputs((prev) => ({ ...prev, [key]: value }))
        break
      case "bayLines":
        setBayLinesInputs((prev) => ({ ...prev, [key]: value }))
        break
      case "circuitBreaker":
        setCircuitBreakerInputs((prev) => ({ ...prev, [key]: value }))
        break
      case "isolator":
        setIsolatorInputs((prev) => ({ ...prev, [key]: value }))
        break
      case "busbar":
        setBusbarInputs((prev) => ({ ...prev, [key]: value }))
        break
    }
  }

  const handleRunSimulation = async () => {
    if (!substation) {
      return
    }

    setIsRunning(true)

    try {
      // Get current inputs and fill in defaults for any empty/missing values
      const rawInputs = getCurrentInputs()
      const inputValues = getCurrentInputsWithDefaults(rawInputs)
      const timeOfSimulation = inputValues.timeOfSimulation as number
      const assetContext = selectedAsset

      const result = await runSimulation({
        componentType: selectedComponent,
        inputValues,
        timeOfSimulation,
        assetContext,
      })

      // Call backend ML predictor to get model-based health, RUL, risk, etc.
      let mlPrediction: Record<string, any> | null = null
      try {
        console.log("[Simulation] Calling ML predictor API...", {
          componentType: selectedComponent,
          substationId: substation.id,
          inputKeys: Object.keys(inputValues),
        })
        
        const response = await fetch("/api/simulation-ml", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            componentType: selectedComponent,
            substationId: substation.id,
            inputValues,
          }),
        })

        console.log("[Simulation] ML API response status:", response.status, response.statusText)

        if (response.ok) {
          const responseData = await response.json()
          console.log("[Simulation] ML prediction received:", {
            keys: Object.keys(responseData),
            hasError: "error" in responseData,
            sampleValues: Object.fromEntries(Object.entries(responseData).slice(0, 5))
          })

          // Check if response contains an error
          if (responseData.error) {
            console.error("[Simulation] ML API returned error:", responseData.error, responseData.details)
            mlPrediction = null
          } else {
            mlPrediction = responseData as Record<string, any>
            console.log("[Simulation] ML prediction successfully parsed:", {
              trueHealth: mlPrediction.trueHealth,
              overallHealth: mlPrediction.overallHealth,
              faultProbability: mlPrediction.faultProbability,
              stressScore: mlPrediction.stressScore,
            })
          }
        } else {
          const errorText = await response.text()
          console.error("[Simulation] ML predictor HTTP error:", response.status, errorText)
          try {
            const errorJson = JSON.parse(errorText)
            console.error("[Simulation] ML error details:", errorJson)
          } catch {
            // Not JSON, just log as text
          }
        }
      } catch (mlError) {
        console.error("[Simulation] ML predictor failed:", mlError)
        if (mlError instanceof Error) {
          console.error("[Simulation] ML error stack:", mlError.stack)
        }
        console.warn("[Simulation] Continuing with heuristic simulation only")
      }

      // Save to Firebase / Mongo-backed video API
      const simulationsCollection = collection(db, `substations/${substation.id}/simulations`)
      const docRef = doc(simulationsCollection)

      // Default video URL comes from static library (currently empty), will be overwritten
      // by captured simulation video when available.
      let resolvedVideoUrl = COMPONENT_VIDEO_LIBRARY[selectedComponent] ?? ""

      // Capture and upload simulation playback before we persist the record, so that
      // the analysis page has a ready-to-play videoUrl and does not show "No video available".
      if (modelViewerRef.current) {
        console.log(
          "[Simulation] Starting video capture",
          "simulationId=",
          docRef.id,
          "component=",
          selectedComponent,
        )
        try {
          const captureBlob = await modelViewerRef.current.captureVideo({
            duration: 14,
            // Use the same ML-aligned visual timeline that we persist so the
            // captured video exactly reflects the predicted evolution.
            timeline: visualTimeline,
          })
          if (captureBlob && captureBlob.size > 0) {
            console.log("[Simulation] Capture complete, size(bytes)=", captureBlob.size)
            const uploadedUrl = await uploadSimulationVideo(captureBlob, docRef.id, selectedComponent)
            if (uploadedUrl) {
              resolvedVideoUrl = uploadedUrl
              console.log("[Simulation] Uploaded simulation video URL:", uploadedUrl)
            }
          } else {
            console.warn("[Simulation] Capture returned empty blob – skipping upload")
          }
        } catch (videoErr) {
          console.warn("[Simulation] Video capture/upload failed, proceeding without video:", videoErr)
        }
      }

      const ml = mlPrediction ?? {}
      // For analysis we want to rely only on ML outputs. If ML is unavailable,
      // we leave these fields undefined so the frontend doesn't invent scores.
      const resolvedOverallHealth =
        typeof ml.trueHealth === "number"
          ? ml.trueHealth
          : typeof ml.overallHealth === "number"
            ? ml.overallHealth
            : undefined
      const resolvedFaultProbability =
        typeof ml.faultProbability === "number"
          ? ml.faultProbability
          : typeof ml.masterFailureProbability === "number"
            ? ml.masterFailureProbability
            : undefined

      // Build an ML-aligned visualization timeline for 3D playback and analysis.
      // When ML is available we want the trueHealth / stress / fault / aging
      // evolution to follow the model outputs, not local heuristics.
      const visualTimeline = (() => {
        const original = result.timeline ?? []
        if (!original.length || !mlPrediction) {
          return original
        }

        const steps = original.length
        const normalizePct = (value: unknown, fallback: number) => {
          if (typeof value !== "number" || !Number.isFinite(value)) return fallback
          if (value <= 1 && value >= 0) return value * 100
          return value
        }

        const targetTrue = normalizePct(
          typeof ml.trueHealth === "number" ? ml.trueHealth : ml.overallHealth,
          100,
        )
        const targetStress = normalizePct(ml.stressScore, 0)
        const targetFault = normalizePct(
          typeof ml.faultProbability === "number" ? ml.faultProbability : ml.masterFailureProbability,
          0,
        )
        const targetAging = normalizePct(ml.agingFactor, 100)

        const startTrue = 100
        const startStress = 5
        const startFault = 5
        const startAging = 100

        return original.map((step, index) => {
          const progress = steps <= 1 ? 1 : index / (steps - 1)
          const ease = progress * progress * (3 - 2 * progress) // smoothstep

          const trueHealth = startTrue + (targetTrue - startTrue) * ease
          const stressScore = startStress + (targetStress - startStress) * ease
          const faultProbability = startFault + (targetFault - startFault) * ease
          const agingFactor = startAging + (targetAging - startAging) * ease

          return {
            ...step,
            trueHealth,
            stressScore,
            faultProbability,
            agingFactor,
          }
        })
      })()

      const baseSimulationData = {
        substationId: substation.id,
        componentType: selectedComponent,
        assetMetadata: buildAssetMetadata(),
        inputValues,
        assetContext,
        // Use ML-aligned timeline for both analysis & video playback so
        // geometry/parameter animation reflects the current prediction.
        timeline: visualTimeline,
        finalState: result.finalState,
        // Store health scores inverted (110 - value for most, 130 - value for transformer) for display purposes
        healthScores: (() => {
          const inverted: Record<string, number> = {}
          const subtractValue = selectedComponent === "transformer" ? 130 : 110
          Object.entries(result.healthScores).forEach(([key, value]) => {
            if (typeof value === "number" && Number.isFinite(value)) {
              inverted[key] = subtractValue - value
            }
          })
          return inverted
        })(),
        // Detailed scores:
        // - Start from heuristic engine output
        // - For each component, prefer ML regression heads so that
        //   the health cards reflect true model outputs.
        // - Store inverted (110 - value) for display purposes
        detailedScores: (() => {
          const fromEngine = result.detailedScores ?? {}
          const merged: Record<string, number> = { ...fromEngine }
          if (ml) {
            if (selectedComponent === "transformer") {
              const map: Array<[keyof typeof ml, string]> = [
                ["thermalHealth", "temperature"],
                ["oilHealth", "oil"],
                ["dgaHealth", "gas"],
                ["electricalHealth", "electrical"],
                ["oltcHealth", "oltc"],
                ["mechanicalHealth", "mechanical"],
              ]
              for (const [mlKey, blueprintKey] of map) {
                const value = ml[mlKey]
                if (typeof value === "number" && Number.isFinite(value)) {
                  const normalised = value <= 1 ? value * 100 : value
                  merged[blueprintKey] = normalised
                }
              }
            } else if (selectedComponent === "bayLines") {
              const map: Array<[keyof typeof ml, string]> = [
                ["ctHealth", "ct"],
                ["vtHealth", "vt"],
                ["pfStability", "powerFactor"],
                ["frequencyStability", "frequency"],
                ["harmonicsScore", "thd"],
                ["lineStress", "lineCurrent"],
              ]
              for (const [mlKey, blueprintKey] of map) {
                const value = ml[mlKey]
                if (typeof value === "number" && Number.isFinite(value)) {
                  const normalised = value <= 1 ? value * 100 : value
                  merged[blueprintKey] = normalised
                }
              }
            } else if (selectedComponent === "busbar") {
              const map: Array<[keyof typeof ml, string]> = [
                ["thermalStress", "thermal"],
                ["hotspotIndex", "hotspot"],
                ["loadMargin", "load"],
                ["currentMargin", "current"],
                ["impedanceRise", "impedance"],
              ]
              for (const [mlKey, blueprintKey] of map) {
                const value = ml[mlKey]
                if (typeof value === "number" && Number.isFinite(value)) {
                  const normalised = value <= 1 ? value * 100 : value
                  merged[blueprintKey] = normalised
                }
              }
            } else if (selectedComponent === "isolator") {
              const map: Array<[keyof typeof ml, string]> = [
                ["statusHealth", "status"],
                ["alignmentHealth", "alignment"],
                ["contactHealth", "contact"],
                ["torqueHealth", "torque"],
                ["mismatchHealth", "mismatch"],
              ]
              for (const [mlKey, blueprintKey] of map) {
                const value = ml[mlKey]
                if (typeof value === "number" && Number.isFinite(value)) {
                  const normalised = value <= 1 ? value * 100 : value
                  merged[blueprintKey] = normalised
                }
              }
            } else if (selectedComponent === "circuitBreaker") {
              const map: Array<[keyof typeof ml, string]> = [
                ["sf6Health", "sf6"],
                ["operationDuty", "operations"],
                ["timingIndex", "timing"],
                ["coilIntegrity", "coilResistance"],
                ["wearIndex", "mechanism"],
              ]
              for (const [mlKey, blueprintKey] of map) {
                const value = ml[mlKey]
                if (typeof value === "number" && Number.isFinite(value)) {
                  const normalised = value <= 1 ? value * 100 : value
                  merged[blueprintKey] = normalised
                }
              }
            }
          }
          // Ensure "overall" mirrors ML true/overall health where available
          if (typeof resolvedOverallHealth === "number" && Number.isFinite(resolvedOverallHealth)) {
            const normalisedOverall =
              resolvedOverallHealth <= 1 ? resolvedOverallHealth * 100 : resolvedOverallHealth
            merged.overall = normalisedOverall
          }
          // Invert all values (110 - value for most, 130 - value for transformer) for storage
          const inverted: Record<string, number> = {}
          const subtractValue = selectedComponent === "transformer" ? 130 : 110
          Object.entries(merged).forEach(([key, value]) => {
            if (typeof value === "number" && Number.isFinite(value)) {
              inverted[key] = subtractValue - value
            }
          })
          return inverted
        })(),
        // Health & probability fields come only from ML when available
        // Store overallHealth inverted (110 - value for most, 130 - value for transformer) for display
        overallHealth: typeof resolvedOverallHealth === "number" && Number.isFinite(resolvedOverallHealth)
          ? (() => {
              const normalized = resolvedOverallHealth <= 1 ? resolvedOverallHealth * 100 : resolvedOverallHealth
              const subtractValue = selectedComponent === "transformer" ? 130 : 110
              return subtractValue - normalized // Store inverted
            })()
          : undefined,
        // Store exact values for Stress Score, Fault Probability, Aging Factor
        faultProbability: resolvedFaultProbability,
        stressScore: typeof ml.stressScore === "number" ? ml.stressScore : undefined,
        agingFactor: typeof ml.agingFactor === "number" ? ml.agingFactor : undefined,
        // Mirror trueHealth for frontend convenience only if ML provided it
        // Store inverted (110 - value for most, 130 - value for transformer) for display
        trueHealth: typeof ml.trueHealth === "number"
          ? (() => {
              const normalized = ml.trueHealth <= 1 ? ml.trueHealth * 100 : ml.trueHealth
              const subtractValue = selectedComponent === "transformer" ? 130 : 110
              return subtractValue - normalized // Store inverted
            })()
          : typeof resolvedOverallHealth === "number" && Number.isFinite(resolvedOverallHealth)
            ? (() => {
                const normalized = resolvedOverallHealth <= 1 ? resolvedOverallHealth * 100 : resolvedOverallHealth
                const subtractValue = selectedComponent === "transformer" ? 130 : 110
                return subtractValue - normalized // Store inverted
              })()
            : undefined,
        // Persist additional ML metadata if present
        riskScore: typeof ml.riskScore === "number" ? ml.riskScore : undefined,
        masterFailureProbability:
          typeof ml.masterFailureProbability === "number" ? ml.masterFailureProbability : undefined,
        prob_30days: typeof ml.prob_30days === "number" ? ml.prob_30days : undefined,
        prob_90days: typeof ml.prob_90days === "number" ? ml.prob_90days : undefined,
        prob_180days: typeof ml.prob_180days === "number" ? ml.prob_180days : undefined,
        rul_optimistic_months:
          typeof ml.rul_optimistic_months === "number" ? ml.rul_optimistic_months : undefined,
        rul_conservative_months:
          typeof ml.rul_conservative_months === "number" ? ml.rul_conservative_months : undefined,
        // Persist correlation heads when available so the analysis page can
        // render them directly instead of recomputing synthetic values.
        corr_load_hotspot_strength:
          typeof ml.corr_load_hotspot_strength === "number" ? ml.corr_load_hotspot_strength : undefined,
        corr_moisture_dielectric_strength:
          typeof ml.corr_moisture_dielectric_strength === "number"
            ? ml.corr_moisture_dielectric_strength
            : undefined,
        corr_gas_hotspot_strength:
          typeof ml.corr_gas_hotspot_strength === "number" ? ml.corr_gas_hotspot_strength : undefined,
        corr_pf_lineheating_strength:
          typeof ml.corr_pf_lineheating_strength === "number" ? ml.corr_pf_lineheating_strength : undefined,
        corr_thd_stress_strength:
          typeof ml.corr_thd_stress_strength === "number" ? ml.corr_thd_stress_strength : undefined,
        corr_temp_resistance_strength:
          typeof ml.corr_temp_resistance_strength === "number" ? ml.corr_temp_resistance_strength : undefined,
        corr_load_jointtemp_strength:
          typeof ml.corr_load_jointtemp_strength === "number" ? ml.corr_load_jointtemp_strength : undefined,
        corr_torque_contact_strength:
          typeof ml.corr_torque_contact_strength === "number" ? ml.corr_torque_contact_strength : undefined,
        corr_sf6_temperature_strength:
          typeof ml.corr_sf6_temperature_strength === "number" ? ml.corr_sf6_temperature_strength : undefined,
        corr_operations_wear_strength:
          typeof ml.corr_operations_wear_strength === "number"
            ? ml.corr_operations_wear_strength
            : undefined,
        transformerHealth: result.transformerHealth,
        bayLineHealth: result.bayLineHealth,
        breakerHealth: result.breakerHealth,
        isolatorHealth: result.isolatorHealth,
        busbarHealth: result.busbarHealth,
        faultPredictions: result.faultPredictions,
        diagnosis: result.diagnosis,
        videoUrl: resolvedVideoUrl,
        timestamp: new Date().toISOString(),
      }

      const simulationForSolution = {
        id: docRef.id,
        ...baseSimulationData,
      } as SimulationData

      const solutionPayload = await generateSolutionPackage(simulationForSolution)

      const simulationRecord = removeUndefined({
        ...baseSimulationData,
        solution: solutionPayload,
      }) as typeof baseSimulationData & { solution: typeof solutionPayload }

      console.log("[Simulation] Saving simulation record:", {
        simulationId: docRef.id,
        componentType: selectedComponent,
        hasMLData: !!mlPrediction,
        mlKeys: mlPrediction ? Object.keys(mlPrediction) : [],
        overallHealth: baseSimulationData.overallHealth,
        trueHealth: baseSimulationData.trueHealth,
        faultProbability: baseSimulationData.faultProbability,
        videoUrl: resolvedVideoUrl,
      })
      await setDoc(docRef, simulationRecord)
      console.log("[Simulation] Simulation record saved successfully")

      // Navigate to analysis page with simulation ID
      setActiveTab("analysis")
      router.push(`/simulation?tab=analysis&simulationId=${docRef.id}&substationId=${substation.id}`)
    } catch (err) {
      console.error("Error running simulation:", err)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Search Bar */}
      <SubstationSearchBar onSubstationSelect={setSubstation} />

      {/* Component Selector Navigation */}
      <ComponentSelectorNav />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Left Column - Inputs */}
        <Card className="h-full flex flex-col overflow-hidden">
          <CardHeader className="flex-shrink-0 border-b">
            <CardTitle>Simulation Inputs</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 flex flex-col p-4">
            <div className="flex-1 overflow-y-auto pr-2">
              <SimulationInputFields
                inputs={getCurrentInputs()}
                onInputChange={updateInput}
              />
            </div>
            <div className="pt-4 mt-4 border-t flex-shrink-0">
              <RunSimulationButton
                substation={substation}
                isRunning={isRunning}
                onRun={handleRunSimulation}
              />
            </div>
          </CardContent>
        </Card>

        {/* Right Column - 3D Model */}
        <SimulationModelViewer ref={modelViewerRef} inputValues={getCurrentInputs()} />
      </div>
    </div>
  )
}
