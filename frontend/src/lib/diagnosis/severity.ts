import type { DiagnosisSeverity, ParameterDefinition } from "./types"

const STATUS_SEVERITY: Record<string, DiagnosisSeverity> = {
  Trip: "trip",
  Alarm: "alarm",
  Warning: "warning",
  FAIL: "alarm",
  Unlock: "alarm",
  Holdover: "warning",
  "Hold Over": "warning",
  Open: "warning",
  Close: "normal",
  Closed: "normal",
  Inactive: "warning",
}

export function evaluateSeverity(value: number | string | null, param: ParameterDefinition): DiagnosisSeverity {
  if (param.type === "status") {
    if (typeof value === "string" && STATUS_SEVERITY[value] != null) {
      return STATUS_SEVERITY[value]
    }
    return "normal"
  }

  if (value == null || typeof value !== "number") {
    return "normal"
  }

  if (typeof param.minAlarm === "number" && value < param.minAlarm) {
    return value < param.minAlarm * 0.8 ? "trip" : "alarm"
  }

  if (typeof param.maxAlarm === "number" && value > param.maxAlarm) {
    return value > param.maxAlarm * 1.1 ? "trip" : "alarm"
  }

  if (typeof param.min === "number" && value < param.min) {
    return "warning"
  }

  if (typeof param.max === "number" && value > param.max) {
    return "warning"
  }

  return "normal"
}

