"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { COMPONENT_DEFINITIONS } from "@/lib/diagnosis/component-config"
import type { DiagnosisComponentKey } from "@/lib/diagnosis/types"

interface FirebaseReadings {
  [key: string]: number | string | null
}

// Client-side cache for live trend readings (separate from diagnosis cache)
const liveTrendCache = new Map<string, { readings: FirebaseReadings; timestamp: string; cachedAt: number }>()
const CACHE_TTL = 30000 // 30 seconds cache TTL

/**
 * Lightweight hook for live trend pages
 * Uses /api/diagnosis/readings endpoint (no ML processing) for fast loading
 * Includes client-side caching to avoid refetching when switching categories
 */
export function useLiveTrendReadings(
  component: DiagnosisComponentKey,
  areaCode: string,
) {
  const [readings, setReadings] = useState<FirebaseReadings>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null)
  const lastTimestampRef = useRef<string | null>(null)
  const cacheKeyRef = useRef<string>("")

  // Check client-side cache first
  const checkClientCache = useMemo(() => {
    const cacheKey = `${areaCode}-${component}`
    cacheKeyRef.current = cacheKey
    const cached = liveTrendCache.get(cacheKey)
    
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
      return cached
    }
    return null
  }, [areaCode, component])

  useEffect(() => {
    if (!areaCode) {
      setIsLoading(false)
      setIsInitialLoad(false)
      return
    }

    // If we have valid cached data, use it immediately
    const cached = checkClientCache
    if (cached) {
      setReadings(cached.readings)
      setLastTimestamp(cached.timestamp)
      lastTimestampRef.current = cached.timestamp
      setIsLoading(false)
      setIsInitialLoad(false)
    }

    // Initial fetch (or refresh if cache expired)
    const initialFetch = async () => {
      try {
        if (!cached) {
          setIsLoading(true)
        }
        setError(null)
        
        // First get the latest timestamp
        let targetTimestamp: string | null = null
        try {
          const timestampResponse = await fetch("/api/diagnosis/timestamp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ areaCode }),
          })
          
          if (timestampResponse.ok) {
            const timestampData = await timestampResponse.json()
            targetTimestamp = timestampData.timestamp
          }
        } catch (err) {
          console.debug("Error fetching timestamp:", err)
        }
        
        // Fetch readings using lightweight API (no ML processing)
        const response = await fetch("/api/diagnosis/readings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            areaCode,
            componentType: component,
            timestamp: targetTimestamp, // Use latest timestamp if available
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch readings: ${response.status} ${response.statusText}`)
        }

        let data
        try {
          data = await response.json()
        } catch (parseError) {
          throw new Error("Failed to parse response")
        }

        const fetchedReadings = data.readings || {}
        const fetchedTimestamp = data.timestamp || new Date().toISOString()
        
        setReadings(fetchedReadings)
        setLastTimestamp(fetchedTimestamp)
        lastTimestampRef.current = fetchedTimestamp
        
        // Update client-side cache
        const cacheKey = cacheKeyRef.current
        liveTrendCache.set(cacheKey, {
          readings: fetchedReadings,
          timestamp: fetchedTimestamp,
          cachedAt: Date.now(),
        })
        
        // Clean up old cache entries (keep only last 20)
        if (liveTrendCache.size > 20) {
          const entries = Array.from(liveTrendCache.entries())
          entries.sort((a, b) => b[1].cachedAt - a[1].cachedAt)
          for (let i = 20; i < entries.length; i++) {
            liveTrendCache.delete(entries[i][0])
          }
        }
        
        setIsInitialLoad(false)
      } catch (err) {
        console.error("Error fetching live trend readings:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch readings")
        setReadings({})
        setIsInitialLoad(false)
      } finally {
        setIsLoading(false)
      }
    }

    // Only fetch if we don't have cached data
    if (!cached) {
      initialFetch()
    }

    // Check for timestamp updates (lightweight check)
    const checkTimestamp = async () => {
      try {
        const response = await fetch("/api/diagnosis/timestamp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ areaCode }),
        })

        if (!response.ok) {
          return // Silently fail - keep showing last values
        }

        let data
        try {
          data = await response.json()
        } catch (parseError) {
          console.debug("Error parsing timestamp response:", parseError)
          return
        }

        const currentTimestamp = data.timestamp

        // Only fetch full data if timestamp changed
        if (currentTimestamp && currentTimestamp !== lastTimestampRef.current) {
          // Fetch only readings for the new timestamp (lightweight, no ML processing)
          const readingsResponse = await fetch("/api/diagnosis/readings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              areaCode,
              componentType: component,
              timestamp: currentTimestamp, // Use the new timestamp directly
            }),
          })

          if (!readingsResponse.ok) {
            console.warn(`Failed to fetch updated readings: ${readingsResponse.status} ${readingsResponse.statusText}`)
            return
          }

          try {
            const readingsData = await readingsResponse.json()
            const fetchedReadings = readingsData.readings || {}
            setReadings(fetchedReadings)
            setLastTimestamp(currentTimestamp)
            lastTimestampRef.current = currentTimestamp
            
            // Update cache
            const cacheKey = cacheKeyRef.current
            liveTrendCache.set(cacheKey, {
              readings: fetchedReadings,
              timestamp: currentTimestamp,
              cachedAt: Date.now(),
            })
          } catch (parseError) {
            console.error("Error parsing updated readings response:", parseError)
          }
        }
        // If timestamp unchanged, keep showing last values (no loading state)
      } catch (err) {
        // Silently fail - keep showing last values
        console.debug("Error checking timestamp:", err)
      }
    }

    // Check timestamp every 5 seconds (lightweight)
    const interval = setInterval(checkTimestamp, 5000)
    return () => clearInterval(interval)
  }, [component, areaCode, checkClientCache])

  // Get parameter definitions for this component
  const definition = COMPONENT_DEFINITIONS[component]
  const parameters = definition?.parameters || []

  return {
    readings,
    parameters,
    isLoading: isInitialLoad ? isLoading : false, // Only show loading on initial load
    error,
    lastTimestamp,
  }
}

