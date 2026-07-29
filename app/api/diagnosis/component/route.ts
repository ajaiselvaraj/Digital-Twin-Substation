import { NextResponse } from "next/server"

import { COMPONENT_DEFINITIONS } from "@/lib/diagnosis/component-config"
import { buildEventLog } from "@/lib/diagnosis/events"
import { buildMaintenancePanel } from "@/lib/diagnosis/maintenance"
import { deriveHealthMetrics } from "@/lib/diagnosis/health"
import { evaluateSeverity } from "@/lib/diagnosis/severity"
import type { DiagnosisComponentKey, DiagnosisSeverity } from "@/lib/diagnosis/types"
import { dispatchMaintenanceAlert } from "@/lib/server/diagnosis/maintenance-alerts"
import { invokePredictor } from "@/lib/server/diagnosis/python-runner"
import { fetchAssetMetadata } from "@/lib/server/diagnosis/live-data-service"
import { getCachedReadings, initializeCache, getLatestCachedTimestamp } from "@/lib/server/diagnosis/readings-cache"

const severityRank: DiagnosisSeverity[] = ["normal", "warning", "alarm", "trip"]

// In-memory cache to avoid re-running ML for unchanged inputs within a short window
const predictionCache = new Map<
  string,
  { payload: any; createdAt: number }
>()
const PREDICTION_CACHE_TTL_MS = 2 * 60 * 1000 // 2 minutes

const getPredictionCacheKey = (
  liveSource: "firebase" | "scada" | "ip",
  areaCode: string | null | undefined,
  substationId: string | null | undefined,
  component: DiagnosisComponentKey,
  liveTimestamp: string | null | undefined,
) => {
  // Timestamp is the main freshness indicator; if missing, skip cache
  if (!liveTimestamp) return null
  return `${liveSource}:${areaCode ?? "NA"}:${substationId ?? "NA"}:${component}:${liveTimestamp}`
}

const getCachedPrediction = (key: string | null) => {
  if (!key) return null
  const cached = predictionCache.get(key)
  if (!cached) return null
  if (Date.now() - cached.createdAt > PREDICTION_CACHE_TTL_MS) {
    predictionCache.delete(key)
    return null
  }
  return cached.payload
}

const setCachedPrediction = (key: string | null, payload: any) => {
  if (!key) return
  predictionCache.set(key, { payload, createdAt: Date.now() })
  // Prevent unbounded growth
  if (predictionCache.size > 50) {
    const entries = Array.from(predictionCache.entries()).sort((a, b) => b[1].createdAt - a[1].createdAt)
    for (let i = 50; i < entries.length; i++) {
      predictionCache.delete(entries[i][0])
    }
  }
}

const isDiagnosisComponent = (value: string): value is DiagnosisComponentKey =>
  [
    "bayLines",
    "transformer",
    "circuitBreaker",
    "busbar",
    "isolator",
    "relay",
    "pmu",
    "gis",
    "battery",
    "environment",
  ].includes(value as DiagnosisComponentKey)

// Map incoming SCADA/IP fields (camelCase or snake_case) to canonical diagnosis keys
const readingAliases: Partial<Record<DiagnosisComponentKey, Record<string, string[]>>> = {
  bayLines: {
    mw: ["activePower", "active_power_mw"],
    mvar: ["reactivePower", "reactive_power_mvar"],
    busVoltage: ["bus_voltage_kv"],
    lineCurrent: ["line_current_a"],
    powerFactor: ["power_factor"],
    frequency: ["frequency_hz"],
    voltageAngle: ["voltage_angle_deg"],
    currentAngle: ["current_angle_deg"],
    rocof: ["rocof_hz_s"],
    thd: ["thd_percent"],
  },
  transformer: {
    windingTemp: ["windingTemperature", "winding_temp_c"],
    oilTemp: ["oilTemperature", "oil_temp_c"],
    loading: ["loading_percent"],
    tapPosition: ["tap_position"],
    hydrogen: ["hydrogen_ppm"],
    acetylene: ["acetylene_ppm"],
    oilLevel: ["oil_level_percent"],
    moisture: ["moisture_ppm"],
    buchholz: ["buchholzStatus"],
    cooling: ["cooling_status", "coolingSystem"],
  },
  circuitBreaker: {
    breakerStatus: ["breaker_status"],
    operationTime: ["operation_time_ms"],
    sf6Density: ["sf6_density_bar"],
  },
  busbar: {
    busVoltage: ["bus_voltage_kv"],
    busCurrent: ["bus_current_a"],
    busTemperature: ["bus_temperature_c", "temperature", "bus_temperature"],
  },
  isolator: {
    status: ["switchStatus"],
    driveTorque: ["drive_torque_nm"],
    operatingTime: ["operating_time_ms"],
    contactResistance: ["contact_resistance_uohm"],
    motorCurrent: ["motor_current_a"],
  },
  battery: {
    batteryVoltage: ["battery_voltage_v", "dc_bus_voltage_v", "ratedVoltage_V"],
    batteryCurrent: ["battery_current_a"],
    soc: ["battery_soc_percent"],
    temperature: ["battery_temperature_c", "temperature_c"],
  },
}

const normalizeStatus = (value: unknown, openLabel = "OPEN", closedLabel = "CLOSED") => {
  if (typeof value === "number") {
    return value === 0 ? openLabel : closedLabel
  }
  if (typeof value === "string") {
    const lowered = value.toLowerCase()
    if (["0", "open", "opened"].includes(lowered)) return openLabel
    if (["1", "close", "closed"].includes(lowered)) return closedLabel
  }
  return value
}

const normalizeComponentReadings = (
  rawReadings: Record<string, number | string>,
  component: DiagnosisComponentKey,
) => {
  const normalized = { ...(rawReadings || {}) }
  const aliases = readingAliases[component] || {}

  Object.entries(aliases).forEach(([canonical, altKeys]) => {
    const current = normalized[canonical]
    if (current === undefined || current === null || current === "") {
      for (const alt of altKeys) {
        const candidate = normalized[alt]
        if (candidate !== undefined && candidate !== null && candidate !== "") {
          normalized[canonical] = candidate
          break
        }
      }
    }
  })

  if (component === "circuitBreaker") {
    normalized.breakerStatus = normalizeStatus(normalized.breakerStatus)
  }
  if (component === "isolator") {
    normalized.status = normalizeStatus(normalized.status)
  }

  return normalized
}

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    let body: any = {}
    try {
      const text = await request.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch (error) {
      console.error("Failed to parse request body", error)
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }
    
    const areaCode = body.areaCode?.trim()
    const substationId = body.substationId?.trim() || areaCode
    const componentType = body.componentType?.trim()
    const scadaData = body.scadaData // SCADA data passed directly from frontend
    const ipData = body.ipData // IP address data with asset metadata

    // If IP address data is provided (includes asset metadata), use it
    // Check for assets at top level or master at top level or inside assets
    const hasIpData = ipData && typeof ipData === "object" && (
      ipData.assets || 
      ipData.master || 
      (ipData.assets && (ipData.assets as any).master)
    )
    
    if (hasIpData) {
      const component: DiagnosisComponentKey = isDiagnosisComponent(componentType) ? componentType : "bayLines"
      const definition = COMPONENT_DEFINITIONS[component]
      
      try {
      // Extract component-specific readings from IP data
      // IP data uses PascalCase for component keys (BayLines, Transformer, etc.)
      const componentKeyMap: Record<string, string> = {
        bayLines: "BayLines",
        transformer: "Transformer",
        circuitBreaker: "CircuitBreaker",
        busbar: "Busbar",
        isolator: "Isolator",
      }
      
      const componentKey = componentKeyMap[component] || component
      const componentReadings = ipData[componentKey] || {}
      
      // IP data format includes both camelCase and snake_case field names
      // Use component readings as live readings (both formats will be handled by transformToMLInput)
      const liveReadings = componentReadings as Record<string, number | string>
      const normalizedReadings = normalizeComponentReadings(liveReadings, component)
      const liveTimestamp = ipData.timestamp || new Date().toISOString()

      // Check cache to avoid re-running ML for the same IP packet
      const ipCacheKey = getPredictionCacheKey("ip", areaCode || "IP", substationId || "IP", component, liveTimestamp)
      const cached = getCachedPrediction(ipCacheKey)
      if (cached) {
        return NextResponse.json(cached)
      }

      // Extract asset metadata from IP data
      const { extractAssetMetadataFromIpData } = await import("@/lib/scada/scada-adapter")
      const assetMetadata = extractAssetMetadataFromIpData(ipData)
      
      // Log asset metadata extraction details
      const hasMaster = !!(assetMetadata?.master && Object.keys(assetMetadata.master).length > 0)
      const assetKeys = assetMetadata?.assets ? Object.keys(assetMetadata.assets) : []
      const componentAsset = assetKeys.length > 0 ? assetMetadata.assets[assetKeys.find(k => 
        k === "transformers" || k === "powerFlowLines" || k === "breakers" || 
        k === "isolators" || k === "busbars"
      ) || assetKeys[0]] : null
      
      console.log(`[Component API] Using IP address data for ${component}:`)
      console.log(`  - Found ${Object.keys(liveReadings).length} parameter readings`)
      console.log(`  - Asset metadata: master=${hasMaster ? 'yes' : 'no'}, assets=${assetKeys.length} collections`)
      if (componentAsset) {
        console.log(`  - Component asset found: ${Array.isArray(componentAsset) ? componentAsset.length : 1} asset(s)`)
      }
      
      // Run ML prediction with IP data
      console.log(`[Component API] Invoking ML predictor for ${component}...`)
      const predictionStartTime = Date.now()
      const prediction = await invokePredictor({
        component,
        areaCode: areaCode || "IP",
        substationId: substationId || "IP",
        liveReadings: normalizedReadings,
        assetMetadata,
      })
      const predictionDuration = Date.now() - predictionStartTime
      console.log(`[Component API] ML prediction completed in ${predictionDuration}ms`)

      const parameterStates = definition.parameters.map((param) => {
        const value = normalizedReadings?.[param.key] ?? null
        const severity = evaluateSeverity(value as number | string | null, param)
        return {
          key: param.key,
          label: param.label,
          value,
          unit: param.unit,
          severity,
          minAlarm: param.minAlarm,
          maxAlarm: param.maxAlarm,
        }
      })

      const liveSeverity =
        parameterStates.reduce<DiagnosisSeverity>(
          (acc, current) =>
            severityRank.indexOf(current.severity) > severityRank.indexOf(acc) ? current.severity : acc,
          "normal"
        ) ?? "normal"

      // Apply same adjustments as Firebase mode
      const isIsolator = component === "isolator"
      const faultProbabilityAdjustment = isIsolator ? 0.05 : 0.15
      const healthIndexAdjustment = isIsolator ? 5 : 25
      
      const rawFaultProbability = prediction.fault_probability ?? 0.3
      const rawXGBoostScore = prediction.XGBoost_FaultScore ?? 0
      const rawHealthIndex = prediction.health_index ?? 70
      const rawLSTMScore = prediction.LSTM_ForecastScore ?? 0
      
      const adjustedFaultProbability = Math.max(0, Math.min(1, rawFaultProbability - faultProbabilityAdjustment))
      const adjustedXGBoostScore = Math.max(0, Math.min(1, rawXGBoostScore - faultProbabilityAdjustment))
      const adjustedHealthIndex = Math.max(0, Math.min(100, rawHealthIndex + healthIndexAdjustment))
      
      let adjustedLSTMScore = rawLSTMScore
      if (rawLSTMScore < 0) {
        adjustedLSTMScore = rawLSTMScore * 0.8
      }

      const { score: _, breakdown } = deriveHealthMetrics({
        pythonHealth: adjustedHealthIndex,
        faultProbability: adjustedFaultProbability,
        installationYear: assetMetadata?.master?.installationYear,
        maintenanceCount: (assetMetadata?.maintenanceHistory ?? []).length,
        parameterStates,
        environmentReadings: component === "environment" ? liveReadings : undefined,
      })

      const maintenance = buildMaintenancePanel({
        component,
        assetMetadata,
        parameterStates,
        faultProbability: adjustedFaultProbability,
        healthScore: adjustedHealthIndex,
      })

      const events = buildEventLog({
        component: definition.title,
        faultProbability: adjustedFaultProbability,
        predictedFault: prediction.predicted_fault ?? "Normal",
        parameterStates,
      })

      dispatchMaintenanceAlert({
        substationId: substationId || "IP",
        areaCode: areaCode || "IP",
        componentType: component,
        fault: prediction.predicted_fault ?? "Normal",
        severity: liveSeverity,
        faultProbability: adjustedFaultProbability,
        healthIndex: adjustedHealthIndex,
      }).catch((error) => {
        console.warn("Unable to push maintenance alert", error)
      })

      const responsePayload = {
        component,
        areaCode: areaCode || "IP",
        substationId: substationId || "IP",
        fault_probability: adjustedFaultProbability,
        health_index: adjustedHealthIndex,
        predicted_fault: prediction.predicted_fault,
        affected_subpart: prediction.affected_subpart,
        explanation: prediction.explanation,
        timeline_prediction: (prediction.timeline_prediction || []).map((val: number) => 
          val < 0 ? val * 0.8 : val
        ),
        live_readings: normalizedReadings,
        asset_metadata: assetMetadata,
        timestamp: liveTimestamp,
        parameter_states: parameterStates,
        live_status: liveSeverity,
        maintenance,
        health_breakdown: breakdown,
        events,
        trend_history: {},
        live_source: "ip",
        LSTM_ForecastScore: adjustedLSTMScore,
        IsolationForestScore: prediction.IsolationForestScore,
        XGBoost_FaultScore: adjustedXGBoostScore,
        Top3_HealthImpactFactors: prediction.Top3_HealthImpactFactors,
      }

      setCachedPrediction(ipCacheKey, responsePayload)

      return NextResponse.json(responsePayload)
    } catch (error) {
      console.error("[Component API] IP Data Diagnosis API failure:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error("[Component API] Error details:", {
        component,
        errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      })
      return NextResponse.json({ 
        error: "Unable to process IP data diagnosis request",
        details: errorMessage 
      }, { status: 500 })
    }
    }

    // If SCADA data is provided, use it directly
    if (scadaData && typeof scadaData === "object") {
      const component: DiagnosisComponentKey = isDiagnosisComponent(componentType) ? componentType : "bayLines"
      const definition = COMPONENT_DEFINITIONS[component]
      
      try {
      // Use SCADA data directly as live readings
      const liveReadings = scadaData as Record<string, number | string>
      const normalizedReadings = normalizeComponentReadings(liveReadings, component)
      const liveTimestamp =
        (scadaData as any)?.timestamp ??
        (scadaData as any)?.ts ??
        (scadaData as any)?.time ??
        (scadaData as any)?.lastUpdated ??
        (scadaData as any)?.Timestamp ??
        (scadaData as any)?.TS ??
        new Date().toISOString()

      // Fast path: reuse recent prediction for same timestamp/component
      const scadaCacheKey = getPredictionCacheKey("scada", areaCode || "SCADA", substationId || "SCADA", component, liveTimestamp)
      const cached = getCachedPrediction(scadaCacheKey)
      if (cached) {
        return NextResponse.json(cached)
      }

      // Fetch asset metadata from Firebase (required for ML predictions)
      // Try to use a default area code if SCADA mode doesn't provide one
      // You can configure this to use a specific substation code
      const metadataAreaCode = substationId ?? areaCode ?? "AREA-728412" // Default to Madurai West Substation
      const assetMetadata = await fetchAssetMetadata(metadataAreaCode)
      
      // Run ML prediction with SCADA data
      const prediction = await invokePredictor({
        component,
        areaCode: areaCode || "SCADA",
        substationId: substationId || "SCADA",
        liveReadings: normalizedReadings,
        assetMetadata,
      })

      console.log(`[Component API] Using SCADA data for ${component}, found ${Object.keys(liveReadings).length} parameters`)

      const parameterStates = definition.parameters.map((param) => {
        const value = normalizedReadings?.[param.key] ?? null
        const severity = evaluateSeverity(value as number | string | null, param)
        return {
          key: param.key,
          label: param.label,
          value,
          unit: param.unit,
          severity,
          minAlarm: param.minAlarm,
          maxAlarm: param.maxAlarm,
        }
      })

      const liveSeverity =
        parameterStates.reduce<DiagnosisSeverity>(
          (acc, current) =>
            severityRank.indexOf(current.severity) > severityRank.indexOf(acc) ? current.severity : acc,
          "normal"
        ) ?? "normal"

      // Apply same adjustments as Firebase mode
      const isIsolator = component === "isolator"
      const faultProbabilityAdjustment = isIsolator ? 0.05 : 0.15
      const healthIndexAdjustment = isIsolator ? 5 : 25
      
      const rawFaultProbability = prediction.fault_probability ?? 0.3
      const rawXGBoostScore = prediction.XGBoost_FaultScore ?? 0
      const rawHealthIndex = prediction.health_index ?? 70
      const rawLSTMScore = prediction.LSTM_ForecastScore ?? 0
      
      const adjustedFaultProbability = Math.max(0, Math.min(1, rawFaultProbability - faultProbabilityAdjustment))
      const adjustedXGBoostScore = Math.max(0, Math.min(1, rawXGBoostScore - faultProbabilityAdjustment))
      const adjustedHealthIndex = Math.max(0, Math.min(100, rawHealthIndex + healthIndexAdjustment))
      
      let adjustedLSTMScore = rawLSTMScore
      if (rawLSTMScore < 0) {
        adjustedLSTMScore = rawLSTMScore * 0.8
      }

      const { score: _, breakdown } = deriveHealthMetrics({
        pythonHealth: adjustedHealthIndex,
        faultProbability: adjustedFaultProbability,
        installationYear: assetMetadata?.master?.installationYear,
        maintenanceCount: (assetMetadata?.maintenanceHistory ?? []).length,
        parameterStates,
        environmentReadings: component === "environment" ? liveReadings : undefined,
      })

      const maintenance = buildMaintenancePanel({
        component,
        assetMetadata,
        parameterStates,
        faultProbability: adjustedFaultProbability,
        healthScore: adjustedHealthIndex,
      })

      const events = buildEventLog({
        component: definition.title,
        faultProbability: adjustedFaultProbability,
        predictedFault: prediction.predicted_fault ?? "Normal",
        parameterStates,
      })

      dispatchMaintenanceAlert({
        substationId: substationId || "SCADA",
        areaCode: areaCode || "SCADA",
        componentType: component,
        fault: prediction.predicted_fault ?? "Normal",
        severity: liveSeverity,
        faultProbability: adjustedFaultProbability,
        healthIndex: adjustedHealthIndex,
      }).catch((error) => {
        console.warn("Unable to push maintenance alert", error)
      })

      const responsePayload = {
        component,
        areaCode: areaCode || "SCADA",
        substationId: substationId || "SCADA",
        fault_probability: adjustedFaultProbability,
        health_index: adjustedHealthIndex,
        predicted_fault: prediction.predicted_fault,
        affected_subpart: prediction.affected_subpart,
        explanation: prediction.explanation,
        timeline_prediction: (prediction.timeline_prediction || []).map((val: number) => 
          val < 0 ? val * 0.8 : val
        ),
        live_readings: normalizedReadings,
        asset_metadata: assetMetadata,
        timestamp: liveTimestamp,
        parameter_states: parameterStates,
        live_status: liveSeverity,
        maintenance,
        health_breakdown: breakdown,
        events,
        trend_history: {},
        live_source: "scada",
        LSTM_ForecastScore: adjustedLSTMScore,
        IsolationForestScore: prediction.IsolationForestScore,
        XGBoost_FaultScore: adjustedXGBoostScore,
        Top3_HealthImpactFactors: prediction.Top3_HealthImpactFactors,
      }

      setCachedPrediction(scadaCacheKey, responsePayload)

      return NextResponse.json(responsePayload)
    } catch (error) {
      console.error("SCADA Diagnosis API failure", error)
      return NextResponse.json({ error: "Unable to process SCADA diagnosis request" }, { status: 500 })
    }
    }

    // Firebase mode - original logic
    if (!areaCode) {
      return NextResponse.json({ error: "areaCode is required" }, { status: 400 })
    }

    const component: DiagnosisComponentKey = isDiagnosisComponent(componentType) ? componentType : "bayLines"
    const definition = COMPONENT_DEFINITIONS[component]

    try {
      // Initialize cache if not already done
      let cachedTimestamp = getLatestCachedTimestamp()
      if (!cachedTimestamp) {
        console.log("[Component API] Cache not initialized, initializing...")
        await initializeCache(areaCode)
        cachedTimestamp = getLatestCachedTimestamp()
      }

      // Check for new timestamp and update cache if needed (ensures we use latest readings)
      const { getRealtimeDB, getLatestTimestampClient } = await import("@/lib/server/diagnosis/live-data-service")
      const { initializeFirebaseAuth, getFirebaseUID } = await import("@/lib/firebase")
      const { updateCacheForNewTimestamp } = await import("@/lib/server/diagnosis/readings-cache")
      
      try {
        await initializeFirebaseAuth()
        const dbInfo = getRealtimeDB()
        if (dbInfo) {
          const { isAdmin } = dbInfo
          const basePathPrefix = "Madurai_West_Substation"
          const uid = getFirebaseUID()
          const basePath = `${basePathPrefix}/${uid}`
          const latestTimestamp = await getLatestTimestampClient(basePath, isAdmin)
          
          // If we have a new timestamp, update cache before making prediction
          if (latestTimestamp && latestTimestamp !== cachedTimestamp) {
            console.log(`[Component API] New timestamp detected: ${latestTimestamp}, updating cache...`)
            const cacheUpdated = await updateCacheForNewTimestamp(latestTimestamp, areaCode)
            if (cacheUpdated) {
              cachedTimestamp = latestTimestamp
              console.log(`[Component API] Cache updated successfully for timestamp ${latestTimestamp}`)
            } else {
              console.warn(`[Component API] Cache update failed for timestamp ${latestTimestamp}`)
            }
          }
        }
      } catch (error) {
        // Silently fail - use existing cache if timestamp check fails
        console.debug("[Component API] Timestamp check failed, using existing cache:", error)
      }

      // Get readings from cache (now updated with latest if available)
      // Use the latest timestamp we just checked/updated (cachedTimestamp was updated above if new timestamp found)
      const finalTimestamp = getLatestCachedTimestamp() || cachedTimestamp
      let cachedReadings = getCachedReadings(component, finalTimestamp)
      
      // If no readings found, try to get from latest timestamp without specifying
      if (!cachedReadings || Object.keys(cachedReadings).length === 0) {
        console.warn(`[Component API] No readings found for ${component} at timestamp ${finalTimestamp}, trying latest cached timestamp`)
        cachedReadings = getCachedReadings(component)
      }
      
      let liveReadings = cachedReadings || {}
      const liveTimestamp = finalTimestamp || new Date().toISOString()
      const normalizedReadings = normalizeComponentReadings(liveReadings, component)

      // If we already processed this timestamp/component, reuse the prediction
      const firebaseCacheKey = getPredictionCacheKey("firebase", areaCode, substationId, component, liveTimestamp)
      const cached = getCachedPrediction(firebaseCacheKey)
      if (cached) {
        return NextResponse.json(cached)
      }
      
      console.log(`[Component API] Using readings for ${component} at timestamp ${liveTimestamp}, found ${Object.keys(liveReadings).length} parameters:`, Object.keys(liveReadings))
      if (Object.keys(liveReadings).length === 0) {
        console.warn(`[Component API] WARNING: No readings found in cache for ${component}. Cache status: latestTimestamp=${getLatestCachedTimestamp()}, cachedTimestamp=${cachedTimestamp}`)
        // Try to initialize cache if it's empty
        if (!getLatestCachedTimestamp()) {
          console.log(`[Component API] Cache is empty, initializing...`)
          await initializeCache(areaCode)
          const newCachedReadings = getCachedReadings(component)
          if (newCachedReadings && Object.keys(newCachedReadings).length > 0) {
            liveReadings = newCachedReadings
            console.log(`[Component API] Successfully initialized cache, now have ${Object.keys(liveReadings).length} parameters`)
          }
        } else {
          // Cache exists but no readings for this component - try to fetch directly
          console.log(`[Component API] Cache exists but no readings for ${component}, fetching directly from Firebase...`)
          try {
            const { fetchReadingsFromFirebaseClient } = await import("@/lib/server/diagnosis/live-data-service")
            await initializeFirebaseAuth()
            const dbInfo = getRealtimeDB()
            if (dbInfo) {
              const { isAdmin } = dbInfo
              const basePathPrefix = "Madurai_West_Substation"
              const uid = getFirebaseUID()
              const basePath = `${basePathPrefix}/${uid}`
              const directReadings = await fetchReadingsFromFirebaseClient(basePath, finalTimestamp, component, isAdmin)
              if (directReadings && Object.keys(directReadings).length > 0) {
                liveReadings = directReadings
                console.log(`[Component API] Successfully fetched readings directly, now have ${Object.keys(liveReadings).length} parameters`)
              }
            }
          } catch (error) {
            console.error(`[Component API] Failed to fetch readings directly:`, error)
          }
        }
      }

      // Fetch asset metadata (this is separate from readings)
      const assetMetadata = await fetchAssetMetadata(substationId ?? areaCode)
      const prediction = await invokePredictor({
        component,
        areaCode,
        substationId,
        liveReadings: normalizedReadings,
        assetMetadata,
      })

      console.log(`[Component API] Creating parameterStates for ${component}, liveReadings keys:`, Object.keys(liveReadings))
      const parameterStates = definition.parameters.map((param) => {
        const value = normalizedReadings?.[param.key] ?? null
        if (value === null || value === undefined) {
          console.warn(`[Component API] Parameter ${param.key} not found in liveReadings for ${component}`)
        }
        const severity = evaluateSeverity(value as number | string | null, param)
        return {
          key: param.key,
          label: param.label,
          value,
          unit: param.unit,
          severity,
          minAlarm: param.minAlarm,
          maxAlarm: param.maxAlarm,
        }
      })
      console.log(`[Component API] Created ${parameterStates.length} parameterStates, ${parameterStates.filter(p => p.value !== null).length} have values`)

      const liveSeverity =
        parameterStates.reduce<DiagnosisSeverity>(
          (acc, current) =>
            severityRank.indexOf(current.severity) > severityRank.indexOf(acc) ? current.severity : acc,
          "normal"
        ) ?? "normal"

      // Adjust values as per requirements:
      // - Reduce Fault Probability, XGBoost, and Combined Fault Probability by 15 for all except isolator (5 for isolator)
      // - Increase Health Index by 25 for all except isolator (5 for isolator)
      // - LSTM: if negative, decrease it (not increase)
      
      // Get raw values from prediction
      const rawFaultProbability = prediction.fault_probability ?? 0.3
      const rawXGBoostScore = prediction.XGBoost_FaultScore ?? 0
      const rawHealthIndex = prediction.health_index ?? 70
      const rawLSTMScore = prediction.LSTM_ForecastScore ?? 0
      
      // Component-specific adjustments
      const isIsolator = component === "isolator"
      const faultProbabilityAdjustment = isIsolator ? 0.05 : 0.15  // 5% for isolator, 15% for others
      const healthIndexAdjustment = isIsolator ? 5 : 25  // 5 points for isolator, 25 for others
      
      // Adjust fault probabilities: reduce by adjustment percentage
      const adjustedFaultProbability = Math.max(0, Math.min(1, rawFaultProbability - faultProbabilityAdjustment))
      const adjustedXGBoostScore = Math.max(0, Math.min(1, rawXGBoostScore - faultProbabilityAdjustment))
      
      // Adjust health index: increase by adjustment points (clamped to 0-100)
      const adjustedHealthIndex = Math.max(0, Math.min(100, rawHealthIndex + healthIndexAdjustment))
      
      // Adjust LSTM: if negative, decrease it (multiply by a factor to decrease magnitude)
      let adjustedLSTMScore = rawLSTMScore
      if (rawLSTMScore < 0) {
        adjustedLSTMScore = rawLSTMScore * 0.8  // Decrease negative value by 20%
      }
      
      // Use adjusted health_index
      const healthIndex = adjustedHealthIndex
      
      // Still calculate breakdown for backward compatibility, but use adjusted backend health_index as primary
      const { score: _, breakdown } = deriveHealthMetrics({
        pythonHealth: healthIndex,
        faultProbability: adjustedFaultProbability,
        installationYear: assetMetadata?.master?.installationYear,
        maintenanceCount: (assetMetadata?.maintenanceHistory ?? []).length,
        parameterStates,
        environmentReadings: component === "environment" ? liveReadings : undefined,
      })

      const maintenance = buildMaintenancePanel({
        component,
        assetMetadata,
        parameterStates,
        faultProbability: adjustedFaultProbability,
        healthScore: healthIndex,
      })

      const events = buildEventLog({
        component: definition.title,
        faultProbability: adjustedFaultProbability,
        predictedFault: prediction.predicted_fault ?? "Normal",
        parameterStates,
      })

      // Fire-and-forget alert push (use adjusted values)
      dispatchMaintenanceAlert({
        substationId,
        areaCode,
        componentType: component,
        fault: prediction.predicted_fault ?? "Normal",
        severity: liveSeverity,
        faultProbability: adjustedFaultProbability,
        healthIndex: healthIndex,
      }).catch((error) => {
        console.warn("Unable to push maintenance alert", error)
      })

      const responsePayload = {
        component,
        areaCode,
        substationId,
        fault_probability: adjustedFaultProbability,
        health_index: healthIndex,
        predicted_fault: prediction.predicted_fault,
        affected_subpart: prediction.affected_subpart,
        explanation: prediction.explanation,
        timeline_prediction: (prediction.timeline_prediction || []).map((val: number) => 
          val < 0 ? val * 0.8 : val  // Decrease negative values in timeline
        ),
        live_readings: normalizedReadings,
        asset_metadata: assetMetadata,
        timestamp: liveTimestamp,
        parameter_states: parameterStates,
        live_status: liveSeverity,
        maintenance,
        health_breakdown: breakdown,
        events,
        trend_history: {}, // History can be generated from cache if needed
        live_source: "firebase",
        // Pass ML model scores from backend prediction (with adjusted scores)
        LSTM_ForecastScore: adjustedLSTMScore,
        IsolationForestScore: prediction.IsolationForestScore,
        XGBoost_FaultScore: adjustedXGBoostScore,
        Top3_HealthImpactFactors: prediction.Top3_HealthImpactFactors,
      }

      setCachedPrediction(firebaseCacheKey, responsePayload)

      return NextResponse.json(responsePayload)
    } catch (error) {
      console.error("Diagnosis API failure", error)
      return NextResponse.json({ error: "Unable to process diagnosis request" }, { status: 500 })
    }
  } catch (error) {
    // Top-level error handler to catch any unhandled errors
    console.error("[Component API] Unhandled error in POST handler:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error("[Component API] Error details:", {
      message: errorMessage,
      stack: errorStack,
      errorType: error?.constructor?.name,
    })
    return NextResponse.json(
      {
        error: "Internal server error",
        details: errorMessage,
        ...(process.env.NODE_ENV === "development" && errorStack ? { stack: errorStack } : {}),
      },
      { status: 500 }
    )
  }
}

