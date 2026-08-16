/**
 * Color coding utilities for simulation results
 * Provides consistent color schemes for fault probability, health, and combined fault probability
 */

/**
 * Get color for Fault Probability (0-100%)
 * Higher values indicate higher risk
 */
export function getFaultProbabilityColor(value: number): string {
  if (value >= 0 && value <= 20) {
    return "#22C55E" // 🟢 Green - Very Low Fault Risk
  }
  if (value >= 21 && value <= 40) {
    return "#86EFAC" // 🍏 Light Green - Low Risk
  }
  if (value >= 41 && value <= 60) {
    return "#FACC15" // 🟡 Yellow - Moderate Risk
  }
  if (value >= 61 && value <= 80) {
    return "#FB923C" // 🟠 Orange - High Risk
  }
  if (value >= 81 && value <= 100) {
    return "#EF4444" // 🔴 Red - Critical / Imminent Fault
  }
  // Default fallback
  return "#22C55E"
}

/**
 * Get color for Overall Health (0-100%)
 * Higher values indicate better health
 */
export function getOverallHealthColor(value: number): string {
  if (value >= 81 && value <= 100) {
    return "#22C55E" // 🟢 Green - Excellent
  }
  if (value >= 61 && value <= 80) {
    return "#4ADE80" // 💚 Soft Green - Good
  }
  if (value >= 41 && value <= 60) {
    return "#EAB308" // 🟡 Yellow - Moderate Health
  }
  if (value >= 21 && value <= 40) {
    return "#F97316" // 🟠 Orange - Poor Health
  }
  if (value >= 0 && value <= 20) {
    return "#DC2626" // 🔴 Red - Critical Condition
  }
  // Default fallback
  return "#22C55E"
}

/**
 * Get color for Combined Fault Probability (0-1.0)
 * Uses a more intense palette for risk severity
 */
export function getCombinedFaultProbabilityColor(value: number): string {
  if (value >= 0 && value <= 0.25) {
    return "#10B981" // 🟢 Emerald Green - Safe
  }
  if (value >= 0.26 && value <= 0.50) {
    return "#F59E0B" // 🟡 Amber - Caution
  }
  if (value >= 0.51 && value <= 0.75) {
    return "#F97316" // 🟠 Deep Orange - Danger
  }
  if (value >= 0.76 && value <= 1.0) {
    return "#B91C1C" // 🔴 Deep Red - Critical Failure Expected
  }
  // Default fallback
  return "#10B981"
}

/**
 * Get Tailwind CSS class for Fault Probability (0-100%)
 * Returns text color class
 */
export function getFaultProbabilityTextClass(value: number): string {
  if (value >= 0 && value <= 20) {
    return "text-green-600" // Very Low Fault Risk
  }
  if (value >= 21 && value <= 40) {
    return "text-green-500" // Low Risk
  }
  if (value >= 41 && value <= 60) {
    return "text-yellow-600" // Moderate Risk
  }
  if (value >= 61 && value <= 80) {
    return "text-orange-600" // High Risk
  }
  if (value >= 81 && value <= 100) {
    return "text-red-600" // Critical / Imminent Fault
  }
  return "text-green-600"
}

/**
 * Get Tailwind CSS class for Overall Health (0-100%)
 * Returns text color class
 */
export function getOverallHealthTextClass(value: number): string {
  if (value >= 81 && value <= 100) {
    return "text-green-600" // Excellent
  }
  if (value >= 61 && value <= 80) {
    return "text-green-500" // Good
  }
  if (value >= 41 && value <= 60) {
    return "text-yellow-600" // Moderate Health
  }
  if (value >= 21 && value <= 40) {
    return "text-orange-600" // Poor Health
  }
  if (value >= 0 && value <= 20) {
    return "text-red-600" // Critical Condition
  }
  return "text-green-600"
}

/**
 * Get Tailwind CSS class for Combined Fault Probability (0-1.0)
 * Returns text color class
 */
export function getCombinedFaultProbabilityTextClass(value: number): string {
  if (value >= 0 && value <= 0.25) {
    return "text-emerald-600" // Safe
  }
  if (value >= 0.26 && value <= 0.50) {
    return "text-amber-600" // Caution
  }
  if (value >= 0.51 && value <= 0.75) {
    return "text-orange-600" // Danger
  }
  if (value >= 0.76 && value <= 1.0) {
    return "text-red-700" // Critical Failure Expected
  }
  return "text-emerald-600"
}

/**
 * Get inline style object with color for Fault Probability
 */
export function getFaultProbabilityStyle(value: number): { color: string } {
  return { color: getFaultProbabilityColor(value) }
}

/**
 * Get inline style object with color for Overall Health
 */
export function getOverallHealthStyle(value: number): { color: string } {
  return { color: getOverallHealthColor(value) }
}

/**
 * Get inline style object with color for Combined Fault Probability
 */
export function getCombinedFaultProbabilityStyle(value: number): { color: string } {
  return { color: getCombinedFaultProbabilityColor(value) }
}

