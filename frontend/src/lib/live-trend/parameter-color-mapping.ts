// Parameter-based color mapping for 3D model visualization
import * as THREE from "three"

export interface ParameterColorConfig {
  parameter: string
  value: number
  targetColor: string
  intensity?: number
}

export interface ColorTransitionState {
  currentColor: THREE.Color
  targetColor: THREE.Color
  progress: number
}

/**
 * Get color based on parameter value with smooth transitions
 */
export function getParameterColor(parameter: string, value: number): string {
  switch (parameter) {
    case "trueHealth":
      // Green (100%) -> Yellow (70%) -> Orange (40%) -> Red (0%)
      if (value >= 80) return "#00FF00" // Bright Green
      if (value >= 60) return "#7FFF00" // Yellow-Green
      if (value >= 40) return "#FFFF00" // Yellow
      if (value >= 20) return "#FF8000" // Orange
      return "#FF0000" // Red

    case "stressScore":
      // Blue (0%) -> Yellow (30%) -> Orange (60%) -> Red (100%)
      if (value <= 20) return "#0080FF" // Blue
      if (value <= 40) return "#00FFFF" // Cyan
      if (value <= 60) return "#FFFF00" // Yellow
      if (value <= 80) return "#FF8000" // Orange
      return "#FF0000" // Red

    case "faultProbability":
      // Green (0%) -> Yellow (25%) -> Orange (50%) -> Red (100%)
      if (value <= 15) return "#00FF00" // Green
      if (value <= 35) return "#80FF00" // Yellow-Green
      if (value <= 55) return "#FFFF00" // Yellow
      if (value <= 75) return "#FF8000" // Orange
      return "#FF0000" // Red

    case "agingFactor":
      // Bright (100%) -> Dim (0%)
      if (value >= 80) return "#FFFFFF" // White/Bright
      if (value >= 60) return "#C0C0C0" // Light Gray
      if (value >= 40) return "#808080" // Gray
      if (value >= 20) return "#404040" // Dark Gray
      return "#202020" // Very Dark Gray

    default:
      return "#FFFFFF" // Default white
  }
}

/**
 * Interpolate between two colors
 */
export function interpolateColor(color1: string, color2: string, factor: number): string {
  const c1 = new THREE.Color(color1)
  const c2 = new THREE.Color(color2)
  
  const result = c1.clone().lerp(c2, Math.max(0, Math.min(1, factor)))
  return `#${result.getHexString()}`
}

/**
 * Create smooth color transition based on multiple parameters
 */
export function createParameterColorTransition(
  parameters: { parameter: string; value: number; weight?: number }[]
): string {
  if (parameters.length === 0) return "#FFFFFF"
  
  let totalWeight = 0
  let r = 0, g = 0, b = 0
  
  parameters.forEach(({ parameter, value, weight = 1 }) => {
    const color = new THREE.Color(getParameterColor(parameter, value))
    r += color.r * weight
    g += color.g * weight
    b += color.b * weight
    totalWeight += weight
  })
  
  if (totalWeight > 0) {
    r /= totalWeight
    g /= totalWeight
    b /= totalWeight
  }
  
  const finalColor = new THREE.Color(r, g, b)
  return `#${finalColor.getHexString()}`
}

/**
 * Apply gradual color transition to 3D model with timeline-based progression
 */
export function applyParameterColorTransition(
  object3D: THREE.Object3D,
  parameters: { parameter: string; value: number; weight?: number }[],
  transitionProgress: number = 0, // 0 = original color, 1 = full parameter color
  transitionSpeed: number = 0.08,
): void {
  const targetColorHex = createParameterColorTransition(parameters)
  const targetColor = new THREE.Color(targetColorHex)
  const effectiveProgress = Math.min(1, Math.max(0, transitionProgress))
  const easedProgress = Math.pow(effectiveProgress, 0.85)

  object3D.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const material = child.material

      if (material instanceof THREE.MeshStandardMaterial) {
        if (!child.userData.originalColor) {
          child.userData.originalColor = material.color.clone()
        }

        const originalColor = child.userData.originalColor.clone()
        // Use actual model color without glowing effect
        const tintedColor = originalColor.clone().lerp(targetColor, easedProgress)
        const currentColor = child.userData.currentTransitionColor || originalColor.clone()
        const newTint = currentColor.lerp(tintedColor, transitionSpeed)

        material.color.copy(newTint)
        // Remove glowing effect - set emissive to black
        material.emissive.set(0x000000)
        material.emissiveIntensity = 0
        child.userData.currentTransitionColor = newTint.clone()
        material.needsUpdate = true
      }
    }
  })
}

/**
 * Apply smooth color transition based on simulation timeline
 */
export function applyTimelineColorTransition(
  object3D: THREE.Object3D,
  timelineSnapshot: any,
  simulationProgress: number = 0 // 0 to 1
): void {
  if (!timelineSnapshot) return
  
  const parameters: { parameter: string; value: number; weight?: number }[] = []
  
  // Extract parameters from timeline snapshot
  if (typeof timelineSnapshot.trueHealth === "number") {
    parameters.push({ parameter: "trueHealth", value: timelineSnapshot.trueHealth, weight: 0.4 })
  }
  if (typeof timelineSnapshot.stressScore === "number") {
    parameters.push({ parameter: "stressScore", value: timelineSnapshot.stressScore, weight: 0.3 })
  }
  if (typeof timelineSnapshot.faultProbability === "number") {
    parameters.push({ parameter: "faultProbability", value: timelineSnapshot.faultProbability, weight: 0.2 })
  }
  if (typeof timelineSnapshot.agingFactor === "number") {
    parameters.push({ parameter: "agingFactor", value: timelineSnapshot.agingFactor, weight: 0.1 })
  }
  
  if (parameters.length > 0) {
    // Use simulation progress to control transition from original to parameter colors
    applyParameterColorTransition(object3D, parameters, Math.max(0.05, simulationProgress), 0.1)
  }
}

/**
 * Reset model to original colors
 */
export function resetModelColors(object3D: THREE.Object3D): void {
  object3D.traverse((child) => {
    if (child instanceof THREE.Mesh && child.userData.originalColor) {
      const material = child.material
      if (material instanceof THREE.MeshStandardMaterial) {
        material.color.copy(child.userData.originalColor)
        material.emissive.set(0x000000)
        material.emissiveIntensity = 0
        material.needsUpdate = true
        delete child.userData.currentTransitionColor
      }
    }
  })
}

/**
 * Get parameter display color for UI elements
 */
export function getParameterDisplayColor(parameter: string, value: number): string {
  // Similar to getParameterColor but optimized for UI display
  const color = getParameterColor(parameter, value)
  
  // Ensure good contrast for text display
  const colorObj = new THREE.Color(color)
  const brightness = (colorObj.r * 299 + colorObj.g * 587 + colorObj.b * 114) / 1000
  
  // If too bright, darken slightly for better visibility
  if (brightness > 0.8) {
    colorObj.multiplyScalar(0.8)
    return `#${colorObj.getHexString()}`
  }
  
  return color
}
