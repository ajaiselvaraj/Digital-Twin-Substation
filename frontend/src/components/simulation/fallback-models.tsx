"use client"

import * as THREE from "three"
import { applyGlow, getGlowColor } from "@/lib/live-trend/glow-utils"
import { createTransformerFallbackModel } from "./transformer-fallback-model"
import { createSubstationFallbackModel } from "./substation-fallback-model"
import { createBayLinesFallbackModel } from "./bay-lines-fallback-model"

export function createFallbackModel(
  componentType: "transformer" | "bayLines" | "circuitBreaker" | "isolator" | "busbar" | "substation",
  glowData: Record<string, number | string> = {},
  showGlow: boolean = false
): THREE.Group {
  const group = new THREE.Group()

  switch (componentType) {
    case "transformer":
      createTransformerModel(group, glowData, showGlow)
      break
    case "bayLines": {
      const bayLines = createBayLinesFallbackModel(glowData, showGlow)
      group.add(bayLines)
      break
    }
    case "circuitBreaker":
      createCircuitBreakerModel(group, glowData, showGlow)
      break
    case "isolator":
      createIsolatorModel(group, glowData, showGlow)
      break
    case "busbar":
      createBusbarModel(group, glowData, showGlow)
      break
    case "substation":
      // Use the detailed substation fallback built in a dedicated module
      const substation = createSubstationFallbackModel()
      group.add(substation)
      break
  }

  return group
}

function createTransformerModel(
  group: THREE.Group,
  glowData: Record<string, number | string>,
  showGlow: boolean
) {
  // Use the detailed transformer model
  const transformerModel = createTransformerFallbackModel(glowData, showGlow)
  group.add(transformerModel)
}

function createCircuitBreakerModel(
  group: THREE.Group,
  glowData: Record<string, number | string>,
  showGlow: boolean
) {
  // Chamber (box)
  const chamberGeometry = new THREE.BoxGeometry(1.5, 2, 1.5)
  const chamberMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3a3a })
  const chamber = new THREE.Mesh(chamberGeometry, chamberMaterial)
  chamber.position.set(0, 1, 0)
  group.add(chamber)

  // SF6 tank (cylinder)
  const tankGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1.5, 16)
  const tankMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
  const tank = new THREE.Mesh(tankGeometry, tankMaterial)
  tank.position.set(0, 2.5, 0)
  group.add(tank)

  // Linkage mechanism (small boxes)
  const linkageGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2)
  const linkageMaterial = new THREE.MeshStandardMaterial({ color: 0x5a5a5a })
  for (let i = 0; i < 3; i++) {
    const linkage = new THREE.Mesh(linkageGeometry, linkageMaterial.clone())
    linkage.position.set(-0.6 + i * 0.6, 0.5, 0)
    group.add(linkage)
  }

  // Breaker arm (for animation)
  const armGeometry = new THREE.BoxGeometry(0.3, 1.5, 0.3)
  const armMaterial = new THREE.MeshStandardMaterial({ color: 0x6a6a6a })
  const arm = new THREE.Mesh(armGeometry, armMaterial)
  arm.position.set(0, 0.75, 0.8)
  arm.rotation.x = -0.3
  group.add(arm)
  group.userData.breakerArm = arm

  if (showGlow && Object.keys(glowData).length > 0) {
    Object.entries(glowData).forEach(([key, value]) => {
      const glowColor = getGlowColor(key, value)
      if (glowColor) {
        applyGlow(group, glowColor)
      }
    })
  }
}

function createIsolatorModel(
  group: THREE.Group,
  glowData: Record<string, number | string>,
  showGlow: boolean
) {
  // Vertical column (cylinders)
  const columnGeometry = new THREE.CylinderGeometry(0.2, 0.2, 3, 16)
  const columnMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a })
  const column = new THREE.Mesh(columnGeometry, columnMaterial)
  column.position.set(0, 1.5, 0)
  group.add(column)

  // Switch blade (rotating box)
  const bladeGeometry = new THREE.BoxGeometry(0.1, 1.5, 0.3)
  const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0x6a6a6a })
  const blade = new THREE.Mesh(bladeGeometry, bladeMaterial)
  blade.position.set(0, 2.5, 0.2)
  blade.rotation.z = -0.5
  group.add(blade)
  group.userData.switchBlade = blade

  // Base
  const baseGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16)
  const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3a3a })
  const base = new THREE.Mesh(baseGeometry, baseMaterial)
  base.position.set(0, 0.1, 0)
  group.add(base)

  // Status-based glow
  if (showGlow && glowData.status) {
    const status = String(glowData.status).toUpperCase()
    const glowColor = status === "OPEN" ? "#808080" : "#00FF00"
    applyGlow(group, glowColor)
  }
}

function createBusbarModel(
  group: THREE.Group,
  glowData: Record<string, number | string>,
  showGlow: boolean
) {
  // Conductor (long cylinder)
  const conductorGeometry = new THREE.CylinderGeometry(0.15, 0.15, 6, 16)
  const conductorMaterial = new THREE.MeshStandardMaterial({ color: 0x8a8a8a })
  const conductor = new THREE.Mesh(conductorGeometry, conductorMaterial)
  conductor.position.set(0, 2, 0)
  conductor.rotation.z = Math.PI / 2
  group.add(conductor)

  // Joints (spheres)
  const jointGeometry = new THREE.SphereGeometry(0.25, 16, 16)
  const jointMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
  for (let i = 0; i < 3; i++) {
    const joint = new THREE.Mesh(jointGeometry, jointMaterial.clone())
    joint.position.set(-2 + i * 2, 2, 0)
    group.add(joint)
  }

  // Supports (boxes)
  const supportGeometry = new THREE.BoxGeometry(0.3, 1.5, 0.3)
  const supportMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a })
  for (let i = 0; i < 3; i++) {
    const support = new THREE.Mesh(supportGeometry, supportMaterial.clone())
    support.position.set(-2 + i * 2, 0.75, 0)
    group.add(support)
  }

  if (showGlow && Object.keys(glowData).length > 0) {
    Object.entries(glowData).forEach(([key, value]) => {
      const glowColor = getGlowColor(key, value)
      if (glowColor) {
        applyGlow(group, glowColor)
      }
    })
  }
}


