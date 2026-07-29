"use client"

import { useEffect, useState, useRef } from "react"
import { fetchScadaData, mapScadaToFrontendFormat, type ScadaData, type MappedFrontendData } from "@/lib/scada/scada-adapter"
import { useDataSource } from "@/lib/scada/data-source-context"

const POLL_INTERVAL = 2000 // 2 seconds

interface UseScadaDataResult {
  data: MappedFrontendData | null
  rawData: ScadaData | null // Raw data including asset metadata for IP address format
  isLoading: boolean
  error: string | null
  lastUpdate: string | null
}

/**
 * Hook to fetch and poll SCADA data
 */
export function useScadaData(): UseScadaDataResult {
  const { dataSource, scadaUrl } = useDataSource()
  const [data, setData] = useState<MappedFrontendData | null>(null)
  const [rawData, setRawData] = useState<ScadaData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastLoggedErrorRef = useRef<string | null>(null)

  useEffect(() => {
    // Only fetch if SCADA mode is active
    if (dataSource !== "scada") {
      setData(null)
      setRawData(null)
      setError(null)
      setIsLoading(false)
      lastLoggedErrorRef.current = null // Reset error logging when switching away from SCADA
      return
    }

    const fetchData = async () => {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      try {
        // Only show loading on initial fetch, not on polling updates (to avoid flickering)
        if (!data && !rawData) {
          setIsLoading(true)
        }
        setError(null)

        // Use longer timeout for SCADA server (10 seconds)
        const scadaData = await fetchScadaData(scadaUrl, 10000)
        const mappedData = mapScadaToFrontendFormat(scadaData)

        setData(mappedData)
        setRawData(scadaData) // Preserve raw data with asset metadata
        setLastUpdate(new Date().toISOString())
        setError(null) // Clear any previous errors on success
        lastLoggedErrorRef.current = null // Reset error logging on success
      } catch (err) {
        // Ignore abort errors (request was cancelled intentionally)
        if (err instanceof Error && err.name === "AbortError") {
          return
        }
        
        // Handle timeout and network errors gracefully
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch SCADA data"
        
        // Only update error state, don't log to console for expected errors (timeout, network)
        // This prevents console spam when server is offline
        if (err instanceof Error && (err.name === "TimeoutError" || err.name === "NetworkError")) {
          setError(errorMessage)
          // Log only once per error type to avoid console spam
          if (lastLoggedErrorRef.current !== errorMessage) {
            console.warn(`[SCADA] ${err.name}: ${errorMessage}`)
            lastLoggedErrorRef.current = errorMessage
          }
        } else {
          // Log unexpected errors (but only once per unique error)
          setError(errorMessage)
          if (lastLoggedErrorRef.current !== errorMessage) {
            console.error("SCADA fetch error:", err)
            lastLoggedErrorRef.current = errorMessage
          }
        }
        
        // Keep last data on error (don't clear it) - allows UI to continue showing last known state
      } finally {
        setIsLoading(false)
      }
    }

    // Initial fetch
    fetchData()

    // Set up polling interval
    intervalRef.current = setInterval(fetchData, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [dataSource, scadaUrl])

  return {
    data,
    rawData,
    isLoading,
    error,
    lastUpdate,
  }
}

/**
 * Hook to get SCADA data for a specific component
 */
export function useScadaComponentData(component: string): {
  readings: Record<string, number | string | null>
  isLoading: boolean
  error: string | null
} {
  const { data, isLoading, error } = useScadaData()

  // Map component names to the correct keys in MappedFrontendData
  // The mapped data uses camelCase keys: bayLines, circuitBreaker, etc.
  const componentKeyMap: Record<string, keyof MappedFrontendData> = {
    baylines: "bayLines",
    circuitbreaker: "circuitBreaker",
    transformer: "transformer",
    busbar: "busbar",
    isolator: "isolator",
  }
  
  const normalizedComponent = component.toLowerCase()
  const componentKey = componentKeyMap[normalizedComponent] || (normalizedComponent as keyof MappedFrontendData)
  const readings = data?.[componentKey] || {}

  return {
    readings,
    isLoading,
    error,
  }
}

