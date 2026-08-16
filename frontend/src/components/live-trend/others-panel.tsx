"use client"

import { useState } from "react"
import { useLiveData, dataGenerators } from "@/hooks/use-live-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PARAMETER_METADATA } from "@/lib/live-trend/parameter-metadata"
import { ParameterDisplay } from "./parameter-display"
import { ParameterDetailSection } from "./parameter-detail-section"

const PARAMETER_SECTIONS: Array<{
  title: string
  description: string
  keys: Array<{ key: keyof ReturnType<typeof dataGenerators.others>; label: string }>
}> = [
  {
    title: "Protection & Control",
    description: "Relay health and fault duty indicators",
    keys: [
      { key: "relayStatus", label: "Relay Status" },
      { key: "tripCount", label: "Trip Count" },
      { key: "earthFaultCurrent", label: "Earth Fault Current" },
      { key: "differentialCurrent", label: "Differential Current" },
      { key: "tripCommand", label: "Trip Command" },
    ],
  },
  {
    title: "Phasor Monitoring",
    description: "Wide-area monitoring metrics from PMUs",
    keys: [
      { key: "phaseAngle", label: "Phase Angle" },
      { key: "phasorMagnitude", label: "Phasor Magnitude" },
      { key: "voltagePhasor", label: "Voltage Phasor" },
      { key: "currentPhasor", label: "Current Phasor" },
      { key: "angleDifference", label: "Angle Difference" },
    ],
  },
  {
    title: "GIS & Switchgear",
    description: "Gas insulated switchgear operating envelope",
    keys: [
      { key: "gisPressure", label: "GIS Pressure" },
      { key: "gisTemperature", label: "GIS Temperature" },
      { key: "partialDischarge", label: "Partial Discharge" },
      { key: "busDifferentialCurrent", label: "Bus Differential Current" },
    ],
  },
  {
    title: "Battery Backup",
    description: "Station DC system measurements",
    keys: [
      { key: "batteryVoltage", label: "Battery Voltage" },
      { key: "batteryCurrent", label: "Battery Current" },
      { key: "batterySOC", label: "Battery SOC" },
      { key: "dcVoltage", label: "DC Voltage" },
    ],
  },
  {
    title: "Environment",
    description: "Ambient operating conditions within the yard",
    keys: [
      { key: "ambientTemperature", label: "Ambient Temperature" },
      { key: "humidity", label: "Humidity" },
    ],
  },
]

export function OthersPanel() {
  const data = useLiveData("others", dataGenerators.others)
  const [selectedParameter, setSelectedParameter] = useState<string | null>(null)

  const handleToggle = (key: string) => {
    setSelectedParameter((prev) => (prev === key ? null : key))
  }

  return (
    <Card className="h-full overflow-hidden flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle>Auxiliary Systems & Environment</CardTitle>
        <p className="text-sm text-muted-foreground">
          Real-time view across protection, GIS, backup power, and environmental channels.
        </p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-6">
        {PARAMETER_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-slate-800">{section.title}</h3>
              <p className="text-sm text-slate-500">{section.description}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {section.keys.map(({ key, label }) => {
                const value = data[key]
                const unit = PARAMETER_METADATA[key]?.unit ?? ""
                const isExpanded = selectedParameter === key
                return (
                  <div key={key} className="space-y-3">
                    <ParameterDisplay
                      label={label}
                      value={value}
                      unit={unit}
                      parameterKey={key}
                      onDetailClick={handleToggle}
                      isExpanded={isExpanded}
                    />
                    {isExpanded && (
                      <div className="border-t pt-3">
                        <ParameterDetailSection parameterKey={key} currentValue={value ?? "—"} unit={unit} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
