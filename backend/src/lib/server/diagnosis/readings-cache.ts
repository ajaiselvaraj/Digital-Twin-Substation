import { getRealtimeDB, getFirebaseData } from "./live-data-service"
import { getLatestTimestampClient, fetchReadingsFromFirebaseClient } from "./live-data-service"
import { initializeFirebaseAuth, getFirebaseUID } from "@/lib/firebase"
import type { DiagnosisComponentKey } from "@/lib/diagnosis/types"

// In-memory cache structure: Map<timestamp, Map<component, readings>>
type ComponentReadings = Record<string, number | string | null>
type TimestampCache = Map<DiagnosisComponentKey, ComponentReadings>
const readingsCache = new Map<string, TimestampCache>()

// Track the latest timestamp we've cached
let latestCachedTimestamp: string | null = null

// All components we support
const ALL_COMPONENTS: DiagnosisComponentKey[] = [
  "bayLines",
  "transformer",
  "circuitBreaker",
  "busbar",
  "isolator",
  // Others category sub-components
  "relay",
  "pmu",
  "gis",
  "battery",
  "environment",
]

/**
 * Fetch all component readings for a specific timestamp from Firebase
 * Returns a map of component -> readings
 */
async function fetchAllReadingsForTimestamp(
  timestamp: string,
  basePath: string,
  isAdmin: boolean,
): Promise<TimestampCache> {
  const cache: TimestampCache = new Map()

  // Fetch all components in parallel
  const promises = ALL_COMPONENTS.map(async (component) => {
    try {
      const readings = await fetchReadingsFromFirebaseClient(basePath, timestamp, component, isAdmin)
      if (readings && Object.keys(readings).length > 0) {
        cache.set(component, readings)
      } else {
        cache.set(component, {})
      }
    } catch (error) {
      console.error(`Error fetching ${component} readings for timestamp ${timestamp}:`, error)
      cache.set(component, {})
    }
  })

  await Promise.allSettled(promises)
  return cache
}

/**
 * Initialize cache by fetching the latest timestamp and all its readings
 */
export async function initializeCache(areaCode: string): Promise<string | null> {
  try {
    await initializeFirebaseAuth()
    const dbInfo = getRealtimeDB()

    if (!dbInfo) {
      console.warn("[ReadingsCache] Realtime DB not available")
      return null
    }

    const { isAdmin } = dbInfo
    const basePathPrefix = "Madurai_West_Substation"
    const uid = getFirebaseUID()
    const basePath = `${basePathPrefix}/${uid}`

    // Get latest timestamp
    const latestTimestamp = await getLatestTimestampClient(basePath, isAdmin)
    if (!latestTimestamp) {
      console.warn("[ReadingsCache] No timestamp found")
      return null
    }

    // If we already have this timestamp cached, skip
    if (readingsCache.has(latestTimestamp) && latestCachedTimestamp === latestTimestamp) {
      console.log(`[ReadingsCache] Timestamp ${latestTimestamp} already cached`)
      return latestTimestamp
    }

    console.log(`[ReadingsCache] Fetching all readings for timestamp: ${latestTimestamp}`)
    
    // Fetch all component readings for this timestamp
    const cache = await fetchAllReadingsForTimestamp(latestTimestamp, basePath, isAdmin)

    // Store in cache
    readingsCache.set(latestTimestamp, cache)
    latestCachedTimestamp = latestTimestamp

    // Clean up old cache entries (keep only last 5 timestamps)
    if (readingsCache.size > 5) {
      const sortedTimestamps = Array.from(readingsCache.keys())
        .map(ts => ({ ts, num: Number(ts) }))
        .filter(x => !isNaN(x.num))
        .sort((a, b) => b.num - a.num) // Sort descending

      // Keep only the 5 most recent
      for (let i = 5; i < sortedTimestamps.length; i++) {
        readingsCache.delete(sortedTimestamps[i].ts)
      }
    }

    console.log(`[ReadingsCache] Cached ${cache.size} components for timestamp ${latestTimestamp}`)
    return latestTimestamp
  } catch (error) {
    console.error("[ReadingsCache] Failed to initialize cache:", error)
    return null
  }
}

/**
 * Update cache when new timestamp is detected
 */
export async function updateCacheForNewTimestamp(
  newTimestamp: string,
  areaCode: string,
): Promise<boolean> {
  try {
    // If we already have this timestamp, skip
    if (readingsCache.has(newTimestamp)) {
      latestCachedTimestamp = newTimestamp
      return true
    }

    await initializeFirebaseAuth()
    const dbInfo = getRealtimeDB()

    if (!dbInfo) {
      return false
    }

    const { isAdmin } = dbInfo
    const basePathPrefix = "Madurai_West_Substation"
    const uid = getFirebaseUID()
    const basePath = `${basePathPrefix}/${uid}`

    console.log(`[ReadingsCache] Updating cache for new timestamp: ${newTimestamp}`)

    // Fetch all component readings for the new timestamp
    const cache = await fetchAllReadingsForTimestamp(newTimestamp, basePath, isAdmin)

    // Store in cache
    readingsCache.set(newTimestamp, cache)
    latestCachedTimestamp = newTimestamp

    // Clean up old cache entries
    if (readingsCache.size > 5) {
      const sortedTimestamps = Array.from(readingsCache.keys())
        .map(ts => ({ ts, num: Number(ts) }))
        .filter(x => !isNaN(x.num))
        .sort((a, b) => b.num - a.num)

      for (let i = 5; i < sortedTimestamps.length; i++) {
        readingsCache.delete(sortedTimestamps[i].ts)
      }
    }

      console.log(`[ReadingsCache] Updated cache with ${cache.size} components for timestamp ${newTimestamp}`)
    return true
  } catch (error) {
    console.error("[ReadingsCache] Failed to update cache:", error)
    return false
  }
}

/**
 * Get readings for a specific component from cache
 * Returns null if not found in cache
 */
export function getCachedReadings(
  component: DiagnosisComponentKey,
  timestamp?: string,
): ComponentReadings | null {
  // If timestamp provided, use it; otherwise use latest
  const targetTimestamp = timestamp || latestCachedTimestamp

  if (!targetTimestamp) {
    return null
  }

  const timestampCache = readingsCache.get(targetTimestamp)
  if (!timestampCache) {
    return null
  }

  return timestampCache.get(component) || null
}

/**
 * Get all cached readings for a timestamp
 */
export function getAllCachedReadings(timestamp?: string): TimestampCache | null {
  const targetTimestamp = timestamp || latestCachedTimestamp

  if (!targetTimestamp) {
    return null
  }

  return readingsCache.get(targetTimestamp) || null
}

/**
 * Get the latest cached timestamp
 */
export function getLatestCachedTimestamp(): string | null {
  return latestCachedTimestamp
}

/**
 * Clear the cache (useful for testing or memory management)
 */
export function clearCache(): void {
  readingsCache.clear()
  latestCachedTimestamp = null
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    cachedTimestamps: Array.from(readingsCache.keys()),
    latestTimestamp: latestCachedTimestamp,
    totalEntries: readingsCache.size,
  }
}

