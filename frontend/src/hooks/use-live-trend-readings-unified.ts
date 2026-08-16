"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { COMPONENT_DEFINITIONS } from "@/lib/diagnosis/component-config"
import type { DiagnosisComponentKey } from "@/lib/diagnosis/types"
import { useLiveTrendReadings } from "./use-live-trend-readings"
import { useScadaComponentData } from "./use-scada-data"
import { useDataSource } from "@/lib/scada/data-source-context"

interface FirebaseReadings {
  [key: string]: number | string | null
}

/**
 * Unified hook for live trend readings that works with both Firebase and SCADA
 */
export function useLiveTrendReadingsUnified(
  component: DiagnosisComponentKey,
  areaCode: string,
) {
  const { dataSource } = useDataSource()
  // Only fetch Firebase if not in SCADA mode
  const firebaseResult = useLiveTrendReadings(component, dataSource === "firebase" ? areaCode : "")
  const scadaResult = useScadaComponentData(component)

  // Track initial load state for SCADA to prevent reloading on updates
  const [isInitialScadaLoad, setIsInitialScadaLoad] = useState(true)
  const hasScadaDataRef = useRef(false)

  useEffect(() => {
    if (dataSource === "scada") {
      const hasReadings = Object.keys(scadaResult.readings).length > 0
      if (hasReadings && !hasScadaDataRef.current) {
        hasScadaDataRef.current = true
        setIsInitialScadaLoad(false)
      }
    } else {
      hasScadaDataRef.current = false
      setIsInitialScadaLoad(true)
    }
  }, [dataSource, scadaResult.readings])

  const result = useMemo(() => {
    if (dataSource === "scada") {
      return {
        readings: scadaResult.readings,
        parameters: COMPONENT_DEFINITIONS[component]?.parameters || [],
        // Only show loading on initial load, not on subsequent updates
        isLoading: scadaResult.isLoading && isInitialScadaLoad,
        error: scadaResult.error,
        lastTimestamp: null,
      }
    } else {
      return {
        readings: firebaseResult.readings,
        parameters: firebaseResult.parameters,
        isLoading: firebaseResult.isLoading,
        error: firebaseResult.error,
        lastTimestamp: firebaseResult.lastTimestamp,
      }
    }
  }, [dataSource, component, firebaseResult, scadaResult, isInitialScadaLoad])

  return result
}

