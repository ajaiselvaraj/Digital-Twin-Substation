// Transformer Fallback Model using Three.js
import * as THREE from "three"
import { getGlowColor } from "@/lib/live-trend/glow-utils"

const TANK_COLOR = 0x374151 // Darker Grey for main tank
const METAL_COLOR = 0x718096 // Standard Grey components
const DARK_METAL = 0x111827 // Very Dark Grey (almost black) for Core
const INSULATOR_COLOR = 0x8B4513 // Saddle Brown

interface TransformerMetrics {
  oilLevel: number
  oilTemp: number
  windingTemp: number
  oltcDeviation: number
  gasLevel: number
  busbarLoad?: number
}

function getOilLevelStatus(level: number): { color: string } {
  if (level > 70) return { color: "#0AB9FF" } // Blue
  if (level >= 50) return { color: "#FFB547" } // Amber
  if (level >= 30) return { color: "#FF8A2A" } // Orange
  return { color: "#FF376B" } // Red
}

function getOilTempStatus(temp: number): { color: string } {
  if (temp < 30) return { color: "#0AB9FF" } // Blue
  if (temp < 55) return { color: "#FFB547" } // Amber
  if (temp < 70) return { color: "#FF8A2A" } // Orange
  return { color: "#FF376B" } // Red
}

function getWindingTempStatus(temp: number): { color: string } {
  if (temp < 40) return { color: "#0AB9FF" } // Blue
  if (temp < 65) return { color: "#FFB547" } // Amber
  if (temp < 80) return { color: "#FF8A2A" } // Orange
  return { color: "#FF376B" } // Red
}

function getOLTCStatus(deviation: number): { color: string } {
  const absDev = Math.abs(deviation)
  if (absDev <= 4) return { color: "#0AB9FF" } // Blue
  if (absDev <= 8) return { color: "#FFB547" } // Amber
  return { color: "#FF8A2A" } // Orange
}

function getGasLevelStatus(level: number): { color: string } {
  if (level < 100) return { color: "#0AB9FF" } // Blue
  if (level < 300) return { color: "#FFB547" } // Amber
  if (level < 700) return { color: "#FF8A2A" } // Orange
  return { color: "#FF376B" } // Red
}

function getBusbarStatus(load?: number): { color: string } {
  if (!load) return { color: "#0AB9FF" }
  if (load < 60) return { color: "#0AB9FF" } // Blue
  if (load < 80) return { color: "#FFB547" } // Amber
  if (load <= 100) return { color: "#FF8A2A" } // Orange
  return { color: "#FF376B" } // Red
}

function createRadiator(
  position: [number, number, number],
  tempColor: string,
  isActive: boolean,
  orientation: "left" | "right" | "back" = "left",
): THREE.Group {
  const group = new THREE.Group()
  group.position.set(...position)

  const panels = 6
  const panelSpacing = 0.18
  const panelWidth = 0.8
  const panelHeight = 2.0
  const headerRadius = 0.1

  // Top Header Pipe
  const topHeader = new THREE.Mesh(
    new THREE.CylinderGeometry(headerRadius, headerRadius, panels * panelSpacing + 0.2, 16),
    new THREE.MeshStandardMaterial({ color: METAL_COLOR })
  )
  topHeader.rotation.x = Math.PI / 2
  topHeader.position.set(0, panelHeight / 2 + 0.1, 0)
  group.add(topHeader)

  // Bottom Header Pipe
  const bottomHeader = new THREE.Mesh(
    new THREE.CylinderGeometry(headerRadius, headerRadius, panels * panelSpacing + 0.2, 16),
    new THREE.MeshStandardMaterial({ color: METAL_COLOR })
  )
  bottomHeader.rotation.x = Math.PI / 2
  bottomHeader.position.set(0, -panelHeight / 2 - 0.1, 0)
  group.add(bottomHeader)

  // Vertical Panels
  for (let i = 0; i < panels; i++) {
    const zPos = (i - (panels - 1) / 2) * panelSpacing
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(panelWidth, panelHeight, 0.05),
      new THREE.MeshStandardMaterial({
        color: METAL_COLOR,
        emissive: new THREE.Color(tempColor),
        emissiveIntensity: isActive ? 0.4 : 0.1,
        roughness: 0.5,
      })
    )
    panel.position.set(0, 0, zPos)
    panel.castShadow = true
    panel.receiveShadow = true
    group.add(panel)
  }

  // Connection Pipes to Main Tank
  const topPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.6),
    new THREE.MeshStandardMaterial({ color: METAL_COLOR })
  )
  topPipe.rotation.z = Math.PI / 2
  topPipe.position.set(orientation === "left" ? 0.5 : -0.5, panelHeight / 2 - 0.2, 0)
  group.add(topPipe)

  const bottomPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.6),
    new THREE.MeshStandardMaterial({ color: METAL_COLOR })
  )
  bottomPipe.rotation.z = Math.PI / 2
  bottomPipe.position.set(orientation === "left" ? 0.5 : -0.5, -panelHeight / 2 + 0.2, 0)
  group.add(bottomPipe)

  return group
}

function createBushing(position: [number, number, number], scale: number, color: string): THREE.Group {
  const group = new THREE.Group()
  group.position.set(...position)
  group.scale.set(scale, scale, scale)

  // Main Bushing Cylinder
  const bushing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.15, 1.6, 16),
    new THREE.MeshStandardMaterial({ color: INSULATOR_COLOR })
  )
  bushing.position.set(0, 0.8, 0)
  group.add(bushing)

  // Rings
  const ringPositions = [0.4, 0.7, 1.0, 1.3]
  ringPositions.forEach((y) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.04, 8, 24),
      new THREE.MeshStandardMaterial({ color: INSULATOR_COLOR })
    )
    ring.rotation.x = Math.PI / 2
    ring.position.set(0, y, 0)
    group.add(ring)
  })

  // Terminal Tip
  const terminal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xc0c0c0 })
  )
  terminal.position.set(0, 1.7, 0)
  group.add(terminal)

  // Base connection
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  )
  base.position.set(0, 0.1, 0)
  group.add(base)

  return group
}

function createCoreAndWindings(tempColor: string, tempValue: number): THREE.Group {
  const group = new THREE.Group()
  group.position.set(0, 1.5, 0)

  // Calculate Glow Intensity
  let intensity = 0.5
  let coreIntensity = 0.2
  if (tempValue > 110) {
    intensity = 2.5
    coreIntensity = 1.0
  } else if (tempValue > 90) {
    intensity = 1.2
    coreIntensity = 0.5
  }

  // Core - Stacked Boxes
  const core = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 3.2, 1.4),
    new THREE.MeshStandardMaterial({
      color: DARK_METAL,
      emissive: new THREE.Color(tempColor),
      emissiveIntensity: coreIntensity,
      roughness: 0.7,
    })
  )
  group.add(core)

  // Windings - Cylinders
  const windingColor = 0xb87333
  const leftWinding = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 2.6, 32),
    new THREE.MeshStandardMaterial({
      color: windingColor,
      emissive: new THREE.Color(tempColor),
      emissiveIntensity: intensity,
    })
  )
  leftWinding.position.set(-0.8, 0, 0)
  group.add(leftWinding)

  const rightWinding = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 2.6, 32),
    new THREE.MeshStandardMaterial({
      color: windingColor,
      emissive: new THREE.Color(tempColor),
      emissiveIntensity: intensity,
    })
  )
  rightWinding.position.set(0.8, 0, 0)
  group.add(rightWinding)

  return group
}

function createConservator(oilLevelStatus: { color: string }, highlightColor?: string): THREE.Group {
  const group = new THREE.Group()
  group.position.set(0, 3.6, 1.0)

  // Supports
  const leftSupport = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.8, 0.1),
    new THREE.MeshStandardMaterial({ color: METAL_COLOR })
  )
  leftSupport.position.set(0.8, -0.6, 0)
  group.add(leftSupport)

  const rightSupport = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.8, 0.1),
    new THREE.MeshStandardMaterial({ color: METAL_COLOR })
  )
  rightSupport.position.set(-0.8, -0.6, 0)
  group.add(rightSupport)

  // Main Tank Cylinder
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 2.8, 32),
    new THREE.MeshStandardMaterial({ color: METAL_COLOR })
  )
  tank.rotation.z = Math.PI / 2
  group.add(tank)

  // End Caps
  const leftCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: METAL_COLOR })
  )
  leftCap.rotation.z = -Math.PI / 2
  leftCap.position.set(1.4, 0, 0)
  group.add(leftCap)

  const rightCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: METAL_COLOR })
  )
  rightCap.rotation.z = Math.PI / 2
  rightCap.position.set(-1.4, 0, 0)
  group.add(rightCap)

  // Oil Level Gauge
  const gaugeGroup = new THREE.Group()
  gaugeGroup.position.set(0.5, 0, 0.5)

  const gaugeBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xeeeeee })
  )
  gaugeBase.rotation.x = Math.PI / 2
  gaugeGroup.add(gaugeBase)

  const gaugeColor = highlightColor ? new THREE.Color(highlightColor) : new THREE.Color(oilLevelStatus.color)
  const gaugeLevel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.05),
    new THREE.MeshStandardMaterial({
      color: gaugeColor,
      emissive: gaugeColor,
      emissiveIntensity: 1.2,
    }),
  )
  gaugeLevel.rotation.x = Math.PI / 2
  gaugeLevel.position.set(0, 0, 0.06)
  gaugeGroup.add(gaugeLevel)

  group.add(gaugeGroup)

  return group
}

function createOLTC(deviation: number): THREE.Group {
  const group = new THREE.Group()
  group.position.set(2.2, 1.5, 0)

  const status = getOLTCStatus(deviation)
  const rotationZ = (deviation / 10) * (Math.PI / 2)

  // OLTC Box
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 2, 1.2),
    new THREE.MeshStandardMaterial({ color: METAL_COLOR })
  )
  group.add(box)

  // Dial Face
  const dial = new THREE.Mesh(
    new THREE.CircleGeometry(0.35, 32),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  )
  dial.rotation.y = Math.PI / 2
  dial.position.set(0.41, 0.5, 0)
  group.add(dial)

  // Indicator Needle
  const needle = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.3, 0.02),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(status.color) })
  )
  needle.rotation.z = -rotationZ
  needle.position.set(0.42, 0.5, 0)
  group.add(needle)

  // Connection to main tank
  const connection = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.8, 0.8),
    new THREE.MeshStandardMaterial({ color: DARK_METAL })
  )
  connection.position.set(-0.5, 0, 0)
  group.add(connection)

  return group
}

function createDiagnosticBox(gasLevel: number): THREE.Group {
  const group = new THREE.Group()
  group.position.set(-2.2, 0.8, 1.2)

  const status = getGasLevelStatus(gasLevel)
  let intensity = 1.5
  if (gasLevel > 300) intensity = 3.0

  // Mounting bracket
  const bracket = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  )
  bracket.position.set(0.2, 0, 0)
  group.add(bracket)

  // Main Housing
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.8, 0.6),
    new THREE.MeshStandardMaterial({ color: METAL_COLOR })
  )
  housing.position.set(-0.1, 0, 0)
  group.add(housing)

  // Glowing Indicator Screen
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.3, 0.4),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(status.color),
      emissive: new THREE.Color(status.color),
      emissiveIntensity: intensity,
    })
  )
  screen.position.set(-0.31, 0.1, 0)
  group.add(screen)

  // Label
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
  )
  label.rotation.y = -Math.PI / 2
  label.position.set(-0.31, -0.2, 0)
  group.add(label)

  return group
}

export function createTransformerFallbackModel(
  glowData: Record<string, number | string> = {},
  showGlow: boolean = false
): THREE.Group {
  const group = new THREE.Group()

  // Extract metrics from glowData or use defaults
  // Map various possible field names to expected metrics
  const metrics: TransformerMetrics = {
    oilLevel: (glowData.oilLevel as number) || 80,
    oilTemp: (glowData.oilTemperature as number) || 65,
    windingTemp: (glowData.windingTemperature as number) || 75,
    oltcDeviation: Math.abs((glowData.oltcDeviation as number) || (glowData.tapPosition as number) || 0),
    gasLevel: (glowData.hydrogenPPM as number) || (glowData.gasLevel as number) || 100,
    busbarLoad: (glowData.transformerLoading as number) || (glowData.busbarLoad as number) || 85,
  }

  const oilLevelStatus = getOilLevelStatus(metrics.oilLevel)
  const oilTempStatus = getOilTempStatus(metrics.oilTemp)
  const windingTempStatus = getWindingTempStatus(metrics.windingTemp)
  const busbarStatus = getBusbarStatus(metrics.busbarLoad)
  const fansActive = metrics.oilTemp > 85

  const trueHealthValue = typeof glowData.trueHealth === "number" ? Number(glowData.trueHealth) : 100
  const stressScoreValue = typeof glowData.stressScore === "number" ? Number(glowData.stressScore) : 0
  const faultProbabilityValue =
    typeof glowData.faultProbability === "number" ? Number(glowData.faultProbability) : 0
  const agingFactorValue = typeof glowData.agingFactor === "number" ? Number(glowData.agingFactor) : 100

  const trueHealthColor = getGlowColor("trueHealth", trueHealthValue) ?? windingTempStatus.color
  const stressColor = getGlowColor("stressScore", stressScoreValue) ?? oilTempStatus.color
  const faultColor = getGlowColor("faultProbability", faultProbabilityValue) ?? busbarStatus.color
  const agingColor = getGlowColor("agingFactor", agingFactorValue) ?? oilLevelStatus.color

  // Determine tank glow intensity
  let tankGlowIntensity = 0.2
  if (metrics.windingTemp > 110) tankGlowIntensity = 0.8
  else if (metrics.windingTemp > 90) tankGlowIntensity = 0.5

  // Main Tank Body
  const mainTank = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 3.5, 2.5),
    new THREE.MeshStandardMaterial({
      color: TANK_COLOR,
      transparent: true,
      opacity: 0.6,
      roughness: 0.3,
      metalness: 0.6,
      emissive: new THREE.Color(trueHealthColor),
      emissiveIntensity: showGlow ? tankGlowIntensity : 0,
      depthWrite: false,
    }),
  )
  mainTank.position.set(0, 1.75, 0)
  mainTank.castShadow = true
  mainTank.receiveShadow = true
  group.add(mainTank)

  // Internal Core & Windings
  const coreAndWindings = createCoreAndWindings(stressColor, metrics.windingTemp)
  group.add(coreAndWindings)

  // Conservator Tank
  const conservator = createConservator(oilLevelStatus, agingColor)
  group.add(conservator)

  // Radiators - Left Bank
  const leftRadiator1 = createRadiator(
    [-2.1, 1.75, 0.8],
    stressColor,
    fansActive,
    "left",
  )
  group.add(leftRadiator1)

  const leftRadiator2 = createRadiator(
    [-2.1, 1.75, -0.8],
    stressColor,
    fansActive,
    "left",
  )
  group.add(leftRadiator2)

  // Radiators - Right Bank
  const rightRadiator = createRadiator(
    [2.1, 1.75, -0.8],
    stressColor,
    fansActive,
    "right",
  )
  group.add(rightRadiator)

  // HV Terminals (Tall)
  const hvTerminal1 = createBushing([-1, 3.5, 0], 1, faultColor)
  group.add(hvTerminal1)

  const hvTerminal2 = createBushing([0, 3.5, 0], 1, faultColor)
  group.add(hvTerminal2)

  const hvTerminal3 = createBushing([1, 3.5, 0], 1, faultColor)
  group.add(hvTerminal3)

  // LV Terminals (Short)
  const lvTerminal1 = createBushing([-0.8, 3.5, 1.5], 0.6, faultColor)
  group.add(lvTerminal1)

  const lvTerminal2 = createBushing([0, 3.5, 1.5], 0.6, faultColor)
  group.add(lvTerminal2)

  const lvTerminal3 = createBushing([0.8, 3.5, 1.5], 0.6, faultColor)
  group.add(lvTerminal3)

  // OLTC Tap Changer
  const oltc = createOLTC(metrics.oltcDeviation)
  group.add(oltc)

  // Gas Monitor Box
  const diagnosticBox = createDiagnosticBox(metrics.gasLevel)
  group.add(diagnosticBox)

  return group
}

