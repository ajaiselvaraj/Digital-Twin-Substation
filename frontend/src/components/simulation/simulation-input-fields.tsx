"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSimulation } from "./simulation-context"

interface SimulationInputFieldsProps {
  inputs: Record<string, number | string>
  onInputChange: (key: string, value: number | string) => void
}

export function SimulationInputFields({ inputs, onInputChange }: SimulationInputFieldsProps) {
  const { selectedComponent } = useSimulation()
  const fields = getFieldsForComponent(selectedComponent)

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={field.key}>
            {field.label} {field.unit && `(${field.unit})`}
          </Label>
          {field.type === "number" ? (
            <Input
              id={field.key}
              type="number"
              min={field.min}
              max={field.max}
              step={field.step || 1}
              value={inputs[field.key] || ""}
              onChange={(e) => {
                const val = e.target.value === "" ? 0 : parseFloat(e.target.value)
                onInputChange(field.key, isNaN(val) ? 0 : val)
              }}
            />
          ) : field.type === "select" ? (
            <select
              id={field.key}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={String(inputs[field.key] || "")}
              onChange={(e) => onInputChange(field.key, e.target.value)}
              suppressHydrationWarning
            >
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={field.key}
              type="text"
              value={String(inputs[field.key] || "")}
              onChange={(e) => onInputChange(field.key, e.target.value)}
            />
          )}
          {field.min !== undefined && field.max !== undefined && (
            <p className="text-xs text-gray-500">
              Range: {field.min} - {field.max} {field.unit}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function getFieldsForComponent(componentType: string): Array<{
  key: string
  label: string
  unit?: string
  type: "number" | "text" | "select"
  min?: number
  max?: number
  step?: number
  options?: string[]
}> {
  switch (componentType) {
    case "transformer":
      return [
        { key: "va", label: "Voltage A", unit: "kV", type: "number" as const, min: 100, max: 420 },
        { key: "vb", label: "Voltage B", unit: "kV", type: "number" as const, min: 100, max: 420 },
        { key: "vc", label: "Voltage C", unit: "kV", type: "number" as const, min: 100, max: 420 },
        { key: "ampa", label: "Current A", unit: "A", type: "number" as const, min: 0, max: 3000 },
        { key: "ampb", label: "Current B", unit: "A", type: "number" as const, min: 0, max: 3000 },
        { key: "ampc", label: "Current C", unit: "A", type: "number" as const, min: 0, max: 3000 },
        { key: "frequency", label: "Frequency", unit: "Hz", type: "number" as const, min: 49, max: 51 },
        { key: "loadUnbalancePercent", label: "Load Unbalance", unit: "%", type: "number" as const, min: 0, max: 15 },
        { key: "neutralCurrent", label: "Neutral Current", unit: "A", type: "number" as const, min: 0, max: 200 },
        { key: "windingTemperature", label: "Winding Temperature", unit: "°C", type: "number" as const, min: 40, max: 90 },
        { key: "hotspotTemperature", label: "Hotspot Temperature", unit: "°C", type: "number" as const, min: 40, max: 180 },
        { key: "oilTemperature", label: "Oil Temperature", unit: "°C", type: "number" as const, min: 30, max: 80 },
        { key: "ambientTemperature", label: "Ambient Temperature", unit: "°C", type: "number" as const, min: 10, max: 55 },
        { key: "oilLevel", label: "Oil Level", unit: "%", type: "number" as const, min: 90, max: 100 },
        { key: "oilMoisture", label: "Oil Moisture", unit: "ppm", type: "number" as const, min: 15, max: 20 },
        { key: "oilAcidity", label: "Oil Acidity", unit: "mg KOH/g", type: "number" as const, min: 0, max: 0.5, step: 0.1 },
        { key: "dielectricStrength", label: "Dielectric Strength", unit: "kV", type: "number" as const, min: 20, max: 70 },
        { key: "hydrogenPPM", label: "Hydrogen (H₂)", unit: "ppm", type: "number" as const, min: 10, max: 300 },
        { key: "methanePPM", label: "Methane (CH₄)", unit: "ppm", type: "number" as const, min: 10, max: 200 },
        { key: "acetylenePPM", label: "Acetylene (C₂H₂)", unit: "ppm", type: "number" as const, min: 0, max: 5 },
        { key: "ethylenePPM", label: "Ethylene (C₂H₄)", unit: "ppm", type: "number" as const, min: 5, max: 100 },
        { key: "CO_PPM", label: "Carbon Monoxide (CO)", unit: "ppm", type: "number" as const, min: 50, max: 1000 },
        { key: "transformerLoading", label: "Transformer Loading", unit: "%", type: "number" as const, min: 20, max: 110 },
        { key: "oltcTapPosition", label: "OLTC Tap Position", unit: "steps", type: "number" as const, min: 1, max: 17 },
        { key: "oltcDeviation", label: "OLTC Deviation", unit: "steps", type: "number" as const, min: 0, max: 12 },
        { key: "oltcMotorStatus", label: "OLTC Motor Status", type: "select" as const, options: ["ON", "OFF"] },
        { key: "oltcOpsCount", label: "OLTC Operations Count", type: "number" as const, min: 0, max: 20000 },
        { key: "vibrationLevel", label: "Vibration Level", unit: "mm/s", type: "number" as const, min: 0, max: 10, step: 0.1 },
        { key: "noiseLevel", label: "Noise Level", unit: "dB", type: "number" as const, min: 50, max: 90 },
        { key: "buchholzAlarm", label: "Buchholz Alarm", type: "select" as const, options: ["NORMAL", "ALARM", "TRIP"] },
        { key: "gasAccumulationRate", label: "Gas Accumulation Rate", unit: "L/day", type: "number" as const, min: 0, max: 20 },
        { key: "timeOfSimulation", label: "Simulation Time", unit: "hours", type: "number" as const, min: 1, max: 168 },
      ]
    case "bayLines":
      return [
        { key: "ctBurdenPercent", label: "CT Burden", unit: "%", type: "number" as const, min: 0, max: 120 },
        { key: "ctPrimaryCurrent", label: "CT Primary Current", unit: "A", type: "number" as const, min: 50, max: 3000 },
        { key: "ctSecondaryCurrent", label: "CT Secondary Current", unit: "A", type: "number" as const, min: 0, max: 5 },
        { key: "ctTemperature", label: "CT Temperature", unit: "°C", type: "number" as const, min: 20, max: 90 },
        { key: "vtVoltageDriftPercent", label: "VT Voltage Drift", unit: "%", type: "number" as const, min: 80, max: 120 },
        { key: "vtOutputVoltage", label: "VT Output Voltage", unit: "%", type: "number" as const, min: 80, max: 120 },
        { key: "vtTemperature", label: "VT Temperature", unit: "°C", type: "number" as const, min: 20, max: 80 },
        { key: "frequencyHz", label: "Frequency", unit: "Hz", type: "number" as const, min: 49.5, max: 50.5 },
        { key: "powerFactor", label: "Power Factor", type: "number" as const, min: 0.7, max: 1, step: 0.01 },
        { key: "lineCurrent", label: "Line Current", unit: "A", type: "number" as const, min: 100, max: 3000 },
        { key: "harmonicsTHDPercent", label: "Harmonics THD", unit: "%", type: "number" as const, min: 0, max: 5 },
        { key: "timeOfSimulation", label: "Simulation Time", unit: "hours", type: "number" as const, min: 1, max: 168 },
      ]
    case "circuitBreaker":
      return [
        { key: "sf6DensityPercent", label: "SF6 Density", unit: "%", type: "number" as const, min: 60, max: 100 },
        { key: "sf6LeakRatePercentPerYear", label: "SF6 Leak Rate", unit: "%/year", type: "number" as const, min: 0, max: 10, step: 0.1 },
        { key: "sf6MoisturePPM", label: "SF6 Moisture", unit: "ppm", type: "number" as const, min: 0, max: 500 },
        { key: "operationCountPercent", label: "Operation Count", unit: "%", type: "number" as const, min: 0, max: 100 },
        { key: "lastTripTimeMs", label: "Last Trip Time", unit: "ms", type: "number" as const, min: 30, max: 70 },
        { key: "sf6DensityBar", label: "SF6 Density", unit: "bar", type: "number" as const, min: 6, max: 8 },
        { key: "closeCoilResistance", label: "Close Coil Resistance", unit: "Ω", type: "number" as const, min: 5, max: 20 },
        { key: "poleTemperature", label: "Pole Temperature", unit: "°C", type: "number" as const, min: 20, max: 90 },
        { key: "mechanismWearLevel", label: "Mechanism Wear Level", unit: "%", type: "number" as const, min: 0, max: 100 },
        { key: "timeOfSimulation", label: "Simulation Time", unit: "hours", type: "number" as const, min: 1, max: 168 },
      ]
    case "isolator":
      return [
        { key: "status", label: "Status", type: "select" as const, options: ["OPEN", "CLOSED"] },
        { key: "bladeAngleDeg", label: "Blade Angle", unit: "°", type: "number" as const, min: 0, max: 90 },
        { key: "contactResistanceMicroOhm", label: "Contact Resistance", unit: "µΩ", type: "number" as const, min: 10, max: 200 },
        { key: "motorTorqueNm", label: "Motor Torque", unit: "Nm", type: "number" as const, min: 20, max: 200 },
        { key: "operatingTimeMs", label: "Operating Time", unit: "ms", type: "number" as const, min: 100, max: 300 },
        { key: "motorCurrent", label: "Motor Current", unit: "A", type: "number" as const, min: 2, max: 10 },
        { key: "positionMismatchPercent", label: "Position Mismatch", unit: "%", type: "number" as const, min: 0, max: 10 },
        { key: "timeOfSimulation", label: "Simulation Time", unit: "hours", type: "number" as const, min: 1, max: 168 },
      ]
    case "busbar":
      return [
        { key: "busbarTemperature", label: "Busbar Temperature", unit: "°C", type: "number" as const, min: 40, max: 90 },
        { key: "ambientTemperature", label: "Ambient Temperature", unit: "°C", type: "number" as const, min: -10, max: 55 },
        { key: "busbarLoadPercent", label: "Busbar Load", unit: "%", type: "number" as const, min: 0, max: 140 },
        { key: "busbarCurrentA", label: "Busbar Current", unit: "A", type: "number" as const, min: 100, max: 5000 },
        { key: "busVoltage", label: "Bus Voltage", unit: "kV", type: "number" as const, min: 380, max: 420 },
        { key: "jointHotspotTemp", label: "Joint Hotspot Temperature", unit: "°C", type: "number" as const, min: 40, max: 150 },
        { key: "impedanceMicroOhm", label: "Impedance", unit: "µΩ", type: "number" as const, min: 20, max: 200 },
        { key: "timeOfSimulation", label: "Simulation Time", unit: "hours", type: "number" as const, min: 1, max: 168 },
      ]
    default:
      return []
  }
}

