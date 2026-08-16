import { randomUUID } from "node:crypto"
import axios from "axios"

import type { DiagnosisComponentKey } from "@/lib/diagnosis/types"
import { transformToMLInput } from "./data-transformer"

const FAULT_LIBRARY: Record<DiagnosisComponentKey, Array<{ fault: string; subpart?: string }>> = {
  bayLines: [
    { fault: "Power Swing / Stability Risk", subpart: "Line section A" },
    { fault: "Voltage Sag", subpart: "PT circuit" },
  ],
  transformer: [
    { fault: "Winding Hotspot", subpart: "HV winding" },
    { fault: "Oil Degradation", subpart: "Main tank" },
  ],
  circuitBreaker: [
    { fault: "Slow Operating Mechanism", subpart: "Spring drive" },
    { fault: "SF6 Leak", subpart: "Tank" },
  ],
  busbar: [
    { fault: "Thermal Hotspot", subpart: "Section-2" },
    { fault: "Shield Connection Loose", subpart: "Spacer clamp" },
  ],
  isolator: [
    { fault: "Drive Torque Drop", subpart: "Drive shaft" },
    { fault: "Contact Resistance Rise", subpart: "Jaw contact" },
  ],
  relay: [
    { fault: "Firmware Fault", subpart: "CPU board" },
    { fault: "Incorrect Setting", subpart: "Zone-2 reach" },
  ],
  pmu: [
    { fault: "GPS Unlock", subpart: "Time sync module" },
    { fault: "Phasor Drift", subpart: "ADC board" },
  ],
  gis: [
    { fault: "Partial Discharge", subpart: "Compartment C1" },
    { fault: "Moisture Ingress", subpart: "Compartment C3" },
  ],
  battery: [
    { fault: "Cell Imbalance", subpart: "String-1" },
    { fault: "Float Voltage Drop", subpart: "Charger" },
  ],
  environment: [
    { fault: "Thermal Stress", subpart: "Switchyard" },
    { fault: "Humidity Spike", subpart: "Control room" },
  ],
}

const DEFAULT_TIMEOUT_MS = Number(process.env.ML_PREDICT_TIMEOUT_MS || 15000)



function pickFault(component: DiagnosisComponentKey, probability: number) {
  if (probability < 0.55) {
    return { predicted_fault: "Normal", affected_subpart: null }
  }
  const library = FAULT_LIBRARY[component] ?? [{ fault: "Undefined Condition" }]
  const selection = library[Math.floor(Math.random() * library.length)]
  return {
    predicted_fault: selection.fault,
    affected_subpart: selection.subpart ?? null,
  }
}

function mockPrediction(component: DiagnosisComponentKey, liveReadings: Record<string, any>, assetMetadata: Record<string, any>) {
  const faultProbability = Number((Math.random() * 0.9 + 0.1).toFixed(2))
  const health = Number((100 - faultProbability * 70 + (Math.random() - 0.5) * 10).toFixed(2))
  const timeline = Array.from({ length: 24 }, (_, idx) =>
    Number((60 + Math.sin(idx / 3) * 15 + Math.random() * 5).toFixed(2))
  )

  return {
    component,
    fault_probability: faultProbability,
    health_index: Math.max(0, Math.min(100, health)),
    ...pickFault(component, faultProbability),
    explanation: "Local heuristic fallback (Python backend unavailable).",
    timeline_prediction: timeline,
    live_readings: liveReadings,
    asset_metadata: assetMetadata,
    timestamp: new Date().toISOString(),
    fallback: true,
    requestId: randomUUID(),
  }
}

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000"

export async function invokePredictor(opts: {
  component: DiagnosisComponentKey
  areaCode: string
  substationId?: string | null
  liveReadings: Record<string, any>
  assetMetadata: Record<string, any>
}) {
  const { component, areaCode, substationId, liveReadings, assetMetadata } = opts
  
  console.log(`[invokePredictor] Starting prediction for ${component}, areaCode: ${areaCode}`)
  
  // Transform data to ML input format
  const mlInput = transformToMLInput(
    component,
    assetMetadata,
    liveReadings,
    areaCode,
    substationId || areaCode
  )
  
  console.log(`[invokePredictor] ML input transformed, keys: ${Object.keys(mlInput).length}`)

  try {
    console.log(`[invokePredictor] Calling ML microservice: ${ML_SERVICE_URL}/predict/diagnosis/${component}`)
    const startTime = Date.now()
    const response = await axios.post(`${ML_SERVICE_URL}/predict/diagnosis/${component}`, mlInput, {
      timeout: DEFAULT_TIMEOUT_MS
    })
    const duration = Date.now() - startTime
    console.log(`[invokePredictor] ML microservice completed in ${duration}ms`)
    
    const parsed = response.data
    console.log(`[invokePredictor] Prediction received, keys: ${Object.keys(parsed).length}`)
    return parsed
  } catch (error: any) {
    console.error(`[invokePredictor] ML microservice predictor failed:`, error.message || error)
    
    let errorMessage = error.message || "Unknown error"
    if (error.response && error.response.data && error.response.data.detail) {
      errorMessage = error.response.data.detail
    }
    
    console.warn(`[invokePredictor] Using mock prediction due to error: ${errorMessage}`)
    return mockPrediction(component, liveReadings, assetMetadata)
  }
}

