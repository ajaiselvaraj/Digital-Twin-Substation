import axios from "axios"
import type { ComponentType } from "@/lib/analysis-config"

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000"

export async function invokeSimulationPredictor(opts: {
  componentType: ComponentType
  substationId: string
  inputValues: Record<string, any>
}) {
  const { componentType, substationId, inputValues } = opts

  console.log("[ML Runner] Calling simulation ML service:", {
    componentType,
    substationId,
    inputsCount: Object.keys(inputValues).length
  })

  try {
    const response = await axios.post(`${ML_SERVICE_URL}/predict/simulation`, {
      component: componentType,
      substation: substationId,
      inputs: inputValues
    }, {
      timeout: Number(process.env.ML_PREDICT_TIMEOUT_MS || 15000)
    })

    console.log("[ML Runner] Simulation completed successfully")
    return response.data
  } catch (error: any) {
    console.error("[ML Runner] Simulation ML service failed:", error.message || error)
    
    let errorDetail = error.message || "Unknown error"
    if (error.response && error.response.data && error.response.data.detail) {
      errorDetail = error.response.data.detail
    }
    
    throw new Error(`Simulation predictor service failure: ${errorDetail}`)
  }
}
