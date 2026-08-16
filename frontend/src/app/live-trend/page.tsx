"use client"

import { useState, Suspense, lazy, useMemo, useEffect, type ComponentProps } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, AlertTriangle, Loader2, Maximize2, X } from "lucide-react"
import { ModelViewer } from "@/components/live-trend/model-viewer"
import { useLiveData, dataGenerators } from "@/hooks/use-live-data"
import { getGlowColor } from "@/lib/live-trend/glow-utils"
import { useLiveTrend } from "@/components/live-trend/live-trend-context"
import { getSubstationById } from "@/lib/firebase-data"
import type { DummySubstation } from "@/lib/dummy-data"
import { useAllReadings } from "@/hooks/use-all-readings"
import { DataSourceToggle } from "@/components/scada/data-source-toggle"
import { useDataSource } from "@/lib/scada/data-source-context"

// Lazy load panels for better performance - actually lazy load with dynamic imports
const LazySubstationPanel = lazy(() => import("@/components/live-trend/substation-panel").then(m => ({ default: m.SubstationPanel })))
const LazyTransformerPanel = lazy(() => import("@/components/live-trend/transformer-panel").then(m => ({ default: m.TransformerPanel })))
const LazyBayLinesPanel = lazy(() => import("@/components/live-trend/bay-lines-panel").then(m => ({ default: m.BayLinesPanel })))
const LazyCircuitBreakerPanel = lazy(() => import("@/components/live-trend/circuit-breaker-panel").then(m => ({ default: m.CircuitBreakerPanel })))
const LazyIsolatorPanel = lazy(() => import("@/components/live-trend/isolator-panel").then(m => ({ default: m.IsolatorPanel })))
const LazyBusbarPanel = lazy(() => import("@/components/live-trend/busbar-panel").then(m => ({ default: m.BusbarPanel })))
const LazyOthersPanel = lazy(() => import("@/components/live-trend/others-panel").then(m => ({ default: m.OthersPanel })))

const toRealtimeKey = (value: string) => value.trim().replace(/\s+/g, "_")

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )
}

// Helper function to get all critical values (orange) from all panels using Firebase/SCADA readings
function useCriticalValues() {
  const { selectedArea } = useLiveTrend()
  const areaCode = selectedArea?.areaCode || ""
  const { allReadings } = useAllReadings(areaCode)
  
  // Fallback to dummy data for "others" category (not in Firebase)
  const othersData = useLiveData("others", dataGenerators.others)

  return useMemo(() => {
    const criticalValues: Array<{ label: string; value: number | string; unit: string; category: string }> = []
    
    // Check all parameters for orange status (#FF8A2A)
    const checkParameter = (data: Record<string, number | string | null>, category: string, params: Array<{ key: string; label: string; unit: string }>) => {
      params.forEach(({ key, label, unit }) => {
        const value = data[key]
        if (value !== undefined && value !== null) {
          const glowColor = getGlowColor(key, value as number | string)
          if (glowColor === "#FF8A2A") { // Orange
            criticalValues.push({ label, value: value as number | string, unit, category })
          }
        }
      })
    }

    // Transformer parameters (from Firebase)
    const transformerReadings = allReadings.transformer || {}
    checkParameter(transformerReadings, "Transformer", [
      { key: "oilLevel", label: "Oil Level", unit: "%" },
      { key: "oilTemp", label: "Oil Temperature", unit: "°C" },
      { key: "hydrogen", label: "Gas Level (Hydrogen)", unit: "ppm" },
      { key: "windingTemp", label: "Winding Temperature", unit: "°C" },
      { key: "tapPosition", label: "Tap Position", unit: "steps" },
    ])

    // Bays parameters (from Firebase)
    const bayLinesReadings = allReadings.bayLines || {}
    checkParameter(bayLinesReadings, "Bays", [
      { key: "frequency", label: "Frequency", unit: "Hz" },
      { key: "powerFactor", label: "Power Factor", unit: "p.u." },
      { key: "mw", label: "Active Power", unit: "MW" },
    ])

    // Circuit Breaker parameters (from Firebase)
    const circuitBreakerReadings = allReadings.circuitBreaker || {}
    checkParameter(circuitBreakerReadings, "Circuit Breaker", [
      { key: "sf6Density", label: "SF6 Density", unit: "bar" },
    ])

    // Busbar parameters (from Firebase)
    const busbarReadings = allReadings.busbar || {}
    checkParameter(busbarReadings, "Busbar", [
      { key: "busVoltage", label: "Bus Voltage", unit: "kV" },
      { key: "busCurrent", label: "Bus Current", unit: "A" },
      { key: "busTemperature", label: "Bus Temperature", unit: "°C" },
    ])

    // Others parameters (still using dummy data as it's not in Firebase)
    checkParameter(othersData, "Others", [
      { key: "tripCount", label: "Trip Count", unit: "count" },
      { key: "batterySOC", label: "Battery SOC", unit: "%" },
    ])

    return criticalValues
  }, [allReadings, othersData])
}

// Helper to get glow data for each category
function useGlowData(category: string) {
  const { selectedArea } = useLiveTrend()
  const areaCode = selectedArea?.areaCode || ""
  const { allReadings } = useAllReadings(areaCode)
  const transformerData = useLiveData("transformer", dataGenerators.transformer)
  const bayLinesData = useLiveData("bayLines", dataGenerators.bayLines)
  const circuitBreakerData = useLiveData("circuitBreaker", dataGenerators.circuitBreaker)
  const busbarData = useLiveData("busbar", dataGenerators.busbar)

  return useMemo(() => {
    const glow: Record<string, number | string> = {}
    
    if (category === "transformer") {
      // For transformer, pass ALL parameter values to the glow system
      // The transformer glow utils will determine the color based on thresholds
      const transformerReadings = allReadings.transformer || {}
      
      // Map Firebase parameter names to transformer glow parameter names
      if (transformerReadings.windingTemp !== undefined && transformerReadings.windingTemp !== null) {
        glow.windingTemp = transformerReadings.windingTemp
      } else if (transformerData.windingTemperature !== undefined) {
        glow.windingTemp = transformerData.windingTemperature
      }
      
      if (transformerReadings.oilTemp !== undefined && transformerReadings.oilTemp !== null) {
        glow.oilTemp = transformerReadings.oilTemp
      } else if (transformerData.oilTemperature !== undefined) {
        glow.oilTemp = transformerData.oilTemperature
      }
      
      if (transformerReadings.hydrogen !== undefined && transformerReadings.hydrogen !== null) {
        glow.gasLevel = transformerReadings.hydrogen
      } else if (transformerReadings.gasLevel !== undefined && transformerReadings.gasLevel !== null) {
        glow.gasLevel = transformerReadings.gasLevel
      } else if (transformerData.gasLevel !== undefined) {
        glow.gasLevel = transformerData.gasLevel
      }
      
      if (transformerReadings.tapPosition !== undefined && transformerReadings.tapPosition !== null) {
        glow.tapPos = transformerReadings.tapPosition
      } else if (transformerData.tapPosition !== undefined) {
        glow.tapPos = transformerData.tapPosition
      }
      
      if (transformerReadings.oilLevel !== undefined && transformerReadings.oilLevel !== null) {
        glow.oilLevel = transformerReadings.oilLevel
      } else if (transformerData.oilLevel !== undefined) {
        glow.oilLevel = transformerData.oilLevel
      }
    } else if (category === "bayLines") {
      if (bayLinesData.ctLoading > 60) glow.ctLoading = bayLinesData.ctLoading
      if (bayLinesData.ptVoltageDeviation < 90 || bayLinesData.ptVoltageDeviation > 110) {
        glow.ptVoltageDeviation = bayLinesData.ptVoltageDeviation
      }
      if (bayLinesData.frequency < 49.7 || bayLinesData.frequency > 50.3) {
        glow.frequency = bayLinesData.frequency
      }
      if (bayLinesData.powerFactor < 0.95) glow.powerFactor = bayLinesData.powerFactor
    } else if (category === "circuitBreaker") {
      // For circuit breaker, pass ALL parameter values to the glow system
      // The circuit breaker glow system will determine the color based on thresholds
      const circuitBreakerReadings = allReadings.circuitBreaker || {}
      
      // Map Firebase parameter names to circuit breaker glow parameter names
      if (circuitBreakerReadings.sf6Density !== undefined && circuitBreakerReadings.sf6Density !== null) {
        glow.sf6Density = circuitBreakerReadings.sf6Density
      } else if (circuitBreakerData.sf6Density !== undefined) {
        glow.sf6Density = circuitBreakerData.sf6Density
      }
    } else if (category === "busbar") {
      if (busbarData.busbarLoad > 80) glow.busbarLoad = busbarData.busbarLoad
      if (busbarData.busbarTemperature > 80) glow.busbarTemperature = busbarData.busbarTemperature
      if (busbarData.jointHotspotTemp > 95) glow.jointHotspotTemp = busbarData.jointHotspotTemp
      if (busbarData.impedanceMicroOhm > 65) glow.impedanceMicroOhm = busbarData.impedanceMicroOhm
    }

    return glow
  }, [category, transformerData, bayLinesData, circuitBreakerData, busbarData, allReadings])
}

export default function LiveTrendPage() {
  const { activeCategory, setSelectedArea, selectedArea } = useLiveTrend()
  const { dataSource } = useDataSource()
  const criticalValues = useCriticalValues()
  const glowData = useGlowData(activeCategory)
  const [substationId, setSubstationId] = useState<string>("")
  const [substation, setSubstation] = useState<DummySubstation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModelFullscreen, setIsModelFullscreen] = useState(false)

  // Preload data for all components when area is selected (background fetch)
  useEffect(() => {
    const areaCode = selectedArea?.areaCode
    if (!areaCode) return

    // Preload readings for all components in the background
    // This ensures data is cached when user switches categories
    const components: Array<"bayLines" | "transformer" | "circuitBreaker" | "busbar" | "isolator"> = [
      "bayLines",
      "transformer",
      "circuitBreaker",
      "busbar",
      "isolator",
    ]

    // Fetch timestamp first
    fetch("/api/diagnosis/timestamp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ areaCode }),
    })
      .then((res) => res.json())
      .then((data) => {
        const timestamp = data.timestamp
        if (!timestamp) return

        // Preload all components in parallel (background, no loading indicators)
        components.forEach((component) => {
          fetch("/api/diagnosis/readings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              areaCode,
              componentType: component,
              timestamp,
            }),
          }).catch((err) => {
            // Silently fail - this is just preloading
            console.debug(`Preload failed for ${component}:`, err)
          })
        })
      })
      .catch((err) => {
        // Silently fail - this is just preloading
        console.debug("Preload timestamp check failed:", err)
      })
  }, [selectedArea?.areaCode])

  // Close fullscreen model when switching to a category without a 3D view
  useEffect(() => {
    if (activeCategory === "others") {
      setIsModelFullscreen(false)
    }
  }, [activeCategory])

  const handleSearch = async () => {
    if (!substationId.trim()) {
      setError("Please enter a substation ID, code, name, or area name")
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const searchTerm = substationId.trim().toLowerCase()
      const realtimeKey = toRealtimeKey(substationId)
      // Use the input as area code initially (will be updated if substation found)
      const initialAreaCode = substationId.trim()
      setSelectedArea({
        key: realtimeKey,
        label: substationId.trim(),
        areaCode: initialAreaCode,
        metadata: { areaName: substationId.trim() },
      })
      
      // First try direct ID lookup
      const data = await getSubstationById(searchTerm)
      if (data) {
        setSubstation(data)
        const derivedKey = toRealtimeKey(
          data.master.substationCode ??
            data.master.areaName ??
            data.master.name ??
            substationId,
        )
        // Use substationCode or areaName as the actual area code for Firebase API
        const actualAreaCode = data.master.substationCode ?? data.master.areaName ?? data.master.name ?? substationId.trim()
        setSelectedArea({
          key: derivedKey,
          label: data.master.areaName ?? data.master.name ?? substationId.trim(),
          areaCode: actualAreaCode,
          metadata: {
            areaName: data.master.areaName,
            substationCode: data.master.substationCode,
            installationYear: data.master.installationYear,
            latitude: data.master.latitude,
            longitude: data.master.longitude,
          },
        })
        setIsLoading(false)
        return
      }

      // If not found, search all substations by code, name, or areaName
      const { getAllSubstations } = await import("@/lib/firebase-data")
      const allSubstations = await getAllSubstations()
      const found = allSubstations.find(s => 
        s.id.toLowerCase() === searchTerm ||
        s.master.substationCode?.toLowerCase() === searchTerm ||
        s.master.name?.toLowerCase().includes(searchTerm) ||
        s.master.areaName?.toLowerCase().includes(searchTerm)
      )
      
      if (found) {
        setSubstation(found)
        const derivedKey = toRealtimeKey(
          found.master.substationCode ??
            found.master.areaName ??
            found.master.name ??
            substationId,
        )
        // Use substationCode or areaName as the actual area code for Firebase API
        const actualAreaCode = found.master.substationCode ?? found.master.areaName ?? found.master.name ?? substationId.trim()
        setSelectedArea({
          key: derivedKey,
          label: found.master.areaName ?? found.master.name ?? substationId.trim(),
          areaCode: actualAreaCode,
          metadata: {
            areaName: found.master.areaName,
            substationCode: found.master.substationCode,
            installationYear: found.master.installationYear,
            latitude: found.master.latitude,
            longitude: found.master.longitude,
          },
        })
      } else {
        setError("Area/Substation not found. Try searching by ID, code, name, or area name.")
        setSubstation(null)
      }
    } catch (err) {
      console.error("Error fetching substation:", err)
      setError("Error fetching substation. Please try again.")
      setSubstation(null)
    } finally {
      setIsLoading(false)
    }
  }

  const renderModelViewer = (
    keySuffix: string,
    extraProps: Partial<ComponentProps<typeof ModelViewer>> = {},
  ) => {
    const mergedClassName = extraProps.className ? `w-full h-full ${extraProps.className}` : "w-full h-full"
    const commonProps = { ...extraProps, className: mergedClassName }

    switch (activeCategory) {
      case "substation":
        return (
          <ModelViewer
            key={`substation-model-${keySuffix}`}
            modelPath="/models/substation/substation.glb"
            showGlow={false}
            componentType="substation"
            useFallback
            {...commonProps}
          />
        )
      case "bayLines":
        return (
          <ModelViewer
            key={`bayLines-model-${keySuffix}`}
            modelPath="/models/bay-lines/bay-lines.glb"
            glowData={glowData}
            showGlow={Object.keys(glowData).length > 0}
            componentType="bayLines"
            useFallback
            {...commonProps}
          />
        )
      case "transformer":
        return (
          <ModelViewer
            key={`transformer-model-${keySuffix}`}
            modelPath="/model/transformer_model.glb"
            glowData={glowData}
            showGlow
            componentType="transformer"
            useFallback={false}
            {...commonProps}
          />
        )
      case "circuitBreaker":
        return (
          <ModelViewer
            key={`circuitBreaker-model-${keySuffix}`}
            modelPath="/model/circuitbreaker_model.glb"
            glowData={glowData}
            showGlow
            componentType="circuitBreaker"
            useFallback={false}
            {...commonProps}
          />
        )
      case "busbar":
        return (
          <ModelViewer
            key={`busbar-model-${keySuffix}`}
            modelPath={null}
            glowData={glowData}
            showGlow={Object.keys(glowData).length > 0}
            componentType="busbar"
            useFallback
            {...commonProps}
          />
        )
      case "isolator":
        return (
          <ModelViewer
            key={`isolator-model-${keySuffix}`}
            modelPath="/models/isolator/isolator.glb"
            showGlow={false}
            componentType="isolator"
            useFallback
            {...commonProps}
          />
        )
      default:
        return null
    }
  }

  const modelViewerCard = renderModelViewer("card")

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
      {/* Search Bar - Only for Substation page */}
      {activeCategory === "substation" && (
        <Card className="p-4 flex-shrink-0 mb-4">
          <div className="space-y-4">
            {/* Data Source Toggle */}
            <DataSourceToggle />
            
            {/* Search Input - Only shown when Firebase mode is active */}
            {dataSource === "firebase" && (
              <>
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Enter Substation ID, Code, Name, or Area Name..."
                      value={substationId}
                      onChange={(e) => setSubstationId(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSearch()
                        }
                      }}
                      className="pl-10"
                    />
                  </div>
                  <Button 
                    onClick={handleSearch} 
                    disabled={isLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Search"
                    )}
                  </Button>
                </div>
                {error && (
                  <div className="text-sm text-red-600">{error}</div>
                )}
                {substation && (
                  <div className="text-sm text-green-600">
                    Showing data for: {substation.master.name} ({substation.master.substationCode})
                  </div>
                )}
              </>
            )}

            {/* SCADA Mode Info */}
            {dataSource === "scada" && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="text-sm text-green-800">
                  <strong>SCADA Mode Active:</strong> Live data is being streamed from SCADA system. Search is disabled.
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Main Content - Conditional Layout: Full width for "others", Split for others */}
      {activeCategory === "others" ? (
        /* Full Width Layout for "Others" page */
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Critical Values - Top */}
          <Card className="p-4 bg-orange-50 border-orange-200 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold text-orange-900">Critical Values</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {criticalValues.length > 0 ? (
                criticalValues.map((item, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1 bg-orange-100 border border-orange-300 rounded-md text-sm"
                  >
                    <span className="font-medium">{item.label}:</span>{" "}
                    <span className="font-bold">{item.value}</span>{" "}
                    <span className="text-gray-600">{item.unit}</span>
                    <span className="text-gray-500 ml-1">({item.category})</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 italic">No critical values at this time</div>
              )}
            </div>
          </Card>

          {/* Parameters Panel - Full Width */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <Suspense fallback={<LoadingFallback />}>
              <LazyOthersPanel />
            </Suspense>
          </div>
        </div>
      ) : (
        /* Split Layout for pages with 3D Model */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
          {/* Left Column */}
          <div className="flex flex-col gap-4 min-h-0">
            {/* Critical Values - Top Left */}
            <Card className="p-4 bg-orange-50 border-orange-200 flex-shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold text-orange-900">Critical Values</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {criticalValues.length > 0 ? (
                  criticalValues.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-1 bg-orange-100 border border-orange-300 rounded-md text-sm"
                    >
                      <span className="font-medium">{item.label}:</span>{" "}
                      <span className="font-bold">{item.value}</span>{" "}
                      <span className="text-gray-600">{item.unit}</span>
                      <span className="text-gray-500 ml-1">({item.category})</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 italic">No critical values at this time</div>
                )}
              </div>
            </Card>

            {/* Parameters Panel - Below Critical Values */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <Suspense fallback={<LoadingFallback />}>
                {activeCategory === "substation" && (
                  <LazySubstationPanel />
                )}
                {activeCategory === "bayLines" && (
                  <LazyBayLinesPanel />
                )}
                {activeCategory === "transformer" && (
                  <LazyTransformerPanel />
                )}
                {activeCategory === "circuitBreaker" && (
                  <LazyCircuitBreakerPanel />
                )}
                {activeCategory === "busbar" && (
                  <LazyBusbarPanel />
                )}
                {activeCategory === "isolator" && (
                  <LazyIsolatorPanel />
                )}
              </Suspense>
            </div>
          </div>

          {/* Right Column - 3D Model Full Height */}
          <div className="h-full min-h-0">
            <Suspense fallback={<LoadingFallback />}>
              {modelViewerCard && (
                <Card className="h-full overflow-hidden flex flex-col">
                  <CardHeader className="flex-shrink-0">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle>3D Model View</CardTitle>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setIsModelFullscreen(true)}
                        aria-label="Open full screen 3D model"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 min-h-0">{modelViewerCard}</CardContent>
                </Card>
              )}
            </Suspense>
          </div>
        </div>
      )}

      {isModelFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 text-white">
            <div className="flex items-center gap-2">
              <span className="font-semibold">3D Model View</span>
              <span className="text-sm text-white/70 capitalize">{activeCategory}</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => setIsModelFullscreen(false)}
              aria-label="Close full screen 3D model"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 p-4 min-h-0">
            <div className="w-full h-full rounded-lg border border-white/10 bg-black">
              {renderModelViewer("fullscreen", { className: "w-full h-full" })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

