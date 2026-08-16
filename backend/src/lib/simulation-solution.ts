import type { SimulationData } from "@/components/simulation/analysis-page"

const COMPONENT_LABELS: Record<SimulationData["componentType"], string> = {
  transformer: "Transformer",
  bayLines: "Bay",
  circuitBreaker: "Circuit Breaker",
  isolator: "Isolator",
  busbar: "Busbar",
}

export type RiskLevel = "Low" | "Medium" | "High" | "Critical"

export interface FaultSummary {
  type: string
  probability: number
  severity: string
  eta?: string | null
}

export interface ComponentInfoSummary {
  componentType: string
  assetId: string
  manufacturer: string
  model: string
  commissionedYear: string
  lastMaintenanceDate: string
  conditionSummary: string
  finalStateSummary: Array<{ label: string; value: string }>
  healthScore: number
  riskLevel: RiskLevel
  faultPredictions: FaultSummary[]
}

export interface AiInsight {
  title: string
  severity: RiskLevel
  description: string
}

export interface MaintenanceBlock {
  title: string
  tasks: string[]
}

export interface FailureForecastEntry {
  window: string
  outlook: string
  recommendation: string
}

export interface ReplacementRecommendation {
  item: string
  urgency: RiskLevel
  rul: string
  cost?: string
}

export interface PreventiveScheduleEntry {
  cadence: string
  tasks: string[]
}

export interface SolutionSummary {
  overallHealth: number
  failureProbability: number
  rootCauses: string[]
  topActions: string[]
  expectedImprovement: number
}

export interface SolutionData {
  generatedAt: string
  componentInfo: ComponentInfoSummary
  aiInsights: AiInsight[]
  maintenancePlan: MaintenanceBlock[]
  failureForecast: FailureForecastEntry[]
  replacementPlan: ReplacementRecommendation[]
  preventiveSchedule: PreventiveScheduleEntry[]
  summary: SolutionSummary
  promptPayload: Record<string, any>
}

const COMPONENT_LABEL_LOOKUP = COMPONENT_LABELS

const healthClamp = (value: number) => Math.min(100, Math.max(0, value))

function getHealthScore(data: SimulationData): number {
  if (typeof data.overallHealth === "number") {
    return healthClamp(data.overallHealth)
  }
  if (data.healthScores?.overall) {
    return healthClamp(data.healthScores.overall)
  }
  if (data.healthScores) {
    const nonZero = Object.values(data.healthScores).filter((value) => typeof value === "number")
    if (nonZero.length > 0) {
      return healthClamp(nonZero.reduce((sum, value) => sum + value, 0) / nonZero.length)
    }
  }
  if (typeof data.stressScore === "number") {
    return healthClamp(100 - data.stressScore * 10)
  }
  return 70
}

function deriveRiskLevel(health: number, faults: SimulationData["faultPredictions"] = []): RiskLevel {
  if (health >= 80 && (!faults || faults.length === 0)) return "Low"
  if (health >= 65) return "Medium"
  if (health >= 45) return "High"
  return "Critical"
}

const formatKey = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/\b\w/g, (char) => char.toUpperCase())

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "—"
    if (Math.abs(value) >= 1000) return value.toFixed(0)
    if (Math.abs(value) >= 100) return value.toFixed(1)
    if (Math.abs(value) >= 10) return value.toFixed(1)
    if (Math.abs(value) >= 1) return value.toFixed(2)
    return value.toFixed(3)
  }
  return String(value)
}

export async function generateSolutionPackage(simulationData: SimulationData): Promise<SolutionData> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const componentType = simulationData.componentType
  const componentLabel = COMPONENT_LABEL_LOOKUP[componentType]
  const healthScore = getHealthScore(simulationData)
  const faults = simulationData.faultPredictions ?? []
  const riskLevel = deriveRiskLevel(healthScore, faults)
  const failureProbability =
    typeof simulationData.faultProbability === "number"
      ? simulationData.faultProbability <= 1
        ? simulationData.faultProbability * 100
        : simulationData.faultProbability
      : Math.min(95, Math.max(5, (100 - healthScore) * 0.7 + faults.length * 6))

  const assetMeta = (simulationData.assetMetadata ?? {}) as SimulationData["assetMetadata"] & {
    lastMaintenanceDate?: string
    conditionSummary?: string
    substation?: Record<string, any>
  }

  const contextAssetId = simulationData.assetContext?.id
  const derivedAssetId =
    typeof assetMeta?.assetId === "string" && assetMeta.assetId.length > 0
      ? assetMeta.assetId
      : contextAssetId
        ? String(contextAssetId)
        : "Not tagged"
  const finalStateEntries = Object.entries(simulationData.finalState ?? {}).slice(0, 4)
  const finalStateSummary =
    finalStateEntries.length > 0
      ? finalStateEntries.map(([key, value]) => ({
          label: formatKey(key),
          value: formatValue(value),
        }))
      : []

  const componentInfo: ComponentInfoSummary = {
    componentType: componentLabel,
    assetId: derivedAssetId,
    manufacturer: assetMeta.manufacturer ?? "Not specified",
    model: assetMeta.model ?? "Unknown model",
    commissionedYear: assetMeta.installationYear ? String(assetMeta.installationYear) : "—",
    lastMaintenanceDate: assetMeta.lastMaintenanceDate ?? "Not recorded",
    conditionSummary:
      assetMeta.conditionSummary ??
      simulationData.diagnosis?.split("\n")[0] ??
      "Asset condition summary not provided.",
    finalStateSummary,
    healthScore,
    riskLevel,
    faultPredictions: faults.map((fault) => ({
      type: fault.type,
      probability: Number(((fault.probability ?? 0) * 100).toFixed(0)),
      severity: fault.severity,
      eta: fault.timeToFailure ? `${fault.timeToFailure.toFixed(1)} h` : null,
    })),
  }

  const aiInsights = buildInsights(componentType, faults, simulationData)
  const maintenancePlan = buildMaintenance(componentType)
  const failureForecast = buildFailureForecast(componentType, healthScore, riskLevel)
  const replacementPlan = buildReplacementPlan(componentType)
  const preventiveSchedule = buildPreventiveSchedule(componentType)

  const summary: SolutionSummary = {
    overallHealth: healthScore,
    failureProbability,
    rootCauses: aiInsights.slice(0, 3).map((item) => item.description),
    topActions: maintenancePlan.flatMap((block) => block.tasks).slice(0, 5),
    expectedImprovement: componentType === "transformer" ? 18 : 12,
  }

  const promptPayload = {
    substationMetadata: assetMeta.substation ?? { id: simulationData.substationId },
    assetMetadata: assetMeta,
    componentType,
    simulationInput: simulationData.inputValues,
    simulationTimeline: simulationData.timeline ?? [],
    finalState: simulationData.finalState ?? {},
    healthScores: simulationData.healthScores ?? {},
    faultPredictions: simulationData.faultPredictions ?? [],
    diagnosis: simulationData.diagnosis ?? "",
    request: {
      generate: [
        "fault_diagnosis",
        "maintenance_recommendations",
        "failure_forecast",
        "replacement_recommendations",
        "preventive_maintenance_plan",
        "executive_summary",
      ],
      useIndustryStandards: true,
      equipmentScope: ["transformer", "breaker", "bayLine", "busbar", "isolator"],
      includeTechnicalReasoning: true,
      optimizeForSubstationType: true,
    },
  }

  return {
    generatedAt: new Date().toISOString(),
    componentInfo,
    aiInsights,
    maintenancePlan,
    failureForecast,
    replacementPlan,
    preventiveSchedule,
    summary,
    promptPayload,
  }
}

function buildInsights(
  component: SimulationData["componentType"],
  faults: SimulationData["faultPredictions"],
  data: SimulationData,
): AiInsight[] {
  const withSeverity = (title: string, severity: RiskLevel, description: string): AiInsight => ({
    title,
    severity,
    description,
  })

  const maps: Record<SimulationData["componentType"], AiInsight[]> = {
    transformer: [
      withSeverity(
        "Winding overheating from high load",
        "High",
        "Load exceeds safe band causing hotspot >110°C. Enforce immediate load shedding.",
      ),
      withSeverity("Oil health degradation", "Medium", "Moisture and reduced BDV detected. Execute filtration and silica gel replacement."),
    ],
    circuitBreaker: [
      withSeverity("SF6 pressure trending below threshold", "High", "Density <6.2 bar compromises arc quenching. Schedule refill and leak detection."),
      withSeverity("Mechanism wear increasing", "Medium", "Operation counts & timing drift indicate lubrication and spring maintenance is due."),
    ],
    bayLines: [
      withSeverity("CT burden saturation risk", "High", "Measured burden exceeds 90% capacity leading to inaccurate relay inputs."),
      withSeverity("PF & frequency drift", "Medium", "Persistent PF <0.92 increases current heating. Investigate capacitor banks."),
    ],
    busbar: [
      withSeverity("Hotspot likelihood at joints", "High", "Thermal trend indicates localized heating. IR scan and clamp tightening required."),
      withSeverity("Mechanical vibration", "Medium", "Spacer fatigue noted. Re-tension supports to avoid conductor fretting."),
    ],
    isolator: [
      withSeverity("Torque rise on drive mechanism", "Medium", "Higher torque suggests lubrication loss and potential shaft wear."),
      withSeverity("Contact alignment drift", "Low", "Minor blade pressure imbalance, schedule contact cleaning and adjustment."),
    ],
  }

  return faults && faults.length > 0 ? maps[component] : [withSeverity("Stable operation", "Low", "No anomalies raised")]
}

function buildMaintenance(component: SimulationData["componentType"]): MaintenanceBlock[] {
  const maintenanceMap: Record<SimulationData["componentType"], MaintenanceBlock[]> = {
    transformer: [
      {
        title: "Thermal Stress",
        tasks: ["Reduce loading to <85%", "Run cooling fans continuously", "Perform IR scanning at radiator fins"],
      },
      {
        title: "Oil Health",
        tasks: ["Full oil filtration", "Conduct BDV test", "Replace silica gel", "Inspect conservator tank & oil level"],
      },
      {
        title: "DGA Gas",
        tasks: ["DGA test within 48 hrs", "Compare against Duval Triangle signature", "Inspect for overheating or localized arcing"],
      },
      {
        title: "Winding & Core",
        tasks: ["Perform winding resistance test", "Run SFRA on HV/LV windings", "Torque and tighten core clamps"],
      },
      {
        title: "OLTC",
        tasks: [
          "Check diverter switch wear",
          "Perform timing signature test",
          "Replace contacts if deviation > 8 ms",
          "Re-grease mechanism linkages",
        ],
      },
    ],
    circuitBreaker: [
      {
        title: "SF6 Health",
        tasks: ["Refill SF6 to nameplate pressure", "Run ultrasonic leak test", "Replace moisture absorbent"],
      },
      {
        title: "Mechanism",
        tasks: ["Lubricate linkages", "Check spring charging time", "Replace worn springs"],
      },
      {
        title: "Operation Count / Timing",
        tasks: ["Conduct timing tests", "Inspect trip coils", "Clean arcing contacts"],
      },
    ],
    bayLines: [
      {
        title: "CT Issues",
        tasks: ["Reduce burden", "Run secondary injection test", "Verify CT polarity marks"],
      },
      {
        title: "VT Issues",
        tasks: ["Re-calibrate VT ratios", "Inspect VT fuses", "Replace insulation if drift >20%"],
      },
      {
        title: "Frequency & PF",
        tasks: ["Activate capacitor banks", "Check harmonic filters", "Investigate source of PF drift"],
      },
    ],
    busbar: [
      {
        title: "Thermal",
        tasks: ["IR scan for hotspots", "Tighten clamps", "Verify sag & vibration"],
      },
      {
        title: "Mechanical",
        tasks: ["Replace corroded bolts", "Apply anti-oxidation coating", "Re-tension supports"],
      },
      {
        title: "Electrical",
        tasks: ["Balance load", "Check bolted joints", "Compare operation to thermal limit"],
      },
    ],
    isolator: [
      {
        title: "Mechanical Wear",
        tasks: ["Lubricate shaft", "Tighten drive rods", "Replace worn bearings"],
      },
      {
        title: "Contact Alignment",
        tasks: ["Check pressure", "Inspect blade for discoloration", "Replace eroded copper contacts"],
      },
    ],
  }

  return maintenanceMap[component]
}

function buildFailureForecast(
  component: SimulationData["componentType"],
  health: number,
  risk: RiskLevel,
): FailureForecastEntry[] {
  const highRisk = risk === "High" || risk === "Critical"
  const healthLabel = health.toFixed(0)

  const defaults: FailureForecastEntry[] = [
    {
      window: "0-6 months",
      outlook: highRisk ? `Elevated outage probability with health at ${healthLabel}%.` : `Stable operation with watch points identified.`,
      recommendation: highRisk
        ? "Schedule focused inspections and reduce loading where possible."
        : "Continue thermography and oil sampling cadence.",
    },
    {
      window: "6-12 months",
      outlook: highRisk ? "Maintenance debt likely to trigger nuisance trips." : "Minor degradation trend detected.",
      recommendation: "Plan targeted maintenance window and verify KPIs after completion.",
    },
    {
      window: "1-3 years",
      outlook: highRisk ? "Component may hit end-of-life envelope." : "Plan for mid-life refurbishment.",
      recommendation: "Align spares, procurement, and outage windows for proactive replacement.",
    },
    {
      window: ">3 years",
      outlook: highRisk ? "Asset replacement should be budgeted now." : "Long-term performance depends on adherence to PM.",
      recommendation: "Update asset roadmap and digital twin assumptions annually.",
    },
  ]

  const componentOverrides: Partial<Record<SimulationData["componentType"], FailureForecastEntry[]>> = {
    transformer: [
      {
        window: "0-6 months",
        outlook: highRisk ? "Hotspot temperatures approaching 110°C band." : "Thermal margins tightening under peak load.",
        recommendation: highRisk ? "Shift load within weeks and verify cooling auxiliaries weekly." : "Increase IR scans and DGA cadence.",
      },
      {
        window: "6-12 months",
        outlook: "Oil aging accelerating; Duval profile indicates emerging thermal fault.",
        recommendation: "Schedule filtration, BDV testing, and OLTC inspection in the next outage.",
      },
      {
        window: "1-3 years",
        outlook: "Insulation endurance drops ~3% per quarter without intervention.",
        recommendation: "Plan major refurbishment or retrofill program before the third year horizon.",
      },
      {
        window: ">3 years",
        outlook: "Digital twin predicts residual life only if derating is maintained.",
        recommendation: "Budget for replacement transformer or advanced life-extension kit.",
      },
    ],
    circuitBreaker: [
      {
        window: "0-6 months",
        outlook: highRisk ? "SF6 density nearing lockout threshold." : "Density trending slightly low.",
        recommendation: "Top up SF6, run leak detection, and verify density switch calibration.",
      },
      {
        window: "6-12 months",
        outlook: "Mechanism wear may add >10 ms to clearing time.",
        recommendation: "Overhaul operating mechanism, replace dashpots, and perform timing test shots.",
      },
      {
        window: "1-3 years",
        outlook: "Contact erosion projected to exceed IEC limits without intervention.",
        recommendation: "Secure spare interrupter and plan retrofit in the next major shutdown.",
      },
      {
        window: ">3 years",
        outlook: "Legacy mechanism will require full modernization kit.",
        recommendation: "Include breaker replacement or refurbishment in capital plan.",
      },
    ],
  }

  return componentOverrides[component] ?? defaults
}

function buildReplacementPlan(component: SimulationData["componentType"]): ReplacementRecommendation[] {
  const map: Record<SimulationData["componentType"], ReplacementRecommendation[]> = {
    transformer: [
      { item: "Forced-air fan assembly", urgency: "Medium", rul: "18 months", cost: "$18k" },
      { item: "Radiator isolation valve", urgency: "Low", rul: "24 months", cost: "$6k" },
      { item: "OLTC diverter switch kit", urgency: "High", rul: "9 months", cost: "$22k" },
      { item: "LV/HV bushing set", urgency: "Medium", rul: "15 months", cost: "$28k" },
    ],
    circuitBreaker: [
      { item: "Spring operating mechanism", urgency: "Medium", rul: "12 months", cost: "$30k" },
      { item: "SF6 nozzle kit", urgency: "High", rul: "6 months", cost: "$9k" },
      { item: "Trip coil assembly", urgency: "Medium", rul: "18 months", cost: "$3k" },
    ],
    bayLines: [
      { item: "Capacitor bank", urgency: "Medium", rul: "14 months", cost: "$11k" },
      { item: "Relay burden kit", urgency: "Low", rul: "20 months", cost: "$4k" },
      { item: "VT insulation pack", urgency: "Medium", rul: "16 months", cost: "$7k" },
    ],
    busbar: [
      { item: "Joint clamp kit", urgency: "Medium", rul: "10 months", cost: "$5k" },
      { item: "Conductor spacer set", urgency: "Low", rul: "24 months", cost: "$8k" },
      { item: "IR monitoring sensors", urgency: "Medium", rul: "18 months", cost: "$14k" },
    ],
    isolator: [
      { item: "Drive mechanism kit", urgency: "Medium", rul: "12 months", cost: "$6k" },
      { item: "Contact finger set", urgency: "High", rul: "8 months", cost: "$2.5k" },
      { item: "Position indicator system", urgency: "Low", rul: "20 months", cost: "$1.8k" },
    ],
  }

  return map[component]
}

function buildPreventiveSchedule(component: SimulationData["componentType"]): PreventiveScheduleEntry[] {
  const schedule: Record<SimulationData["componentType"], PreventiveScheduleEntry[]> = {
    transformer: [
      { cadence: "Monthly", tasks: ["Review load profile", "Check fan status", "Visual inspection of bushings"] },
      { cadence: "Quarterly", tasks: ["Oil sampling", "Tap changer inspection", "Thermography scan"] },
      { cadence: "Yearly", tasks: ["Full DGA", "Winding resistance test", "OLTC timing test"] },
    ],
    circuitBreaker: [
      { cadence: "Monthly", tasks: ["SF6 pressure check", "Mechanism exercise", "Visual inspection"] },
      { cadence: "Half-yearly", tasks: ["Timing test", "Contact resistance measurement", "Lubrication"] },
      { cadence: "Yearly", tasks: ["Full mechanism overhaul", "Insulation resistance test"] },
    ],
    bayLines: [
      { cadence: "Weekly", tasks: ["Relay health check", "Secondary injection test"] },
      { cadence: "Monthly", tasks: ["PF correction review", "Harmonic analysis"] },
      { cadence: "Yearly", tasks: ["Line impedance test", "CT/VT calibration"] },
    ],
    busbar: [
      { cadence: "Monthly", tasks: ["IR scan", "Thermal trend review"] },
      { cadence: "Yearly", tasks: ["Torque checks", "Joint resistance measurement"] },
      { cadence: "2-Year", tasks: ["Complete mechanical inspection", "Spacer replacement"] },
    ],
    isolator: [
      { cadence: "Quarterly", tasks: ["Lubrication", "Operational check"] },
      { cadence: "Yearly", tasks: ["Contact inspection", "Alignment verification"] },
      { cadence: "2-Year", tasks: ["Drive mechanism overhaul", "Seal replacement"] },
    ],
  }

  return schedule[component]
}


