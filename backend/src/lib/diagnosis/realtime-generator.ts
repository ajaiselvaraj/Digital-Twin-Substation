import { COMPONENT_DEFINITIONS } from "./component-config"
import type { DiagnosisComponentKey } from "./types"

const numericState = new Map<string, number>()
const historyState = new Map<string, number[]>()

const STATUS_LOOKUP: Record<string, string[]> = {
  breakerStatus: ["Open", "Close"],
  status: ["Open", "Close"],
  buchholz: ["Normal", "Alarm", "Trip"],
  cooling: ["ON", "OFF", "AUTO"],
  relayStatus: ["Active", "Inactive"],
  firmwareVersion: ["v3.4.2", "v3.4.3", "v3.5.0-beta"],
  selfTest: ["PASS", "FAIL"],
  gpsSync: ["Locked", "Holdover", "Unlock"],
}

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min

const clamp = (value: number, min?: number, max?: number) => {
  if (typeof min === "number" && value < min) return min
  if (typeof max === "number" && value > max) return max
  return value
}

function nextNumericValue(component: DiagnosisComponentKey, paramKey: string, min?: number, max?: number) {
  const key = `${component}:${paramKey}`
  const baseline = typeof min === "number" && typeof max === "number" ? (min + max) / 2 : 0
  const prev = numericState.get(key) ?? baseline
  const span = typeof min === "number" && typeof max === "number" ? max - min : Math.abs(prev) || 1
  const drift = randomBetween(-span * 0.01, span * 0.01)
  let next = prev + drift

  // occasional spikes
  if (Math.random() < 0.03) {
    next += randomBetween(-span * 0.05, span * 0.05)
  }

  next = clamp(next, min, max)
  numericState.set(key, next)
  return Number(next.toFixed(2))
}

function pushHistory(component: DiagnosisComponentKey, paramKey: string, value: number) {
  const key = `${component}:${paramKey}`
  const existing = historyState.get(key) ?? []
  const next = [...existing.slice(-30), value]
  historyState.set(key, next)
  return next
}

export function generateSyntheticReadings(component: DiagnosisComponentKey) {
  const definition = COMPONENT_DEFINITIONS[component]
  if (!definition) {
    throw new Error(`Unknown component ${component}`)
  }

  const readings: Record<string, number | string> = {}
  const history: Record<string, number[]> = {}
  const timestamp = new Date().toISOString()

  for (const param of definition.parameters) {
    if (param.type === "status") {
      const values = STATUS_LOOKUP[param.key] ?? ["Normal", "Warning", "Alarm"]
      const idx = Math.floor(Math.random() * values.length)
      readings[param.key] = values[idx]
    } else {
      const value = nextNumericValue(component, param.key, param.min, param.max)
      readings[param.key] = value
      if (definition.defaultTrends.includes(param.key)) {
        history[param.key] = pushHistory(component, param.key, value)
      }
    }
  }

  return {
    timestamp,
    readings,
    history,
  }
}

