"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import type { DiagnosisComponentKey } from "@/lib/diagnosis/types"

interface ComponentReadings {
  [component: string]: {
    [key: string]: number | string | null
  }
}

// Client-side cache to avoid refetching when switching categories
const clientCache = new Map<string, { readings: ComponentReadings; timestamp: string; cachedAt: number }>()
const CACHE_TTL = 30000 // 30 seconds cache TTL

/**
 * Hook to fetch ALL readings from Firebase for all components
 * Uses lightweight readings API (no ML processing) for better performance
 * Includes client-side caching to avoid refetching when switching categories
 */
export function useAllFirebaseReadings(areaCode: string, substationId?: string) {
  const [allReadings, setAllReadings] = useState<ComponentReadings>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null)
  const lastTimestampRef = useRef<string | null>(null)
  const cacheKeyRef = useRef<string>("")

  const components: DiagnosisComponentKey[] = [
    "bayLines",
    "transformer",
    "circuitBreaker",
    "busbar",
    "isolator",
  ]

  // Check client-side cache first
  const checkClientCache = useMemo(() => {
    const cacheKey = `${areaCode}-${substationId || ""}`
    cacheKeyRef.current = cacheKey
    const cached = clientCache.get(cacheKey)
    
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
      return cached
    }
    return null
  }, [areaCode, substationId])

  useEffect(() => {
    if (!areaCode) {
      setIsLoading(false)
      setIsInitialLoad(false)
      return
    }

    // If we have valid cached data, use it immediately
    const cached = checkClientCache
    if (cached) {
      setAllReadings(cached.readings)
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
        
        const readings: ComponentReadings = {}
        
        // Use lightweight readings API instead of full component API (no ML processing)
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
        
        // Fetch readings for all components in parallel using lightweight API
        const promises = components.map(async (component) => {
          try {
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
              console.warn(`Failed to fetch ${component} readings: ${response.status} ${response.statusText}`)
              readings[component] = {}
              return
            }

            try {
              const data = await response.json()
              readings[component] = data.readings || {}
              // Use first component's timestamp as reference
              if (component === components[0] && data.timestamp) {
                targetTimestamp = data.timestamp
              }
            } catch (parseError) {
              console.error(`Error parsing ${component} response:`, parseError)
              readings[component] = {}
            }
          } catch (err) {
            // Handle network errors, CORS, etc.
            console.error(`Error fetching ${component} readings:`, err)
            readings[component] = {}
          }
        })

        // Use allSettled so one failure doesn't block others
        await Promise.allSettled(promises)
        
        const finalTimestamp = targetTimestamp || new Date().toISOString()
        setAllReadings(readings)
        setLastTimestamp(finalTimestamp)
        lastTimestampRef.current = finalTimestamp
        
        // Update client-side cache
        const cacheKey = cacheKeyRef.current
        clientCache.set(cacheKey, {
          readings,
          timestamp: finalTimestamp,
          cachedAt: Date.now(),
        })
        
        // Clean up old cache entries (keep only last 10)
        if (clientCache.size > 10) {
          const entries = Array.from(clientCache.entries())
          entries.sort((a, b) => b[1].cachedAt - a[1].cachedAt)
          for (let i = 10; i < entries.length; i++) {
            clientCache.delete(entries[i][0])
          }
        }
        
        setIsInitialLoad(false)
      } catch (err) {
        console.error("Error fetching all Firebase readings:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch readings")
        setAllReadings({})
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
          const readings: ComponentReadings = {}
          
          const promises = components.map(async (component) => {
            try {
              const response = await fetch("/api/diagnosis/readings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  areaCode,
                  componentType: component,
                  timestamp: currentTimestamp, // Use the new timestamp directly
                }),
              })

              if (!response.ok) {
                console.warn(`Failed to fetch ${component} readings: ${response.status} ${response.statusText}`)
                readings[component] = {}
                return
              }

              try {
                const data = await response.json()
                readings[component] = data.readings || {}
              } catch (parseError) {
                console.error(`Error parsing ${component} response:`, parseError)
                readings[component] = {}
              }
            } catch (err) {
              // Handle network errors, CORS, etc.
              console.error(`Error fetching ${component} readings:`, err)
              readings[component] = {}
            }
          })

          // Use allSettled so one failure doesn't block others
          await Promise.allSettled(promises)
          setAllReadings(readings)
          setLastTimestamp(currentTimestamp)
          lastTimestampRef.current = currentTimestamp
          
          // Update cache
          const cacheKey = cacheKeyRef.current
          clientCache.set(cacheKey, {
            readings,
            timestamp: currentTimestamp,
            cachedAt: Date.now(),
          })
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
  }, [areaCode, substationId, checkClientCache])

  return {
    allReadings,
    isLoading: isInitialLoad ? isLoading : false, // Only show loading on initial load
    error,
    lastTimestamp,
  }
}

