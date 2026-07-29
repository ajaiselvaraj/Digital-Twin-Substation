/**
 * SCADA Data Adapter
 * Maps SCADA JSON response to frontend component structure
 */

export interface ScadaData {
  BayLines?: {
    busVoltage?: number
    lineCurrent?: number
    activePower?: number
    reactivePower?: number
    frequency?: number
    voltageAngle?: number
    currentAngle?: number
    [key: string]: any
  }
  Transformer?: {
    windingTemperature?: number
    oilTemperature?: number
    loading?: number
    tapPosition?: number
    hydrogen?: number
    [key: string]: any
  }
  CircuitBreaker?: {
    breakerStatus?: string | number
    operationTime?: number
    sf6Density?: number
    [key: string]: any
  }
  Busbar?: {
    busVoltage?: number
    busCurrent?: number
    temperature?: number
    [key: string]: any
  }
  Isolator?: {
    contactResistance?: number
    motorCurrent?: number
    [key: string]: any
  }
  Protection?: {
    [key: string]: any
  }
  Phasor?: {
    phaseAngle?: number
    magnitude?: number
    [key: string]: any
  }
  GIS?: {
    gis_pressure_bar?: number
    gis_temperature_c?: number
    pd?: number
    [key: string]: any
  }
  Battery?: {
    battery_voltage?: number
    battery_soc?: number
    dc_bus_voltage?: number
    [key: string]: any
  }
  Environment?: {
    ambient_temperature?: number
    humidity?: number
    [key: string]: any
  }
  // IP address data format includes asset metadata
  assets?: {
    transformers?: any[]
    powerFlowLines?: any[]
    breakers?: any[]
    isolators?: any[]
    busbars?: any[]
    relays?: any[]
    pmu?: any[]
    gis?: any[]
    battery?: any[]
    environment?: any[]
    master?: any
    [key: string]: any
  }
  master?: {
    name?: string
    areaName?: string
    substationCode?: string
    voltageClass?: string
    installationYear?: number
    operator?: string
    latitude?: number
    longitude?: number
    notes?: string
    [key: string]: any
  }
  timestamp?: string
  [key: string]: any
}

export interface MappedFrontendData {
  bayLines: Record<string, number | string | null>
  transformer: Record<string, number | string | null>
  circuitBreaker: Record<string, number | string | null>
  busbar: Record<string, number | string | null>
  isolator: Record<string, number | string | null>
  relay?: Record<string, number | string | null>
  pmu?: Record<string, number | string | null>
  gis?: Record<string, number | string | null>
  battery?: Record<string, number | string | null>
  environment?: Record<string, number | string | null>
}

/**
 * Maps SCADA data to frontend format
 * Flask server sends both camelCase and snake_case, we map to frontend camelCase format
 * Also handles IP address data format which includes asset metadata
 */
export function mapScadaToFrontendFormat(scadaData: ScadaData): MappedFrontendData {
  const safeGet = (obj: any, ...keys: string[]) => {
    for (const key of keys) {
      if (obj?.[key] !== undefined && obj?.[key] !== null) {
        return obj[key]
      }
    }
    return null
  }

  // Handle both SCADA format and IP address data format
  // IP address data has the same component structure but may include assets/master
  const bayLinesData = scadaData.BayLines || {}
  const transformerData = scadaData.Transformer || {}
  const circuitBreakerData = scadaData.CircuitBreaker || {}
  const busbarData = scadaData.Busbar || {}
  const isolatorData = scadaData.Isolator || {}
  const protectionData = scadaData.Protection || {}
  const phasorData = scadaData.Phasor || {}
  const gisData = scadaData.GIS || {}
  const batteryData = scadaData.Battery || {}
  const environmentData = scadaData.Environment || {}

  return {
    bayLines: {
      // Map camelCase from Flask (primary) or snake_case (fallback)
      busVoltage: safeGet(bayLinesData, "busVoltage", "bus_voltage_kv"),
      lineCurrent: safeGet(bayLinesData, "lineCurrent", "line_current_a"),
      mw: safeGet(bayLinesData, "activePower", "active_power_mw"),
      mvar: safeGet(bayLinesData, "reactivePower", "reactive_power_mvar"),
      powerFactor: safeGet(bayLinesData, "powerFactor", "power_factor"),
      frequency: safeGet(bayLinesData, "frequency", "frequency_hz"),
      voltageAngle: safeGet(bayLinesData, "voltageAngle", "voltage_angle_deg"),
      currentAngle: safeGet(bayLinesData, "currentAngle", "current_angle_deg"),
      rocof: safeGet(bayLinesData, "rocof", "rocof_hz_s"),
      thd: safeGet(bayLinesData, "thd", "thd_percent"),
    },
    transformer: {
      // Map camelCase from Flask (primary) or snake_case (fallback)
      windingTemp: safeGet(transformerData, "windingTemperature", "winding_temp_c"),
      oilTemp: safeGet(transformerData, "oilTemperature", "oil_temp_c"),
      loading: safeGet(transformerData, "loading", "loading_percent"),
      tapPosition: safeGet(transformerData, "tapPosition", "tap_position"),
      hydrogen: safeGet(transformerData, "hydrogen", "hydrogen_ppm"),
      acetylene: safeGet(transformerData, "acetylene", "acetylene_ppm"),
      oilLevel: safeGet(transformerData, "oilLevel", "oil_level_percent"),
      moisture: safeGet(transformerData, "moisture", "moisture_ppm"),
      buchholz: safeGet(transformerData, "buchholz", "buchholzStatus", "buchholz"),
      cooling: safeGet(transformerData, "coolingSystem", "cooling_status", "cooling"),
    },
    circuitBreaker: {
      // Map camelCase from Flask (primary) or snake_case (fallback)
      breakerStatus: safeGet(circuitBreakerData, "breakerStatus", "breaker_status"),
      operationTime: safeGet(circuitBreakerData, "operationTime", "operation_time_ms"),
      sf6Density: safeGet(circuitBreakerData, "sf6Density", "sf6_density_bar"),
    },
    busbar: {
      // Map camelCase from Flask (primary) or snake_case (fallback)
      busVoltage: safeGet(busbarData, "busVoltage", "bus_voltage_kv"),
      busCurrent: safeGet(busbarData, "busCurrent", "bus_current_a"),
      busTemperature: safeGet(busbarData, "temperature", "bus_temperature_c"),
    },
    isolator: {
      // Map camelCase from Flask (primary) or snake_case (fallback)
      status: safeGet(isolatorData, "switchStatus", "status"),
      driveTorque: safeGet(isolatorData, "driveTorque", "drive_torque_nm"),
      operatingTime: safeGet(isolatorData, "operatingTime", "operating_time_ms"),
      contactResistance: safeGet(isolatorData, "contactResistance", "contact_resistance_uohm"),
      motorCurrent: safeGet(isolatorData, "motorCurrent", "motor_current_a"),
    },
    relay: protectionData && Object.keys(protectionData).length > 0
      ? {
          // Map snake_case from Flask to camelCase for frontend
          relayStatus: safeGet(protectionData, "relay_status"),
          tripCount: safeGet(protectionData, "trip_count"),
          earthFaultCurrent: safeGet(protectionData, "earth_fault_current_a"),
          differentialCurrent: safeGet(protectionData, "differential_current_a"),
          tripCommand: safeGet(protectionData, "trip_command"),
        }
      : undefined,
    pmu: phasorData && Object.keys(phasorData).length > 0
      ? {
          // Map snake_case from Flask to camelCase for frontend
          phaseAngle: safeGet(phasorData, "phase_angle_deg"),
          phasorMagnitude: safeGet(phasorData, "phasor_magnitude_pu"),
          voltagePhasor: safeGet(phasorData, "voltage_phasor_mag"),
          currentPhasor: safeGet(phasorData, "current_phasor_mag"),
          angleDifference: safeGet(phasorData, "angle_difference_deg"),
        }
      : undefined,
    gis: gisData && Object.keys(gisData).length > 0
      ? {
          // Map snake_case from Flask to camelCase for frontend
          gisPressure: safeGet(gisData, "gis_pressure_bar"),
          gisTemperature: safeGet(gisData, "gis_temperature_c"),
          partialDischarge: safeGet(gisData, "partial_discharge_pc"),
          busDifferentialCurrent: safeGet(gisData, "bus_differential_current_a"),
        }
      : undefined,
    battery: batteryData && Object.keys(batteryData).length > 0
      ? {
          // Map snake_case from Flask to camelCase for frontend
          batteryVoltage: safeGet(batteryData, "battery_voltage_v"),
          batteryCurrent: safeGet(batteryData, "battery_current_a"),
          batterySOC: safeGet(batteryData, "battery_soc_percent"),
          dcVoltage: safeGet(batteryData, "dc_bus_voltage_v"),
        }
      : undefined,
    environment: environmentData && Object.keys(environmentData).length > 0
      ? {
          // Map snake_case from Flask to camelCase for frontend
          ambientTemperature: safeGet(environmentData, "ambient_temperature_c"),
          humidity: safeGet(environmentData, "humidity_percent"),
        }
      : undefined,
  }
}

/**
 * Fetches SCADA data from the Flask server
 * @param url SCADA server URL
 * @param timeoutMs Timeout in milliseconds (default: 10000ms / 10 seconds)
 */
export async function fetchScadaData(url: string, timeoutMs: number = 10000): Promise<ScadaData> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`SCADA server returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data as ScadaData
  } catch (error) {
    clearTimeout(timeoutId)
    
    // Handle abort errors (timeout) gracefully
    if (error instanceof Error && error.name === "AbortError") {
      const timeoutError = new Error("SCADA server timeout - server may be offline")
      timeoutError.name = "TimeoutError"
      throw timeoutError
    }
    
    // Handle network errors
    if (error instanceof Error && (error.message.includes("Failed to fetch") || error.message.includes("NetworkError"))) {
      const networkError = new Error("Cannot connect to SCADA server - check network connection")
      networkError.name = "NetworkError"
      throw networkError
    }
    
    // Re-throw other errors as-is
    throw error
  }
}

/**
 * Extracts asset metadata from IP address data format
 * IP address data includes both component readings and asset metadata
 * Handles both formats:
 * - master at top level: { master: {...}, assets: {...} }
 * - master inside assets: { assets: { master: {...}, ... } }
 */
export function extractAssetMetadataFromIpData(ipData: ScadaData): Record<string, any> {
  // Check for master at top level first, then inside assets
  const master = ipData.master || (ipData.assets as any)?.master || {}
  const assets = ipData.assets || {}
  
  // Transform assets structure to match Firebase format
  // Exclude master from assets if it exists there (we'll add it separately)
  const transformedAssets: Record<string, any> = {}
  
  // Map component names from IP data to Firebase format
  if (assets.transformers && Array.isArray(assets.transformers)) {
    transformedAssets.transformers = assets.transformers
  }
  if (assets.powerFlowLines && Array.isArray(assets.powerFlowLines)) {
    transformedAssets.powerFlowLines = assets.powerFlowLines
  }
  if (assets.breakers && Array.isArray(assets.breakers)) {
    transformedAssets.breakers = assets.breakers
  }
  if (assets.isolators && Array.isArray(assets.isolators)) {
    transformedAssets.isolators = assets.isolators
  }
  if (assets.busbars && Array.isArray(assets.busbars)) {
    transformedAssets.busbars = assets.busbars
  }
  if (assets.relays && Array.isArray(assets.relays)) {
    transformedAssets.relays = assets.relays
  }
  if (assets.pmu && Array.isArray(assets.pmu)) {
    transformedAssets.pmu = assets.pmu
  }
  if (assets.gis && Array.isArray(assets.gis)) {
    transformedAssets.gis = assets.gis
  }
  if (assets.battery && Array.isArray(assets.battery)) {
    transformedAssets.battery = assets.battery
  }
  if (assets.environment && Array.isArray(assets.environment)) {
    transformedAssets.environment = assets.environment
  }
  
  // Also check for ctvt (current/voltage transformers)
  if (assets.ctvt && Array.isArray(assets.ctvt)) {
    transformedAssets.ctvt = assets.ctvt
  }
  
  // Also check for earthing
  if (assets.earthing && Array.isArray(assets.earthing)) {
    transformedAssets.earthing = assets.earthing
  }
  
  return {
    master,
    assets: transformedAssets,
  }
}

