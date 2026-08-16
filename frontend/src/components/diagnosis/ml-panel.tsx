"use client"

import { Activity, Brain, Network } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { COMPONENT_DEFINITIONS } from "@/lib/diagnosis/component-config"
import type { DiagnosisComponentKey } from "@/lib/diagnosis/types"
import {
  getCombinedFaultProbabilityColor,
  getCombinedFaultProbabilityTextClass,
} from "@/lib/simulation-color-coding"
import { cn } from "@/lib/utils"

const modelIcons = {
  lstm: Brain,
  isolationForest: Network,
  xgboost: Activity,
}

interface MLPanelProps {
  component: DiagnosisComponentKey
  faultProbability: number
  predictedFault?: string
  explanation?: string
  timeline?: number[]
  lstmScore?: number
  isolationForestScore?: number
  xgboostScore?: number
  liveReadings?: Record<string, number | string>
}

export function MLPanel({ 
  component, 
  faultProbability, 
  predictedFault, 
  explanation, 
  timeline,
  lstmScore,
  isolationForestScore,
  xgboostScore,
  liveReadings,
}: MLPanelProps) {
  const definition = COMPONENT_DEFINITIONS[component]
  const combinedScore = Math.round((faultProbability || 0) * 100)

  // Map component to the parameter being forecasted and its unit
  // Priority: component-config keys (camelCase) first, then backend keys (live_ prefix)
  const getForecastParameter = () => {
    switch (component) {
      case "bayLines":
        return { 
          keys: ["mw", "live_ActivePower_MW", "activePower"], // "mw" is the key in component-config
          label: "Active Power", 
          unit: "MW",
          description: "Forecasting Active Power"
        }
      case "transformer":
        return { 
          keys: ["loading", "live_LoadingPercent", "loadingPercent"], // "loading" is the key in component-config
          label: "Transformer Loading", 
          unit: "%",
          description: "Predicts Transformer Loading"
        }
      case "isolator":
        return { 
          keys: ["driveTorque", "live_DriveTorque_Nm", "drive_torque"], // "driveTorque" is the key in component-config
          label: "Drive Torque", 
          unit: "Nm",
          description: "Forecasting Drive Torque"
        }
      case "busbar":
        return { 
          keys: ["busTemperature", "live_BusTemperature_C", "bus_temperature"], // "busTemperature" is the key in component-config
          label: "Bus Temperature", 
          unit: "°C",
          description: "Forecasting Bus Temperature"
        }
      case "circuitBreaker":
        return { 
          keys: ["operationTime", "live_OperationTime_ms", "operation_time"], // "operationTime" is the key in component-config
          label: "Operating Time", 
          unit: "ms",
          description: "Forecasting Operating Time"
        }
      default:
        return { 
          keys: [], 
          label: "Parameter", 
          unit: "",
          description: "Forecasting parameter"
        }
    }
  }

  const forecastParam = getForecastParameter()
  
  // Try to find the current value using multiple possible key formats
  let currentValue: number | null = null
  if (liveReadings && forecastParam.keys.length > 0) {
    for (const key of forecastParam.keys) {
      const rawValue = liveReadings[key]
      if (rawValue !== undefined && rawValue !== null) {
        const numValue = Number(rawValue)
        if (!isNaN(numValue)) {
          currentValue = numValue
          break
        }
      }
    }
  }

  // Map model keys to actual scores from backend
  const getModelScore = (modelKey: string): number | null => {
    if (modelKey === "lstm" && lstmScore !== undefined) {
      return lstmScore
    }
    if (modelKey === "isolationForest" && isolationForestScore !== undefined) {
      return isolationForestScore
    }
    if (modelKey === "xgboost" && xgboostScore !== undefined) {
      return xgboostScore
    }
    return null
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">ML-Based Fault Diagnosis</CardTitle>
        <p className="text-sm text-slate-500">
          Ensemble of LSTM forecast, Isolation Forest anomaly score, and XGBoost classification.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Combined Fault Probability</p>
              <p className={cn("text-3xl font-semibold", getCombinedFaultProbabilityTextClass(faultProbability))}>
                {combinedScore}%
              </p>
            </div>
            <Badge
              style={{
                backgroundColor: `${getCombinedFaultProbabilityColor(faultProbability)}20`,
                color: getCombinedFaultProbabilityColor(faultProbability),
              }}
            >
              {faultProbability > 0.75 ? "Critical Failure Expected" : faultProbability > 0.50 ? "Danger" : faultProbability > 0.25 ? "Caution" : "Safe"}
            </Badge>
          </div>
          <div className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-slate-700">
            <p className="font-semibold mb-1">What this means:</p>
            <p>
              {faultProbability > 0.75
                ? "Critical Failure Expected: Immediate attention is required. The ML models have detected multiple warning signals suggesting potential equipment failure. Recommended actions: Schedule emergency inspection, review maintenance logs, and prepare contingency plans."
                : faultProbability > 0.50
                  ? "Danger: Elevated risk that warrants monitoring. The system has identified anomalies that could lead to faults if not addressed. Recommended actions: Increase monitoring frequency, review recent operational parameters, and plan preventive maintenance."
                  : faultProbability > 0.25
                    ? "Caution: Moderate risk level. The equipment shows some signs that require attention. Recommended actions: Monitor closely and schedule preventive maintenance."
                    : "Safe: Normal operation with low fault probability. The equipment is functioning within expected parameters. Continue routine monitoring and scheduled maintenance."}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Predicted Fault</p>
            <p className="text-lg font-semibold text-slate-800">{predictedFault ?? "Normal"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Timeline Forecast (24h)</p>
            {timeline && timeline.length > 0 ? (
              <div className="space-y-3 mt-2">
                <div>
                  <p className="text-xs text-slate-600 font-medium mb-1">
                    {forecastParam.description || `Forecasting: ${forecastParam.label}`}
                  </p>
                  {currentValue !== null ? (
                    <p className="text-xs text-slate-500">
                      Current: <span className="font-semibold text-slate-700">{currentValue.toFixed(1)} {forecastParam.unit}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600">
                      Current value not available - showing forecast deltas only
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {timeline.slice(0, 3).map((forecastDelta, index) => {
                    const hourNumber = index + 1
                    const hourLabel = `${hourNumber}h`
                    // Add or subtract forecast delta to current value (negative values reduce, positive increase)
                    const forecastValue = currentValue !== null 
                      ? Number((currentValue + forecastDelta).toFixed(1))
                      : forecastDelta
                    const isNegative = forecastValue < 0
                    return (
                      <div key={`forecast-${index}`} className="flex flex-col items-center text-center">
                        <span className="text-xs text-slate-500 mb-2">{hourLabel}</span>
                        <span className={`inline-flex rounded-full px-3 py-2 text-sm font-semibold w-full justify-center ${
                          isNegative 
                            ? "bg-red-100 text-red-700" 
                            : "bg-slate-100 text-slate-800"
                        }`}>
                          {isNegative ? "-" : ""}{Math.abs(forecastValue).toFixed(1)}
                        </span>
                        {forecastParam.unit && (
                          <span className="text-[10px] text-slate-400 mt-1">{forecastParam.unit}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-slate-500 text-center">
                  Next 3 hours forecast (1h, 2h, 3h)
                </p>
              </div>
            ) : (
              <span className="text-sm text-slate-400">No forecast available</span>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {definition.mlModels.map((model) => {
            const Icon = modelIcons[model.key]
            const actualScore = getModelScore(model.key)
            
            // Use actual score from backend if available, otherwise show placeholder
            let displayScore: number
            let displayLabel: string
            
            if (actualScore !== null) {
              if (model.key === "isolationForest") {
                // Isolation Forest is binary (0 or 1), show as percentage
                displayScore = actualScore === 1 ? 100 : 0
                displayLabel = actualScore === 1 ? "Anomaly Detected" : "Normal"
              } else if (model.key === "lstm") {
                // LSTM forecast score (can be negative), convert to percentage
                displayScore = actualScore * 100
                // Show negative percentage if value is negative
                displayLabel = displayScore < 0 
                  ? `-${Math.abs(displayScore).toFixed(1)}%`
                  : `${displayScore.toFixed(1)}%`
              } else {
                // XGBoost fault score (0-1), convert to percentage
                displayScore = Math.round(actualScore * 100)
                displayLabel = `${displayScore}%`
              }
            } else {
              // Fallback if score not available
              displayScore = 0
              displayLabel = "N/A"
            }
            
            return (
              <div key={model.key} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-semibold">{model.label}</p>
                </div>
                {model.key === "lstm" ? (
                  <div className="mt-3">
                    <p className={`text-2xl font-bold ${
                      actualScore !== null && actualScore < 0 
                        ? "text-red-600" 
                        : "text-slate-900"
                    }`}>
                      {displayLabel}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Forecasting: {model.description}</p>
                  </div>
                ) : model.key === "isolationForest" ? (
                  <div className="mt-3">
                    <p className="text-2xl font-bold text-slate-900">{displayLabel}</p>
                    <p className="text-xs text-slate-500 mt-1">{model.description}</p>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-2xl font-bold text-slate-900">{displayScore}%</p>
                    <p className="text-xs text-slate-500">{model.description}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

