"use client"

import { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { PARAMETER_METADATA } from "@/lib/live-trend/parameter-metadata"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ParameterDetailPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parameterKey: string
  currentValue: number | string
  unit: string
}

// Generate 7 days of historical data (hourly points)
function generate7DayHistory(currentValue: number): Array<{ time: string; value: number }> {
  const data: Array<{ time: string; value: number }> = []
  const now = new Date()
  
  // Generate data for last 7 days (168 hours = 7 days * 24 hours)
  for (let i = 168; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 60 * 60 * 1000)
    // Add small random variation to current value
    const variation = (Math.random() - 0.5) * (currentValue * 0.05) // ±5% variation
    const value = Math.max(0, currentValue + variation)
    
    data.push({
      time: date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit" }),
      value: Number(value.toFixed(2)),
    })
  }
  
  return data
}

export function ParameterDetailPanel({
  open,
  onOpenChange,
  parameterKey,
  currentValue,
  unit,
}: ParameterDetailPanelProps) {
  const metadata = PARAMETER_METADATA[parameterKey]
  const [historyData, setHistoryData] = useState<Array<{ time: string; value: number }>>([])

  useEffect(() => {
    if (open && typeof currentValue === "number") {
      setHistoryData(generate7DayHistory(currentValue))
    }
  }, [open, currentValue])

  if (!metadata) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>{metadata.name} - Detailed View</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetTitle>
          <SheetDescription>
            Parameter information and 7-day historical trend
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Current Value */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-gray-600 mb-1">Current Value</div>
            <div className="text-3xl font-bold text-blue-700">
              {currentValue} <span className="text-lg">{unit}</span>
            </div>
          </div>

          {/* Parameter Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Parameter Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                  Parameter Meaning
                </h4>
                <p className="text-sm">{metadata.meaning}</p>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                  Unit
                </h4>
                <p className="text-sm font-mono">{metadata.unit}</p>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                  Typical Range
                </h4>
                <p className="text-sm font-mono">{metadata.typicalRange}</p>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                  Sensor Type
                </h4>
                <p className="text-sm">{metadata.sensorType}</p>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                  IEC61850 Logical Node
                </h4>
                <p className="text-sm font-mono">{metadata.iec61850LogicalNode}</p>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                  Use Case
                </h4>
                <p className="text-sm">{metadata.useCase}</p>
              </div>
            </div>
          </div>

          {/* 7-Day Trend Chart */}
          {historyData.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">7-Day Historical Trend</h3>
              <div className="h-80 w-full">
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
                    <YAxis
                      label={{ value: unit, angle: -90, position: "insideLeft" }}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value} ${unit}`, "Value"]}
                      labelFormatter={(label) => `Time: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

