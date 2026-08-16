import type { DiagnosisEventLog, DiagnosisSeverity, ParameterState } from "./types"

const severityFromProbability = (prob: number): DiagnosisSeverity => {
  if (prob > 0.85) return "trip"
  if (prob > 0.7) return "alarm"
  if (prob > 0.5) return "warning"
  return "normal"
}

const randomId = () => Math.random().toString(36).slice(2, 10)

export function buildEventLog(opts: {
  component: string
  faultProbability: number
  predictedFault: string
  parameterStates: ParameterState[]
}): DiagnosisEventLog[] {
  const { component, faultProbability, predictedFault, parameterStates } = opts

  const events: DiagnosisEventLog[] = [
    {
      id: randomId(),
      title: `${component} ML verdict`,
      severity: severityFromProbability(faultProbability),
      timestamp: new Date().toISOString(),
      description: predictedFault,
      source: "ml",
    },
  ]

  parameterStates
    .filter((item) => item.severity !== "normal")
    .slice(0, 3)
    .forEach((item) => {
      events.push({
        id: randomId(),
        title: `${item.label} ${item.severity}`,
        severity: item.severity,
        timestamp: new Date().toISOString(),
        description: `${item.label} observed ${item.value}${item.unit ?? ""}`,
        source: "sensor",
      })
    })

  return events
}

