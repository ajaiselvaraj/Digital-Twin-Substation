// Circuit Breaker-specific glow effect utilities
import * as THREE from "three"

// Parameter → Part Mapping (exact names from Blender file)
export const circuitBreakerRules = {
  SF6: {
    param: "sf6Density", // SF6 Density parameter - maps to SF6 part in 3D model
    minAlarm: 5.5, // Below 5.5 bar is critical (low pressure - can't interrupt)
    maxAlarm: 8.0, // Above 8.0 bar is overpressure
  },
} as const

/**
 * Get glow color based on value and alarm thresholds
 * @param value - Current sensor value
 * @param minAlarm - Minimum alarm threshold
 * @param maxAlarm - Maximum alarm threshold
 * @returns Hex color string
 */
export function getGlowColor(value: number, minAlarm: number, maxAlarm: number): string {
  if (value < minAlarm) return "#00ff55" // Green (low)
  if (value > maxAlarm) return "#ff3333" // Red (high)
  return "#ff9900" // Orange (medium)
}

/**
 * Get circuit breaker parameter color based on parameter key and value
 * Uses the same thresholds as the 3D glow system
 * @param parameterKey - The parameter key (e.g., "sf6Density")
 * @param value - The parameter value
 * @returns Hex color string or null if parameter not found
 */
export function getCircuitBreakerParameterColor(
  parameterKey: string,
  value: number | string | null | undefined
): string | null {
  if (value === null || value === undefined) return null
  
  const numValue = typeof value === "string" ? parseFloat(value) : value
  if (!Number.isFinite(numValue)) return null

  // Map parameter keys to circuit breaker rules
  const keyMap: Record<string, keyof typeof circuitBreakerRules> = {
    // SF6 Density variations
    sf6Density: "SF6",
    sf6DensityPercent: "SF6",
    sf6Pressure: "SF6",
  }

  const ruleKey = keyMap[parameterKey]
  if (!ruleKey) {
    // Parameter not mapped to a circuit breaker part, return null
    return null
  }

  const rule = circuitBreakerRules[ruleKey]
  return getGlowColor(numValue, rule.minAlarm, rule.maxAlarm)
}

/**
 * Update circuit breaker glow effects based on live sensor values
 * @param circuitBreaker - The Three.js circuit breaker model
 * @param values - Live sensor values object
 */
export function updateCircuitBreakerGlow(
  circuitBreaker: THREE.Object3D,
  values: Record<string, number | string>
): void {
  console.log("[CircuitBreakerGlow] Updating glow with values:", values)
  
  // First, log all available object names in the model for debugging
  const allNames: string[] = []
  circuitBreaker.traverse((child) => {
    if (child.name) {
      allNames.push(child.name)
    }
  })
  console.log("[CircuitBreakerGlow] Available object names in model:", allNames)
  
  Object.keys(circuitBreakerRules).forEach((partName) => {
    const rule = circuitBreakerRules[partName as keyof typeof circuitBreakerRules]
    const liveValue = values[rule.param]

    if (liveValue === undefined || liveValue === null) {
      console.log(`[CircuitBreakerGlow] No value for ${rule.param} (part: ${partName})`)
      return
    }

    const numValue = typeof liveValue === "string" ? parseFloat(liveValue) : liveValue
    if (!Number.isFinite(numValue)) {
      console.warn(`[CircuitBreakerGlow] Invalid value for ${rule.param}: ${liveValue}`)
      return
    }

    const color = getGlowColor(numValue, rule.minAlarm, rule.maxAlarm)
    console.log(`[CircuitBreakerGlow] ${partName} (${rule.param}): ${numValue} → ${color}`)
    
    const part = circuitBreaker.getObjectByName(partName)

    if (!part) {
      console.warn(`[CircuitBreakerGlow] Part "${partName}" not found by name, searching...`)
      // Try to find the part by traversing the model
      let found = false
      circuitBreaker.traverse((child) => {
        if (child.name === partName || child.name.includes(partName)) {
          console.log(`[CircuitBreakerGlow] Found part "${partName}" as "${child.name}"`)
          applyGlowToPart(child, color)
          found = true
        }
      })
      if (!found) {
        console.warn(`[CircuitBreakerGlow] Part "${partName}" not found in model`)
      }
      return
    }

    console.log(`[CircuitBreakerGlow] Found part "${partName}", applying glow color ${color}`)
    applyGlowToPart(part, color)
  })
}

/**
 * Apply glow effect to a specific part
 * @param part - The Three.js object representing the part
 * @param color - Hex color string
 */
function applyGlowToPart(part: THREE.Object3D, color: string): void {
  part.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Clone material to avoid affecting other instances
      if (child.material instanceof THREE.MeshStandardMaterial) {
        child.material = child.material.clone()
        child.material.emissive = new THREE.Color(color)
        child.material.emissiveIntensity = 1.0
        child.material.needsUpdate = true
      } else if (child.material instanceof THREE.MeshBasicMaterial) {
        // Convert to MeshStandardMaterial for emissive support
        const newMaterial = new THREE.MeshStandardMaterial({
          color: child.material.color,
          map: child.material.map,
          transparent: child.material.transparent,
          opacity: child.material.opacity,
          emissive: new THREE.Color(color),
          emissiveIntensity: 1.0,
        })
        child.material = newMaterial
        child.material.needsUpdate = true
      }
    }
  })
}

/**
 * Remove all glow effects from circuit breaker
 * @param circuitBreaker - The Three.js circuit breaker model
 */
export function removeCircuitBreakerGlow(circuitBreaker: THREE.Object3D): void {
  circuitBreaker.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      child.material.emissive = new THREE.Color(0x000000)
      child.material.emissiveIntensity = 0
      child.material.needsUpdate = true
    }
  })
}

