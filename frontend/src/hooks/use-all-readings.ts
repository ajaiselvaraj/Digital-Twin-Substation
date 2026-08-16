"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { useAllFirebaseReadings } from "./use-all-firebase-readings"
import { useScadaData } from "./use-scada-data"
import { useDataSource } from "@/lib/scada/data-source-context"

interface ComponentReadings {
  [component: string]: {
    [key: string]: number | string | null
  }
}

/**
 * Unified hook that returns readings from either Firebase or SCADA based on data source
 */
export function useAllReadings(areaCode: string, substationId?: string) {
  const { dataSource } = useDataSource()
  // Only fetch Firebase if not in SCADA mode
  const firebaseResult = useAllFirebaseReadings(dataSource === "firebase" ? areaCode : "", substationId)
  const scadaResult = useScadaData()

  // Track initial load state for SCADA to prevent reloading on updates
  const [isInitialScadaLoad, setIsInitialScadaLoad] = useState(true)
  const hasScadaDataRef = useRef(false)

  useEffect(() => {
    if (dataSource === "scada") {
      const hasReadings = scadaResult.data && Object.keys(scadaResult.data).length > 0
      if (hasReadings && !hasScadaDataRef.current) {
        hasScadaDataRef.current = true
        setIsInitialScadaLoad(false)
      }
    } else {
      hasScadaDataRef.current = false
      setIsInitialScadaLoad(true)
    }
  }, [dataSource, scadaResult.data])

  const result = useMemo(() => {
    if (dataSource === "scada") {
      return {
        allReadings: (scadaResult.data || {}) as ComponentReadings,
        // Only show loading on initial load, not on subsequent updates
        isLoading: scadaResult.isLoading && isInitialScadaLoad,
        error: scadaResult.error,
        lastTimestamp: scadaResult.lastUpdate,
      }
    } else {
      return {
        allReadings: firebaseResult.allReadings,
        isLoading: firebaseResult.isLoading,
        error: firebaseResult.error,
        lastTimestamp: firebaseResult.lastTimestamp,
      }
    }
  }, [dataSource, scadaResult, firebaseResult, isInitialScadaLoad])

  return result
}

