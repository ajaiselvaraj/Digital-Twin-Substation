import type { ComponentType } from "@/lib/analysis-config"

/**
 * Maps frontend field names to backend ML model expected field names.
 * This ensures that values entered in the simulation panel are correctly
 * passed to the backend predictor.
 */
export function mapInputFieldsToBackend(
  componentType: ComponentType,
  inputValues: Record<string, any>
): Record<string, any> {
  const mapped: Record<string, any> = {}

  // Common mappings that apply to all components
  const commonMappings: Record<string, string> = {
    timeOfSimulation: "timeOfSimulation", // Keep as is if used
  }

  // Component-specific mappings
  // Maps frontend input field names to backend ML model expected field names
  // Only the specified fields below are used for prediction, along with asset details
  const componentMappings: Record<ComponentType, Record<string, string>> = {
    transformer: {
      // Only these fields are used for transformer prediction
      ambientTemperature: "ambientTemperature",
      transformerLoading: "transformerLoading",
      windingTemperature: "windingTemperature",
      hotspotTemperature: "hotspotTemperature",
      oilTemperature: "oilTemperature",
      oilMoisture: "oilMoisture",
      dielectricStrength: "dielectricStrength",
      hydrogenPPM: "hydrogenPPM",
      methanePPM: "methanePPM",
      acetylenePPM: "acetylenePPM",
      ethylenePPM: "ethylenePPM",
      CO_PPM: "CO_PPM",
      noiseLevel: "noiseLevel",
      vibrationLevel: "vibrationLevel",
      oltcOpsCount: "oltcOps", // Frontend uses oltcOpsCount, backend expects oltcOps
    },
    bayLines: {
      // Only these fields are used for bay lines prediction
      ctBurdenPercent: "ctBurdenPercent",
      ctTemperature: "ctTemperature",
      vtVoltageDriftPercent: "vtVoltageDriftPercent",
      vtTemperature: "vtTemperature",
      frequencyHz: "frequencyHz",
      powerFactor: "powerFactor",
      harmonicsTHDPercent: "harmonicsTHDPercent",
    },
    circuitBreaker: {
      // Only these fields are used for circuit breaker prediction
      sf6DensityPercent: "sf6DensityPercent",
      sf6LeakRatePercentPerYear: "sf6LeakRatePercentPerYear",
      sf6MoisturePPM: "sf6MoisturePPM",
      operationCountPercent: "operationCountPercent",
      lastTripTimeMs: "lastTripTimeMs",
      sf6DensityBar: "sf6DensityBar",
      closeCoilResistance: "closeCoilResistance",
      poleTemperature: "poleTemperature",
      mechanismWearLevel: "mechanismWearLevel",
    },
    isolator: {
      // Only these fields are used for isolator prediction
      status: "status",
      bladeAngleDeg: "bladeAngleDeg",
      contactResistanceMicroOhm: "contactResistanceMicroOhm",
      motorTorqueNm: "motorTorqueNm",
      operatingTimeMs: "operatingTimeMs",
      motorCurrent: "motorCurrent",
      positionMismatchPercent: "positionMismatchPercent",
    },
    busbar: {
      // Only these fields are used for busbar prediction
      ambientTemperature: "ambientTemperature",
      busVoltage: "busVoltage",
      busbarCurrentA: "busbarCurrentA",
      busbarLoadPercent: "busbarLoadPercent",
      busbarTemperature: "busbarTemperature",
      jointHotspotTemp: "jointHotspotTemp",
      impedanceMicroOhm: "impedanceMicroOhm",
    },
  }

  const mappings = {
    ...commonMappings,
    ...(componentMappings[componentType] || {}),
  }

  // Only include fields that are in the mapping - filter out any other fields
  // This ensures only the specified fields are sent to the backend for prediction
  Object.entries(inputValues).forEach(([key, value]) => {
    if (key in mappings) {
      mapped[mappings[key]] = value
    }
    // Note: Unmapped fields are NOT included in the mapped result
    // They are preserved in the original inputValues for display purposes only
  })

  return mapped
}

