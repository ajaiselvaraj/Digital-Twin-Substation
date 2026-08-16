export type DiagnosisComponentKey =
  | "bayLines"
  | "transformer"
  | "circuitBreaker"
  | "busbar"
  | "isolator"
  | "relay"
  | "pmu"
  | "gis"
  | "battery"
  | "environment"

export type DiagnosisSeverity = "normal" | "warning" | "alarm" | "trip"

export interface ParameterDefinition {
  key: string
  label: string
  unit?: string
  min?: number
  max?: number
  minAlarm?: number
  maxAlarm?: number
  description?: string
  sensor?: string
  iecLn?: string
  type?: "numeric" | "status"
}

export interface ComponentDefinition {
  title: string
  description: string
  category: "primary" | "secondary"
  parameters: ParameterDefinition[]
  maintenancePlaybook: {
    title: string
    steps: string[]
  }[]
  mlModels: Array<{
    key: "lstm" | "isolationForest" | "xgboost"
    label: string
    description: string
  }>
  defaultTrends: string[]
}

export interface ParameterState {
  key: string
  label: string
  value: number | string | null
  unit?: string
  severity: DiagnosisSeverity
  minAlarm?: number
  maxAlarm?: number
}

export interface DiagnosisMaintenanceRecord {
  id: string
  title: string
  severity: DiagnosisSeverity
  timestamp: string
  description: string
  owner: string
  status: "open" | "in_progress" | "closed"
}

export interface DiagnosisEventLog {
  id: string
  title: string
  severity: DiagnosisSeverity
  timestamp: string
  description: string
  source: "ml" | "sensor" | "system"
}

export interface DiagnosisApiResponse {
  component: DiagnosisComponentKey
  areaCode: string
  substationId?: string
  fault_probability: number
  health_index: number
  predicted_fault: string
  affected_subpart?: string | null
  explanation: string
  timeline_prediction: number[]
  live_readings: Record<string, number | string>
  asset_metadata: Record<string, any>
  timestamp: string
  parameter_states: ParameterState[]
  live_status: DiagnosisSeverity
  maintenance: {
    automaticAlerts: DiagnosisMaintenanceRecord[]
    pendingIssues: DiagnosisMaintenanceRecord[]
    suggestions: string[]
  }
  health_breakdown: {
    mlImpact: number
    agingFactor: number
    maintenanceGap: number
    driftScore: number
    environmentalStress: number
  }
  events: DiagnosisEventLog[]
  trend_history: Record<string, number[]>
  live_source?: string
  // ML model scores from backend
  LSTM_ForecastScore?: number
  IsolationForestScore?: number
  XGBoost_FaultScore?: number
  Top3_HealthImpactFactors?: string[]
}

