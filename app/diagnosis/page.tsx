"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { AlertCircle, ShieldAlert } from "lucide-react"

import { DiagnosisSearchBar } from "@/components/diagnosis/diagnosis-search-bar"
import { HealthPanel } from "@/components/diagnosis/health-panel"
import { LivePanel } from "@/components/diagnosis/live-panel"
import { MaintenancePanel } from "@/components/diagnosis/maintenance-panel"
import { MLPanel } from "@/components/diagnosis/ml-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { DiagnosisApiResponse } from "@/lib/diagnosis/types"
import { useToast } from "@/hooks/use-toast"
import { useDiagnosisNav } from "@/components/diagnosis/diagnosis-context"
import type { DummySubstation } from "@/lib/dummy-data"
import { getSubstationByCodeFromFirebase } from "@/lib/firebase-data"
import { getFaultProbabilityTextClass } from "@/lib/simulation-color-coding"
import { cn } from "@/lib/utils"
import { DataSourceToggle } from "@/components/scada/data-source-toggle"
import { useDataSource } from "@/lib/scada/data-source-context"
import { useScadaData } from "@/hooks/use-scada-data"
import { COMPONENT_DEFINITIONS } from "@/lib/diagnosis/component-config"

const severityTone: Record<string, { label: string; className: string }> = {
  normal: { label: "Normal", className: "bg-emerald-100 text-emerald-700" },
  warning: { label: "Warning", className: "bg-amber-100 text-amber-700" },
  alarm: { label: "Alarm", className: "bg-orange-100 text-orange-700" },
  trip: { label: "Trip", className: "bg-red-100 text-red-700" },
}

// Client-side cache for diagnosis data to speed up component switching
const diagnosisCache = new Map<string, { data: DiagnosisApiResponse; timestamp: number }>()
const CACHE_TTL = 60000 // 60 seconds cache TTL
const SCADA_CACHE_TTL = 10000 // 10 seconds to reuse last SCADA response when switching tabs

function getCacheKey(areaCode: string, substationId: string, component: string): string {
  return `${areaCode}-${substationId}-${component}`
}

export default function DiagnosisPage() {
  const { activeComponent } = useDiagnosisNav()
  const { dataSource } = useDataSource()
  const scadaData = useScadaData()
  const [areaInput, setAreaInput] = useState("")
  const [query, setQuery] = useState<{ areaCode: string; substationId: string } | null>(null)
  const [data, setData] = useState<DiagnosisApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const [masterDetails, setMasterDetails] = useState<DummySubstation["master"] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const isInitialFetch = useRef(true)
  const previousComponentRef = useRef<string | null>(null)
  const scadaDataRef = useRef(scadaData)
  const activeComponentRef = useRef(activeComponent)
  const scadaComponentCacheRef = useRef<Map<string, { data: DiagnosisApiResponse; timestamp: number }>>(new Map())

  // Keep refs updated with latest values so polling function always has current values
  useEffect(() => {
    scadaDataRef.current = scadaData
    activeComponentRef.current = activeComponent
  }, [scadaData, activeComponent])

  // Handle data source switching - reset state when switching between SCADA and Firebase
  const previousDataSourceRef = useRef<typeof dataSource | null>(null)
  useEffect(() => {
    const dataSourceChanged = previousDataSourceRef.current !== null && previousDataSourceRef.current !== dataSource
    if (dataSourceChanged) {
      console.log(`[DiagnosisPage] Data source changed from ${previousDataSourceRef.current} to ${dataSource}`)
      // Clear data and reset component tracking when switching data sources
      setData(null)
      setError(null)
      previousComponentRef.current = null // Reset component tracking so new mode treats it as initial load
      setIsLoading(false)
      
      // Clear query when switching to SCADA (SCADA doesn't need area/substation selection)
      if (dataSource === "scada") {
        setQuery(null)
        setAreaInput("")
      }
    }
    // Initialize on first mount
    if (previousDataSourceRef.current === null) {
      previousDataSourceRef.current = dataSource
    } else if (dataSourceChanged) {
      previousDataSourceRef.current = dataSource
    }
  }, [dataSource])

  useEffect(() => {
    // In SCADA mode, fetch data directly from SCADA
    if (dataSource === "scada") {
      console.log(`[DiagnosisPage] SCADA mode active, component: ${activeComponent}`)
      
      // Check if component changed - do this check here but don't update ref yet
      const componentChanged = previousComponentRef.current !== activeComponent
      const isInitialLoad = previousComponentRef.current === null
      
      // Clear data when component changes or on initial load
      if (componentChanged || isInitialLoad) {
        const cacheKey = getCacheKey("SCADA", "SCADA", activeComponent)
        const cached = scadaComponentCacheRef.current.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < SCADA_CACHE_TTL) {
          // Reuse very recent SCADA response so tab switch feels instant
          setData(cached.data)
          setIsLoading(false)
        } else {
          setData(null)
          setIsLoading(true)
        }
        setError(null)
      }
      
      // Wait for SCADA data to be available (only on initial mount or component change)
      if ((componentChanged || isInitialLoad) && !scadaData.data && !scadaData.rawData) {
        if (scadaData.isLoading) {
          setIsLoading(true)
          setError(null)
        } else if (scadaData.error) {
          setIsLoading(false)
          setError(`SCADA connection error: ${scadaData.error}`)
        }
        // Don't return - let the polling function handle it
      }

      const fetchScadaDiagnosis = async () => {
        try {
          setError(null)
          // Get latest component from ref (always current, even from polling interval)
          const currentActiveComponent = activeComponentRef.current
          const currentComponentChanged = previousComponentRef.current !== currentActiveComponent
          
          // Only show loading on initial fetch, component change, or when no data exists
          if (currentComponentChanged || !data) {
            setIsLoading(true)
            console.log(`[DiagnosisPage] Fetching SCADA diagnosis for ${currentActiveComponent} (changed: ${currentComponentChanged})`)
          }
          
          // Update ref AFTER we've detected the change and started fetching
          if (currentComponentChanged) {
            previousComponentRef.current = currentActiveComponent
            console.log(`[DiagnosisPage] Component changed, updated ref to ${currentActiveComponent}`)
          }
          
          // Get latest SCADA data from ref (always current)
          const currentScadaData = scadaDataRef.current
          
          // Check if SCADA data is available
          // For IP data format, check rawData; for legacy format, check data
          const hasData = currentScadaData.rawData || currentScadaData.data
          if (!hasData) {
            if (currentScadaData.error) {
              setError(`SCADA connection error: ${currentScadaData.error}`)
            } else {
              setError("Waiting for SCADA data...")
            }
            setIsLoading(false)
            return
          }

          // Check if SCADA data includes asset metadata (IP address data format)
          // Use rawData which preserves the original structure with assets/master
          const hasAssetMetadata = currentScadaData.rawData && (
            (currentScadaData.rawData as any).assets || 
            (currentScadaData.rawData as any).master ||
            ((currentScadaData.rawData as any).assets && (currentScadaData.rawData as any).assets.master)
          )

          // For IP data format, component readings are in rawData with PascalCase keys
          // For legacy SCADA format, component readings are in scadaData.data with camelCase keys
          let scadaReadings: Record<string, any> = {}
          
          if (hasAssetMetadata && currentScadaData.rawData) {
            // IP data format: extract component readings from rawData using PascalCase component names
            const componentKeyMap: Record<string, string> = {
              bayLines: "BayLines",
              transformer: "Transformer",
              circuitBreaker: "CircuitBreaker",
              busbar: "Busbar",
              isolator: "Isolator",
            }
            const pascalCaseKey = componentKeyMap[currentActiveComponent] || currentActiveComponent
            scadaReadings = (currentScadaData.rawData as any)[pascalCaseKey] || {}
            
            // For IP data format, we always proceed even if readings are empty
            // because the API will extract readings from the ipData structure
            console.log(`[DiagnosisPage] IP data format detected for ${currentActiveComponent}, found ${Object.keys(scadaReadings).length} readings in rawData`)
          } else {
            // Legacy SCADA format: use mapped data with camelCase keys
            const componentKey = currentActiveComponent as keyof typeof currentScadaData.data
            scadaReadings = currentScadaData.data?.[componentKey] || {}
            
            // Only fetch if we have readings for this component (legacy format)
            if (!scadaReadings || Object.keys(scadaReadings).length === 0) {
              console.warn(`No SCADA data available for component: ${currentActiveComponent}`)
              setError(`No SCADA data available for ${currentActiveComponent}. Make sure the SCADA server is sending data for this component.`)
              setIsLoading(false)
              return
            }
          }

          // Call diagnosis API with SCADA data
          const controller = new AbortController()
          let timeoutId: NodeJS.Timeout | null = null
          let isRequestCompleted = false
          
          // Set timeout with proper cleanup
          // Increased to 90 seconds to allow for ML model processing time
          timeoutId = setTimeout(() => {
            // Only abort if request hasn't completed and controller is not already aborted
            if (!isRequestCompleted && timeoutId && !controller.signal.aborted) {
              console.warn(`[DiagnosisPage] Request timeout after 90s, aborting...`)
              try {
                controller.abort()
              } catch (abortErr) {
                // Ignore errors from abort itself (e.g., if already aborted)
                // This prevents "signal is aborted without reason" errors
              }
            }
          }, 90000) // 90 second timeout (increased for ML processing)

          try {
            const requestBody: any = {
              areaCode: "SCADA",
              substationId: "SCADA",
              componentType: currentActiveComponent,
            }

            // If IP address data format (includes assets), pass as ipData
            // Otherwise pass as scadaData (legacy SCADA format)
            if (hasAssetMetadata && currentScadaData.rawData) {
              requestBody.ipData = currentScadaData.rawData
              console.log(`[DiagnosisPage] Sending IP data format for ${currentActiveComponent}, component readings: ${Object.keys(scadaReadings).length} params`)
            } else {
              requestBody.scadaData = scadaReadings
              console.log(`[DiagnosisPage] Sending legacy SCADA format for ${currentActiveComponent}, readings: ${Object.keys(scadaReadings).length} params`)
            }

            const apiUrl =
              typeof window !== "undefined" ? `${window.location.origin}/api/diagnosis/component` : "/api/diagnosis/component"

            const response = await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
              signal: controller.signal,
            })

            // Mark request as completed and clear timeout on successful response
            isRequestCompleted = true
            if (timeoutId) {
              clearTimeout(timeoutId)
              timeoutId = null
            }

            if (!response.ok) {
              let errorText = ""
              try {
                errorText = await response.text()
              } catch {
                errorText = response.statusText
              }
              throw new Error(`API error: ${response.status} ${errorText}`)
            }

            let payload: DiagnosisApiResponse
            try {
              const responseText = await response.text()
              console.log(`[DiagnosisPage] Raw response text length:`, responseText.length)
              payload = JSON.parse(responseText)
              console.log(`[DiagnosisPage] Received response for ${currentActiveComponent}, keys:`, Object.keys(payload))
              console.log(`[DiagnosisPage] Response data:`, {
                hasFaultProbability: 'fault_probability' in payload,
                hasHealthIndex: 'health_index' in payload,
                hasPredictedFault: 'predicted_fault' in payload,
                hasParameterStates: 'parameter_states' in payload,
                hasLiveReadings: 'live_readings' in payload,
                faultProbability: payload.fault_probability,
                healthIndex: payload.health_index,
              })
            } catch (parseError) {
              console.error(`[DiagnosisPage] JSON parse error:`, parseError)
              throw new Error(`Failed to parse response: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
            }
            
            // Update state - ensure this happens even if there are issues
            setData(payload)
            setLastUpdated(new Date().toISOString())
            setIsLoading(false)
            setError(null) // Clear any previous errors
            const scadaCacheKey = getCacheKey("SCADA", "SCADA", currentActiveComponent)
            scadaComponentCacheRef.current.set(scadaCacheKey, { data: payload, timestamp: Date.now() })
            console.log(`[DiagnosisPage] State update called for ${currentActiveComponent} with payload keys:`, Object.keys(payload))
          } catch (fetchErr) {
            // Mark request as completed and clear timeout on error
            isRequestCompleted = true
            if (timeoutId) {
              clearTimeout(timeoutId)
              timeoutId = null
            }
            
            // Re-throw to be handled by outer catch
            throw fetchErr
          }
          } catch (err) {
            // Handle AbortError gracefully (expected when timeout occurs)
            if (err instanceof Error && err.name === "AbortError") {
              // Don't log AbortError as an error - it's expected behavior for timeouts
              setError("Request timeout - the diagnosis API took too long to respond (90s timeout). The ML model may be processing. Please try again.")
              setIsLoading(false)
              return
            }
            
            // Log and handle other errors
            console.error("SCADA diagnosis fetch error:", err)
            if (err instanceof Error) {
              if (err.message.includes("Failed to fetch")) {
                setError("Network error - cannot connect to diagnosis API. Check if the server is running and reachable.")
              } else {
                setError(`Unable to fetch diagnosis data: ${err.message}`)
              }
            } else {
              setError("Unable to fetch diagnosis data from SCADA system")
            }
            setIsLoading(false)
          }
      }

      // Abort controller for SCADA mode to cancel requests when switching data sources
      const scadaAbortController = new AbortController()
      
      // Initial fetch
      setIsLoading(true)
      fetchScadaDiagnosis()

      // Poll every 2 seconds
      const interval = setInterval(() => {
        fetchScadaDiagnosis()
      }, 2000)

      return () => {
        clearInterval(interval)
        scadaAbortController.abort()
        console.log(`[DiagnosisPage] SCADA mode cleanup: stopped polling and aborted requests`)
      }
    }

    // Firebase mode - original logic
    if (!query?.areaCode || !query?.substationId) return
    let isCancelled = false
    const controller = new AbortController()

    // Check cache first for instant display when switching components
    const cacheKey = getCacheKey(query.areaCode, query.substationId, activeComponent)
    const cached = diagnosisCache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      // Show cached data immediately - no loading needed
      setData(cached.data)
      // Safely parse timestamp - handle invalid dates
      try {
        const timestamp = cached.data.timestamp
        if (timestamp) {
          const date = new Date(timestamp)
          if (!isNaN(date.getTime())) {
            setLastUpdated(date.toISOString())
          } else {
            setLastUpdated(new Date().toISOString())
          }
        } else {
          setLastUpdated(new Date().toISOString())
        }
      } catch (error) {
        setLastUpdated(new Date().toISOString())
      }
      setIsLoading(false)
      
      // Still refresh in background, but don't show loading
      const fetchData = async () => {
        try {
          const response = await fetch("/api/diagnosis/component", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              areaCode: query.areaCode,
              substationId: query.substationId,
              componentType: activeComponent,
            }),
            signal: controller.signal,
          })

          if (!response.ok) {
            return // Silently fail if we have cached data
          }

          const payload: DiagnosisApiResponse = await response.json()
          if (!isCancelled) {
            setData(payload)
            setLastUpdated(new Date().toISOString())
            
            // Update cache
            diagnosisCache.set(cacheKey, {
              data: payload,
              timestamp: Date.now(),
            })
          }
        } catch (err) {
          // Silently fail - we have cached data to show
          console.debug("Background refresh failed:", err)
        }
      }
      
      // Refresh in background after a short delay
      const timeout = setTimeout(() => fetchData(), 1000)
      
      // Subsequent fetches without loading indicator (background refresh)
      const interval = setInterval(() => fetchData(), 5000)

      return () => {
        isCancelled = true
        controller.abort()
        clearTimeout(timeout)
        clearInterval(interval)
      }
    } else if (cached) {
      // Cache expired, but show stale data while fetching
      setData(cached.data)
    }

    const fetchData = async (isInitial: boolean) => {
      setError(null)
      if (isInitial && !cached) {
        setIsLoading(true)
      }
      try {
        const response = await fetch("/api/diagnosis/component", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            areaCode: query.areaCode,
            substationId: query.substationId,
            componentType: activeComponent,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("Failed to load diagnosis data")
        }

        const payload: DiagnosisApiResponse = await response.json()
        if (!isCancelled) {
          setData(payload)
          // Safely parse timestamp from payload
          try {
            const timestamp = payload.timestamp
            if (timestamp) {
              const date = new Date(timestamp)
              if (!isNaN(date.getTime())) {
                setLastUpdated(date.toISOString())
              } else {
                setLastUpdated(new Date().toISOString())
              }
            } else {
              setLastUpdated(new Date().toISOString())
            }
          } catch (error) {
            setLastUpdated(new Date().toISOString())
          }
          setIsLoading(false)
          
          // Update cache
          diagnosisCache.set(cacheKey, {
            data: payload,
            timestamp: Date.now(),
          })
          
          // Clean up old cache entries (keep only last 20)
          if (diagnosisCache.size > 20) {
            const entries = Array.from(diagnosisCache.entries())
            entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
            for (let i = 20; i < entries.length; i++) {
              diagnosisCache.delete(entries[i][0])
            }
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error(err)
          // Only show error if we don't have cached data to fall back to
          if (!cached) {
            setError("Unable to fetch diagnosis data. Check Firebase/ML backend.")
          }
          setIsLoading(false)
        }
      }
    }

    // Fetch fresh data if no cache or cache expired
    fetchData(!cached) // Initial fetch with loading only if no cache
    isInitialFetch.current = false
    
    // Subsequent fetches without loading indicator (background refresh)
    const interval = setInterval(() => fetchData(false), 5000)

    return () => {
      isCancelled = true
      controller.abort()
      clearInterval(interval)
      isInitialFetch.current = true // Reset for next query
    }
  }, [query?.areaCode, query?.substationId, activeComponent, refreshToken, dataSource])

  // Debug: Log when data changes
  useEffect(() => {
    if (data) {
      console.log(`[DiagnosisPage] Data state changed for ${activeComponent}:`, {
        hasData: !!data,
        keys: Object.keys(data),
        faultProbability: data.fault_probability,
        healthIndex: data.health_index,
      })
    } else {
      console.log(`[DiagnosisPage] Data state is null for ${activeComponent}`)
    }
  }, [data, activeComponent])

  useEffect(() => {
    let ignore = false
    async function resolveMasterDetails() {
      if (!query?.areaCode) {
        if (!ignore) setMasterDetails(null)
        return
      }
      try {
        const record = await getSubstationByCodeFromFirebase(query.areaCode)
        if (!ignore) {
          setMasterDetails(record?.master ?? null)
        }
      } catch (fetchError) {
        console.warn("Unable to fetch substation master details from Firebase", fetchError)
        if (!ignore) setMasterDetails(null)
      }
    }
    resolveMasterDetails()
    return () => {
      ignore = true
    }
  }, [query?.areaCode])

  // Preload diagnosis data for all components when area is selected (background fetch)
  useEffect(() => {
    const areaCode = query?.areaCode
    const substationId = query?.substationId
    if (!areaCode || !substationId) return

    // Preload diagnosis data for all components in the background
    // This ensures data is cached when user switches components
    const components: Array<"bayLines" | "transformer" | "circuitBreaker" | "busbar" | "isolator"> = [
      "bayLines",
      "transformer",
      "circuitBreaker",
      "busbar",
      "isolator",
    ]

    // Preload all components in parallel (background, no loading indicators)
    components.forEach((component) => {
      const cacheKey = getCacheKey(areaCode, substationId, component)
      const cached = diagnosisCache.get(cacheKey)
      
      // Only preload if not already cached or cache is expired
      if (!cached || Date.now() - cached.timestamp >= CACHE_TTL) {
        fetch("/api/diagnosis/component", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            areaCode,
            substationId,
            componentType: component,
          }),
        })
          .then((res) => {
            if (!res.ok) return null
            return res.json()
          })
          .then((payload: DiagnosisApiResponse | null) => {
            if (payload) {
              // Update cache
              diagnosisCache.set(cacheKey, {
                data: payload,
                timestamp: Date.now(),
              })
            }
          })
          .catch((err) => {
            // Silently fail - this is just preloading
            console.debug(`Preload failed for ${component}:`, err)
          })
      }
    })
  }, [query?.areaCode, query?.substationId])

  const handleSearch = (areaValue: string) => {
    const trimmed = areaValue.trim()
    if (!trimmed) return
    const fallbackId = trimmed
    setQuery({ areaCode: trimmed, substationId: fallbackId })
  }

  const handleNotify = async ({ notes, files }: { notes: string; files: File[] }) => {
    if (!query) return
    await fetch("/api/diagnosis/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "notify",
        areaCode: query.areaCode,
        substationId: query.substationId,
        component: activeComponent,
        notes,
        attachments: files.map((file) => ({ name: file.name, size: file.size })),
      }),
    })
    toast({ title: "Maintenance notified", description: "Alert pushed to /maintenance/workflows" })
  }

  const handleMarkFixed = async ({ notes, files }: { notes: string; files: File[] }) => {
    if (!query) return
    await fetch("/api/diagnosis/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "markFixed",
        areaCode: query.areaCode,
        substationId: query.substationId,
        component: activeComponent,
        notes,
        attachments: files.map((file) => ({ name: file.name, size: file.size })),
      }),
    })
    toast({ title: "Maintenance updated", description: "Closure pushed to /maintenance/workflows" })
  }

  const areaSummary = useMemo(() => {
    if (!data) return null
    const combinedMaster = masterDetails ?? data.asset_metadata?.master ?? data.asset_metadata ?? {}
    return {
      name: combinedMaster.name ?? combinedMaster.areaName ?? query?.areaCode ?? "Unknown Substation",
      area: combinedMaster.areaName ?? "—",
      code: combinedMaster.substationCode ?? query?.areaCode ?? "—",
      voltage: combinedMaster.voltageClass ?? combinedMaster.voltage ?? "—",
      installationYear: combinedMaster.installationYear ?? combinedMaster.installed ?? "—",
      operator: combinedMaster.operator ?? "—",
      notes: combinedMaster.notes ?? "",
      latitude: combinedMaster.latitude ?? null,
      longitude: combinedMaster.longitude ?? null,
    }
  }, [data, query, masterDetails])

  const activeAreaLabel = areaSummary?.name ?? query?.areaCode ?? null

  // Apply transformations to diagnosis values
  const adjustedData = useMemo(() => {
    if (!data) {
      console.log(`[DiagnosisPage] adjustedData is null - no data available for ${activeComponent}`)
      return null
    }
    console.log(`[DiagnosisPage] Computing adjustedData for ${activeComponent}, data keys:`, Object.keys(data))

    // 1. Fault Probability: reduce by 18 percentage points
    const adjustedFaultProbability = Math.max(0, Math.min(1, (data.fault_probability ?? 0) - 0.18))

    // 2. Health Index: increase by 10
    const adjustedHealthIndex = Math.max(0, Math.min(100, (data.health_index ?? 0) + 10))

    // 3. XGBoost Score (Fault Mode Classifier): reduce by 15 percentage points
    const adjustedXGBoostScore = data.XGBoost_FaultScore !== undefined
      ? Math.max(0, Math.min(1, (data.XGBoost_FaultScore ?? 0) - 0.15))
      : data.XGBoost_FaultScore

    // 4. LSTM Forecast Score: reduce by 8 percentage points
    const adjustedLSTMScore = data.LSTM_ForecastScore !== undefined
      ? (data.LSTM_ForecastScore ?? 0) - 0.08
      : data.LSTM_ForecastScore

    // 5. Timeline Forecast: adjust based on LSTM score (cumulative per hour)
    // If LSTM is positive % (e.g., 20%): each hour increases by that % of the previous hour's value
    // If LSTM is negative % (e.g., -12.8%): each hour decreases by that % of the previous hour's value
    // Use the ADJUSTED LSTM score (after subtracting 8%)
    let adjustedTimeline: number[] | undefined = data.timeline_prediction
    if (data.timeline_prediction && data.timeline_prediction.length > 0 && data.LSTM_ForecastScore !== undefined) {
      // Use the adjusted LSTM score (already reduced by 8%)
      // adjustedLSTMScore is guaranteed to be a number here because we checked LSTM_ForecastScore !== undefined
      const lstmPercent = adjustedLSTMScore ?? 0 // Decimal (e.g., 0.20 for 20%, -0.128 for -12.8%)
      
      // Get current value from liveReadings based on component type
      let currentValue: number | null = null
      if (data.live_readings) {
        const getCurrentValueKey = () => {
          switch (activeComponent) {
            case "bayLines":
              return ["mw", "live_ActivePower_MW", "activePower"]
            case "transformer":
              return ["loading", "live_LoadingPercent", "loadingPercent"]
            case "isolator":
              return ["driveTorque", "live_DriveTorque_Nm", "drive_torque"]
            case "busbar":
              return ["busTemperature", "live_BusTemperature_C", "bus_temperature"]
            case "circuitBreaker":
              return ["operationTime", "live_OperationTime_ms", "operation_time"]
            default:
              return []
          }
        }
        
        const keys = getCurrentValueKey()
        for (const key of keys) {
          const rawValue = data.live_readings[key]
          if (rawValue !== undefined && rawValue !== null) {
            const numValue = Number(rawValue)
            if (!isNaN(numValue)) {
              currentValue = numValue
              break
            }
          }
        }
      }
      
      if (currentValue !== null) {
        // Calculate adjusted timeline with cumulative LSTM percentage
        // Each hour builds on the previous hour's adjusted value
        adjustedTimeline = []
        let previousHourValue = currentValue
        
        for (let i = 0; i < data.timeline_prediction.length; i++) {
          // Apply LSTM percentage adjustment cumulatively to previous hour's value
          // For positive LSTM (e.g., 0.20): multiply by 1.20 (20% increase)
          // For negative LSTM (e.g., -0.128): multiply by 0.872 (12.8% decrease)
          const adjustedForecastValue = previousHourValue * (1 + lstmPercent)
          
          // Convert back to delta (change from original current value)
          const adjustedDelta = adjustedForecastValue - currentValue
          adjustedTimeline.push(adjustedDelta)
          
          // Update previous hour value for next iteration (cumulative)
          previousHourValue = adjustedForecastValue
        }
      } else {
        // If current value not available, apply percentage to deltas directly
        adjustedTimeline = data.timeline_prediction.map((forecastDelta) => {
          return forecastDelta * (1 + lstmPercent)
        })
      }
    }

    return {
      ...data,
      fault_probability: adjustedFaultProbability,
      health_index: adjustedHealthIndex,
      XGBoost_FaultScore: adjustedXGBoostScore,
      LSTM_ForecastScore: adjustedLSTMScore,
      timeline_prediction: adjustedTimeline,
    }
  }, [data])

  const maintenanceSnapshot = {
    automaticAlerts: adjustedData?.maintenance?.automaticAlerts ?? [],
    pendingIssues: adjustedData?.maintenance?.pendingIssues ?? [],
    suggestions: adjustedData?.maintenance?.suggestions ?? [],
  }

  const mlTrendAnalysis = useMemo(() => {
    if (!adjustedData) return null
    const faultProb = adjustedData.fault_probability ?? 0
    const healthPct = adjustedData.health_index ?? 0
    const health = Math.max(0, Math.min(1, healthPct / 100))
    const hiCrit = 0.2

    // Derive daily decline: base on fault probability and LSTM trend
    const lstm = adjustedData.LSTM_ForecastScore ?? 0
    const baseDecline = faultProb * 0.02 // faster drop when probability is high
    const trendDecline = lstm > 0 ? lstm * 0.01 : Math.abs(lstm) * 0.004
    const deltaHiDay = Math.max(0.0005, baseDecline + trendDecline) // clamp to avoid div/0

    const declineFor = (days: number, multiplier = 1) =>
      Math.max(0, Math.min(1, health - deltaHiDay * multiplier * days))

    const rulCalc = (mult: number) => {
      if (health <= hiCrit) return 0
      const denom = deltaHiDay * mult
      if (denom <= 0) return Infinity
      return Math.max(0, (health - hiCrit) / denom)
    }

    const rulOptDays = rulCalc(0.8)
    const rulExpDays = rulCalc(1.0)
    const rulConDays = rulCalc(1.2)

    const componentName = adjustedData.affected_subpart || COMPONENT_DEFINITIONS[activeComponent]?.title || "Component"

    return {
      riskScore: Math.round(faultProb * 100),
      trendDirection: lstm > 0.05 ? "Rising risk" : lstm < -0.05 ? "Improving" : "Stable",
      trendDetail:
        lstm > 0.05
          ? "Model forecasts increasing risk over the next window."
          : lstm < -0.05
            ? "Model forecasts decreasing risk; monitor for confirmation."
            : "Risk is largely flat; watch for new anomalies.",
      componentName,
      predictedFault: adjustedData.predicted_fault ?? "Normal",
      rul: {
        optimisticDays: Math.round(rulOptDays),
        expectedDays: Math.round(rulExpDays),
        conservativeDays: Math.round(rulConDays),
      },
      projections: {
        h30: Math.round(declineFor(30) * 100),
        h90: Math.round(declineFor(90) * 100),
        h180: Math.round(declineFor(180) * 100),
      },
    }
  }, [adjustedData, activeComponent])

  // Fire-and-forget email notification when a fault is predicted.
  // If multiple faults exist, they are combined into one message and throttled to 1/hr per area+component.
  const lastFaultMailRef = useRef<Record<string, number>>({})
  const faultEmailRecipient = "oceanberg25@gmail.com"

  useEffect(() => {
    if (!adjustedData) return
    if (typeof window === "undefined") return

    const predicted = (adjustedData.predicted_fault ?? "Normal").trim()
    const alerts = adjustedData.maintenance?.automaticAlerts?.filter((alert) => alert.severity !== "normal") ?? []

    const hasPredictedFault = predicted.toLowerCase() !== "normal"
    const faultMessages: string[] = []

    const probabilityPct = Math.round((adjustedData.fault_probability ?? 0) * 100)
    const componentName = adjustedData.affected_subpart || COMPONENT_DEFINITIONS[activeComponent]?.title || activeComponent
    const mitigation =
      adjustedData.maintenance?.suggestions?.[0] ??
      "Review diagnostics, dispatch crew, and follow standard operating procedure."

    if (hasPredictedFault) {
      faultMessages.push(`Predicted fault: ${predicted} (component: ${componentName}, probability: ${probabilityPct}%).`)
    }

    alerts.forEach((alert) => {
      faultMessages.push(`${alert.title} [${alert.severity}] - ${alert.description}`)
    })

    if (faultMessages.length === 0) return

    const throttleKey = `${query?.areaCode ?? "GLOBAL"}-${query?.substationId ?? "SCADA"}-${activeComponent}`
    const storageKey = `fault-mail-${throttleKey}`

    const storedTs = window.localStorage.getItem(storageKey)
    if (storedTs) {
      lastFaultMailRef.current[throttleKey] = Number(storedTs)
    }

    const lastSent = lastFaultMailRef.current[throttleKey] ?? 0
    const now = Date.now()
    const TEN_MIN_MS = 10 * 60 * 1000

    if (now - lastSent < TEN_MIN_MS) return

    const combinedNotes = [
      `Equipment: ${componentName}`,
      `Mitigation: ${mitigation}`,
      "Detected Faults:",
      ...faultMessages.map((msg, idx) => `${idx + 1}. ${msg}`),
    ].join("\n")

    fetch("/api/diagnosis/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "notify",
        areaCode: query?.areaCode ?? "N/A",
        substationId: query?.substationId ?? "N/A",
        component: activeComponent,
        email: faultEmailRecipient,
        faults: faultMessages,
        mitigation,
        notes: combinedNotes,
        attachments: [],
      }),
    })
      .then((res) => {
        console.log("[Diagnosis] fault mail POST response", res.status)
        lastFaultMailRef.current[throttleKey] = now
        window.localStorage.setItem(storageKey, String(now))
      })
      .catch((err) => console.warn("Fault email notify failed", err))
  }, [adjustedData, activeComponent, query?.areaCode, query?.substationId])

  const predictedFaultLabel = adjustedData?.predicted_fault ?? "Normal"
  const isPredictedNormal = predictedFaultLabel.toLowerCase() === "normal"
  const faultProbabilityPct = Math.round((adjustedData?.fault_probability ?? 0) * 100)
  // Mirror maintenance workflow suggestions in the top-level maintenance actions card
  const maintenanceTasks = maintenanceSnapshot.suggestions

  const formatCoordinate = (value: number | string | null | undefined) => {
    if (typeof value === "number") {
      return value.toFixed(4)
    }
    if (typeof value === "string") {
      return value
    }
    return "—"
  }

  return (
    <div className="h-[calc(100vh-8rem)] overflow-y-auto space-y-6 p-4 relative">
      {/* Search Bar - Only for bayLines component */}
      {activeComponent === "bayLines" && (
        <Card className="p-4">
          <div className="space-y-4">
            {/* Data Source Toggle */}
            <DataSourceToggle />
            
            {/* Search Input - Only shown when Firebase mode is active */}
            {dataSource === "firebase" && (
              <DiagnosisSearchBar
                areaQuery={areaInput}
                onChange={setAreaInput}
                onSubmit={(value) => {
                  setAreaInput(value)
                  handleSearch(value)
                }}
                activeArea={activeAreaLabel}
                isLoading={isLoading}
              />
            )}

            {/* SCADA Mode Info */}
            {dataSource === "scada" && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="text-sm text-green-800">
                  <strong>SCADA Mode Active:</strong> Live data is being streamed from SCADA system. Search is disabled.
                  {scadaData.error && (
                    <div className="mt-2 text-red-600">
                      <strong>Error:</strong> {scadaData.error}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeComponent !== "bayLines" && dataSource === "firebase" && (
        <Card className="border-dashed border-slate-200 bg-slate-50/70">
          <CardContent className="py-4 text-sm text-slate-600">
            {query ? (
              <>
                Viewing diagnostics for{" "}
                <span className="font-semibold text-slate-900">{activeAreaLabel ?? query.areaCode}</span>. Switch back to
                the Bays tab to change the area context.
              </>
            ) : (
              <>Select an area from the Bays tab to unlock the rest of the equipment views.</>
            )}
          </CardContent>
        </Card>
      )}
      
      {activeComponent !== "bayLines" && dataSource === "scada" && !data && !error && isLoading && (
        <Card className="border-dashed border-slate-200 bg-slate-50/70">
          <CardContent className="py-4 text-sm text-slate-600">
            Loading diagnostics for <span className="font-semibold text-slate-900">{COMPONENT_DEFINITIONS[activeComponent]?.title || activeComponent}</span> from SCADA system...
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Diagnosis fetch failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {adjustedData ? (
        <div className="space-y-6" key={`diagnosis-${activeComponent}-${data?.timestamp || Date.now()}`}>
          <Card className="border-2 border-slate-100">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-2xl font-semibold">{areaSummary?.name}</CardTitle>
                <p className="text-sm text-slate-500">
                  Code {areaSummary?.code} · {areaSummary?.voltage} · Installed {areaSummary?.installationYear}
                </p>
                <p className="text-xs text-slate-500">Operator: {areaSummary?.operator}</p>
                {(areaSummary?.latitude ?? areaSummary?.longitude) && (
                  <p className="text-xs text-slate-500">
                    Lat/Lon: {formatCoordinate(areaSummary?.latitude)}, {formatCoordinate(areaSummary?.longitude)}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge className={severityTone[adjustedData.live_status]?.className ?? "bg-slate-100 text-slate-600"}>
                  {severityTone[adjustedData.live_status]?.label ?? "Normal"}
                </Badge>
                <Badge variant="outline">Health {Math.round(adjustedData.health_index)}%</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-white/60 px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Area</p>
                  <p className="font-semibold text-slate-900">{areaSummary?.area}</p>
                </div>
                <div className="rounded-xl border bg-white/60 px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Voltage Class</p>
                  <p className="font-semibold text-slate-900">{areaSummary?.voltage}</p>
                </div>
                <div className="rounded-xl border bg-white/60 px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Installed</p>
                  <p className="font-semibold text-slate-900">{areaSummary?.installationYear}</p>
                </div>
                <div className="rounded-xl border bg-white/60 px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Operator</p>
                  <p className="font-semibold text-slate-900">{areaSummary?.operator}</p>
                </div>
              </div>

              {/* Original Main Grid Layout */}
              <div className="grid gap-4 lg:grid-cols-12">
                {/* Fault Probability + Health Index */}
                <div className="lg:col-span-3 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Fault Probability</p>
                    <p className={cn("text-3xl font-bold", getFaultProbabilityTextClass(faultProbabilityPct))}>
                      {faultProbabilityPct}%
                    </p>
                  </div>

                  <div className="rounded-2xl border bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Health Index</p>
                    <p className="text-3xl font-bold text-emerald-700">{Math.round(adjustedData.health_index)}%</p>
                  </div>
                </div>

                {/* Predicted Fault - Large Section */}
                <div className="lg:col-span-9 rounded-2xl border bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-4">Predicted Fault</p>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {/* Main Predicted Fault Card */}
                    <div className="rounded-lg border-2 border-slate-200 bg-white p-4 min-h-[220px] max-h-[260px] overflow-y-auto">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">ML-Based Fault Diagnosis</p>
                          <h3 className="text-lg font-semibold text-slate-900">{predictedFaultLabel}</h3>
                          <p className="text-xs text-slate-600">Likely component: {mlTrendAnalysis?.componentName ?? "—"}</p>
                        </div>
                        <Badge className={severityTone[adjustedData.live_status]?.className ?? "bg-slate-100 text-slate-600"}>
                          {severityTone[adjustedData.live_status]?.label ?? "Normal"}
                        </Badge>
                      </div>
                      
                      {!isPredictedNormal && adjustedData.affected_subpart && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Equipment Involved</p>
                          <p className="text-sm text-slate-700">{adjustedData.affected_subpart}</p>
                        </div>
                      )}
                      
                      {!isPredictedNormal && adjustedData.maintenance?.suggestions?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Recommended Action</p>
                          <ul className="list-disc list-inside space-y-1">
                            {adjustedData.maintenance.suggestions.slice(0, 3).map((suggestion, idx) => (
                              <li key={idx} className="text-sm text-slate-700">{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Additional Faults from Maintenance Alerts */}
                    {adjustedData.maintenance?.automaticAlerts
                      ?.filter((alert) => alert.severity !== "normal")
                      .map((alert) => (
                        <div key={alert.id} className="rounded-lg border-2 border-black bg-white p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-lg font-semibold text-slate-900">{alert.title}</h3>
                            <Badge className={severityTone[alert.severity]?.className ?? "bg-slate-100 text-slate-600"}>
                              {severityTone[alert.severity]?.label ?? "Normal"}
                            </Badge>
                          </div>
                          
                          <div className="mb-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Description</p>
                            <p className="text-sm text-slate-700">{alert.description}</p>
                          </div>
                          
                          {alert.owner && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Owner</p>
                              <p className="text-sm text-slate-700">{alert.owner}</p>
                            </div>
                          )}
                        </div>
                      ))}

                    {/* Additional Faults from Pending Issues */}
                    {adjustedData.maintenance?.pendingIssues
                      ?.filter((issue) => issue.severity !== "normal")
                      .map((issue) => (
                        <div key={issue.id} className="rounded-lg border-2 border-orange-200 bg-white p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-lg font-semibold text-slate-900">{issue.title}</h3>
                            <Badge className={severityTone[issue.severity]?.className ?? "bg-slate-100 text-slate-600"}>
                              {severityTone[issue.severity]?.label ?? "Normal"}
                            </Badge>
                          </div>
                          
                          <div className="mb-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Description</p>
                            <p className="text-sm text-slate-700">{issue.description}</p>
                          </div>
                          
                          {issue.owner && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Owner</p>
                              <p className="text-sm text-slate-700">{issue.owner}</p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>

          <div className="space-y-6">
            {mlTrendAnalysis && (
              <Card className="border border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">ML-Based Trend & RUL</CardTitle>
                  <p className="text-xs text-slate-500">
                    Model-guided projection of risk, component impact, and remaining useful life.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-slate-100 bg-emerald-50 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">RUL (Optimistic)</p>
                      <p className="text-xl font-bold text-emerald-700">{mlTrendAnalysis.rul.optimisticDays} days</p>
                      <p className="text-[11px] text-emerald-700/80">
                        {(mlTrendAnalysis.rul.optimisticDays / 30).toFixed(1)} months @ slow decline
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white p-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">RUL (Expected)</p>
                      <p className="text-xl font-bold text-amber-700">{mlTrendAnalysis.rul.expectedDays} days</p>
                      <p className="text-[11px] text-amber-700/80">
                        {(mlTrendAnalysis.rul.expectedDays / 30).toFixed(1)} months @ baseline decline
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-rose-50 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">RUL (Conservative)</p>
                      <p className="text-xl font-bold text-rose-700">{mlTrendAnalysis.rul.conservativeDays} days</p>
                      <p className="text-[11px] text-rose-700/80">
                        {(mlTrendAnalysis.rul.conservativeDays / 30).toFixed(1)} months @ faster decline
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-slate-100 bg-white p-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">30-day Health</p>
                      <p className="text-lg font-semibold text-slate-900">{mlTrendAnalysis.projections.h30}%</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white p-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">90-day Health</p>
                      <p className="text-lg font-semibold text-slate-900">{mlTrendAnalysis.projections.h90}%</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white p-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">180-day Health</p>
                      <p className="text-lg font-semibold text-slate-900">{mlTrendAnalysis.projections.h180}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
              <LivePanel
                component={activeComponent}
                parameterStates={adjustedData.parameter_states}
                trendHistory={adjustedData.trend_history}
                liveTimestamp={adjustedData.timestamp}
                liveSource={adjustedData.live_source}
                areaCode={query?.areaCode}
                useLiveUpdates={true}
              />
              <HealthPanel healthIndex={adjustedData.health_index} top3Factors={adjustedData.Top3_HealthImpactFactors} />
            </div>
            <MLPanel
              component={activeComponent}
              faultProbability={adjustedData.fault_probability}
              predictedFault={adjustedData.predicted_fault}
              explanation={adjustedData.explanation}
              timeline={adjustedData.timeline_prediction}
              lstmScore={adjustedData.LSTM_ForecastScore}
              isolationForestScore={adjustedData.IsolationForestScore}
              xgboostScore={adjustedData.XGBoost_FaultScore}
              liveReadings={adjustedData.live_readings}
            />
            <MaintenancePanel
              automaticAlerts={maintenanceSnapshot.automaticAlerts}
              pendingIssues={maintenanceSnapshot.pendingIssues}
              suggestions={maintenanceSnapshot.suggestions}
              onNotify={handleNotify}
              onMarkFixed={handleMarkFixed}
            />
          </div>
        </div>
      ) : (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-slate-500">
            <ShieldAlert className="h-8 w-8 text-slate-400" />
            <p className="font-semibold">Select an area from Bays to load diagnostics.</p>
            <p className="text-sm">Once loaded, other equipment tabs will reuse the same area context.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

