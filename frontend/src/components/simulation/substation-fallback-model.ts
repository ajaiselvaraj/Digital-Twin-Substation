"use client"

import * as THREE from "three"

/**
 * Standalone substation fallback model inspired by the provided viewer code.
 * This builds the full yard geometry in a single THREE.Group (no renderer/controls).
 * Ground plane/base plate intentionally omitted to keep the model free-suspended.
 */
export function createSubstationFallbackModel(config: { autoRotate?: boolean; showGrid?: boolean } = {}) {
  const group = new THREE.Group()

  // --- Materials (realistic, light-reactive) ---
  const matSteelGalvanized = new THREE.MeshStandardMaterial({
    color: 0x7a8b95,
    roughness: 0.55,
    metalness: 0.4,
  })
  const matSteelPainted = new THREE.MeshStandardMaterial({
    color: 0x44555d,
    roughness: 0.45,
    metalness: 0.22,
  })
  const matInsulatorPorcelain = new THREE.MeshStandardMaterial({
    color: 0x2b1d1a,
    roughness: 0.12,
    metalness: 0.0,
  })
  const matInsulatorGrey = new THREE.MeshStandardMaterial({
    color: 0xb5c2c7,
    roughness: 0.45,
    metalness: 0.1,
  })
  const matConductor = new THREE.MeshStandardMaterial({
    color: 0xc8c8c8,
    roughness: 0.5,
    metalness: 0.55,
  })
  const matCopper = new THREE.MeshStandardMaterial({
    color: 0x9a6028,
    roughness: 0.35,
    metalness: 0.82,
  })
  const matConcrete = new THREE.MeshStandardMaterial({
    color: 0x7e7e7e,
    roughness: 0.9,
    metalness: 0.02,
  })

  // ==========================================
  //        Component Helpers
  // ==========================================
  const createFoundation = (width: number, depth: number) => {
    const h = 0.4
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, h, depth), matConcrete)
    mesh.position.y = h / 2
    return mesh
  }

  const createSteelSupport = (height: number, width: number, depth: number) => {
    const g = new THREE.Group()
    const legSize = 0.15
    const legGeo = new THREE.BoxGeometry(legSize, height, legSize)
    const positions = [
      [-width / 2, -depth / 2],
      [width / 2, -depth / 2],
      [-width / 2, depth / 2],
      [width / 2, depth / 2],
    ]
    positions.forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, matSteelGalvanized)
      leg.position.set(x, height / 2, z)
      g.add(leg)
    })
    const braceCount = Math.floor(height / 1.0)
    const braceGeoX = new THREE.BoxGeometry(width * 1.2, 0.06, 0.06)
    const braceGeoZ = new THREE.BoxGeometry(0.06, 0.06, depth * 1.2)
    for (let i = 0; i < braceCount; i++) {
      const y = i * 1.0 + 0.5
      const rotZ = i % 2 === 0 ? Math.PI / 6 : -Math.PI / 6
      const rotX = i % 2 === 0 ? Math.PI / 6 : -Math.PI / 6
      const bFront = new THREE.Mesh(braceGeoX, matSteelGalvanized)
      bFront.position.set(0, y, depth / 2)
      bFront.rotation.z = rotZ
      g.add(bFront)
      const bBack = new THREE.Mesh(braceGeoX, matSteelGalvanized)
      bBack.position.set(0, y, -depth / 2)
      bBack.rotation.z = rotZ
      g.add(bBack)
      const bLeft = new THREE.Mesh(braceGeoZ, matSteelGalvanized)
      bLeft.position.set(-width / 2, y, 0)
      bLeft.rotation.x = rotX
      g.add(bLeft)
      const bRight = new THREE.Mesh(braceGeoZ, matSteelGalvanized)
      bRight.position.set(width / 2, y, 0)
      bRight.rotation.x = rotX
      g.add(bRight)
    }
    return g
  }

  const createLatticeGantry = (x: number, width: number, height: number) => {
    const g = new THREE.Group()
    g.position.set(x, 0, 0)
    const tower1 = createSteelSupport(height, 1.8, 1.8)
    tower1.position.z = -width / 2
    const tower2 = createSteelSupport(height, 1.8, 1.8)
    tower2.position.z = width / 2
    const beamGroup = new THREE.Group()
    beamGroup.position.y = height
    const trussH = 1.2
    const chordGeo = new THREE.BoxGeometry(0.2, 0.2, width + 4)
    const topChordF = new THREE.Mesh(chordGeo, matSteelGalvanized)
    topChordF.position.set(0.6, trussH / 2, 0)
    const topChordB = new THREE.Mesh(chordGeo, matSteelGalvanized)
    topChordB.position.set(-0.6, trussH / 2, 0)
    const botChordF = new THREE.Mesh(chordGeo, matSteelGalvanized)
    botChordF.position.set(0.6, -trussH / 2, 0)
    const botChordB = new THREE.Mesh(chordGeo, matSteelGalvanized)
    botChordB.position.set(-0.6, -trussH / 2, 0)
    beamGroup.add(topChordF, topChordB, botChordF, botChordB)
    const webCount = Math.floor(width / 1.5)
    const webGeo = new THREE.BoxGeometry(0.1, trussH, 0.1)
    for (let i = 0; i < webCount + 4; i++) {
      const z = -width / 2 - 2 + i * 1.5
      const web = new THREE.Mesh(webGeo, matSteelGalvanized)
      web.position.set(0.6, 0, z)
      beamGroup.add(web)
      const web2 = new THREE.Mesh(webGeo, matSteelGalvanized)
      web2.position.set(-0.6, 0, z)
      beamGroup.add(web2)
    }
    g.add(tower1, tower2, beamGroup)
    return g
  }

  const createDetailedInsulator = (height: number, radius: number, material: THREE.Material) => {
    const g = new THREE.Group()
    const core = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.4, radius * 0.4, height, 16), material)
    g.add(core)
    const shedCount = Math.floor(height * 6)
    const shedGeo = new THREE.CylinderGeometry(radius, radius * 0.7, 0.02, 16)
    const shedSpacing = height / shedCount
    for (let i = 0; i < shedCount; i++) {
      const shed = new THREE.Mesh(shedGeo, material)
      shed.position.y = -height / 2 + i * shedSpacing + shedSpacing / 2
      g.add(shed)
    }
    return g
  }

  const createCoronaRing = (radius: number) => {
    const geo = new THREE.TorusGeometry(radius, 0.03, 8, 24)
    const mesh = new THREE.Mesh(geo, matConductor)
    mesh.rotation.x = Math.PI / 2
    return mesh
  }

  const createBundledCatenary = (start: THREE.Vector3, end: THREE.Vector3, droop: number = 0.5) => {
    const g = new THREE.Group()
    const spacing = 0.25
    const direction = new THREE.Vector3().subVectors(end, start).normalize()
    const up = new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3().crossVectors(direction, up).normalize().multiplyScalar(spacing / 2)
    const startL = start.clone().sub(right)
    const startR = start.clone().add(right)
    const endL = end.clone().sub(right)
    const endR = end.clone().add(right)
    const createWire = (s: THREE.Vector3, e: THREE.Vector3) => {
      const controlPoint = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5)
      controlPoint.y = Math.min(s.y, e.y) - droop
      const curve = new THREE.QuadraticBezierCurve3(s, controlPoint, e)
      const points = curve.getPoints(16)
      return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, 0.03, 8, false), matConductor)
    }
    g.add(createWire(startL, endL))
    g.add(createWire(startR, endR))
    const spacerCount = Math.max(1, Math.floor(start.distanceTo(end) / 5))
    const spacerGeo = new THREE.BoxGeometry(spacing, 0.03, 0.03)
    for (let i = 1; i <= spacerCount; i++) {
      const t = i / (spacerCount + 1)
      const pos = new THREE.Vector3().lerpVectors(start, end, t)
      pos.y -= 4 * droop * (t - t * t)
      const spacer = new THREE.Mesh(spacerGeo, matConductor)
      spacer.position.copy(pos)
      spacer.lookAt(end)
      spacer.rotateY(Math.PI / 2)
      g.add(spacer)
    }
    return g
  }

  const createRigidBus = (start: THREE.Vector3, end: THREE.Vector3, radius: number = 0.08) => {
    const len = start.distanceTo(end)
    const geometry = new THREE.CylinderGeometry(radius, radius, len, 12)
    geometry.rotateX(-Math.PI / 2)
    const mesh = new THREE.Mesh(geometry, matConductor)
    mesh.position.copy(start).add(end).multiplyScalar(0.5)
    mesh.lookAt(end)
    return mesh
  }

  // --- EQUIPMENT CREATORS ---
  const createLA = (pos: THREE.Vector3) => {
    const g = new THREE.Group()
    g.position.copy(pos)
    g.add(createFoundation(1.2, 1.2))
    const supportH = 2.5
    const support = new THREE.Mesh(new THREE.BoxGeometry(0.3, supportH, 0.3), matSteelGalvanized)
    support.position.y = supportH / 2 + 0.2
    g.add(support)
    const insH = 3.8
    const insulator = createDetailedInsulator(insH, 0.22, matInsulatorPorcelain)
    insulator.position.y = supportH + 0.2 + insH / 2
    g.add(insulator)
    const ring = createCoronaRing(0.4)
    ring.position.y = supportH + 0.2 + insH - 0.3
    g.add(ring)
    const counterBox = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.2), matSteelPainted)
    counterBox.position.set(0.3, 1.5, 0)
    g.add(counterBox)
    const wireGeo = new THREE.TubeGeometry(
      new THREE.LineCurve3(new THREE.Vector3(0, supportH, 0), new THREE.Vector3(0.3, 1.5, 0)),
      4,
      0.015,
      6,
      false
    )
    g.add(new THREE.Mesh(wireGeo, matCopper))
    group.add(g)
    return new THREE.Vector3(pos.x, supportH + 0.2 + insH + 0.4, pos.z)
  }

  const createCVT = (pos: THREE.Vector3) => {
    const g = new THREE.Group()
    g.position.copy(pos)
    g.add(createFoundation(1.2, 1.2))
    const supportH = 2.0
    const support = createSteelSupport(supportH, 0.6, 0.6)
    support.position.y = 0.4
    g.add(support)
    const boxH = 0.8
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, boxH, 0.9), matSteelPainted)
    box.position.y = supportH + 0.4 + boxH / 2
    g.add(box)
    const stackH = 3.5
    const stack = createDetailedInsulator(stackH, 0.18, matInsulatorPorcelain)
    stack.position.y = supportH + 0.4 + boxH + stackH / 2
    g.add(stack)
    group.add(g)
    return new THREE.Vector3(pos.x, supportH + 0.4 + boxH + stackH + 0.2, pos.z)
  }

  const createIsolator = (pos: THREE.Vector3) => {
    const g = new THREE.Group()
    g.position.copy(pos)
    g.add(createFoundation(3.0, 1.2))
    const legH = 2.5
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, legH, 0.4), matSteelGalvanized)
    leg1.position.set(-1.0, legH / 2 + 0.4, 0)
    const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, legH, 0.4), matSteelGalvanized)
    leg2.position.set(1.0, legH / 2 + 0.4, 0)
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.3, 0.4), matSteelGalvanized)
    beam.position.y = legH + 0.4
    g.add(leg1, leg2, beam)
    const insH = 2.0
    const post1 = createDetailedInsulator(insH, 0.15, matInsulatorPorcelain)
    post1.position.set(-1.0, legH + 0.55 + insH / 2, 0)
    post1.rotation.y = 0.15
    const post2 = createDetailedInsulator(insH, 0.15, matInsulatorPorcelain)
    post2.position.set(1.0, legH + 0.55 + insH / 2, 0)
    post2.rotation.y = -0.15
    const armLen = 1.1
    const armGeo = new THREE.CylinderGeometry(0.05, 0.05, armLen, 8)
    armGeo.rotateZ(-Math.PI / 2)
    const arm1 = new THREE.Mesh(armGeo, matConductor)
    arm1.position.set(armLen / 2, insH / 2 + 0.1, 0)
    post1.add(arm1)
    const arm2 = new THREE.Mesh(armGeo, matConductor)
    arm2.position.set(-armLen / 2, insH / 2 + 0.1, 0)
    post2.add(arm2)
    g.add(post1, post2)
    group.add(g)
    return {
      in: new THREE.Vector3(pos.x - 1.0, legH + 0.55 + insH + 0.2, pos.z),
      out: new THREE.Vector3(pos.x + 1.0, legH + 0.55 + insH + 0.2, pos.z),
    }
  }

  const createBreaker = (pos: THREE.Vector3) => {
    const g = new THREE.Group()
    g.position.copy(pos)
    g.add(createFoundation(1.5, 1.5))
    const supportH = 2.8
    const support = createSteelSupport(supportH, 0.8, 0.8)
    support.position.y = 0.4
    g.add(support)
    const colH = 2.2
    const col = createDetailedInsulator(colH, 0.2, matInsulatorPorcelain)
    col.position.y = supportH + 0.4 + colH / 2
    g.add(col)
    const headY = supportH + 0.4 + colH + 0.2
    const chamberLen = 2.0
    const chamberGeo = new THREE.CylinderGeometry(0.25, 0.25, chamberLen, 16)
    chamberGeo.rotateZ(Math.PI / 2)
    const chamber = new THREE.Mesh(chamberGeo, matInsulatorPorcelain)
    chamber.position.set(0, headY, 0)
    g.add(chamber)
    const capGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 12)
    capGeo.rotateZ(Math.PI / 2)
    const cap1 = new THREE.Mesh(capGeo, matInsulatorGrey)
    cap1.position.set(-0.6, headY + 0.4, 0)
    const cap2 = new THREE.Mesh(capGeo, matInsulatorGrey)
    cap2.position.set(0.6, headY + 0.4, 0)
    g.add(cap1, cap2)
    group.add(g)
    return {
      in: new THREE.Vector3(pos.x - chamberLen / 2 - 0.2, headY, pos.z),
      out: new THREE.Vector3(pos.x + chamberLen / 2 + 0.2, headY, pos.z),
    }
  }

  const createTransformer = (pos: THREE.Vector3) => {
    const container = new THREE.Group()
    container.position.copy(pos)
    container.rotation.y = -Math.PI / 2
    const g = new THREE.Group()
    container.add(g)
    const tankW = 6
    const tankH = 4
    const tankD = 3.5
    g.add(createFoundation(tankW + 2, tankD + 2))
    const tank = new THREE.Mesh(new THREE.BoxGeometry(tankW, tankH, tankD), matSteelPainted)
    tank.position.y = 0.4 + tankH / 2
    g.add(tank)
    const conservator = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 4, 24), matSteelPainted)
    conservator.rotation.z = Math.PI / 2
    conservator.position.set(0, tankH + 1.5, 0.8)
    g.add(conservator)
    const hvBushings: THREE.Vector3[] = []
    const bushH = 2.8
    ;[-1.8, 0, 1.8].forEach((xOff) => {
      const bGroup = new THREE.Group()
      const ins = createDetailedInsulator(bushH, 0.25, matInsulatorPorcelain)
      ins.position.y = bushH / 2
      bGroup.add(ins, createCoronaRing(0.4).translateY(bushH - 0.2))
      bGroup.rotation.x = Math.PI / 4
      bGroup.position.set(xOff, tankH + 0.5, tankD / 2 - 0.5)
      g.add(bGroup)
      const tipLocalY = bushH * Math.cos(Math.PI / 4)
      const tipLocalZ = bushH * Math.sin(Math.PI / 4)
      const localPos = new THREE.Vector3(xOff, tankH + 0.5 + tipLocalY, tankD / 2 - 0.5 + tipLocalZ)
      const worldPos = localPos.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2).add(pos)
      hvBushings.push(worldPos)
    })
    const lvBushH = 1.5
    ;[-1.5, -0.5, 0.5, 1.5].forEach((xOff) => {
      const bGroup = new THREE.Group()
      const ins = createDetailedInsulator(lvBushH, 0.15, matInsulatorPorcelain)
      ins.position.y = lvBushH / 2
      bGroup.add(ins)
      bGroup.rotation.x = -Math.PI / 6
      bGroup.position.set(xOff, tankH + 0.5, -tankD / 2 + 0.5)
      g.add(bGroup)
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 8), matConductor)
      bar.position.set(0, lvBushH + 0.5, -1)
      bar.rotation.x = Math.PI / 2
      bGroup.add(bar)
    })
    const radGroup = new THREE.Group()
    for (let k = 0; k < 6; k++) {
      const rad = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.5, 0.2), matSteelPainted)
      rad.position.set(-2.5 + k * 1.0, tankH / 2 + 0.5, -tankD / 2 - 0.4)
      radGroup.add(rad)
    }
    g.add(radGroup)
    group.add(container)
    return hvBushings.reverse()
  }

  // ==========================================
  //           Scene Assembly
  // ==========================================
  const startX = -30
  const phaseSpacing = 7
  const gantry1 = createLatticeGantry(startX, 24, 14)
  group.add(gantry1)
  const gantry2X = startX + 45
  const gantry2 = createLatticeGantry(gantry2X, 24, 14)
  group.add(gantry2)
  const txX = startX + 60
  const txTips = createTransformer(new THREE.Vector3(txX, 0, 0))
  const phases = [{ z: -phaseSpacing }, { z: 0 }, { z: phaseSpacing }]
  phases.forEach((phase, index) => {
    const z = phase.z
    const g1Anchor = new THREE.Vector3(startX, 13.5, z)
    const g2Anchor = new THREE.Vector3(gantry2X, 13.5, z)
    const insString1 = createDetailedInsulator(2.5, 0.2, matInsulatorPorcelain)
    insString1.position.copy(g1Anchor).sub(new THREE.Vector3(0, 1.25, 0))
    group.add(insString1)
    const insString2 = createDetailedInsulator(2.5, 0.2, matInsulatorPorcelain)
    insString2.position.copy(g2Anchor).sub(new THREE.Vector3(0, 1.25, 0))
    group.add(insString2)
    const laPos = new THREE.Vector3(startX + 8, 0, z)
    const cvtPos = new THREE.Vector3(startX + 14, 0, z)
    const isoPos = new THREE.Vector3(startX + 22, 0, z)
    const cbPos = new THREE.Vector3(startX + 32, 0, z)
    const laTip = createLA(laPos)
    const cvtTip = createCVT(cvtPos)
    const isoPts = createIsolator(isoPos)
    const cbPts = createBreaker(cbPos)
    const txTip = txTips[index]
    const lineStart = g1Anchor.clone().sub(new THREE.Vector3(0, 2.5, 0))
    group.add(createBundledCatenary(lineStart, cvtTip, 0.8))
    group.add(createBundledCatenary(lineStart, laTip, 0.8))
    group.add(createBundledCatenary(cvtTip, isoPts.in, 0.5))
    group.add(createRigidBus(isoPts.out, cbPts.in))
    const lineEndStrain = g2Anchor.clone().sub(new THREE.Vector3(0, 2.5, 0))
    group.add(createBundledCatenary(cbPts.out, lineEndStrain, 0.8))
    group.add(createBundledCatenary(lineEndStrain, txTip, 0.4))
  })

  // Optional grid helper (kept off by default for cleaner fallback)
  if (config.showGrid) {
    const gridHelper = new THREE.GridHelper(400, 200, 0xaabbd0, 0xdce2e8)
    group.add(gridHelper)
  }

  // Auto-rotate hint: consumer (ModelViewer) handles camera controls; we just flag
  group.userData.autoRotate = Boolean(config.autoRotate)

  return group
}

