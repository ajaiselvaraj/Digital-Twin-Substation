"use client"

import { useEffect, useState, useRef } from "react"
import { COMPONENT_DEFINITIONS } from "@/lib/diagnosis/component-config"
import type { DiagnosisComponentKey } from "@/lib/diagnosis/types"

interface FirebaseReadings {
  [key: string]: number | string | null
}

/**
 * Hook to fetch live readings from Firebase for a component
 * Checks timestamp first - only fetches full data if timestamp changed
 * Shows last values while checking for updates
 */
export function useFirebaseReadings(
  component: DiagnosisComponentKey,
  areaCode: string,
  substationId?: string,
) {
  const [readings, setReadings] = useState<FirebaseReadings>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null)
  const lastTimestampRef = useRef<string | null>(null)

  useEffect(() => {
    if (!areaCode) {
      setIsLoading(false)
      setIsInitialLoad(false)
      return
    }

    // Initial fetch
    const initialFetch = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch("/api/diagnosis/component", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            areaCode,
            substationId: substationId || areaCode,
            componentType: component,
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

        setReadings(data.live_readings || {})
        // Extract timestamp from the response (it's in the snapshot)
        if (data.timestamp) {
          setLastTimestamp(data.timestamp)
          lastTimestampRef.current = data.timestamp
        }
        setIsInitialLoad(false)
      } catch (err) {
        console.error("Error fetching Firebase readings:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch readings")
        setReadings({})
        setIsInitialLoad(false)
      } finally {
        setIsLoading(false)
      }
    }

    initialFetch()

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
            setReadings(readingsData.readings || {})
            setLastTimestamp(currentTimestamp)
            lastTimestampRef.current = currentTimestamp
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
  }, [component, areaCode, substationId])

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

