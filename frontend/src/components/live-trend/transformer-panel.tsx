"use client"

import { useState } from "react"
import { useLiveTrend } from "@/components/live-trend/live-trend-context"
import { useLiveTrendReadingsUnified } from "@/hooks/use-live-trend-readings-unified"
import { useDataSource } from "@/lib/scada/data-source-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ParameterDetailSection } from "./parameter-detail-section"
import { ParameterDisplay } from "./parameter-display"

export function TransformerPanel() {
  const { selectedArea } = useLiveTrend()
  const { dataSource } = useDataSource()
  // In SCADA mode, areaCode is not required
  const areaCode = dataSource === "scada" ? "SCADA" : (selectedArea?.areaCode || "")
  const { readings, parameters, isLoading } = useLiveTrendReadingsUnified("transformer", areaCode)
  const [selectedParameter, setSelectedParameter] = useState<string | null>(null)

  return (
    <Card className="h-full overflow-hidden flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle>Transformer Live Parameters</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">Loading readings...</div>
        ) : parameters.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">No readings available. Please select an area.</div>
        ) : Object.keys(readings).length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">No readings available. Waiting for data...</div>
        ) : (
          <div className="space-y-4">
            {parameters.map((param) => {
              const value = readings[param.key] ?? null
              const expanded = selectedParameter === param.key
              return (
                <div key={param.key} className="space-y-3">
                  <ParameterDisplay
                    label={param.label}
                    value={value}
                    unit={param.unit}
                    parameterKey={param.key}
                    onDetailClick={(key) => setSelectedParameter((prev) => (prev === key ? null : key))}
                    isExpanded={expanded}
                    componentType="transformer"
                  />
                  {expanded && (
                    <div className="border-t pt-4">
                      <ParameterDetailSection
                        parameterKey={param.key}
                        currentValue={value ?? "—"}
                        unit={param.unit}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
