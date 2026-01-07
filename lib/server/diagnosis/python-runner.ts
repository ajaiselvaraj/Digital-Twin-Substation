import { randomUUID } from "node:crypto"
import { spawn } from "node:child_process"
import path from "node:path"

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

const runCommand = (args: string[], stdinData?: string, timeoutMs: number = DEFAULT_TIMEOUT_MS) =>
  new Promise<string>((resolve, reject) => {
    const cmd = process.env.PYTHON_PATH || "python"
    const subprocess = spawn(cmd, args, { 
      stdio: stdinData ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"] 
    })
    let stdout = ""
    let stderr = ""
    let isResolved = false

    // Set timeout to kill process if it takes too long
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true
        subprocess.kill('SIGTERM')
        // Force kill after a short grace period
        setTimeout(() => {
          if (!subprocess.killed) {
            subprocess.kill('SIGKILL')
          }
        }, 2000)
        reject(new Error(`Python script timeout after ${timeoutMs}ms. stderr: ${stderr.substring(0, 500)}`))
      }
    }, timeoutMs)

    // Write stdin data if provided
    if (stdinData && subprocess.stdin) {
      subprocess.stdin.write(stdinData)
      subprocess.stdin.end()
    }

    subprocess.stdout.on("data", (chunk) => {
      stdout += chunk.toString()
    })
    subprocess.stderr.on("data", (chunk) => {
      stderr += chunk.toString()
    })
    subprocess.on("error", (error) => {
      if (!isResolved) {
        isResolved = true
        clearTimeout(timeout)
        reject(error)
      }
    })
    subprocess.on("close", (code) => {
      if (isResolved) return
      isResolved = true
      clearTimeout(timeout)
      
      if (code === 0) {
        // Extract JSON from stdout - TensorFlow might print progress info before/after JSON
        const trimmed = stdout.trim()
        
        // Try to find JSON object in the output (in case TensorFlow printed something)
        // Look for the first { and last } to extract JSON
        const firstBrace = trimmed.indexOf('{')
        const lastBrace = trimmed.lastIndexOf('}')
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          // Extract JSON portion
          const jsonStr = trimmed.substring(firstBrace, lastBrace + 1)
          resolve(jsonStr)
        } else {
          // No braces found, return as-is (shouldn't happen but handle gracefully)
          resolve(trimmed)
        }
      } else {
        // Try to extract JSON error from stderr if available
        let errorMessage = stderr || `Python exited with code ${code}`
        try {
          // Check if stderr contains JSON error
          const jsonMatch = stderr.match(/\{[\s\S]*"error"[\s\S]*\}/)
          if (jsonMatch) {
            const errorJson = JSON.parse(jsonMatch[0])
            if (errorJson.error) {
              errorMessage = errorJson.error
            }
          }
        } catch {
          // If JSON parsing fails, use original error message
        }
        const error = new Error(errorMessage)
        reject(error)
      }
    })
  })

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

export async function invokePredictor(opts: {
  component: DiagnosisComponentKey
  areaCode: string
  substationId?: string | null
  liveReadings: Record<string, any>
  assetMetadata: Record<string, any>
}) {
  const { component, areaCode, substationId, liveReadings, assetMetadata } = opts
  const scriptPath = path.join(process.cwd(), "backend", "ml", "run_predictor.py")
  
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
  
  const args = [scriptPath, "--component", component, "--stdin"]
  const stdinData = JSON.stringify(mlInput)

  try {
    console.log(`[invokePredictor] Calling Python script: ${scriptPath}`)
    const startTime = Date.now()
    // Use shorter timeout to fail fast and rely on cached/mock results when Python is slow
    const output = await runCommand(args, stdinData, DEFAULT_TIMEOUT_MS)
    const duration = Date.now() - startTime
    console.log(`[invokePredictor] Python script completed in ${duration}ms`)
    
    const parsed = JSON.parse(output)
    console.log(`[invokePredictor] Prediction received, keys: ${Object.keys(parsed).length}`)
    return parsed
  } catch (error) {
    console.error(`[invokePredictor] Python predictor failed:`, error)
    
    // Extract meaningful error message
    let errorMessage = "Unknown error"
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Check for common dependency errors
      if (errorMessage.includes("sklearn") || errorMessage.includes("scikit-learn")) {
        console.error(`[invokePredictor] Missing scikit-learn package. Install with: pip install scikit-learn`)
        errorMessage = "Missing scikit-learn package. Please install it: pip install scikit-learn"
      } else if (errorMessage.includes("MemoryError")) {
        console.error(`[invokePredictor] Memory error - may be due to Python 3.13 compatibility issues. Consider using Python 3.10-3.12.`)
        errorMessage = "Memory error - Python 3.13 may have compatibility issues. Consider using Python 3.10-3.12."
      } else if (errorMessage.includes("No module named") || errorMessage.includes("ImportError")) {
        const moduleMatch = errorMessage.match(/No module named ['"]([^'"]+)['"]|ImportError.*['"]([^'"]+)['"]/)
        const moduleName = moduleMatch ? (moduleMatch[1] || moduleMatch[2]) : "unknown"
        console.error(`[invokePredictor] Missing Python package: ${moduleName}. Install with: pip install ${moduleName}`)
        errorMessage = `Missing Python package: ${moduleName}. Install with: pip install ${moduleName}`
      }
    }
    
    console.warn(`[invokePredictor] Using mock prediction due to error: ${errorMessage}`)
    return mockPrediction(component, liveReadings, assetMetadata)
  }
}

