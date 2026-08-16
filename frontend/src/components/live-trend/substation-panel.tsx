"use client"

import { useState } from "react"
import { useLiveTrend } from "@/components/live-trend/live-trend-context"
import { useAllReadings } from "@/hooks/use-all-readings"
import { useDataSource } from "@/lib/scada/data-source-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ParameterDetailSection } from "./parameter-detail-section"
import { ParameterDisplay } from "./parameter-display"
import { COMPONENT_DEFINITIONS } from "@/lib/diagnosis/component-config"
import type { DiagnosisComponentKey } from "@/lib/diagnosis/types"

export function SubstationPanel() {
  const { selectedArea } = useLiveTrend()
  const { dataSource } = useDataSource()
  // In SCADA mode, areaCode is not required
  const areaCode = dataSource === "scada" ? "SCADA" : (selectedArea?.areaCode || "")
  const { allReadings, isLoading } = useAllReadings(areaCode)
  const [selectedParameter, setSelectedParameter] = useState<string | null>(null)

  // Combine all component readings into a flat list
  const allParameters: Array<{
    component: string
    key: string
    label: string
    unit?: string
    value: number | string | null
  }> = []

  const components: DiagnosisComponentKey[] = ["bayLines", "transformer", "circuitBreaker", "busbar", "isolator"]
  
  components.forEach((component) => {
    const definition = COMPONENT_DEFINITIONS[component]
    const readings = allReadings[component] || {}
    
    definition?.parameters.forEach((param) => {
      allParameters.push({
        component: definition.title,
        key: param.key,
        label: `${definition.title} - ${param.label}`,
        unit: param.unit,
        value: readings[param.key] ?? null,
      })
    })
  })

  return (
    <Card className="h-full overflow-hidden flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle>Substation Live Parameters</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">Loading readings...</div>
        ) : allParameters.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">No readings available. Please select an area.</div>
        ) : Object.keys(allReadings).length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">No readings available. Waiting for data...</div>
        ) : (
          <div className="space-y-4">
            {allParameters.map((param, index) => {
              const paramKey = `${param.component}-${param.key}-${index}`
              const isExpanded = selectedParameter === paramKey
              return (
                <div key={paramKey} className="space-y-3">
                  <ParameterDisplay
                    label={param.label}
                    value={param.value}
                    unit={param.unit}
                    parameterKey={param.key}
                    onDetailClick={(key) => setSelectedParameter((prev) => (prev === paramKey ? null : paramKey))}
                    isExpanded={isExpanded}
                  />
                  {isExpanded && (
                    <div className="border-t pt-4">
                      <ParameterDetailSection
                        parameterKey={param.key}
                        currentValue={param.value ?? "—"}
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
