import type { DiagnosisSeverity, ParameterState } from "./types"

interface HealthArgs {
  pythonHealth: number
  faultProbability: number
  installationYear?: number
  maintenanceCount: number
  parameterStates: ParameterState[]
  environmentReadings?: Record<string, number | string>
}

const clamp = (val: number, min = 0, max = 100) => Math.max(min, Math.min(max, val))

const severityWeight: Record<DiagnosisSeverity, number> = {
  normal: 0,
  warning: 4,
  alarm: 10,
  trip: 25,
}

export function deriveHealthMetrics({
  pythonHealth,
  faultProbability,
  installationYear,
  maintenanceCount,
  parameterStates,
  environmentReadings,
}: HealthArgs) {
  const currentYear = new Date().getFullYear()
  const ageYears = installationYear ? currentYear - installationYear : 15
  const agingFactor = clamp((ageYears / 50) * 25)

  const maintenanceGap = clamp(Math.max(0, 4 - maintenanceCount) * 6)

  const severityScore = parameterStates.reduce((acc, state) => acc + (severityWeight[state.severity] ?? 0), 0)
  const driftScore = clamp(severityScore, 0, 30)

  let environmentalStress = 0
  if (environmentReadings) {
    const temp = Number(environmentReadings["ambientTemperature"] ?? environmentReadings["oilTemp"])
    if (!Number.isNaN(temp)) {
      environmentalStress += temp > 60 ? 20 : temp > 45 ? 10 : 0
    }
    const humidity = Number(environmentReadings["humidity"])
    if (!Number.isNaN(humidity)) {
      environmentalStress += humidity > 90 ? 10 : humidity > 80 ? 5 : 0
    }
  }
  environmentalStress = clamp(environmentalStress, 0, 15)

  const mlImpact = clamp(faultProbability * 100)

  const penalty = mlImpact * 0.25 + agingFactor + maintenanceGap + driftScore + environmentalStress
  const computedHealth = clamp(100 - penalty)
  const score = Math.round((computedHealth + pythonHealth) / 2)

  return {
    score,
    breakdown: {
      mlImpact: Math.round(mlImpact),
      agingFactor: Math.round(agingFactor),
      maintenanceGap: Math.round(maintenanceGap),
      driftScore: Math.round(driftScore),
      environmentalStress: Math.round(environmentalStress),
    },
  }
}

