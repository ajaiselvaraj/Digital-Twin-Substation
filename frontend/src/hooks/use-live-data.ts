"use client"

// Hook for generating live data (random fallback with Firebase overlay)
import { useEffect, useMemo, useState } from "react"
import { onValue, ref } from "firebase/database"

import { useLiveTrend } from "@/components/live-trend/live-trend-context"
import { realtimeDB } from "@/lib/firebase/config"

/**
 * Generate random value with small deviation from baseline (positive values only)
 */
const randomDeviation = (baseline: number, deviationPercent: number = 5): number => {
  const deviation = baseline * (deviationPercent / 100)
  const min = Math.max(0, baseline - deviation) // Ensure positive
  const max = baseline + deviation
  return Number((Math.random() * (max - min) + min).toFixed(2))
}

const randomRange = (min: number, max: number, digits: number = 2): number => {
  return Number((Math.random() * (max - min) + min).toFixed(digits))
}

/**
 * Generate random integer with small deviation from baseline
 */
const randomIntDeviation = (baseline: number, deviationPercent: number = 5): number => {
  const deviation = Math.max(1, Math.floor(baseline * (deviationPercent / 100)))
  const min = Math.max(0, baseline - deviation)
  const max = baseline + deviation
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const REALTIME_CATEGORY_KEYS: Record<string, string> = {
  substation: "substation",
  bayLines: "bayLines",
  transformer: "transformer",
  circuitBreaker: "circuitBreaker",
  isolator: "isolator",
  busbar: "busbar",
  others: "others",
}

/**
 * Hook for live data generation.
 * Always keeps a synthetic baseline alive so parameters/graphs stay populated,
 * but overlays realtime Firebase readings for any sensors that the backend publishes
 * for the selected area (picked from the live trend search bar).
 */
export function useLiveData<T extends Record<string, number | string>>(
  category: string,
  dataGenerator: () => T,
  refreshInterval: number = 3000,
): T {
  const initialBaseline = {} as T
  const [baselineData, setBaselineData] = useState<T>(initialBaseline)
  const [realtimeState, setRealtimeState] = useState<{ key: string | null; data: Partial<T> }>({
    key: null,
    data: {},
  })
  const liveTrendContext = useLiveTrend(true)
  const selectedAreaKey = liveTrendContext?.selectedArea?.key?.trim() ?? null
  const selectedAreaCode = liveTrendContext?.selectedArea?.areaCode?.trim() ?? null

  // Generate baseline synthetic values continuously (acts as placeholder + fills gaps)
  useEffect(() => {
    if (typeof window === "undefined") return
    let mounted = true
    queueMicrotask(() => {
      if (mounted) {
        setBaselineData(dataGenerator())
      }
    })
    const interval = setInterval(() => setBaselineData(dataGenerator()), refreshInterval)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [dataGenerator, refreshInterval])

  // Overlay realtime Firebase readings whenever an area is selected
  useEffect(() => {
    if (!selectedAreaKey || typeof window === "undefined") {
      queueMicrotask(() => {
        setRealtimeState({ key: null, data: {} })
      })
      return
    }

    // For "others" category, fetch from API endpoint that combines all sub-components
    if (category === "others") {
      if (!selectedAreaCode) {
        queueMicrotask(() => {
          setRealtimeState({ key: null, data: {} })
        })
        return
      }
      
      const fetchOthersData = async () => {
        try {
          // Fetch latest timestamp first
          const timestampResponse = await fetch("/api/diagnosis/timestamp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ areaCode: selectedAreaCode }),
          })
          
          let targetTimestamp: string | null = null
          if (timestampResponse.ok) {
            const timestampData = await timestampResponse.json()
            targetTimestamp = timestampData.timestamp
          }
          
          if (!targetTimestamp) {
            setRealtimeState({ key: selectedAreaKey, data: {} })
            return
          }
          
          // Fetch data from all "others" sub-components: relay, pmu, gis, battery, environment
          const othersComponents = ["relay", "pmu", "gis", "battery", "environment"]
          const combinedData: Partial<T> = {}
          
          const promises = othersComponents.map(async (component) => {
            try {
              const response = await fetch("/api/diagnosis/readings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  areaCode: selectedAreaCode,
                  componentType: component,
                  timestamp: targetTimestamp,
                }),
              })
              
              if (response.ok) {
                const data = await response.json()
                if (data.readings) {
                  Object.assign(combinedData, data.readings)
                }
              }
            } catch (err) {
              console.error(`Error fetching ${component} for others:`, err)
            }
          })
          
          await Promise.allSettled(promises)
          setRealtimeState({ key: selectedAreaKey, data: combinedData })
        } catch (error) {
          console.error("Error fetching others data from Firebase:", error)
          setRealtimeState({ key: selectedAreaKey, data: {} })
        }
      }
      
      fetchOthersData()
      
      // Poll for updates every 5 seconds
      const interval = setInterval(fetchOthersData, 5000)
      return () => clearInterval(interval)
    }

    // For other categories, use realtime subscription
    if (!realtimeDB) {
      queueMicrotask(() => {
        setRealtimeState({ key: null, data: {} })
      })
      return
    }

    const componentKey = REALTIME_CATEGORY_KEYS[category] ?? category
    const path = `${selectedAreaKey}/${componentKey}`
    const dbRef = ref(realtimeDB, path)

    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setRealtimeState({ key: selectedAreaKey, data: {} })
          return
        }
        const payload = snapshot.val()
        if (payload && typeof payload === "object") {
          setRealtimeState({ key: selectedAreaKey, data: payload as Partial<T> })
        } else {
          setRealtimeState({ key: selectedAreaKey, data: {} })
        }
      },
      (error) => {
        console.error("Firebase realtime subscription failed", error)
        setRealtimeState({ key: selectedAreaKey, data: {} })
      },
    )

    return () => {
      unsubscribe()
    }
  }, [category, selectedAreaKey, selectedAreaCode])

  const realtimeData = useMemo(() => {
    if (!selectedAreaKey) {
      return {}
    }
    return realtimeState.key === selectedAreaKey ? realtimeState.data : {}
  }, [realtimeState, selectedAreaKey])

  return useMemo(() => {
    return {
      ...baselineData,
      ...realtimeData,
    } as T
  }, [baselineData, realtimeData])
}

/**
 * Data generators for each category
 */
export const dataGenerators = {
  substation: () => ({
    // Small deviations from typical baselines
    voltage: randomDeviation(330, 3), // 330kV ± 3%
    busVoltage: randomDeviation(330, 3),
    mw: randomDeviation(250, 5), // 250MW ± 5%
    mvar: randomDeviation(50, 10), // 50MVAR ± 10%
    frequency: randomDeviation(50, 0.5), // 50Hz ± 0.5%
    powerFactor: randomDeviation(0.95, 2), // 0.95 ± 2%
    // Additional substation parameters
    current: randomDeviation(1000, 5), // 1000A ± 5%
    lineCurrent: randomDeviation(1200, 6),
    apparentPower: randomDeviation(300, 5), // 300MVA ± 5%
    phaseVoltageA: randomDeviation(190, 3),
    phaseVoltageB: randomDeviation(190, 3),
    phaseVoltageC: randomDeviation(190, 3),
    phaseCurrentA: randomDeviation(1000, 5),
    phaseCurrentB: randomDeviation(1000, 5),
    phaseCurrentC: randomDeviation(1000, 5),
    voltageAngle: randomRange(-25, 25),
    currentAngle: randomRange(-20, 20),
    rocof: randomRange(-0.5, 0.5),
    thd: randomRange(1, 6),
  }),

  transformer: () => ({
    oilLevel: randomDeviation(95, 2), // 95% ± 2%
    oilTemperature: randomDeviation(55, 8), // 55°C ± 8%
    gasLevel: randomDeviation(200, 15), // 200ppm ± 15%
    windingTemperature: randomDeviation(65, 10), // 65°C ± 10%
    tapPosition: randomIntDeviation(0, 20), // 0 ± 20%
    transformerLoading: randomDeviation(85, 15),
    hydrogenGas: randomDeviation(150, 20),
    acetyleneGas: randomRange(0, 20),
    oilMoisture: randomDeviation(20, 30),
    buchholzAlarm: Math.random() > 0.97 ? "Trip" : Math.random() > 0.9 ? "Alarm" : "Normal",
    coolingStatus: Math.random() > 0.2 ? "ON" : "OFF",
  }),

  bayLines: () => ({
    ctLoading: randomDeviation(70, 8), // 70% ± 8%
    ptVoltageDeviation: randomDeviation(100, 3), // 100% ± 3%
    frequency: randomDeviation(50, 0.5), // 50Hz ± 0.5%
    powerFactor: randomDeviation(0.95, 2), // 0.95 ± 2%
    mw: randomDeviation(250, 5), // 250MW ± 5%
  }),

  circuitBreaker: () => ({
    sf6Density: randomRange(6.2, 7.8), // bar
    operationCount: randomIntDeviation(5000, 5), // 5000 ± 5%
    breakerStatus: Math.random() > 0.1 ? "Closed" : "Open", // Mostly closed
    operationTime: randomDeviation(55, 15),
  }),

  isolator: () => ({
    status: Math.random() > 0.2 ? "Closed" : "Open", // Mostly closed
    driveTorque: randomDeviation(4500, 10), // N·m
    operatingTime: randomDeviation(3.5, 15), // seconds
    contactResistance: randomRange(40, 120, 1), // µΩ
    motorCurrent: randomDeviation(18, 15), // A
  }),

  busbar: () => ({
    busVoltage: randomDeviation(400, 2),
    busCurrent: randomDeviation(2500, 8),
    busbarTemperature: randomDeviation(65, 12),
    jointHotspotTemp: randomDeviation(85, 10),
    busbarLoad: randomDeviation(75, 12),
    impedanceMicroOhm: randomDeviation(55, 8),
  }),

  others: () => ({
    // Protection
    relayStatus: Math.random() > 0.05 ? "Active" : "Inactive", // Mostly active
    tripCount: randomIntDeviation(100, 10), // 100 ± 10%
    earthFaultCurrent: randomDeviation(120, 25),
    differentialCurrent: randomRange(0, 2, 3),
    tripCommand: Math.random() > 0.96 ? "ON" : "OFF",
    // Phasor
    phaseAngle: randomDeviation(0, 5), // 0° ± 5%
    phasorMagnitude: randomDeviation(1.0, 2), // 1.0 p.u. ± 2%
    voltagePhasor: `${randomDeviation(330, 2).toFixed(1)} ∠ ${randomRange(-10, 10).toFixed(1)}°`,
    currentPhasor: `${randomDeviation(1000, 4).toFixed(0)} ∠ ${randomRange(-12, 12).toFixed(1)}°`,
    angleDifference: randomRange(5, 35),
    // GIS
    gisPressure: randomDeviation(5, 5), // 5 bar ± 5%
    gisTemperature: randomDeviation(25, 10), // 25°C ± 10%
    partialDischarge: randomRange(50, 400),
    // Battery
    batteryVoltage: randomDeviation(52, 3), // 52V ± 3%
    batteryCurrent: randomDeviation(5, 20), // 5A ± 20%
    batterySOC: randomDeviation(85, 5), // 85% ± 5%
    dcVoltage: randomDeviation(220, 4),
    busDifferentialCurrent: randomRange(0, 3, 2),
    // Environment
    ambientTemperature: randomDeviation(30, 15), // 30°C ± 15%
    humidity: randomDeviation(60, 10), // 60% ± 10%
  }),
}

