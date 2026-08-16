"use client"

import * as THREE from "three"
import { applyGlow, getGlowColor } from "@/lib/live-trend/glow-utils"

/**
 * Bay lines fallback model mirroring the richer R3F design (disconnects + breaker per phase).
 * Free-suspended (no ground plane). Uses the darker material palette for consistency.
 */
export function createBayLinesFallbackModel(
  glowData: Record<string, number | string> = {},
  showGlow = false
): THREE.Group {
  const group = new THREE.Group()

  // Palette aligned with current substation fallback
  const matSteel = new THREE.MeshStandardMaterial({
    color: 0x7a8b95,
    roughness: 0.55,
    metalness: 0.4,
  })
  const matSteelPaint = new THREE.MeshStandardMaterial({
    color: 0x44555d,
    roughness: 0.45,
    metalness: 0.22,
  })
  const matInsGrey = new THREE.MeshStandardMaterial({
    color: 0xb5c2c7,
    roughness: 0.45,
    metalness: 0.1,
  })
  const matConductor = new THREE.MeshStandardMaterial({
    color: 0xc8c8c8,
    roughness: 0.5,
    metalness: 0.55,
  })
  const matDark = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.2 })

  // Helpers
  const createInsulator = (height = 1.8, ribs = 12, radius = 0.12) => {
    const g = new THREE.Group()
    const ribRadius = radius * 1.8
    const ribHeight = height / ribs / 2
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 16), matInsGrey)
    g.add(rod)
    for (let i = 0; i < ribs; i++) {
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(ribRadius, radius, ribHeight, 16), matInsGrey)
      rib.position.set(0, -height / 2 + (height / ribs) * i + height / ribs / 2, 0)
      g.add(rib)
    }
    const capTop = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.8, radius * 0.8, 0.1, 16), matDark)
    capTop.position.y = height / 2 + 0.05
    const capBottom = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.2, radius * 1.2, 0.1, 16), matDark)
    capBottom.position.y = -height / 2 - 0.05
    g.add(capTop, capBottom)
    return g
  }

  const createSteelColumn = (height: number, thickness = 0.2) => {
    const g = new THREE.Group()
    const col = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, thickness), matSteel)
    col.position.y = height / 2
    g.add(col)
    const footer = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.5), matSteelPaint)
    footer.position.y = 0.1
    g.add(footer)
    return g
  }

  const createSteelTable = (width: number, length: number, height: number) => {
    const g = new THREE.Group()
    const t = 0.15
    const halfW = width / 2
    const halfL = length / 2
    const leg = (x: number, z: number) => {
      const l = createSteelColumn(height, t)
      l.position.set(x, 0, z)
      g.add(l)
    }
    leg(-halfW, -halfL)
    leg(halfW, -halfL)
    leg(-halfW, halfL)
    leg(halfW, halfL)
    const addBeam = (pos: THREE.Vector3, size: [number, number, number]) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(...size), matSteel)
      beam.position.copy(pos)
      g.add(beam)
    }
    // top frame
    addBeam(new THREE.Vector3(-halfW, height, 0), [t, t, length])
    addBeam(new THREE.Vector3(halfW, height, 0), [t, t, length])
    addBeam(new THREE.Vector3(0, height, -halfL), [width, t, t])
    addBeam(new THREE.Vector3(0, height, halfL), [width, t, t])
    addBeam(new THREE.Vector3(0, height, 0), [width, t * 0.8, t * 0.8])
    return g
  }

  const createWire = (start: THREE.Vector3, end: THREE.Vector3, slack = 1.0) => {
    const mid = start.clone().add(end).multiplyScalar(0.5)
    mid.y -= slack
    const curve = new THREE.CatmullRomCurve3([start, mid, end])
    const geom = new THREE.TubeGeometry(curve, 32, 0.03, 8, false)
    return new THREE.Mesh(geom, matConductor)
  }

  const createDisconnectUnit = (position: THREE.Vector3) => {
    const g = new THREE.Group()
    g.position.copy(position)
    const tableHeight = 2.5
    const tableWidth = 1.5
    const tableLength = 2.5
    const insHeight = 1.8
    const insSpacing = 1.5

    const table = createSteelTable(tableWidth, tableLength, tableHeight)
    g.add(table)

    const baseBox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 2.0), matDark)
    baseBox.position.y = tableHeight + 0.1
    g.add(baseBox)

    const makeStack = (zOffset: number, armDir: number) => {
      const stack = new THREE.Group()
      stack.position.set(0, tableHeight + 0.15 + insHeight / 2, zOffset)
      const ins = createInsulator(insHeight, 12, 0.1)
      stack.add(ins)
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), matSteelPaint)
      head.position.y = insHeight / 2 + 0.1
      stack.add(head)
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8), matConductor)
      arm.rotation.x = armDir * Math.PI / 4
      arm.position.set(0, insHeight / 2 + 0.6, armDir * 0.3)
      stack.add(arm)
      return stack
    }

    g.add(makeStack(-insSpacing / 2, 1))
    g.add(makeStack(insSpacing / 2, -1))
    return g
  }

  const createBreakerUnit = (position: THREE.Vector3) => {
    const g = new THREE.Group()
    g.position.copy(position)
    const tableHeight = 2.5
    const tableWidth = 1.5
    const tableLength = 1.5
    const breakerHeight = 3.2

    const table = createSteelTable(tableWidth, tableLength, tableHeight)
    g.add(table)

    const baseBox = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), matDark)
    baseBox.position.y = tableHeight + 0.3
    g.add(baseBox)

    const col = createInsulator(breakerHeight, 20, 0.25)
    col.position.y = tableHeight + 0.6 + breakerHeight / 2
    g.add(col)

    const head = new THREE.Group()
    head.position.y = tableHeight + 0.6 + breakerHeight
    const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), matDark)
    head.add(headBox)
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), matConductor)
    bar.rotation.x = Math.PI / 2
    head.add(bar)
    g.add(head)

    return g
  }

  const buildPhase = (offset: THREE.Vector3) => {
    const phase = new THREE.Group()

    const unitSpacing = 5
    const posDisconnect1 = offset.clone().add(new THREE.Vector3(0, 0, -unitSpacing))
    const posBreaker = offset.clone()
    const posDisconnect2 = offset.clone().add(new THREE.Vector3(0, 0, unitSpacing))

    const dis1 = createDisconnectUnit(posDisconnect1)
    const dis2 = createDisconnectUnit(posDisconnect2)
    const breaker = createBreakerUnit(posBreaker)
    phase.add(dis1, dis2, breaker)

    const hDisconnect = 2.5 + 1.8 + 0.1
    const hBreaker = 2.5 + 0.6 + 3.2
    const d1Outer = new THREE.Vector3(offset.x, hDisconnect, posDisconnect1.z - 0.75)
    const d1Inner = new THREE.Vector3(offset.x, hDisconnect, posDisconnect1.z + 0.75)
    const d2Inner = new THREE.Vector3(offset.x, hDisconnect, posDisconnect2.z - 0.75)
    const d2Outer = new THREE.Vector3(offset.x, hDisconnect, posDisconnect2.z + 0.75)
    const breakerTop = new THREE.Vector3(offset.x, hBreaker, posBreaker.z)
    const lineIn = new THREE.Vector3(offset.x, hDisconnect + 1, posDisconnect1.z - 4)
    const lineOut = new THREE.Vector3(offset.x, hDisconnect + 1, posDisconnect2.z + 4)

    // Wires and rigid links
    phase.add(createWire(lineIn, d1Outer, 0.5))

    const bridge1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), matConductor)
    bridge1.position.set(offset.x, hDisconnect - 0.1, posDisconnect1.z)
    bridge1.rotation.x = Math.PI / 2
    phase.add(bridge1)

    phase.add(createWire(d1Inner, breakerTop, 1.2))
    phase.add(createWire(breakerTop, d2Inner, 1.2))

    const bridge2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), matConductor)
    bridge2.position.set(offset.x, hDisconnect - 0.1, posDisconnect2.z)
    bridge2.rotation.x = Math.PI / 2
    phase.add(bridge2)

    phase.add(createWire(d2Outer, lineOut, 0.5))

    return phase
  }

  const phaseSpacing = 3.5
  group.add(buildPhase(new THREE.Vector3(-phaseSpacing, 0, 0)))
  group.add(buildPhase(new THREE.Vector3(0, 0, 0)))
  group.add(buildPhase(new THREE.Vector3(phaseSpacing, 0, 0)))

  // Rotate scene slightly for better initial framing
  group.rotation.y = Math.PI / 4

  if (showGlow && Object.keys(glowData).length > 0) {
    Object.entries(glowData).forEach(([key, value]) => {
      const glowColor = getGlowColor(key, value)
      if (glowColor) {
        applyGlow(group, glowColor)
      }
    })
  }

  return group
}

