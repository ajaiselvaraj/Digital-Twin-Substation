import { Router, Request, Response } from "express"
import { randomUUID } from "node:crypto"
import nodemailer, { type Transporter } from "nodemailer"

// Shared config & helper imports
import { COMPONENT_DEFINITIONS } from "../lib/diagnosis/component-config.js"
import { buildEventLog } from "../lib/diagnosis/events.js"
import { buildMaintenancePanel } from "../lib/diagnosis/maintenance.js"
import { deriveHealthMetrics } from "../lib/diagnosis/health.js"
import { evaluateSeverity } from "../lib/diagnosis/severity.js"
import type { DiagnosisComponentKey, DiagnosisSeverity } from "../lib/diagnosis/types.js"

// Server helper imports
import { dispatchMaintenanceAlert } from "../lib/server/diagnosis/maintenance-alerts.js"
import { invokePredictor } from "../lib/server/diagnosis/python-runner.js"
import { fetchAssetMetadata, getRealtimeDB, getLatestTimestampClient, getFirebaseData } from "../lib/server/diagnosis/live-data-service.js"
import { getCachedReadings, initializeCache, getLatestCachedTimestamp, updateCacheForNewTimestamp } from "../lib/server/diagnosis/readings-cache.js"
import { getAdminRealtimeDB } from "../lib/server/firebase-admin.js"
import { initializeFirebaseAuth, getFirebaseUID } from "../lib/firebase.js"

const router = Router()
const severityRank: DiagnosisSeverity[] = ["normal", "warning", "alarm", "trip"]

// In-memory cache for component predictions
const predictionCache = new Map<string, { payload: any; createdAt: number }>()
const PREDICTION_CACHE_TTL_MS = 2 * 60 * 1000 // 2 minutes

const getPredictionCacheKey = (
  liveSource: "firebase" | "scada" | "ip",
  areaCode: string | null | undefined,
  substationId: string | null | undefined,
  component: DiagnosisComponentKey,
  liveTimestamp: string | null | undefined,
) => {
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

// Map incoming SCADA/IP fields to canonical keys
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
    normalized.breakerStatus = normalizeStatus(normalized.breakerStatus) as string | number
  }
  if (component === "isolator") {
    normalized.status = normalizeStatus(normalized.status) as string | number
  }

  return normalized
}

let cachedTransporter: Transporter | null = null

function getMailer() {
  if (cachedTransporter) return cachedTransporter

  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM
  const secure = String(process.env.SMTP_SECURE ?? "").toLowerCase() === "true"

  if (!host || !port || !user || !pass || !from) {
    console.warn("[Maintenance API] SMTP config missing; mailer disabled")
    return null
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })

  return cachedTransporter
}

// 1. POST /api/diagnosis/component
router.post("/diagnosis/component", async (req: Request, res: Response) => {
  try {
    const body = req.body
    const areaCode = body.areaCode?.trim()
    const substationId = body.substationId?.trim() || areaCode
    const componentType = body.componentType?.trim()
    const scadaData = body.scadaData
    const ipData = body.ipData

    // IP Mode
    const hasIpData = ipData && typeof ipData === "object" && (
      ipData.assets || 
      ipData.master || 
      (ipData.assets && (ipData.assets as any).master)
    )

    if (hasIpData) {
      const component: DiagnosisComponentKey = isDiagnosisComponent(componentType) ? componentType : "bayLines"
      const definition = COMPONENT_DEFINITIONS[component]
      
      try {
        const componentKeyMap: Record<string, string> = {
          bayLines: "BayLines",
          transformer: "Transformer",
          circuitBreaker: "CircuitBreaker",
          busbar: "Busbar",
          isolator: "Isolator",
        }
        
        const componentKey = componentKeyMap[component] || component
        const componentReadings = ipData[componentKey] || {}
        const liveReadings = componentReadings as Record<string, number | string>
        const normalizedReadings = normalizeComponentReadings(liveReadings, component)
        const liveTimestamp = ipData.timestamp || new Date().toISOString()

        const ipCacheKey = getPredictionCacheKey("ip", areaCode || "IP", substationId || "IP", component, liveTimestamp)
        const cached = getCachedPrediction(ipCacheKey)
        if (cached) {
          return res.json(cached)
        }

        const { extractAssetMetadataFromIpData } = await import("../lib/scada/scada-adapter.js")
        const assetMetadata = extractAssetMetadataFromIpData(ipData) as any

        console.log(`[Component API] Using IP data for ${component}`)
        const prediction = await invokePredictor({
          component,
          areaCode: areaCode || "IP",
          substationId: substationId || "IP",
          liveReadings: normalizedReadings,
          assetMetadata,
        })

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

        const liveSeverity = parameterStates.reduce<DiagnosisSeverity>(
          (acc, current) => severityRank.indexOf(current.severity) > severityRank.indexOf(acc) ? current.severity : acc,
          "normal"
        ) ?? "normal"

        const isIsolator = component === "isolator"
        const faultProbabilityAdjustment = isIsolator ? 0.05 : 0.15
        const healthIndexAdjustment = isIsolator ? 5 : 25
        
        const adjustedFaultProbability = Math.max(0, Math.min(1, (prediction.fault_probability ?? 0.3) - faultProbabilityAdjustment))
        const adjustedXGBoostScore = Math.max(0, Math.min(1, (prediction.XGBoost_FaultScore ?? 0) - faultProbabilityAdjustment))
        const adjustedHealthIndex = Math.max(0, Math.min(100, (prediction.health_index ?? 70) + healthIndexAdjustment))
        
        const rawLSTMScore = prediction.LSTM_ForecastScore ?? 0
        const adjustedLSTMScore = rawLSTMScore < 0 ? rawLSTMScore * 0.8 : rawLSTMScore

        const { breakdown } = deriveHealthMetrics({
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
        }).catch((err) => console.warn("Alert push failed:", err))

        const responsePayload = {
          component,
          areaCode: areaCode || "IP",
          substationId: substationId || "IP",
          fault_probability: adjustedFaultProbability,
          health_index: adjustedHealthIndex,
          predicted_fault: prediction.predicted_fault,
          affected_subpart: prediction.affected_subpart,
          explanation: prediction.explanation,
          timeline_prediction: (prediction.timeline_prediction || []).map((v: number) => v < 0 ? v * 0.8 : v),
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
        return res.json(responsePayload)
      } catch (err: any) {
        console.error("IP diagnosis error:", err)
        return res.status(500).json({ error: "IP diagnosis error", details: err.message })
      }
    }

    // SCADA Mode
    if (scadaData && typeof scadaData === "object") {
      const component: DiagnosisComponentKey = isDiagnosisComponent(componentType) ? componentType : "bayLines"
      const definition = COMPONENT_DEFINITIONS[component]
      
      try {
        const liveReadings = scadaData as Record<string, number | string>
        const normalizedReadings = normalizeComponentReadings(liveReadings, component)
        const liveTimestamp = scadaData.timestamp || scadaData.ts || scadaData.time || new Date().toISOString()

        const scadaCacheKey = getPredictionCacheKey("scada", areaCode || "SCADA", substationId || "SCADA", component, liveTimestamp)
        const cached = getCachedPrediction(scadaCacheKey)
        if (cached) {
          return res.json(cached)
        }

        const metadataAreaCode = substationId ?? areaCode ?? "AREA-728412"
        const assetMetadata = (await fetchAssetMetadata(metadataAreaCode)) as any
        
        const prediction = await invokePredictor({
          component,
          areaCode: areaCode || "SCADA",
          substationId: substationId || "SCADA",
          liveReadings: normalizedReadings,
          assetMetadata,
        })

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

        const liveSeverity = parameterStates.reduce<DiagnosisSeverity>(
          (acc, current) => severityRank.indexOf(current.severity) > severityRank.indexOf(acc) ? current.severity : acc,
          "normal"
        ) ?? "normal"

        const isIsolator = component === "isolator"
        const faultProbabilityAdjustment = isIsolator ? 0.05 : 0.15
        const healthIndexAdjustment = isIsolator ? 5 : 25
        
        const adjustedFaultProbability = Math.max(0, Math.min(1, (prediction.fault_probability ?? 0.3) - faultProbabilityAdjustment))
        const adjustedXGBoostScore = Math.max(0, Math.min(1, (prediction.XGBoost_FaultScore ?? 0) - faultProbabilityAdjustment))
        const adjustedHealthIndex = Math.max(0, Math.min(100, (prediction.health_index ?? 70) + healthIndexAdjustment))
        
        const rawLSTMScore = prediction.LSTM_ForecastScore ?? 0
        const adjustedLSTMScore = rawLSTMScore < 0 ? rawLSTMScore * 0.8 : rawLSTMScore

        const { breakdown } = deriveHealthMetrics({
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
        }).catch((err) => console.warn("Alert push failed:", err))

        const responsePayload = {
          component,
          areaCode: areaCode || "SCADA",
          substationId: substationId || "SCADA",
          fault_probability: adjustedFaultProbability,
          health_index: adjustedHealthIndex,
          predicted_fault: prediction.predicted_fault,
          affected_subpart: prediction.affected_subpart,
          explanation: prediction.explanation,
          timeline_prediction: (prediction.timeline_prediction || []).map((v: number) => v < 0 ? v * 0.8 : v),
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
        return res.json(responsePayload)
      } catch (err: any) {
        console.error("SCADA diagnosis error:", err)
        return res.status(500).json({ error: "SCADA diagnosis error", details: err.message })
      }
    }

    // Default Firebase Mode
    const component: DiagnosisComponentKey = isDiagnosisComponent(componentType) ? componentType : "bayLines"
    const definition = COMPONENT_DEFINITIONS[component]

    // Fetch latest timestamp
    await initializeFirebaseAuth()
    const dbInfo = getRealtimeDB()
    if (!dbInfo) {
      return res.status(500).json({ error: "Realtime DB not available" })
    }

    const { isAdmin } = dbInfo
    const uid = getFirebaseUID()
    const basePath = `Madurai_West_Substation/${uid}`
    const liveTimestamp = await getLatestTimestampClient(basePath, isAdmin)
    
    if (!liveTimestamp) {
      return res.json({ error: "No readings timestamp found" })
    }

    const firebaseCacheKey = getPredictionCacheKey("firebase", areaCode, substationId, component, liveTimestamp)
    const cached = getCachedPrediction(firebaseCacheKey)
    if (cached) {
      return res.json(cached)
    }

    // Load readings & metadata
    await initializeCache(areaCode)
    let liveReadings: any = getCachedReadings(component, liveTimestamp)
    if (!liveReadings) {
      await updateCacheForNewTimestamp(liveTimestamp, areaCode)
      liveReadings = getCachedReadings(component, liveTimestamp)
    }

    const assetMetadata = (await fetchAssetMetadata(substationId)) as any
    const normalizedReadings = normalizeComponentReadings(liveReadings || {}, component)

    console.log(`[Component API] Running ML prediction for component: ${component}`)
    const prediction = await invokePredictor({
      component,
      areaCode,
      substationId,
      liveReadings: normalizedReadings,
      assetMetadata,
    })

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

    const liveSeverity = parameterStates.reduce<DiagnosisSeverity>(
      (acc, current) => severityRank.indexOf(current.severity) > severityRank.indexOf(acc) ? current.severity : acc,
      "normal"
    ) ?? "normal"

    const isIsolator = component === "isolator"
    const faultProbabilityAdjustment = isIsolator ? 0.05 : 0.15
    const healthIndexAdjustment = isIsolator ? 5 : 25
    
    const adjustedFaultProbability = Math.max(0, Math.min(1, (prediction.fault_probability ?? 0.3) - faultProbabilityAdjustment))
    const adjustedXGBoostScore = Math.max(0, Math.min(1, (prediction.XGBoost_FaultScore ?? 0) - faultProbabilityAdjustment))
    const adjustedHealthIndex = Math.max(0, Math.min(100, (prediction.health_index ?? 70) + healthIndexAdjustment))
    
    const rawLSTMScore = prediction.LSTM_ForecastScore ?? 0
    const adjustedLSTMScore = rawLSTMScore < 0 ? rawLSTMScore * 0.8 : rawLSTMScore

    const { breakdown } = deriveHealthMetrics({
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
      substationId,
      areaCode,
      componentType: component,
      fault: prediction.predicted_fault ?? "Normal",
      severity: liveSeverity,
      faultProbability: adjustedFaultProbability,
      healthIndex: adjustedHealthIndex,
    }).catch((err) => console.warn("Alert push failed:", err))

    const responsePayload = {
      component,
      areaCode,
      substationId,
      fault_probability: adjustedFaultProbability,
      health_index: adjustedHealthIndex,
      predicted_fault: prediction.predicted_fault,
      affected_subpart: prediction.affected_subpart,
      explanation: prediction.explanation,
      timeline_prediction: (prediction.timeline_prediction || []).map((v: number) => v < 0 ? v * 0.8 : v),
      live_readings: normalizedReadings,
      asset_metadata: assetMetadata,
      timestamp: liveTimestamp,
      parameter_states: parameterStates,
      live_status: liveSeverity,
      maintenance,
      health_breakdown: breakdown,
      events,
      trend_history: {},
      live_source: "firebase",
      LSTM_ForecastScore: adjustedLSTMScore,
      IsolationForestScore: prediction.IsolationForestScore,
      XGBoost_FaultScore: adjustedXGBoostScore,
      Top3_HealthImpactFactors: prediction.Top3_HealthImpactFactors,
    }

    setCachedPrediction(firebaseCacheKey, responsePayload)
    return res.json(responsePayload)
  } catch (error: any) {
    console.error("Diagnosis error:", error)
    return res.status(500).json({ error: "Diagnosis failure", details: error.message })
  }
})

// 2. POST /api/diagnosis/maintenance
router.post("/diagnosis/maintenance", async (req: Request, res: Response) => {
  try {
    const payload = req.body
    const action = ["notify", "markFixed"].includes(payload.action) ? payload.action : "notify"
    const areaCode = payload.areaCode?.trim()
    const substationId = payload.substationId?.trim() || areaCode
    const component = isDiagnosisComponent(payload.component) ? payload.component : "bayLines"

    if (!areaCode) {
      return res.status(400).json({ error: "areaCode required" })
    }

    const db = getAdminRealtimeDB()
    if (!db) {
      return res.json({ ok: false, reason: "Realtime DB not configured" })
    }

    const entryId = randomUUID()
    const ref = db.ref(`/maintenance/workflows/${entryId}`)

    const faults: string[] = payload.faults ?? []
    const mitigation: string = payload.mitigation ?? ""
    const notes: string = payload.notes ?? ""

    let emailSent = false
    if (action === "notify") {
      const transporter = getMailer()
      if (transporter) {
        const to = payload.email
        const from = process.env.SMTP_FROM as string
        const subject = `Fault detected - ${component} @ ${areaCode ?? "N/A"}`

        const faultsList = faults.length
          ? faults.map((f: string, idx: number) => `${idx + 1}. ${f}`).join("\n")
          : "No fault details provided."

        const text = [
          `Area: ${areaCode ?? "N/A"}`,
          `Substation: ${substationId ?? "N/A"}`,
          `Component: ${component}`,
          "",
          "Faults:",
          faultsList,
          "",
          mitigation ? `Mitigation: ${mitigation}` : "Mitigation: (not provided)",
          "",
          notes ? `Notes: ${notes}` : "Notes: (none)",
        ].join("\n")

        const html = `
          <p><strong>Area:</strong> ${areaCode ?? "N/A"}</p>
          <p><strong>Substation:</strong> ${substationId ?? "N/A"}</p>
          <p><strong>Component:</strong> ${component}</p>
          <p><strong>Faults:</strong></p>
          <ul>${faults.length ? faults.map((f: string) => `<li>${f}</li>`).join("") : "<li>No fault details provided.</li>"}</ul>
          <p><strong>Mitigation:</strong> ${mitigation || "(not provided)"}</p>
          <p><strong>Notes:</strong><br/>${notes || "(none)"}</p>
        `

        try {
          const info = await transporter.sendMail({ to, from, subject, text, html })
          emailSent = true
          console.log("[Maintenance API] mail sent", { entryId, to, messageId: info.messageId })
        } catch (error) {
          console.error("[Maintenance API] mail send failed", { error })
        }
      }
    }

    await ref.set({
      entryId,
      areaCode,
      substationId,
      component,
      email: payload.email ?? null,
      faults: payload.faults ?? [],
      mitigation: payload.mitigation ?? "",
      action,
      notes: payload.notes ?? "",
      attachments: payload.attachments ?? [],
      timestamp: new Date().toISOString(),
    })

    return res.json({ ok: true, entryId, emailSent })
  } catch (error: any) {
    console.error("Maintenance workflow error:", error)
    return res.status(500).json({ error: "Failed to update maintenance workflow" })
  }
})

// 3. POST /api/diagnosis/readings
router.post("/diagnosis/readings", async (req: Request, res: Response) => {
  try {
    const { areaCode, componentType, timestamp } = req.body
    const cleanedArea = (areaCode ?? "").trim()
    const cleanedComp = (componentType ?? "").trim()
    const cleanedTime = (timestamp ?? "").trim()

    if (!cleanedArea) {
      return res.status(400).json({ error: "areaCode is required" })
    }
    if (!cleanedComp) {
      return res.status(400).json({ error: "componentType is required" })
    }

    const component = isDiagnosisComponent(cleanedComp) ? cleanedComp : "bayLines"

    const cachedTimestamp = getLatestCachedTimestamp()
    if (!cachedTimestamp) {
      await initializeCache(cleanedArea)
    }

    let targetTimestamp = cleanedTime || getLatestCachedTimestamp()
    if (!targetTimestamp) {
      await initializeFirebaseAuth()
      const dbInfo = getRealtimeDB()
      if (!dbInfo) {
        return res.status(500).json({ error: "Realtime DB not available" })
      }
      const { isAdmin } = dbInfo
      const uid = getFirebaseUID()
      const basePath = `Madurai_West_Substation/${uid}`
      targetTimestamp = await getLatestTimestampClient(basePath, isAdmin)
      if (!targetTimestamp) {
        return res.json({ readings: {}, timestamp: null, areaCode: cleanedArea, component })
      }
      await initializeCache(cleanedArea)
    }

    let readings: any = getCachedReadings(component, targetTimestamp)
    if (!readings) {
      await updateCacheForNewTimestamp(targetTimestamp, cleanedArea)
      readings = getCachedReadings(component, targetTimestamp)
    }

    return res.json({
      readings: readings || {},
      timestamp: targetTimestamp,
      areaCode: cleanedArea,
      component
    })
  } catch (error: any) {
    console.error("Readings API failed:", error)
    return res.status(500).json({ error: "Unable to get readings", readings: {}, timestamp: null })
  }
})

// 4. POST /api/diagnosis/timestamp
router.post("/diagnosis/timestamp", async (req: Request, res: Response) => {
  try {
    const areaCode = (req.body.areaCode ?? "").trim()
    if (!areaCode) {
      return res.status(400).json({ error: "areaCode is required" })
    }

    await initializeFirebaseAuth()
    const dbInfo = getRealtimeDB()
    if (!dbInfo) {
      return res.status(500).json({ error: "Realtime DB not available" })
    }

    const { isAdmin } = dbInfo
    const uid = getFirebaseUID()
    const basePath = `Madurai_West_Substation/${uid}/readings`

    const timestamps = await getFirebaseData(basePath, isAdmin)
    if (!timestamps || typeof timestamps !== "object") {
      return res.json({ timestamp: null, areaCode })
    }

    const keys = Object.keys(timestamps)
    const numericTimestamps = keys.map(Number).filter(ts => !isNaN(ts))
    
    let latestTimestamp: string | null = null
    if (numericTimestamps.length === 0) {
      const sortedKeys = keys.sort()
      latestTimestamp = sortedKeys.length > 0 ? sortedKeys[sortedKeys.length - 1] : null
    } else {
      latestTimestamp = String(Math.max(...numericTimestamps))
    }

    const cachedTimestamp = getLatestCachedTimestamp()
    if (latestTimestamp && latestTimestamp !== cachedTimestamp) {
      console.log(`[Timestamp Route] New timestamp detected: ${latestTimestamp}, cache update...`)
      await updateCacheForNewTimestamp(latestTimestamp, areaCode)
    }

    return res.json({
      timestamp: latestTimestamp,
      areaCode
    })
  } catch (error: any) {
    console.error("Timestamp API failed:", error)
    return res.status(500).json({ error: "Unable to get timestamp", timestamp: null })
  }
})

export default router
