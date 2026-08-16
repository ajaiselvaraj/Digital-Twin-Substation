// Three.js glow effect utilities
import * as THREE from "three"

/**
 * Apply glow effect to a 3D object
 * @param object3D - The Three.js object to apply glow to
 * @param colorHex - Hex color string (e.g., "#0AB9FF")
 */
export function applyGlow(object3D: THREE.Object3D, colorHex: string): void {
  // Remove existing glow if present
  removeGlow(object3D)

  const color = new THREE.Color(colorHex)

  // Add emissive material to object
  object3D.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const originalMaterial = child.material
      if (originalMaterial instanceof THREE.MeshStandardMaterial) {
        originalMaterial.emissive = color
        originalMaterial.emissiveIntensity = 0.5
      } else if (originalMaterial instanceof THREE.MeshBasicMaterial) {
        // Convert to MeshStandardMaterial for emissive support
        const newMaterial = new THREE.MeshStandardMaterial({
          color: originalMaterial.color,
          map: originalMaterial.map,
          transparent: originalMaterial.transparent,
          opacity: originalMaterial.opacity,
          emissive: color,
          emissiveIntensity: 0.5,
        })
        child.material = newMaterial
      }
      child.userData.originalMaterial = originalMaterial
      child.userData.hasGlow = true
    }
  })

  // Store glow color
  object3D.userData.glowColor = colorHex
}

/**
 * Remove glow effect from a 3D object
 * @param object3D - The Three.js object to remove glow from
 */
export function removeGlow(object3D: THREE.Object3D): void {
  // Remove emissive material
  object3D.traverse((child) => {
    if (child instanceof THREE.Mesh && child.userData.hasGlow) {
      if (child.userData.originalMaterial) {
        child.material = child.userData.originalMaterial
      } else if (child.material instanceof THREE.MeshStandardMaterial) {
        child.material.emissive = new THREE.Color(0x000000)
        child.material.emissiveIntensity = 0
      }
      delete child.userData.hasGlow
      delete child.userData.originalMaterial
    }
  })

  // Remove glow light reference
  if (object3D.userData.glowLight) {
    delete object3D.userData.glowLight
  }
  delete object3D.glowColor
}

/**
 * Get glow color based on parameter value and rules
 */
export function getGlowColor(
  parameter: string,
  value: number | string
): string | null {
  const numValue = typeof value === "string" ? parseFloat(value) : value

  switch (parameter) {
    // Transformer Parameters
    case "oilLevel":
      if (numValue < 60) return "#FF8A2A" // Orange (critical)
      if (numValue >= 60 && numValue <= 100) return "#0AB9FF" // Blue (normal range, not critical)
      if (numValue > 100) return "#FF376B" // Red
      return "#0AB9FF" // Default to blue

    case "oilTemperature":
      if (numValue < 30) return "#0AB9FF" // Blue
      if (numValue < 55) return "#FFB547" // Amber
      if (numValue < 70) return "#FF8A2A" // Orange
      return "#FF376B" // Red

    case "gasLevel":
      if (numValue < 100) return "#0AB9FF" // Blue
      if (numValue < 300) return "#FFB547" // Amber
      if (numValue < 700) return "#FF8A2A" // Orange
      return "#FF376B" // Red

    case "windingTemperature":
      if (numValue < 40) return "#0AB9FF" // Blue
      if (numValue < 65) return "#FFB547" // Amber
      if (numValue < 80) return "#FF8A2A" // Orange
      return "#FF376B" // Red

    case "tapPosition":
      // Critical: >17 or <0 (values between 0-17 are normal, not critical)
      if (numValue > 17 || numValue < 0) return "#FF8A2A" // Orange (critical)
      if (numValue >= 0 && numValue <= 17) return "#0AB9FF" // Blue (normal range, not critical)
      return "#0AB9FF" // Default to blue

    // Busbar Parameters
    case "busbarLoad":
      if (numValue < 60) return "#0AB9FF" // Blue
      if (numValue < 80) return "#FFB547" // Amber
      if (numValue <= 100) return "#FF8A2A" // Orange
      return "#FF376B" // Red

    case "busbarTemperature":
      if (numValue < 40) return "#0AB9FF" // Blue
      if (numValue < 65) return "#FFB547" // Amber
      if (numValue < 80) return "#FF8A2A" // Orange
      return "#FF376B" // Red

    // Bays Parameters
    case "ctLoading":
      if (numValue < 60) return "#0AB9FF" // Blue
      if (numValue < 80) return "#FFB547" // Amber
      if (numValue <= 100) return "#FF8A2A" // Orange
      return "#FF376B" // Red

    case "ptVoltageDeviation":
      if (numValue >= 95 && numValue <= 105) return "#0AB9FF" // Blue
      if ((numValue >= 90 && numValue < 95) || (numValue > 105 && numValue <= 110))
        return "#FFB547" // Amber
      if ((numValue >= 85 && numValue < 90) || (numValue > 110 && numValue <= 115))
        return "#FF8A2A" // Orange
      return "#FF376B" // Red

    case "frequency":
      if (numValue >= 49.9 && numValue <= 50.05) return "#0AB9FF" // Blue
      if (
        (numValue >= 49.7 && numValue < 49.9) ||
        (numValue > 50.05 && numValue <= 50.3)
      )
        return "#FFB547" // Amber
      if (
        (numValue >= 49.5 && numValue < 49.7) ||
        (numValue > 50.3 && numValue <= 50.5)
      )
        return "#FF8A2A" // Orange
      return "#FF376B" // Red

    case "powerFactor":
      if (numValue >= 0.98 && numValue <= 1.0) return "#0AB9FF" // Blue
      if (numValue >= 0.95 && numValue < 0.98) return "#FFB547" // Amber
      if (numValue >= 0.9 && numValue < 0.95) return "#FF8A2A" // Orange
      return "#FF376B" // Red

    // Circuit Breaker Parameters
    case "sf6Density":
      if (numValue >= 90) return "#0AB9FF" // Blue
      if (numValue >= 80) return "#FFB547" // Amber
      if (numValue >= 70) return "#FF8A2A" // Orange
      return "#FF376B" // Red

    case "operationCount":
      const maxOps = 10000 // Assuming max operations
      const percent = (numValue / maxOps) * 100
      if (percent < 50) return "#0AB9FF" // Blue
      if (percent < 75) return "#FFB547" // Amber
      if (percent < 95) return "#FF8A2A" // Orange
      return "#FF376B" // Red

    // Isolator
    case "isolatorStatus":
      if (value === "Open" || value === "open") return "#808080" // Gray
      return "#00FF00" // Green

    // New simulation parameters
    case "trueHealth":
      // Green (100%) -> Yellow (70%) -> Orange (40%) -> Red (0%)
      if (numValue >= 80) return "#10b981" // Green
      if (numValue >= 60) return "#f59e0b" // Yellow
      if (numValue >= 40) return "#f97316" // Orange
      if (numValue >= 20) return "#ef4444" // Red
      return "#dc2626" // Dark Red

    case "stressScore":
      // Blue (0%) -> Yellow (30%) -> Orange (60%) -> Red (100%)
      if (numValue <= 20) return "#3b82f6" // Blue
      if (numValue <= 40) return "#06b6d4" // Cyan
      if (numValue <= 60) return "#f59e0b" // Yellow
      if (numValue <= 80) return "#f97316" // Orange
      return "#ef4444" // Red

    case "faultProbability":
      // Green (0%) -> Yellow (25%) -> Orange (50%) -> Red (100%)
      if (numValue <= 15) return "#10b981" // Green
      if (numValue <= 35) return "#84cc16" // Light Green
      if (numValue <= 55) return "#f59e0b" // Yellow
      if (numValue <= 75) return "#f97316" // Orange
      return "#ef4444" // Red

    case "agingFactor":
      // Bright (100%) -> Dim (0%)
      if (numValue >= 80) return "#f8fafc" // White/Bright
      if (numValue >= 60) return "#cbd5e1" // Light Gray
      if (numValue >= 40) return "#94a3b8" // Gray
      if (numValue >= 20) return "#64748b" // Dark Gray
      return "#374151" // Very Dark Gray

    default:
      return null
  }
}

