import { Router, Request, Response } from "express"
import type { ComponentType } from "../lib/analysis-config.js"
import { invokeSimulationPredictor } from "../lib/server/simulation/python-ml-runner.js"
import { mapInputFieldsToBackend } from "../lib/server/simulation/field-mapping.js"

const router = Router()
const SUPPORTED_COMPONENTS: ComponentType[] = ["transformer", "bayLines", "circuitBreaker", "isolator", "busbar"]

router.post("/simulation-ml", async (req: Request, res: Response) => {
  try {
    const { componentType, substationId, inputValues } = req.body
    const cleanedComponent = (componentType ?? "").trim() as ComponentType
    const cleanedSubstation = (substationId ?? "").trim()
    const cleanedInputs = (inputValues ?? {}) as Record<string, any>

    console.log("[Simulation ML Route] Request received:", { 
      componentType: cleanedComponent, 
      substationId: cleanedSubstation, 
      inputKeys: Object.keys(cleanedInputs) 
    })

    if (!SUPPORTED_COMPONENTS.includes(cleanedComponent)) {
      console.warn("[Simulation ML Route] Unsupported component:", cleanedComponent)
      return res.status(400).json({ error: "Unsupported componentType" })
    }

    if (!cleanedSubstation) {
      console.warn("[Simulation ML Route] Missing substationId")
      return res.status(400).json({ error: "substationId is required" })
    }

    // Map fields
    const mappedInputs = mapInputFieldsToBackend(cleanedComponent, cleanedInputs)
    console.log("[Simulation ML Route] Mapped inputs:", {
      originalKeys: Object.keys(cleanedInputs),
      mappedKeys: Object.keys(mappedInputs)
    })

    console.log("[Simulation ML Route] Invoking predictor...")
    const prediction = await invokeSimulationPredictor({
      componentType: cleanedComponent,
      substationId: cleanedSubstation,
      inputValues: mappedInputs
    })

    if (!prediction || typeof prediction !== "object") {
      console.error("[Simulation ML Route] Invalid prediction response:", prediction)
      return res.status(500).json({ error: "Invalid prediction format from ML model" })
    }

    return res.json(prediction)
  } catch (error: any) {
    console.error("[Simulation ML Route] Predictor failed:", error)
    return res.status(500).json({
      error: "Unable to run simulation predictor",
      details: error.message || String(error)
    })
  }
})

export default router
