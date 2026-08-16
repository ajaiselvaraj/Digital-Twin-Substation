"use client"

import { useState, useEffect } from "react"
import { PARAMETER_METADATA } from "@/lib/live-trend/parameter-metadata"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface ParameterDetailSectionProps {
  parameterKey: string
  currentValue?: number | string | null
  unit: string
}

const STATUS_LOOKUP: Record<string, number> = {
  closed: 1,
  open: 0,
  active: 1,
  inactive: 0,
  normal: 0.9,
  alarm: 0.3,
}

function convertToNumeric(value: number | string | null | undefined, key: string): { value: number | null; isBinary: boolean } {
  if (value === null || value === undefined) {
    return { value: null, isBinary: false }
  }
  if (typeof value === "number") {
    return { value, isBinary: value === 0 || value === 1 }
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    const normalized = trimmed.toLowerCase()
    if (STATUS_LOOKUP[normalized] !== undefined) {
      const mapped = STATUS_LOOKUP[normalized]
      return { value: mapped, isBinary: mapped === 0 || mapped === 1 }
    }
    const parsed = Number.parseFloat(trimmed)
    if (Number.isFinite(parsed)) {
      return { value: parsed, isBinary: false }
    }
  }
  // For some categorical parameters we still want a deterministic binary plot
  if (key === "isolatorStatus") {
    const normalized = String(value).toLowerCase()
    const mapped = normalized === "open" ? 0 : 1
    return { value: mapped, isBinary: true }
  }
  return { value: null, isBinary: false }
}

// Generate 7 days of historical data (hourly points)
function generate7DayHistory(currentValue: number, isBinary: boolean): Array<{ time: string; value: number }> {
  const data: Array<{ time: string; value: number }> = []
  const now = new Date()
  const variationBase = Math.max(Math.abs(currentValue) * 0.05, isBinary ? 0 : 0.02)

  for (let i = 168; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 60 * 60 * 1000)
    const variation = isBinary ? 0 : (Math.random() - 0.5) * variationBase
    const value = Number((currentValue + variation).toFixed(3))

    data.push({
      time: date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit" }),
      value,
    })
  }

  return data
}

export function ParameterDetailSection({
  parameterKey,
  currentValue,
  unit,
}: ParameterDetailSectionProps) {
  const metadata = PARAMETER_METADATA[parameterKey]
  const resolvedValue = currentValue ?? "—"
  const [historyData, setHistoryData] = useState<Array<{ time: string; value: number }>>([])
  const { value: numericValue, isBinary } = convertToNumeric(resolvedValue, parameterKey)
  const derivedUnit = unit || metadata?.unit || ""

  useEffect(() => {
    if (numericValue === null) {
      setHistoryData([])
      return
    }
    setHistoryData(generate7DayHistory(numericValue, isBinary))
  }, [numericValue, isBinary, parameterKey])

  return (
    <div className="space-y-4 mt-4 p-4 bg-gray-50 rounded-lg border">
      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-lg border bg-white/70 p-3">
          <p className="text-xs uppercase text-muted-foreground tracking-wide">Current Value</p>
          <p className="mt-1 text-2xl font-semibold">
            {typeof resolvedValue === "number" ? resolvedValue : String(resolvedValue)}
            {derivedUnit && <span className="ml-2 text-base text-muted-foreground">{derivedUnit}</span>}
          </p>
          {numericValue !== null && isBinary && (
            <p className="mt-1 text-xs text-muted-foreground">
              Normalized to binary scale for trend visualisation.
            </p>
          )}
        </div>
        {metadata && (
          <div className="rounded-lg border bg-white/70 p-3 space-y-2">
            <p className="text-xs uppercase text-muted-foreground tracking-wide">Operating Envelope</p>
            <p className="text-sm font-semibold">{metadata.typicalRange}</p>
            {(metadata.minAlarm || metadata.maxAlarm) && (
              <p className="text-xs text-muted-foreground">
                Alarm band: {metadata.minAlarm ?? "—"} – {metadata.maxAlarm ?? "—"}
              </p>
            )}
            {metadata.accuracy && (
              <p className="text-xs text-muted-foreground">Sensor accuracy {metadata.accuracy}</p>
            )}
          </div>
        )}
      </div>

      {metadata && (
        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div>
            <h4 className="font-semibold text-muted-foreground text-xs uppercase">Meaning</h4>
            <p className="mt-1">{metadata.meaning}</p>
            {metadata.equipment && (
              <p className="text-xs text-muted-foreground mt-1">Equipment: {metadata.equipment}</p>
            )}
          </div>
          <div>
            <h4 className="font-semibold text-muted-foreground text-xs uppercase">Sensor</h4>
            <p className="mt-1">{metadata.sensorType}</p>
            <p className="text-xs text-muted-foreground">IEC {metadata.iec61850LogicalNode}</p>
          </div>
          <div>
            <h4 className="font-semibold text-muted-foreground text-xs uppercase">Use Case</h4>
            <p className="mt-1">{metadata.useCase}</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold text-lg">7-Day Historical Trend</h3>
        {historyData.length > 0 && numericValue !== null ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval="preserveStartEnd"
                  tick={{ fontSize: 10 }}
                />
                <YAxis label={{ value: derivedUnit, angle: -90, position: "insideLeft" }} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [`${value} ${derivedUnit}`.trim(), "Value"]}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Time-series visualisation is not available for this parameter yet.
          </p>
        )}
      </div>
    </div>
  )
}

