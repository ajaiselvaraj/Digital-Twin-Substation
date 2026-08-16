// Transformer-specific glow effect utilities
import * as THREE from "three"

// Parameter → Part Mapping (exact names from Blender file)
export const transformerRules = {
  CORE_WINDINGS: {
    param: "windingTemp",
    minAlarm: 35,
    maxAlarm: 95,
  },
  RADIATORS: {
    param: "oilTemp",
    minAlarm: 25,
    maxAlarm: 85,
  },
  GAS_MONITOR: {
    param: "gasLevel",
    minAlarm: 80,
    maxAlarm: 550,
  },
  OLTC_BOX: {
    param: "tapPos",
    minAlarm: 1,
    maxAlarm: 17,
  },
  CONSERVATOR_TANK: {
    param: "oilLevel", // Oil Level parameter - maps to CONSERVATOR_TANK part in 3D model
    minAlarm: 85,
    maxAlarm: 100,
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
 * Get transformer parameter color based on parameter key and value
 * Uses the same thresholds as the 3D glow system
 * @param parameterKey - The parameter key (e.g., "windingTemp", "oilTemp", etc.)
 * @param value - The parameter value
 * @returns Hex color string or null if parameter not found
 */
export function getTransformerParameterColor(
  parameterKey: string,
  value: number | string | null | undefined
): string | null {
  if (value === null || value === undefined) return null
  
  const numValue = typeof value === "string" ? parseFloat(value) : value
  if (!Number.isFinite(numValue)) return null

  // Map parameter keys to transformer rules
  // Handle all possible parameter name variations
  const keyMap: Record<string, keyof typeof transformerRules> = {
    // Winding Temperature variations
    windingTemp: "CORE_WINDINGS",
    windingTemperature: "CORE_WINDINGS",
    // Oil Temperature variations
    oilTemp: "RADIATORS",
    oilTemperature: "RADIATORS",
    // Gas Level variations (hydrogen is the actual parameter name in component config)
    gasLevel: "GAS_MONITOR",
    hydrogen: "GAS_MONITOR",
    hydrogenPPM: "GAS_MONITOR",
    // Tap Position variations
    tapPos: "OLTC_BOX",
    tapPosition: "OLTC_BOX",
    // Oil Level - maps to CONSERVATOR_TANK part
    oilLevel: "CONSERVATOR_TANK",
  }

  const ruleKey = keyMap[parameterKey]
  if (!ruleKey) {
    // Parameter not mapped to a transformer part, return null
    return null
  }

  const rule = transformerRules[ruleKey]
  return getGlowColor(numValue, rule.minAlarm, rule.maxAlarm)
}

/**
 * Update transformer glow effects based on live sensor values
 * @param transformer - The Three.js transformer model
 * @param values - Live sensor values object
 */
export function updateTransformerGlow(
  transformer: THREE.Object3D,
  values: Record<string, number | string>
): void {
  console.log("[TransformerGlow] Updating glow with values:", values)
  
  // First, log all available object names in the model for debugging
  const allNames: string[] = []
  transformer.traverse((child) => {
    if (child.name) {
      allNames.push(child.name)
    }
  })
  console.log("[TransformerGlow] Available object names in model:", allNames)
  
  Object.keys(transformerRules).forEach((partName) => {
    const rule = transformerRules[partName as keyof typeof transformerRules]
    const liveValue = values[rule.param]

    if (liveValue === undefined || liveValue === null) {
      console.log(`[TransformerGlow] No value for ${rule.param} (part: ${partName})`)
      return
    }

    const numValue = typeof liveValue === "string" ? parseFloat(liveValue) : liveValue
    if (!Number.isFinite(numValue)) {
      console.warn(`[TransformerGlow] Invalid value for ${rule.param}: ${liveValue}`)
      return
    }

    const color = getGlowColor(numValue, rule.minAlarm, rule.maxAlarm)
    console.log(`[TransformerGlow] ${partName} (${rule.param}): ${numValue} → ${color}`)
    
    const part = transformer.getObjectByName(partName)

    if (!part) {
      console.warn(`[TransformerGlow] Part "${partName}" not found by name, searching...`)
      // Try to find the part by traversing the model
      let found = false
      transformer.traverse((child) => {
        if (child.name === partName || child.name.includes(partName)) {
          console.log(`[TransformerGlow] Found part "${partName}" as "${child.name}"`)
          applyGlowToPart(child, color)
          found = true
        }
      })
      if (!found) {
        console.warn(`[TransformerGlow] Part "${partName}" not found in model`)
      }
      return
    }

    console.log(`[TransformerGlow] Found part "${partName}", applying glow color ${color}`)
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
 * Remove all glow effects from transformer
 * @param transformer - The Three.js transformer model
 */
export function removeTransformerGlow(transformer: THREE.Object3D): void {
  transformer.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      child.material.emissive = new THREE.Color(0x000000)
      child.material.emissiveIntensity = 0
      child.material.needsUpdate = true
    }
  })
}

