import {
  COMPONENT_VIDEO_LIBRARY,
  FAULT_LIBRARY,
  PARAMETER_THRESHOLDS,
  type ComponentType,
} from "./analysis-config"

type FaultDetail = (typeof FAULT_LIBRARY)[ComponentType][number]

// Simulation Engine for multi-component analysis

export interface SimulationInput {
  componentType: ComponentType
  inputValues: Record<string, number | string>
  timeOfSimulation: number // hours
  assetContext?: Record<string, unknown> | null
}

export interface SimulationResult {
  timeline: Array<{
    time: number
    state: Record<string, number | string>
    healthScore: number
    trueHealth?: number
    stressScore?: number
    faultProbability?: number
    agingFactor?: number
  }>
  finalState: Record<string, number | string>
  healthScores: Record<string, number>
  faultPredictions: Array<{
    type: string
    probability: number
    timeToFailure?: number
    severity: "low" | "medium" | "high" | "critical"
    cause?: string
    affected?: string
    action?: string
  }>
  diagnosis: string
  videoUrl: string
  detailedScores: Record<string, number>
  stressScore: number
  agingFactor: number
  faultProbability: number
  overallHealth: number
  transformerHealth?: number
  bayLineHealth?: number
  breakerHealth?: number
  isolatorHealth?: number
  busbarHealth?: number
}

const COMPONENT_BASELINES: Record<ComponentType, Record<string, number | string>> = {
  transformer: {
    oilLevel: 95,
    oilTemperature: 55,
    windingTemperature: 65,
    hotspotTemperature: 90,
    oilMoisture: 17.5,
    hydrogenPPM: 155,
    methanePPM: 45,
    acetylenePPM: 5,
    oilDielectricStrength: 55,
    dielectricStrength: 55,
    transformerLoading: 65,
    tapPosition: 9,
    oltcDeviation: 1,
    oltcOpsCount: 5000,
    vibrationLevel: 3,
    noiseLevel: 65,
    gasLevel: 120,
    coolingFanSpeed: 40,
    ambientTemperature: 35,
    oilTemperatureRise: 0,
  },
  bayLines: {
    ctBurdenPercent: 70,
    vtVoltageDeviation: 100,
    frequencyHz: 50.02,
    powerFactor: 0.98,
    lineCurrent: 75,
    harmonicsTHDPercent: 2.2,
  },
  circuitBreaker: {
    sf6DensityPercent: 95,
    operationCountPercent: 40,
    poleTemperature: 40,
    lastTripTimeMs: 45,
    closeCoilResistance: 12,
    mechanismWearLevel: 35,
  },
  isolator: {
    contactResistanceMicroOhm: 60,
    motorTorqueNm: 210,
    positionMismatchPercent: 1,
    bladeAngleDeg: 2,
  },
  busbar: {
    busbarTemperature: 65,
    jointHotspotTemp: 70,
    busbarLoadPercent: 72,
    busbarCurrentA: 2550,
    busVoltage: 400,
    impedanceMicroOhm: 50,
  },
}

const clampScore = (value: number) => Math.max(0, Math.min(100, value))

const STATUS_SCORE_MAP: Record<string, number> = {
  excellent: 72,
  verygood: 68,
  good: 64,
  stable: 62,
  fair: 55,
  average: 52,
  poor: 45,
  critical: 35,
}

const normalizeStatusScore = (status?: string, fallback = 60) => {
  if (!status) return fallback
  const key = status.replace(/\s+/g, "").toLowerCase()
  return STATUS_SCORE_MAP[key] ?? fallback
}

const safeNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const clampRange = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const oscillate = (progress: number, amplitude = 1) => Math.sin(progress * Math.PI * 2) * amplitude
const smoothToward = (current: number, target: number, factor = 0.15, precision = 1) => {
  const next = current + (target - current) * factor
  return Number(next.toFixed(precision))
}
const toPercent = (value: number) => Math.round(clamp01(value) * 100)
const average = (values: number[]) => (values.length ? values.reduce((sum, val) => sum + val, 0) / values.length : 0)
const weightedAverage = (entries: Array<[number, number]>) => {
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0)
  if (totalWeight === 0) return 0
  const weightedSum = entries.reduce((sum, [value, weight]) => sum + value * weight, 0)
  return weightedSum / totalWeight
}

const numFromState = (state: Record<string, number | string>, key: string, fallback = 0) =>
  safeNumber(state[key], fallback)

const getInstallationYear = (
  assetContext?: Record<string, unknown> | null,
  state?: Record<string, number | string>,
) => {
  const ctxYear = safeNumber((assetContext as Record<string, unknown> | undefined)?.installationYear, NaN)
  if (Number.isFinite(ctxYear)) return ctxYear
  const stateYear = state ? numFromState(state, "installationYear", NaN) : NaN
  if (Number.isFinite(stateYear)) return stateYear
  return new Date().getFullYear() - 10
}

function deriveAssetSignals(componentType: ComponentType, asset?: Record<string, unknown> | null) {
  if (!asset) return {}
  const context = asset as Record<string, any>
  const signals: Record<string, number | string> = {}

  switch (componentType) {
    case "transformer": {
      const dga = (context.DGA as Record<string, number>) || (context.dga as Record<string, number>) || {}
      const statusScore = normalizeStatusScore(context.conditionAssessment?.status, 60)
      const ratedMVA = safeNumber(context.ratedMVA, 300)
      const loadPercent = Math.min(140, 60 + ratedMVA / 5)

      signals.oilMoisture = safeNumber(context.oilMoisture_ppm, 18)
      signals.hydrogenPPM = safeNumber(dga.H2, 120)
      signals.methanePPM = safeNumber(dga.CH4, 45)
      signals.acetylenePPM = safeNumber(dga.C2H2, 5)
      signals.dielectricStrength = statusScore
      signals.oilDielectricStrength = statusScore - 2
      signals.transformerLoading = loadPercent
      signals.hotspotTemperature = 95 + Math.max(0, loadPercent - 90) * 0.8
      signals.windingTemperature = 65 + Math.max(0, loadPercent - 80) * 0.6
      signals.oilTemperature = 55 + Math.max(0, loadPercent - 75) * 0.4
      signals.tapPosition = safeNumber(context.oltc?.steps, 0)
      signals.oltcDeviation = Math.max(0.5, safeNumber(context.oltcDeviation, (signals.tapPosition as number) * 0.05 || 1))
      signals.oltcOpsCount = safeNumber(context.oltcOpsCount ?? context.oltc?.opsCount, 5000)
      signals.coolingFanSpeed = Math.min(100, 40 + (signals.oilTemperature as number - 55) * 1.5)
      signals.vibrationLevel = Number((3 + Math.max(0, loadPercent - 100) * 0.02).toFixed(2))
      signals.noiseLevel = Number((65 + Math.max(0, loadPercent - 95) * 0.1).toFixed(1))
      signals.gasLevel = safeNumber(dga.CO, 220)
      break
    }
    case "bayLines": {
      const thermalLimit = safeNumber(context.thermalLimit_A, 3000)
      const lineVoltage = safeNumber(context.lineVoltage_kV, 220)
      const lineCurrent = Math.min(thermalLimit, thermalLimit * 0.35)
      signals.ctBurdenPercent = Number((60 + lineCurrent / 20).toFixed(1))
      signals.vtVoltageDeviation = Number((100 + (lineVoltage - 220) * 0.15).toFixed(2))
      signals.frequencyHz = Number((50 + (Math.random() - 0.5) * 0.05).toFixed(3))
      signals.powerFactor = Number(Math.max(0.9, 0.99 - lineCurrent / 10000).toFixed(3))
      signals.lineCurrent = Number(lineCurrent.toFixed(1))
      signals.harmonicsTHDPercent = Number(
        Math.max(2, safeNumber(context.impedance_R_X?.X, 0.5) * 1.5).toFixed(2),
      )
      break
    }
    case "circuitBreaker": {
      const sf6 = safeNumber(context.sf6Pressure, 6)
      const opCount = safeNumber(context.opCount, 800)
      const operatingTime = safeNumber(context.operatingTime_ms, 60)
      const statusScore = normalizeStatusScore(context.conditionAssessment?.status, 60)

      signals.sf6DensityPercent = Number(Math.min(100, (sf6 / 6.5) * 100).toFixed(1))
      signals.operationCountPercent = Number(Math.min(130, opCount / 20).toFixed(1))
      signals.lastTripTimeMs = operatingTime
      signals.poleTemperature = Number((35 + Math.max(0, opCount - 500) * 0.02).toFixed(1))
      signals.mechanismWearLevel = Math.min(100, statusScore + opCount / 200)
      signals.closeCoilResistance = safeNumber(context.closeCoilResistance, 12)
      break
    }
    case "isolator": {
      signals.contactResistanceMicroOhm = safeNumber(context.contactResistanceMicroOhm, 60)
      signals.motorTorqueNm = safeNumber(context.motorTorqueNm, 210)
      signals.positionMismatchPercent = Number(
        (Math.random() * 0.3 + (context.interlockInfo ? 1.2 : 0.8)).toFixed(2),
      )
      signals.bladeAngleDeg = safeNumber(context.bladeAngleDeg, 0)
      break
    }
    case "busbar": {
      const capacity = safeNumber(context.capacity_A, 4000)
      const loadCurrent = capacity * 0.6
      signals.busbarCurrentA = Number(loadCurrent.toFixed(0))
      signals.busbarLoadPercent = Number(Math.min(140, (loadCurrent / capacity) * 100 + 15).toFixed(1))
      signals.busbarTemperature = Number((65 + Math.max(0, (signals.busbarLoadPercent as number) - 80) * 0.4).toFixed(1))
      signals.jointHotspotTemp = Number((signals.busbarTemperature as number + 12).toFixed(1))
      signals.impedanceMicroOhm = Number(
        Math.max(30, safeNumber(context.impedance_R_X?.R, 0.05) * 100).toFixed(1),
      )
      break
    }
  }

  return signals
}

interface ComponentScorePack {
  detailedScores: Record<string, number>
  componentHealth: number
  stressIndicators: number
  abnormalDga: number
  temperatureSeverity: number
}

function computeComponentScorePack(
  componentType: ComponentType,
  state: Record<string, number | string>,
): ComponentScorePack {
  const get = (key: string, fallback = 0) => numFromState(state, key, fallback)

  switch (componentType) {
    case "transformer": {
      const windingTemp = get("windingTemperature", 65)
      const oilTemp = get("oilTemperature", 55)
      const hotspotTemp = get("hotspotTemperature", 90)
      const moisture = get("oilMoisture", 15)
      const oilLevel = clamp01(get("oilLevel", 80) / 100)
      const oilAcidity = get("oilAcidity", 0.05)
      const dielectricStrength = get("dielectricStrength", 60)
      const hydrogen = get("hydrogenPPM", 200)
      const acetylene = get("acetylenePPM", 5)
      const ethylene = get("ethylenePPM", get("C2H4", 10))
      const carbonMonoxide = get("CO_PPM", get("CO", 300))
      const loading = get("transformerLoading", 75)
      const loadUnbalance = get("loadUnbalancePercent", 5)
      const neutralCurrent = get("neutralCurrent", 30)
      const oltcDeviation = get("oltcDeviation", 1)
      const oltcOps = get("oltcOpsCount", 5000)
      const vibration = get("vibrationLevel", 3)
      const noise = get("noiseLevel", 60)
      const motorStatus = String(state.oltcMotorStatus ?? "ON").toUpperCase()

      const windingScore = clamp01(1 - (windingTemp - 40) / 50)
      const oilTempScore = clamp01(1 - (oilTemp - 30) / 50)
      const hotspotScore = clamp01(1 - (hotspotTemp - 90) / 90)
      const tempScore = average([windingScore, oilTempScore, hotspotScore])

      const moistureScore = clamp01(1 - moisture / 40)
      const oilLevelScore = oilLevel
      const acidityScore = clamp01(1 - oilAcidity / 0.5)
      const dielectricScore = clamp01(dielectricStrength / 70)
      const oilHealth = average([moistureScore, oilLevelScore, acidityScore, dielectricScore])

      const h2Score = clamp01(1 - hydrogen / 500)
      const c2h2Score = clamp01(1 - acetylene / 50)
      const c2h4Score = clamp01(1 - ethylene / 100)
      const coScore = clamp01(1 - carbonMonoxide / 1200)
      const gasHealth = average([h2Score, c2h2Score, c2h4Score, coScore])

      const loadScore = clamp01(1 - (loading - 70) / 80)
      const unbalanceScore = clamp01(1 - loadUnbalance / 15)
      const neutralCurrentScore = clamp01(1 - neutralCurrent / 200)
      const electricalHealth = average([loadScore, unbalanceScore, neutralCurrentScore])

      const tapScore = clamp01(1 - oltcDeviation / 12)
      const motorScore = motorStatus === "ON" ? 1 : 0.5
      const opWearScore = clamp01(1 - oltcOps / 20000)
      const oltcHealth = average([tapScore, motorScore, opWearScore])

      const vibrationScore = clamp01(1 - vibration / 10)
      const noiseScore = clamp01(1 - (noise - 50) / 40)
      const mechanicalHealth = average([vibrationScore, noiseScore])

      const componentHealth = weightedAverage([
        [tempScore, 0.25],
        [oilHealth, 0.2],
        [gasHealth, 0.2],
        [electricalHealth, 0.15],
        [oltcHealth, 0.1],
        [mechanicalHealth, 0.1],
      ])

      return {
        detailedScores: {
          temperature: tempScore,
          oil: oilHealth,
          gas: gasHealth,
          electrical: electricalHealth,
          oltc: oltcHealth,
          mechanical: mechanicalHealth,
        },
        componentHealth,
        stressIndicators: average([1 - loadScore, 1 - unbalanceScore, 1 - vibrationScore]),
        abnormalDga: clamp01(1 - gasHealth),
        temperatureSeverity: clamp01(1 - tempScore),
      }
    }
    case "bayLines": {
      const ctBurdenPercent = get("ctBurdenPercent", 70)
      const ctTemperature = get("ctTemperature", 45)
      const primaryCurrent = get("primaryCurrent", get("lineCurrent", 800))
      const ratedCurrent = Math.max(get("ratedCurrent", get("thermalLimit", get("thermalLimit_A", 1500))), 1)
      const vtDriftPercent = get("vtVoltageDriftPercent", get("vtVoltageDeviation", 100))
      const vtTemperature = get("vtTemperature", 45)
      const powerFactor = clamp01(get("powerFactor", 0.98))
      const frequency = get("frequencyHz", get("frequency", 50))
      const thd = get("harmonicsTHDPercent", 2.5)
      const lineCurrent = get("lineCurrent", 800)
      const thermalLimit = Math.max(get("thermalLimit_A", get("thermalLimit", 2000)), 1)
      const impedance = get("impedanceMicroOhm", get("impedance", 40))
      const maxAllowedImpedance = Math.max(get("maxAllowedImpedance", 200), 1)

      const ctBurdenScore = clamp01(1 - ctBurdenPercent / 120)
      const ctTempScore = clamp01(1 - (ctTemperature - 40) / 50)
      const ctPrimaryScore = clamp01(1 - primaryCurrent / ratedCurrent)
      const ctHealth = average([ctBurdenScore, ctTempScore, ctPrimaryScore])

      const vtDriftScore = clamp01(1 - Math.abs(vtDriftPercent - 100) / 20)
      const vtTempScore = clamp01(1 - (vtTemperature - 35) / 45)
      const vtHealth = average([vtDriftScore, vtTempScore])

      const frequencyScore = clamp01(1 - Math.abs(frequency - 50) / 3)
      const thdScore = clamp01(1 - thd / 20)
      const lineCurrentScore = clamp01(1 - lineCurrent / thermalLimit)
      const impedanceScore = clamp01(1 - impedance / maxAllowedImpedance)

      const componentHealth = weightedAverage([
        [ctHealth, 0.3],
        [vtHealth, 0.2],
        [powerFactor, 0.15],
        [frequencyScore, 0.15],
        [thdScore, 0.1],
        [lineCurrentScore, 0.1],
      ])

      return {
        detailedScores: {
          ct: ctHealth,
          vt: vtHealth,
          powerFactor,
          frequency: frequencyScore,
          thd: thdScore,
          lineCurrent: lineCurrentScore,
          impedance: impedanceScore,
        },
        componentHealth,
        stressIndicators: average([1 - lineCurrentScore, 1 - powerFactor, 1 - frequencyScore, 1 - impedanceScore]),
        abnormalDga: 0,
        temperatureSeverity: clamp01(1 - vtTempScore),
      }
    }
    case "circuitBreaker": {
      const sf6Pressure = get("sf6Pressure", 4 + (clamp01(get("sf6DensityPercent", 95) / 100) * 3 || 0))
      const sf6Moisture = get("sf6MoisturePPM", 150)
      const leakRate = get("leakRate", get("sf6LeakRate", 1))
      const opPercent = clamp01(get("operationCountPercent", 40) / 100)
      const operatingTime = get("lastTripTimeMs", get("operatingTimeMs", 45))
      const coilResistance = get("closeCoilResistance", 12)
      const mechanismWear = get("mechanismWearLevel", 35)
      const poleTemperature = get("poleTemperature", 40)

      const sf6Score = clamp01((sf6Pressure - 4) / 3)
      const sf6MoistureScore = clamp01(1 - sf6Moisture / 500)
      const leakScore = clamp01(1 - leakRate / 10)
      const sf6Composite = average([sf6Score, sf6MoistureScore, leakScore])

      const opScore = clamp01(1 - opPercent)
      const timingScore = clamp01(1 - (operatingTime - 40) / 40)
      const coilResistanceScore = clamp01(1 - (coilResistance - 5) / 15)
      const mechanismScore = clamp01(1 - mechanismWear / 100)

      const componentHealth = weightedAverage([
        [sf6Composite, 0.25],
        [opScore, 0.25],
        [timingScore, 0.2],
        [coilResistanceScore, 0.15],
        [mechanismScore, 0.15],
      ])

      const poleTemperatureSeverity = clamp01((poleTemperature - 40) / 40)

      return {
        detailedScores: {
          sf6: sf6Composite,
          operations: opScore,
          timing: timingScore,
          coilResistance: coilResistanceScore,
          mechanism: mechanismScore,
        },
        componentHealth,
        stressIndicators: average([1 - opScore, 1 - mechanismScore, poleTemperatureSeverity]),
        abnormalDga: 0,
        temperatureSeverity: poleTemperatureSeverity,
      }
    }
    case "isolator": {
      const status = String(state.status ?? state.isolatorStatus ?? "CLOSED").toUpperCase()
      const bladeAngle = get("bladeAngleDeg", 2)
      const contactResistance = get("contactResistanceMicroOhm", 60)
      const motorTorque = get("motorTorqueNm", 210)
      const mismatch = get("positionMismatchPercent", 1)

      const statusScore = status === "CLOSED" ? 1 : 0.8
      const bladeAngleScore = clamp01(1 - bladeAngle / 90)
      const contactResistanceScore = clamp01(1 - contactResistance / 300)
      const torqueScore = clamp01(1 - motorTorque / 500)
      const mismatchScore = clamp01(1 - mismatch / 10)

      const componentHealth = average([statusScore, bladeAngleScore, contactResistanceScore, torqueScore, mismatchScore])

      return {
        detailedScores: {
          status: statusScore,
          alignment: bladeAngleScore,
          contact: contactResistanceScore,
          torque: torqueScore,
          mismatch: mismatchScore,
        },
        componentHealth,
        stressIndicators: average([1 - bladeAngleScore, 1 - contactResistanceScore, 1 - mismatchScore]),
        abnormalDga: 0,
        temperatureSeverity: 0,
      }
    }
    case "busbar": {
      const busbarTemperature = get("busbarTemperature", 65)
      const jointHotspot = get("jointHotspotTemp", 75)
      const loadPercent = get("busbarLoadPercent", 70)
      const busbarCurrent = get("busbarCurrentA", 1800)
      const capacity = Math.max(get("capacity_A", 3000), 1)
      const impedanceMicroOhm = get("impedanceMicroOhm", 60)

      const tempScore = clamp01(1 - (busbarTemperature - 40) / 50)
      const hotspotScore = clamp01(1 - (jointHotspot - 55) / 95)
      const loadScore = clamp01(1 - loadPercent / 140)
      const currentScore = clamp01(1 - busbarCurrent / capacity)
      const impedanceScore = clamp01(1 - impedanceMicroOhm / 200)

      const componentHealth = weightedAverage([
        [tempScore, 0.35],
        [hotspotScore, 0.25],
        [loadScore, 0.2],
        [currentScore, 0.1],
        [impedanceScore, 0.1],
      ])

      return {
        detailedScores: {
          thermal: tempScore,
          hotspot: hotspotScore,
          load: loadScore,
          current: currentScore,
          impedance: impedanceScore,
        },
        componentHealth,
        stressIndicators: average([1 - loadScore, 1 - currentScore, 1 - impedanceScore]),
        abnormalDga: 0,
        temperatureSeverity: clamp01(1 - tempScore),
      }
    }
    default:
      return {
        detailedScores: { overall: 0.85 },
        componentHealth: 0.85,
        stressIndicators: 0.2,
        abnormalDga: 0,
        temperatureSeverity: 0.2,
      }
  }
}

export async function runSimulation(input: SimulationInput): Promise<SimulationResult> {
  const { componentType, inputValues, timeOfSimulation, assetContext } = input
  const baseline = COMPONENT_BASELINES[componentType] || {}
  const timeline: SimulationResult["timeline"] = []
  const steps = Math.max(12, Math.floor(timeOfSimulation))

  let currentState: Record<string, number | string> = {
    ...baseline,
    ...deriveAssetSignals(componentType, assetContext),
    ...inputValues,
  }

  for (let step = 0; step <= steps; step++) {
    const time = Number(((step / steps) * timeOfSimulation).toFixed(2))
    currentState = computeNextState(componentType, currentState, time, timeOfSimulation)
    const healthScore = calculateHealthScore(componentType, currentState)
    
    // Calculate dynamic parameters for each timeline step
    const stepScorePack = computeComponentScorePack(componentType, currentState)
    const stepInstallYear = getInstallationYear(assetContext, currentState)
    const stepAgeYears = Math.max(0, new Date().getFullYear() - stepInstallYear)
    const stepAgeFactor = clamp01(1 - stepAgeYears / 40)
    const stepTrueHealth = clamp01(0.7 * stepScorePack.componentHealth + 0.3 * stepAgeFactor)
    const stepStressScore = clamp01(stepScorePack.stressIndicators)
    const stepFaultProbability = clamp01(
      1 - stepScorePack.componentHealth + stepScorePack.stressIndicators * 0.3 + stepScorePack.abnormalDga * 0.2 + stepScorePack.temperatureSeverity * 0.3,
    )
    
    // Apply degradation over time for dynamic simulation
    const progressRatio = step / steps
    const degradationFactor = 1 - (progressRatio * 0.1) // 10% degradation over simulation time
    const stressFactor = progressRatio * 0.15 // 15% stress increase over time
    
    const dynamicTrueHealth = Math.max(0, stepTrueHealth * degradationFactor)
    const dynamicStressScore = Math.min(1, stepStressScore + stressFactor)
    const dynamicFaultProbability = Math.min(1, stepFaultProbability + (progressRatio * 0.2))
    const dynamicAgingFactor = Math.max(0, stepAgeFactor * (1 - progressRatio * 0.05))
    
    timeline.push({
      time,
      state: { ...currentState },
      healthScore,
      // Enhanced parameters for visualization
      trueHealth: dynamicTrueHealth * 100, // Convert to percentage
      stressScore: dynamicStressScore * 100,
      faultProbability: dynamicFaultProbability * 100,
      agingFactor: dynamicAgingFactor * 100,
    })
  }

  const healthScores = calculateAllHealthScores(componentType, currentState)
  const scorePack = computeComponentScorePack(componentType, currentState)
  const faultPredictions = predictFaults(componentType, currentState, timeOfSimulation)
  const diagnosis = generateDiagnosis(componentType, currentState, healthScores, faultPredictions)
  const installYear = getInstallationYear(assetContext, currentState)
  const ageYears = Math.max(0, new Date().getFullYear() - installYear)
  const ageFactor = clamp01(1 - ageYears / 40)
  const trueHealth = clamp01(0.7 * scorePack.componentHealth + 0.3 * ageFactor)
  const stressScore = clamp01(scorePack.stressIndicators)
  const faultProbability = clamp01(
    1 - scorePack.componentHealth + scorePack.stressIndicators * 0.3 + scorePack.abnormalDga * 0.2 + scorePack.temperatureSeverity * 0.3,
  )

  const componentHealthFieldMap: Record<
    ComponentType,
    keyof Pick<SimulationResult, "transformerHealth" | "bayLineHealth" | "breakerHealth" | "isolatorHealth" | "busbarHealth">
  > = {
    transformer: "transformerHealth",
    bayLines: "bayLineHealth",
    circuitBreaker: "breakerHealth",
    isolator: "isolatorHealth",
    busbar: "busbarHealth",
  }

  const componentHealthField = componentHealthFieldMap[componentType]
  const componentHealthPayload: Partial<SimulationResult> = {}
  if (componentHealthField) {
    componentHealthPayload[componentHealthField] = scorePack.componentHealth
  }

  return {
    timeline,
    finalState: currentState,
    healthScores,
    faultPredictions,
    diagnosis,
    videoUrl: getVideoUrl(componentType),
    detailedScores: scorePack.detailedScores,
    stressScore,
    agingFactor: ageFactor,
    faultProbability,
    overallHealth: trueHealth,
    ...componentHealthPayload,
  }
}

function computeNextState(
  componentType: ComponentType,
  currentState: Record<string, number | string>,
  time: number,
  totalTime: number
): Record<string, number | string> {
  const updated: Record<string, number | string> = { ...currentState }
  const progress = totalTime === 0 ? 0 : time / totalTime

  const asNumber = (value: number | string | undefined, fallback = 0) => {
    const parsed = typeof value === "string" ? parseFloat(value) : value
    return Number.isFinite(parsed) ? (parsed as number) : fallback
  }

  switch (componentType) {
    case "transformer": {
      const loadBase = clampRange(asNumber(updated.transformerLoading, 85), 55, 120)
      const stabilizedLoad = clampRange(loadBase + oscillate(progress, 4), 55, 120)
      updated.transformerLoading = Number(stabilizedLoad.toFixed(1))

      const ambient = clampRange(asNumber(updated.ambientTemperature, 32), 15, 55)
      const oilTarget = 55 + (stabilizedLoad - 70) * 0.35 + (ambient - 25) * 0.2
      updated.oilTemperature = smoothToward(asNumber(updated.oilTemperature, 55), oilTarget)

      const windingTarget = oilTarget + 7
      updated.windingTemperature = smoothToward(asNumber(updated.windingTemperature, 65), windingTarget)

      const hotspotTarget = windingTarget + 6 + Math.max(0, stabilizedLoad - 95) * 0.2
      updated.hotspotTemperature = smoothToward(asNumber(updated.hotspotTemperature, 90), hotspotTarget)

      const moistureBase = clampRange(asNumber(updated.oilMoisture, 18), 8, 26)
      updated.oilMoisture = Number((moistureBase + oscillate(progress, 0.4)).toFixed(1))

      const hydrogenBase = clampRange(asNumber(updated.hydrogenPPM, 140), 50, 260)
      updated.hydrogenPPM = Math.round(hydrogenBase + oscillate(progress, 8))

      const methaneBase = clampRange(asNumber(updated.methanePPM, 45), 10, 120)
      updated.methanePPM = Math.round(methaneBase + oscillate(progress, 4))

      const acetyleneBase = clampRange(asNumber(updated.acetylenePPM, 5), 0, 20)
      updated.acetylenePPM = Number((acetyleneBase + oscillate(progress, 0.8)).toFixed(1))

      const oilMoistureValue =
        typeof updated.oilMoisture === "number" ? (updated.oilMoisture as number) : moistureBase
      const dielectricTarget = clampRange(66 - (oilMoistureValue - 15) * 0.4, 48, 70)
      updated.oilDielectricStrength = smoothToward(asNumber(updated.oilDielectricStrength, 55), dielectricTarget, 0.2)
      updated.dielectricStrength = updated.oilDielectricStrength

      updated.tapPosition = Number((asNumber(updated.tapPosition, 0) + oscillate(progress, 0.5)).toFixed(1))
      const oltcDeviationTarget =
        Math.abs(Number(updated.tapPosition)) * 0.3 + Math.max(0, stabilizedLoad - 95) * 0.02 + Math.abs(oscillate(progress, 0.2))
      updated.oltcDeviation = Number(clampRange(oltcDeviationTarget, 0, 5).toFixed(2))
      updated.oltcOpsCount = Math.round(asNumber(updated.oltcOpsCount, 5000) + progress * 20)

      updated.vibrationLevel = smoothToward(
        asNumber(updated.vibrationLevel, 3),
        3 + Math.max(0, stabilizedLoad - 105) * 0.02,
        0.2,
        2,
      )
      updated.noiseLevel = smoothToward(
        asNumber(updated.noiseLevel, 65),
        64 + Math.max(0, stabilizedLoad - 100) * 0.15,
      )
      updated.coolingFanSpeed = Number(
        clampRange(40 + (Number(updated.oilTemperature) - 55) * 1.2, 35, 95).toFixed(0),
      )
      updated.gasLevel = Math.round(clampRange(asNumber(updated.gasLevel, 150) + oscillate(progress, 10), 80, 300))
      break
    }

    case "bayLines": {
      const ctBase = clampRange(asNumber(updated.ctBurdenPercent, 70), 40, 105)
      updated.ctBurdenPercent = Number((ctBase + oscillate(progress, 2)).toFixed(1))
      updated.vtVoltageDeviation = Number(
        clampRange(asNumber(updated.vtVoltageDeviation, 100) + oscillate(progress, 1.5), 92, 108).toFixed(2),
      )
      updated.frequencyHz = Number((50 + oscillate(progress, 0.04)).toFixed(3))
      const pfBase = clampRange(asNumber(updated.powerFactor, 0.98), 0.92, 1)
      updated.powerFactor = Number((pfBase + oscillate(progress, 0.005)).toFixed(3))
      const lineBase = clampRange(asNumber(updated.lineCurrent, 75), 30, 120)
      updated.lineCurrent = Number((lineBase + oscillate(progress, 3)).toFixed(1))
      const thdBase = clampRange(asNumber(updated.harmonicsTHDPercent, 2.2), 1.5, 4.5)
      updated.harmonicsTHDPercent = Number((thdBase + oscillate(progress, 0.2)).toFixed(2))
      break
    }

    case "circuitBreaker": {
      const sf6Base = clampRange(asNumber(updated.sf6DensityPercent, 95), 85, 99)
      updated.sf6DensityPercent = Number((sf6Base + oscillate(progress, 0.6)).toFixed(1))
      const opBase = clampRange(asNumber(updated.operationCountPercent, 40), 20, 80)
      updated.operationCountPercent = Number((opBase + oscillate(progress, 2)).toFixed(1))
      const poleTarget = 38 + (updated.operationCountPercent as number) * 0.15
      updated.poleTemperature = smoothToward(asNumber(updated.poleTemperature, 40), poleTarget, 0.2)
      updated.lastTripTimeMs = smoothToward(
        asNumber(updated.lastTripTimeMs, 45),
        45 + oscillate(progress, 0.8),
        0.3,
        1,
      )
      updated.closeCoilResistance = smoothToward(
        asNumber(updated.closeCoilResistance, 12),
        12.5 + oscillate(progress, 0.2),
        0.25,
        2,
      )
      updated.mechanismWearLevel = Number(
        clampRange(asNumber(updated.mechanismWearLevel, 35) + progress * 0.8, 20, 70).toFixed(1),
      )
      break
    }

    case "isolator": {
      updated.contactResistanceMicroOhm = Number(
        clampRange(asNumber(updated.contactResistanceMicroOhm, 60) + oscillate(progress, 2), 40, 120).toFixed(1),
      )
      updated.motorTorqueNm = Number(
        clampRange(asNumber(updated.motorTorqueNm, 210) + oscillate(progress, 5), 150, 260).toFixed(1),
      )
      updated.positionMismatchPercent = Number(
        clampRange(asNumber(updated.positionMismatchPercent, 1) + oscillate(progress, 0.2), 0, 3).toFixed(2),
      )
      updated.bladeAngleDeg = Number(
        clampRange(asNumber(updated.bladeAngleDeg, 2) + oscillate(progress, 0.4), 0, 8).toFixed(2),
      )
      break
    }

    case "busbar": {
      const loadBase = clampRange(asNumber(updated.busbarLoadPercent, 72), 40, 105)
      const loadValue = clampRange(loadBase + oscillate(progress, 3), 40, 105)
      updated.busbarLoadPercent = Number(loadValue.toFixed(1))
      const currentBase = clampRange(asNumber(updated.busbarCurrentA, 2100), 1200, 3200)
      updated.busbarCurrentA = Number((currentBase + oscillate(progress, 60)).toFixed(0))
      const busTempTarget = 65 + (loadValue - 70) * 0.35
      updated.busbarTemperature = smoothToward(asNumber(updated.busbarTemperature, 65), busTempTarget)
      const hotspotTarget = busTempTarget + 8
      updated.jointHotspotTemp = smoothToward(asNumber(updated.jointHotspotTemp, 70), hotspotTarget)
      const impedanceBase = clampRange(asNumber(updated.impedanceMicroOhm, 50), 30, 70)
      updated.impedanceMicroOhm = Number((impedanceBase + oscillate(progress, 0.8)).toFixed(1))
      break
    }
  }

  return updated
}

function calculateHealthScore(componentType: ComponentType, state: Record<string, number | string>): number {
  const pack = computeComponentScorePack(componentType, state)
  return clampScore(toPercent(pack.componentHealth))
}

export function calculateAllHealthScores(
  componentType: ComponentType,
  state: Record<string, number | string>,
): Record<string, number> {
  const pack = computeComponentScorePack(componentType, state)
  const scores: Record<string, number> = {}
  Object.entries(pack.detailedScores).forEach(([key, value]) => {
    scores[key] = clampScore(toPercent(value))
  })
  scores.overall = clampScore(toPercent(pack.componentHealth))
  return scores
}

function predictFaults(
  componentType: ComponentType,
  state: Record<string, number | string>,
  timeOfSimulation: number
): SimulationResult["faultPredictions"] {
  const list: SimulationResult["faultPredictions"] = []
  const lib = FAULT_LIBRARY[componentType] || []

  const pushFault = (type: string, probability: number, severity: FaultDetail["severity"]) => {
    const meta = lib.find((fault) => fault.type === type)
    list.push({
      type,
      probability: Math.min(0.99, Math.max(0.05, probability)),
      timeToFailure: Number((timeOfSimulation * Math.random() * 0.6 + timeOfSimulation * 0.2).toFixed(1)),
      severity: meta?.severity || severity,
      cause: meta?.cause,
      affected: meta?.affected,
      action: meta?.action,
    })
  }

  const num = (key: string) =>
    typeof state[key] === "number" ? (state[key] as number) : parseFloat(String(state[key] || ""))

  switch (componentType) {
    case "transformer":
      if (num("windingTemperature") > 115 || num("hotspotTemperature") > 130) {
        pushFault("Thermal Overload", (num("hotspotTemperature") - 110) / 80, "high")
      }
      if (num("oltcDeviation") > 6) {
        pushFault("OLTC Imbalance", (num("oltcDeviation") - 4) / 12, "medium")
      }
      if (num("hydrogenPPM") > 350 || num("acetylenePPM") > 15) {
        pushFault("Gas Accumulation", (num("hydrogenPPM") - 250) / 400, "high")
      }
      if (num("dielectricStrength") < 45 || num("oilMoisture") > 25) {
        pushFault("Insulation Aging", (25 - num("dielectricStrength")) / 40, "medium")
      }
      break
    case "bayLines":
      if (num("ctBurdenPercent") > 100) {
        pushFault("CT Saturation", (num("ctBurdenPercent") - 90) / 60, "high")
      }
      if (Math.abs(num("vtVoltageDeviation") - 100) > 10) {
        pushFault("VT Instability", Math.abs(num("vtVoltageDeviation") - 100) / 40, "medium")
      }
      if (num("powerFactor") < 0.95) {
        pushFault("Power Factor Deterioration", (0.98 - num("powerFactor")) * 4, "medium")
      }
      break
    case "circuitBreaker":
      if (num("sf6DensityPercent") < 85) {
        pushFault("SF6 Leakage", (95 - num("sf6DensityPercent")) / 40, "critical")
      }
      if (num("operationCountPercent") > 75 || num("mechanismWearLevel") > 70) {
        pushFault("Mechanism Fatigue", (num("operationCountPercent") - 60) / 60, "high")
      }
      if (num("poleTemperature") > 70) {
        pushFault("Pole Overheating", (num("poleTemperature") - 65) / 40, "medium")
      }
      break
    case "isolator":
      if (num("contactResistanceMicroOhm") > 140) {
        pushFault("Contact Deterioration", (num("contactResistanceMicroOhm") - 120) / 160, "high")
      }
      if (num("positionMismatchPercent") > 3) {
        pushFault("Misalignment", (num("positionMismatchPercent") - 2) / 8, "medium")
      }
      break
    case "busbar":
      if (num("jointHotspotTemp") > 95) {
        pushFault("Hotspot Development", (num("jointHotspotTemp") - 90) / 60, "high")
      }
      if (num("busbarLoadPercent") > 95) {
        pushFault("Overload Thermal Stress", (num("busbarLoadPercent") - 90) / 60, "medium")
      }
      if (num("impedanceMicroOhm") > 65) {
        pushFault("Oxidation Resistance Rise", (num("impedanceMicroOhm") - 60) / 60, "medium")
      }
      break
  }

  return list
}

function generateDiagnosis(
  componentType: ComponentType,
  state: Record<string, number | string>,
  healthScores: Record<string, number>,
  faults: SimulationResult["faultPredictions"]
): string {
  const overall = healthScores.overall ?? calculateHealthScore(componentType, state)
  let summary = `Analysis for ${componentType}:\n`
  summary += `Overall health index: ${overall.toFixed(1)}%\n\n`

  summary += "Key observations:\n"
  Object.entries(healthScores)
    .filter(([key]) => key !== "overall")
    .forEach(([key, value]) => {
      const status = value >= 80 ? "Healthy" : value >= 60 ? "Watch" : "Critical"
      summary += `- ${capitalize(key)}: ${value.toFixed(0)}% (${status})\n`
    })

  if (faults.length) {
    summary += "\nPredicted failure modes:\n"
    faults.forEach((fault) => {
      summary += `- ${fault.type} (${fault.severity}): ${(fault.probability * 100).toFixed(0)}% chance`
      if (fault.timeToFailure) {
        summary += ` within ${fault.timeToFailure.toFixed(1)} h`
      }
      summary += ".\n"
      if (fault.cause) summary += `  Cause: ${fault.cause}\n`
      if (fault.action) summary += `  Action: ${fault.action}\n`
    })
  } else {
    summary += "\nNo immediate critical faults detected, continue monitoring.\n"
  }

  return summary
}

function getVideoUrl(componentType: ComponentType) {
  return COMPONENT_VIDEO_LIBRARY[componentType] || COMPONENT_VIDEO_LIBRARY.transformer
}

function capitalize(text: string) {
  return text.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim()
}

