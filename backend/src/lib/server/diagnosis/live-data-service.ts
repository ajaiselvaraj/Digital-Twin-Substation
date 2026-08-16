import { generateSyntheticReadings } from "@/lib/diagnosis/realtime-generator"
import type { DiagnosisComponentKey } from "@/lib/diagnosis/types"
import { DUMMY_SUBSTATIONS } from "@/lib/dummy-data"
import { getAdminFirestore, getAdminRealtimeDB } from "@/lib/server/firebase-admin"
import { getDatabase, ref, get } from "firebase/database"
import app, { initializeFirebaseAuth, getFirebaseUID } from "@/lib/firebase"

// Map UI component keys to Firebase component names
const FIREBASE_COMPONENT_MAP: Record<DiagnosisComponentKey, string> = {
  bayLines: "BayLines",
  transformer: "Transformer",
  circuitBreaker: "CircuitBreaker",
  busbar: "Busbar",
  isolator: "Isolator",
  relay: "Protection",
  pmu: "Phasor",
  gis: "GIS",
  battery: "Battery",
  environment: "Environment",
}

// Map UI parameter keys to Firebase field names for each component
const FIREBASE_FIELD_MAP: Record<DiagnosisComponentKey, Record<string, string>> = {
  bayLines: {
    busVoltage: "bus_voltage_kv",
    lineCurrent: "line_current_a",
    mw: "active_power_mw",
    mvar: "reactive_power_mvar",
    powerFactor: "power_factor",
    frequency: "frequency_hz",
    voltageAngle: "voltage_angle_deg",
    currentAngle: "current_angle_deg",
    rocof: "rocof_hz_s",
    thd: "thd_percent",
  },
  transformer: {
    windingTemp: "winding_temp_c",
    oilTemp: "oil_temp_c",
    loading: "loading_percent",
    tapPosition: "tap_position",
    hydrogen: "hydrogen_ppm",
    acetylene: "acetylene_ppm",
    oilLevel: "oil_level_percent",
    moisture: "moisture_ppm",
    buchholz: "buchholz",
    cooling: "cooling_status",
  },
  circuitBreaker: {
    breakerStatus: "breaker_status",
    operationTime: "operation_time_ms",
    sf6Density: "sf6_density_bar",
  },
  busbar: {
    busVoltage: "bus_voltage_kv",
    busCurrent: "bus_current_a",
    busTemperature: "bus_temperature_c",
  },
  isolator: {
    status: "status",
    driveTorque: "drive_torque_nm",
    operatingTime: "operating_time_ms",
    contactResistance: "contact_resistance_uohm",
    motorCurrent: "motor_current_a",
  },
  relay: {
    relayStatus: "relay_status",
    tripCount: "trip_count",
    earthFaultCurrent: "earth_fault_current_a",
    differentialCurrent: "differential_current_a",
    tripCommand: "trip_command",
  },
  pmu: {
    phaseAngle: "phase_angle_deg",
    phasorMagnitude: "phasor_magnitude_pu",
    voltagePhasor: "voltage_phasor",
    currentPhasor: "current_phasor",
    angleDifference: "angle_difference_deg",
  },
  gis: {
    gisPressure: "gis_pressure_bar",
    gisTemperature: "gis_temperature_c",
    partialDischarge: "partial_discharge_pc",
    busDifferentialCurrent: "bus_differential_current_a",
  },
  battery: {
    batteryVoltage: "battery_voltage_v",
    batteryCurrent: "battery_current_a",
    batterySOC: "battery_soc_percent",
    dcVoltage: "dc_bus_voltage_v",
  },
  environment: {
    ambientTemperature: "ambient_temperature_c",
    humidity: "humidity_percent",
  },
}

/**
 * Convert Firebase field values to UI parameter format
 */
function convertFirebaseValue(value: any, paramKey: string, component: DiagnosisComponentKey): number | string {
  // Handle binary status fields (0 = Closed, 1 = Open)
  if (paramKey === "breakerStatus" || paramKey === "status") {
    return value === 0 || value === "0" ? "Close" : "Open"
  }
  if (paramKey === "buchholz") {
    return value === 1 || value === "1" ? "Trip" : value === 0 || value === "0" ? "Normal" : String(value)
  }
  if (paramKey === "cooling") {
    return value === 1 || value === "1" ? "ON" : "OFF"
  }
  
  // Handle relay status
  if (paramKey === "relayStatus") {
    if (typeof value === "string") {
      return value === "Active" || value === "active" || value === "1" ? "Active" : "Inactive"
    }
    return value === 1 || value === "1" ? "Active" : "Inactive"
  }
  
  // Handle trip command
  if (paramKey === "tripCommand") {
    return value === 1 || value === "1" || value === "ON" || value === "on" ? "ON" : "OFF"
  }
  
  // Handle phasor objects (voltage_phasor and current_phasor)
  // Backend format: { "magnitude": 327.2, "angle": -8.1 } or { "magnitude": 327.2, "angle_deg": -8.1 }
  if (paramKey === "voltagePhasor" || paramKey === "currentPhasor") {
    if (value && typeof value === "object") {
      const magnitude = value.magnitude ?? value.magnitude_pu ?? 0
      const angle = value.angle_deg ?? value.angle ?? 0
      return `${Number(magnitude).toFixed(1)} ∠ ${Number(angle).toFixed(1)}°`
    }
    // If it's already a string, return as-is
    if (typeof value === "string") {
      return value
    }
  }
  
  // Return numeric values as-is, or convert strings to numbers
  if (typeof value === "number") {
    return value
  }
  if (typeof value === "string") {
    const num = parseFloat(value)
    return isNaN(num) ? value : num
  }
  
  return value ?? null
}

/**
 * Fetch the latest timestamp from Firebase readings (using client SDK approach)
 * Handles numeric timestamps correctly - converts to numbers and finds max
 */
export async function getLatestTimestampClient(
  basePath: string,
  isAdmin: boolean,
): Promise<string | null> {
  try {
    const readingsPath = `${basePath}/readings`
    console.log(`[getLatestTimestampClient] Checking path: ${readingsPath}`)
    
    const timestamps = await getFirebaseData(readingsPath, isAdmin)
    
    if (!timestamps) {
      console.warn(`[getLatestTimestampClient] No data found at path: ${readingsPath}`)
      // Try to check if the base path exists
      const baseData = await getFirebaseData(basePath, isAdmin)
      console.log(`[getLatestTimestampClient] Base path data:`, baseData ? `Exists with keys: ${Object.keys(baseData).join(', ')}` : 'null')
      return null
    }
    
    console.log(`[getLatestTimestampClient] Found timestamps object, keys:`, Object.keys(timestamps || {}))
    
    if (!timestamps || typeof timestamps !== "object") {
      console.warn(`[getLatestTimestampClient] Invalid timestamps format, type:`, typeof timestamps)
      return null
    }
    
    // Get all timestamp keys - handle both numeric and string timestamps
    const keys = Object.keys(timestamps)
    
    // Convert to numbers and find the maximum (latest timestamp)
    const numericTimestamps = keys.map(Number).filter(ts => !isNaN(ts))
    
    if (numericTimestamps.length === 0) {
      // Fallback: if no numeric timestamps, sort as strings
      const sortedKeys = keys.sort()
      const latest = sortedKeys.length > 0 ? sortedKeys[sortedKeys.length - 1] : null
      console.log(`[getLatestTimestampClient] Latest timestamp (string sort): ${latest} (from ${keys.length} timestamps)`)
      return latest
    }
    
    const latestTs = Math.max(...numericTimestamps)
    const latest = String(latestTs)
    console.log(`[getLatestTimestampClient] Latest timestamp (numeric max): ${latest} (from ${keys.length} timestamps, max: ${latestTs})`)
    return latest
  } catch (error) {
    console.error("[getLatestTimestampClient] Failed to get latest timestamp", error)
    return null
  }
}

/**
 * Fetch readings from Firebase for a specific component and timestamp (using client SDK approach)
 */
export async function fetchReadingsFromFirebaseClient(
  basePath: string,
  timestamp: string,
  component: DiagnosisComponentKey,
  isAdmin: boolean,
): Promise<Record<string, number | string> | null> {
  try {
    const firebaseComponentName = FIREBASE_COMPONENT_MAP[component]
    const fullPath = `${basePath}/readings/${timestamp}/${firebaseComponentName}`
    
    console.log(`[fetchReadingsFromFirebaseClient] Fetching from path: ${fullPath}`)
    
    const firebaseData = await getFirebaseData(fullPath, isAdmin)
    
    if (!firebaseData) {
      console.warn(`[fetchReadingsFromFirebaseClient] No data exists at path: ${fullPath}`)
      return null
    }
    
    console.log(`[fetchReadingsFromFirebaseClient] Raw Firebase data for ${component}:`, firebaseData)
    
    if (!firebaseData || typeof firebaseData !== "object") {
      console.warn(`[fetchReadingsFromFirebaseClient] Invalid data format at path: ${fullPath}`)
      return null
    }
    
    // Map Firebase fields to UI parameter keys
    const fieldMap = FIREBASE_FIELD_MAP[component]
    const readings: Record<string, number | string> = {}
    
    console.log(`[fetchReadingsFromFirebaseClient] Field map for ${component}:`, fieldMap)
    
    for (const [uiKey, firebaseKey] of Object.entries(fieldMap)) {
      if (firebaseData[firebaseKey] !== undefined) {
        readings[uiKey] = convertFirebaseValue(firebaseData[firebaseKey], uiKey, component)
        console.log(`[fetchReadingsFromFirebaseClient] Mapped ${firebaseKey} (${firebaseData[firebaseKey]}) -> ${uiKey} (${readings[uiKey]})`)
      } else {
        console.log(`[fetchReadingsFromFirebaseClient] Field ${firebaseKey} not found in Firebase data`)
      }
    }
    
    console.log(`[fetchReadingsFromFirebaseClient] Final readings for ${component}:`, readings)
    
    return Object.keys(readings).length > 0 ? readings : null
  } catch (error) {
    console.error(`[fetchReadingsFromFirebaseClient] Failed to fetch readings from Firebase:`, error)
    return null
  }
}

/**
 * Try to find available UIDs under the base path (using client SDK approach)
 */
async function findAvailableUIDsClient(
  basePathPrefix: string,
  isAdmin: boolean,
): Promise<string[]> {
  try {
    const data = await getFirebaseData(basePathPrefix, isAdmin)
    
    if (!data || typeof data !== "object") {
      return []
    }
    
    return Object.keys(data)
  } catch (error) {
    console.warn("[findAvailableUIDsClient] Failed to find UIDs", error)
    return []
  }
}

/**
 * Get Firebase Realtime Database reference (tries Admin first, falls back to client SDK)
 */
export function getRealtimeDB() {
  // Try Admin SDK first (for server-side with credentials)
  const adminDB = getAdminRealtimeDB()
  if (adminDB) {
    return { db: adminDB, isAdmin: true }
  }
  
  // Fallback to client SDK (works without service account)
  try {
    const clientDB = getDatabase(app)
    return { db: clientDB, isAdmin: false }
  } catch (error) {
    console.error("Failed to initialize client Firebase DB", error)
    return null
  }
}

/**
 * Get data from Firebase using either Admin or Client SDK
 */
export async function getFirebaseData(path: string, isAdmin: boolean): Promise<any> {
  try {
    if (isAdmin) {
      const adminDB = getAdminRealtimeDB()
      if (!adminDB) {
        console.warn(`[getFirebaseData] Admin DB not available for path: ${path}`)
        return null
      }
      const dbRef = adminDB.ref(path)
      console.log(`[getFirebaseData] Admin SDK - Fetching from path: ${path}`)
      const snapshot = await dbRef.get()
      const exists = snapshot.exists()
      const data = exists ? snapshot.val() : null
      console.log(`[getFirebaseData] Admin SDK - Path: ${path}, Exists: ${exists}, Data keys:`, data ? (typeof data === 'object' ? Object.keys(data) : 'not an object') : 'null')
      return data
    } else {
      const clientDB = getDatabase(app)
      const dbRef = ref(clientDB, path)
      console.log(`[getFirebaseData] Client SDK - Fetching from path: ${path}`)
      const snapshot = await get(dbRef)
      const exists = snapshot.exists()
      const data = exists ? snapshot.val() : null
      console.log(`[getFirebaseData] Client SDK - Path: ${path}, Exists: ${exists}, Data:`, data ? (typeof data === 'object' ? `Object with keys: ${Object.keys(data).join(', ')}` : data) : 'null')
      return data
    }
  } catch (error: any) {
    console.error(`[getFirebaseData] Error fetching from path ${path}:`, error?.message || error)
    return null
  }
}

/**
 * Fetch live parameter readings from Firebase Realtime Database
 * Path structure: Madurai_West_Substation/<substationId>/readings/<timestamp>/<ComponentType>
 * 
 * This function uses Realtime Database (NOT Firestore) for live sensor readings
 */
export async function fetchLiveSnapshot(
  areaCode: string,
  substationId: string | null | undefined,
  component: DiagnosisComponentKey,
) {
  // Initialize Firebase Auth (server-side)
  await initializeFirebaseAuth()
  
  // Get Realtime Database connection (NOT Firestore - readings come from RTDB)
  const dbInfo = getRealtimeDB()
  
  if (!dbInfo) {
    console.warn("Realtime DB not available (neither Admin nor Client SDK), returning empty readings")
    return {
      timestamp: new Date().toISOString(),
      readings: {},
      history: {},
      source: "firebase",
    }
  }
  
  const { isAdmin } = dbInfo
  console.log(`[fetchLiveSnapshot] Using ${isAdmin ? 'Admin' : 'Client'} Firebase SDK for Realtime Database`)

  try {
    // The structure is: Madurai_West_Substation/<UID>/readings/<timestamp>
    const basePathPrefix = "Madurai_West_Substation"
    
    // Use Firebase UID for the path
    const uid = getFirebaseUID()
    const basePath = `${basePathPrefix}/${uid}`
    
    console.log(`[fetchLiveSnapshot] Fetching for component: ${component}, using UID: ${uid}, basePath: ${basePath}`)
    
    // Get the latest timestamp (last updated value) - using client SDK approach
    let latestTimestamp = await getLatestTimestampClient(basePath, isAdmin)
    
    if (!latestTimestamp) {
      console.warn(`[fetchLiveSnapshot] No data found at ${basePath}/readings, returning empty readings`)
      return {
        timestamp: new Date().toISOString(),
        readings: {},
        history: {},
        source: "firebase",
      }
    }
    
    console.log(`[fetchLiveSnapshot] Latest timestamp: ${latestTimestamp}, using basePath: ${basePath}`)
    
    // Fetch readings for the latest timestamp
    const readings = await fetchReadingsFromFirebaseClient(basePath, latestTimestamp, component, isAdmin)
    
    if (!readings || Object.keys(readings).length === 0) {
      console.warn(`[fetchLiveSnapshot] No readings found for component ${component} at ${basePath}/readings/${latestTimestamp}, returning empty readings`)
      return {
        timestamp: latestTimestamp,
        readings: {},
        history: {},
        source: "firebase",
      }
    }
    
    console.log(`[fetchLiveSnapshot] Successfully fetched ${Object.keys(readings).length} readings for ${component}:`, readings)
    
    // Generate history from readings (for trend display)
    const history: Record<string, number[]> = {}
    const { COMPONENT_DEFINITIONS } = await import("@/lib/diagnosis/component-config")
    const definition = COMPONENT_DEFINITIONS[component]
    if (definition) {
      for (const paramKey of definition.defaultTrends) {
        const value = readings[paramKey]
        if (typeof value === "number") {
          history[paramKey] = [value] // Single point history for now
        }
      }
    }
    
    return {
      timestamp: latestTimestamp,
      readings,
      history,
      source: "firebase",
    }
  } catch (error) {
    console.error("[fetchLiveSnapshot] Realtime fetch failed, returning empty readings", error)
    return {
      timestamp: new Date().toISOString(),
      readings: {},
      history: {},
      source: "firebase",
    }
  }
}

async function querySubstationByField(
  firestore: ReturnType<typeof getAdminFirestore>,
  fieldPath: string,
  rawValue: string,
) {
  if (!firestore || !rawValue) return null
  const candidates = Array.from(
    new Set(
      [rawValue, rawValue.trim(), rawValue.trim().toUpperCase(), rawValue.trim().toLowerCase()].filter(Boolean),
    ),
  ) as string[]
  for (const candidate of candidates) {
    if (!candidate) continue
    const snapshot = await firestore.collection("substations").where(fieldPath, "==", candidate).limit(1).get()
    if (!snapshot.empty) {
      const doc = snapshot.docs[0]
      return { id: doc.id, ...doc.data() }
    }
  }
  return null
}

/**
 * Fetch asset metadata from Firebase Firestore
 * 
 * This function uses Firestore (NOT Realtime Database) for asset details like:
 * - Installation year
 * - Substation specifications
 * - Asset configurations
 * 
 * Live parameter readings come from Realtime Database via fetchLiveSnapshot()
 */
export async function fetchAssetMetadata(identifier?: string | null) {
  if (!identifier) {
    return {
      master: {
        areaName: "Unknown Area",
        installationYear: "—",
      },
    }
  }

  // Try Admin Firestore first
  const adminFirestore = getAdminFirestore()
  if (adminFirestore) {
    try {
      const directCollections = ["substations", "areas"]
      for (const collectionName of directCollections) {
        const doc = await adminFirestore.collection(collectionName).doc(identifier).get()
        if (doc.exists) {
          const data = doc.data()
          console.log(`[fetchAssetMetadata] Found in ${collectionName} collection:`, data)
          return { id: doc.id, ...data }
        }
      }

      const lookupOrder = [
        "master.substationCode",
        "master.areaName",
        "master.name",
      ]
      for (const fieldPath of lookupOrder) {
        const record = await querySubstationByField(adminFirestore, fieldPath, identifier)
        if (record) {
          console.log(`[fetchAssetMetadata] Found via field lookup ${fieldPath}:`, record)
          return record
        }
      }
    } catch (error) {
      console.warn("[fetchAssetMetadata] Admin Firestore fetch failed:", error)
    }
  }

  // Fallback to client SDK Firestore
  try {
    const { getFirestoreDB } = await import("@/lib/firebase")
    const { collection, getDocs, query, where, limit } = await import("firebase/firestore")
    const clientFirestore = getFirestoreDB()
    
    if (clientFirestore) {
      // Try direct document lookup
      const { doc, getDoc } = await import("firebase/firestore")
      const collections = ["substations", "areas"]
      
      for (const collectionName of collections) {
        try {
          const docRef = doc(clientFirestore, collectionName, identifier)
          const docSnap = await getDoc(docRef)
          if (docSnap.exists()) {
            const data = docSnap.data()
            console.log(`[fetchAssetMetadata] Found in client Firestore ${collectionName}:`, data)
            return { id: docSnap.id, ...data }
          }
        } catch (err) {
          // Continue to next collection
        }
      }

      // Try query by substationCode
      const substationQuery = query(
        collection(clientFirestore, "substations"),
        where("master.substationCode", "==", identifier),
        limit(1)
      )
      const substationSnapshot = await getDocs(substationQuery)
      if (!substationSnapshot.empty) {
        const doc = substationSnapshot.docs[0]
        const data = doc.data()
        console.log(`[fetchAssetMetadata] Found via substationCode query:`, data)
        return { id: doc.id, ...data }
      }

      // Try query by areaName
      const areaQuery = query(
        collection(clientFirestore, "substations"),
        where("master.areaName", "==", identifier),
        limit(1)
      )
      const areaSnapshot = await getDocs(areaQuery)
      if (!areaSnapshot.empty) {
        const doc = areaSnapshot.docs[0]
        const data = doc.data()
        console.log(`[fetchAssetMetadata] Found via areaName query:`, data)
        return { id: doc.id, ...data }
      }

      // Try query by name (partial match)
      const nameQuery = query(
        collection(clientFirestore, "substations"),
        where("master.name", ">=", identifier),
        where("master.name", "<=", identifier + "\uf8ff"),
        limit(1)
      )
      const nameSnapshot = await getDocs(nameQuery)
      if (!nameSnapshot.empty) {
        const doc = nameSnapshot.docs[0]
        const data = doc.data()
        console.log(`[fetchAssetMetadata] Found via name query:`, data)
        return { id: doc.id, ...data }
      }
    }
  } catch (error) {
    console.warn("[fetchAssetMetadata] Client Firestore fetch failed:", error)
  }

  // Final fallback to dummy data
  if (identifier) {
    const matchId = identifier.toLowerCase()
    const fallback = DUMMY_SUBSTATIONS.find(
      (item) =>
        item.id === identifier ||
        item.master.substationCode?.toLowerCase() === matchId ||
        item.master.areaName?.toLowerCase() === matchId,
    )
    if (fallback) {
      console.log("[fetchAssetMetadata] Using dummy data fallback")
      return fallback
    }
  }

  console.warn(`[fetchAssetMetadata] No metadata found for identifier: ${identifier}`)
  return {
    master: {
      areaName: identifier ?? "Unknown Area",
      installationYear: "—",
    },
  }
}

