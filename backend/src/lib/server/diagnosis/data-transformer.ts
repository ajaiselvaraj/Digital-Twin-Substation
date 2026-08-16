import type { DiagnosisComponentKey } from "@/lib/diagnosis/types"
import { generateSyntheticReadings } from "@/lib/diagnosis/realtime-generator"

/**
 * ML-required parameters for each component (parameters needed for ML model prediction)
 * Only these parameters will use random generator if missing from Firebase
 */
const ML_REQUIRED_PARAMS: Record<DiagnosisComponentKey, string[]> = {
  bayLines: [
    "busVoltage",      // live_BusVoltage_kV
    "lineCurrent",     // live_LineCurrent_A
    "mw",              // live_ActivePower_MW
    "mvar",            // live_ReactivePower_MVAR
    "powerFactor",     // live_PowerFactor
    "frequency",       // live_Frequency_Hz
    "thd",             // live_THD_percent
  ],
  transformer: [
    "oilTemp",         // live_OilTemperature_C
    "windingTemp",     // live_WindingTemperature_C
    "loading",         // live_LoadingPercent
    "hydrogen",         // live_Hydrogen_ppm
    "acetylene",       // live_Acetylene_ppm
    "moisture",        // live_Moisture_ppm
    "oilLevel",        // live_OilLevelPercent
    "tapPosition",     // live_TapPosition
  ],
  circuitBreaker: [
    "operationTime",   // live_OperationTime_ms
    "sf6Density",      // live_SF6Pressure_bar
    "motorCurrent",    // live_MotorCurrent_A
  ],
  busbar: [
    "busVoltage",      // live_BusVoltage_kV
    "busCurrent",      // live_BusCurrent_A
    "busTemperature", // live_BusTemperature_C
  ],
  isolator: [
    "driveTorque",     // live_DriveTorque_Nm
    "operatingTime",   // live_OperatingTime_ms
    "contactResistance", // live_ContactResistance_uOhm
    "motorCurrent",    // live_MotorCurrent_A
  ],
  relay: [],
  pmu: [],
  gis: [],
  battery: [],
  environment: [],
}

/**
 * Transforms asset metadata and live readings into the format required by the ML predictor backend.
 * This combines asset specifications from Firebase with live parameter values from diagnosis.
 * If ML-required parameters are missing from Firebase, uses random generator ONLY for those missing parameters.
 * All other parameters use Firebase values only (no random generation).
 */
export function transformToMLInput(
  component: DiagnosisComponentKey,
  assetMetadata: Record<string, any>,
  liveReadings: Record<string, any>,
  areaCode: string,
  substationId: string,
  assetId?: string,
): Record<string, any> {
  const timestamp = new Date().toISOString()
  const master = assetMetadata?.master || {}
  const assets = assetMetadata?.assets || {}
  
  // Get installation year from master or assets
  const installationYear = 
    master.installationYear || 
    assets.installationYear || 
    (typeof master.installationYear === 'string' ? parseInt(master.installationYear) : null) ||
    2010

  // Extract assetId from assets collection or use provided/default
  const getAssetId = () => {
    if (assetId) return assetId
    
    // Try to get from component-specific asset collection
    const componentAssetKeys: Record<DiagnosisComponentKey, string[]> = {
      transformer: ["transformers", "transformer"],
      bayLines: ["powerFlowLines", "bayLines", "bayLine"],
      circuitBreaker: ["breakers", "breaker", "circuitBreaker"],
      isolator: ["isolators", "isolator"],
      busbar: ["busbars", "busbar"],
      relay: ["relays", "relay"],
      pmu: ["pmus", "pmu"],
      gis: ["gis"],
      battery: ["batteries", "battery"],
      environment: ["environment"],
    }
    
    const keys = componentAssetKeys[component] || [component]
    for (const key of keys) {
      const asset = assets[key]
      if (asset) {
        if (Array.isArray(asset) && asset[0]?.id) {
          return asset[0].id
        }
        if (asset.id) {
          return asset.id
        }
        if (asset.assetId) {
          return asset.assetId
        }
      }
    }
    
    // Fallback to substation code or default
    return master.substationCode 
      ? `${component.toUpperCase()}-${master.substationCode}` 
      : `${component.toUpperCase()}-1`
  }

  // Base fields common to all components
  const base = {
    timestamp,
    assetType: component === "bayLines" ? "BayLine" : component.charAt(0).toUpperCase() + component.slice(1),
    assetId: getAssetId(),
    installationYear: typeof installationYear === 'number' ? installationYear : parseInt(String(installationYear)) || 2010,
  }

  // Generate synthetic readings ONLY for missing ML-required parameters
  const mlRequiredParams = ML_REQUIRED_PARAMS[component] || []
  const syntheticReadings = generateSyntheticReadings(component).readings
  
  // Helper function to get value: Firebase first, then synthetic for ML-required params only, then default
  // Also checks for snake_case variants from IP address data
  const getMLValue = (uiKey: string, mlKey: string, defaultValue: number, isMLRequired: boolean) => {
    // Always prefer Firebase value if available (check multiple key formats)
    // 1. Check camelCase UI key (e.g., "oilTemp")
    if (liveReadings[uiKey] !== undefined && liveReadings[uiKey] !== null) {
      return liveReadings[uiKey]
    }
    // 2. Check ML model key (e.g., "live_OilTemperature_C")
    if (liveReadings[mlKey] !== undefined && liveReadings[mlKey] !== null) {
      return liveReadings[mlKey]
    }
    // 3. Check snake_case variants from IP data (e.g., "oil_temp_c")
    // Map common UI keys to their snake_case equivalents
    const snakeCaseMap: Record<string, string[]> = {
      oilTemp: ["oil_temp_c", "oilTemperature"],
      windingTemp: ["winding_temp_c", "windingTemperature"],
      loading: ["loading_percent", "loading"],
      tapPosition: ["tap_position", "tapPosition"],
      hydrogen: ["hydrogen_ppm", "hydrogen"],
      acetylene: ["acetylene_ppm", "acetylene"],
      moisture: ["moisture_ppm", "moisture"],
      oilLevel: ["oil_level_percent", "oilLevel"],
      busVoltage: ["bus_voltage_kv", "busVoltage"],
      lineCurrent: ["line_current_a", "lineCurrent"],
      mw: ["active_power_mw", "activePower"],
      mvar: ["reactive_power_mvar", "reactivePower"],
      powerFactor: ["power_factor", "powerFactor"],
      frequency: ["frequency_hz", "frequency"],
      voltageAngle: ["voltage_angle_deg", "voltageAngle"],
      currentAngle: ["current_angle_deg", "currentAngle"],
      rocof: ["rocof_hz_s", "rocof"],
      thd: ["thd_percent", "thd"],
      busCurrent: ["bus_current_a", "busCurrent"],
      busTemperature: ["bus_temperature_c", "temperature"],
      breakerStatus: ["breaker_status", "breakerStatus"],
      operationTime: ["operation_time_ms", "operationTime"],
      sf6Density: ["sf6_density_bar", "sf6Density"],
      status: ["switchStatus", "status"],
      driveTorque: ["drive_torque_nm", "driveTorque"],
      operatingTime: ["operating_time_ms", "operatingTime"],
      contactResistance: ["contact_resistance_uohm", "contactResistance"],
      motorCurrent: ["motor_current_a", "motorCurrent"],
    }
    
    const snakeCaseKeys = snakeCaseMap[uiKey] || []
    for (const key of snakeCaseKeys) {
      if (liveReadings[key] !== undefined && liveReadings[key] !== null) {
        return liveReadings[key]
      }
    }
    
    // 4. Only use synthetic for ML-required parameters
    if (isMLRequired && syntheticReadings[uiKey] !== undefined) {
      const syntheticValue = syntheticReadings[uiKey]
      if (typeof syntheticValue === "number") {
        return syntheticValue
      }
    }
    return defaultValue
  }

  switch (component) {
    case "transformer": {
      const transformerAsset = assets.transformer || assets.transformers?.[0] || {}
      return {
        ...base,
        assetType: "Transformer",
        spec_ratedMVA: transformerAsset.ratedMVA || transformerAsset.spec_ratedMVA || 315,
        spec_HV_kV: transformerAsset.HV_kV || transformerAsset.spec_HV_kV || 400,
        spec_LV_kV: transformerAsset.LV_kV || transformerAsset.spec_LV_kV || 230,
        spec_vectorGroup: transformerAsset.vectorGroup || transformerAsset.spec_vectorGroup || "YNd11",
        spec_coolingType: transformerAsset.coolingType || transformerAsset.spec_coolingType || "ONAF",
        spec_windingMaterial: transformerAsset.windingMaterial || transformerAsset.spec_windingMaterial || "Cu",
        spec_manufacturer: transformerAsset.manufacturer || transformerAsset.spec_manufacturer || "BHEL",
        live_OilTemperature_C: getMLValue("oilTemp", "live_OilTemperature_C", 63.5, mlRequiredParams.includes("oilTemp")),
        live_WindingTemperature_C: getMLValue("windingTemp", "live_WindingTemperature_C", 78.4, mlRequiredParams.includes("windingTemp")),
        live_LoadingPercent: getMLValue("loading", "live_LoadingPercent", 92, mlRequiredParams.includes("loading")),
        live_Hydrogen_ppm: getMLValue("hydrogen", "live_Hydrogen_ppm", 45, mlRequiredParams.includes("hydrogen")),
        live_Acetylene_ppm: getMLValue("acetylene", "live_Acetylene_ppm", 0.2, mlRequiredParams.includes("acetylene")),
        live_Moisture_ppm: getMLValue("moisture", "live_Moisture_ppm", 18, mlRequiredParams.includes("moisture")),
        live_OilLevelPercent: getMLValue("oilLevel", "live_OilLevelPercent", 96, mlRequiredParams.includes("oilLevel")),
        live_TapPosition: getMLValue("tapPosition", "live_TapPosition", 8, mlRequiredParams.includes("tapPosition")),
      }
    }

    case "bayLines": {
      const bayLineAsset = assets.bayLine || assets.powerFlowLines?.[0] || {}
      return {
        ...base,
        assetType: "BayLine",
        spec_ratedVoltage: bayLineAsset.ratedVoltage || bayLineAsset.spec_ratedVoltage || 400,
        spec_conductorType: bayLineAsset.conductorType || bayLineAsset.spec_conductorType || "Moose",
        spec_thermalLimit_A: bayLineAsset.thermalLimit_A || bayLineAsset.spec_thermalLimit_A || 2500,
        live_BusVoltage_kV: getMLValue("busVoltage", "live_BusVoltage_kV", 398, mlRequiredParams.includes("busVoltage")),
        live_LineCurrent_A: getMLValue("lineCurrent", "live_LineCurrent_A", 1780, mlRequiredParams.includes("lineCurrent")),
        live_ActivePower_MW: getMLValue("mw", "live_ActivePower_MW", 640, mlRequiredParams.includes("mw")),
        live_ReactivePower_MVAR: getMLValue("mvar", "live_ReactivePower_MVAR", 40, mlRequiredParams.includes("mvar")),
        live_PowerFactor: getMLValue("powerFactor", "live_PowerFactor", 0.94, mlRequiredParams.includes("powerFactor")),
        live_Frequency_Hz: getMLValue("frequency", "live_Frequency_Hz", 50.02, mlRequiredParams.includes("frequency")),
        live_THD_percent: getMLValue("thd", "live_THD_percent", 2.6, mlRequiredParams.includes("thd")),
      }
    }

    case "busbar": {
      const busbarAsset = assets.busbar || assets.busbars?.[0] || {}
      return {
        ...base,
        assetType: "Busbar",
        spec_material: busbarAsset.material || busbarAsset.spec_material || "Cu",
        spec_capacity_A: busbarAsset.capacity_A || busbarAsset.spec_capacity_A || 5000,
        spec_busType: busbarAsset.busType || busbarAsset.spec_busType || "Main",
        live_BusVoltage_kV: getMLValue("busVoltage", "live_BusVoltage_kV", 402, mlRequiredParams.includes("busVoltage")),
        live_BusCurrent_A: getMLValue("busCurrent", "live_BusCurrent_A", 3200, mlRequiredParams.includes("busCurrent")),
        live_BusTemperature_C: getMLValue("busTemperature", "live_BusTemperature_C", 66.8, mlRequiredParams.includes("busTemperature")),
      }
    }

    case "isolator": {
      const isolatorAsset = assets.isolator || assets.isolators?.[0] || {}
      return {
        ...base,
        assetType: "Isolator",
        spec_type: isolatorAsset.type || isolatorAsset.spec_type || "Vertical",
        spec_driveMechanism: isolatorAsset.driveMechanism || isolatorAsset.spec_driveMechanism || "Motorized",
        spec_manufacturer: isolatorAsset.manufacturer || isolatorAsset.spec_manufacturer || "Crompton",
        live_DriveTorque_Nm: getMLValue("driveTorque", "live_DriveTorque_Nm", 95.215, mlRequiredParams.includes("driveTorque")),
        live_OperatingTime_ms: getMLValue("operatingTime", "live_OperatingTime_ms", 344.292, mlRequiredParams.includes("operatingTime")),
        live_ContactResistance_uOhm: getMLValue("contactResistance", "live_ContactResistance_uOhm", 86.48, mlRequiredParams.includes("contactResistance")),
        live_MotorCurrent_A: getMLValue("motorCurrent", "live_MotorCurrent_A", 7.272, mlRequiredParams.includes("motorCurrent")),
      }
    }

    case "circuitBreaker": {
      const breakerAsset = assets.breaker || assets.breakers?.[0] || {}
      return {
        ...base,
        assetType: "CircuitBreaker",
        spec_ratedVoltage_kV: breakerAsset.ratedVoltage_kV || breakerAsset.spec_ratedVoltage_kV || 220,
        spec_ratedCurrent_A: breakerAsset.ratedCurrent_A || breakerAsset.spec_ratedCurrent_A || 1600,
        spec_mechanismType: breakerAsset.mechanismType || breakerAsset.spec_mechanismType || "Spring",
        spec_manufacturer: breakerAsset.manufacturer || breakerAsset.spec_manufacturer || "ABB",
        live_OperationTime_ms: getMLValue("operationTime", "live_OperationTime_ms", 62, mlRequiredParams.includes("operationTime")),
        live_SF6Pressure_bar: getMLValue("sf6Density", "live_SF6Pressure_bar", 6.3, mlRequiredParams.includes("sf6Density")),
        live_MotorCurrent_A: getMLValue("motorCurrent", "live_MotorCurrent_A", 14.6, mlRequiredParams.includes("motorCurrent")),
      }
    }

    default:
      // Fallback for other components
      return {
        ...base,
        ...liveReadings,
      }
  }
}

