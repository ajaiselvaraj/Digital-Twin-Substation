import { COMPONENT_DEFINITIONS } from "./component-config"
import type {
  DiagnosisComponentKey,
  DiagnosisMaintenanceRecord,
  DiagnosisSeverity,
  ParameterState,
} from "./types"

const severityOrder: DiagnosisSeverity[] = ["normal", "warning", "alarm", "trip"]

const randomId = () => Math.random().toString(36).slice(2, 10)

export function buildMaintenancePanel(opts: {
  component: DiagnosisComponentKey
  assetMetadata: Record<string, any>
  parameterStates: ParameterState[]
  faultProbability: number
  healthScore: number
}): {
  automaticAlerts: DiagnosisMaintenanceRecord[]
  pendingIssues: DiagnosisMaintenanceRecord[]
  suggestions: string[]
} {
  const { component, assetMetadata, parameterStates, faultProbability, healthScore } = opts
  const triggered = parameterStates.filter((item) => severityOrder.indexOf(item.severity) >= severityOrder.indexOf("alarm"))

  const automaticAlerts: DiagnosisMaintenanceRecord[] = triggered.map((item) => ({
    id: randomId(),
    title: `${item.label} breach`,
    severity: item.severity,
    timestamp: new Date().toISOString(),
    description: `${item.label} measured ${item.value}${item.unit ?? ""} beyond safe envelope`,
    owner: "Autonomous Agent",
    status: "open",
  }))

  const assetKeyMap: Record<DiagnosisComponentKey, string> = {
    bayLines: "bayLines",
    transformer: "transformers",
    circuitBreaker: "breakers",
    busbar: "busbars",
    isolator: "isolators",
    relay: "relay",
    pmu: "pmu",
    gis: "gis",
    battery: "battery",
    environment: "environment",
  }

  const assetArray = assetMetadata?.assets?.[assetKeyMap[component]] ?? []

  const pendingIssues: DiagnosisMaintenanceRecord[] = assetArray
    .flatMap((asset: any) => asset?.maintenanceHistory ?? [])
    .slice(-4)
    .map((entry: any) => ({
      id: entry.id ?? randomId(),
      title: entry.notes ?? "Maintenance activity",
      severity: entry.severity ?? "warning",
      timestamp: entry.date ?? new Date().toISOString(),
      description: entry.notes ?? "",
      owner: entry.technician ?? "Field Crew",
      status: "in_progress",
    }))

  const definition = COMPONENT_DEFINITIONS[component]
  const suggestions = definition.maintenancePlaybook.map(
    (play) => `${play.title}: ${play.steps[0]}`
  )

  if (faultProbability > 0.7) {
    suggestions.unshift("Initiate emergency inspection and prepare outage plan.")
  }

  if (healthScore < 40) {
    suggestions.unshift("Raise CMMS ticket for immediate rectification.")
  }

  return {
    automaticAlerts,
    pendingIssues,
    suggestions,
  }
}

