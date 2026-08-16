export type ComponentType =
  | "transformer"
  | "bayLines"
  | "circuitBreaker"
  | "isolator"
  | "busbar"

export interface ParameterThreshold {
  warning: number
  critical: number
  direction?: "high" | "low" | "range"
  unit?: string
  healthyText?: string
}

// Local fallback video sources for each component type.
// For now we leave these empty so that playback relies on captured MongoDB videos only.
// If you add local demo MP4/WebM files under /public, populate these with relative URLs.
export const COMPONENT_VIDEO_LIBRARY: Record<ComponentType, string> = {
  transformer: "",
  bayLines: "",
  circuitBreaker: "",
  isolator: "",
  busbar: "",
}

export const COMPONENT_HEALTH_BLUEPRINT: Record<
  ComponentType,
  Array<{ key: string; label: string; description: string }>
> = {
  transformer: [
    { key: "temperature", label: "Thermal Score", description: "Winding, oil & hotspot profile" },
    { key: "oil", label: "Oil Health", description: "Moisture, acidity & dielectric strength" },
    { key: "gas", label: "Gas Index", description: "Hydrogen, acetylene, ethylene, CO" },
    { key: "electrical", label: "Electrical Balance", description: "Loading, unbalance & neutral current" },
    { key: "oltc", label: "OLTC Health", description: "Tap deviation & mechanism wear" },
    { key: "mechanical", label: "Mechanical Condition", description: "Vibration & noise signature" },
    { key: "overall", label: "Overall Score", description: "Weighted composite index" },
  ],
  bayLines: [
    { key: "ct", label: "CT Health", description: "Burden, temperature & primary loading" },
    { key: "vt", label: "VT Health", description: "Voltage drift & temperature" },
    { key: "powerFactor", label: "PF Stability", description: "Measured system efficiency" },
    { key: "frequency", label: "Frequency Stability", description: "Hz deviations against 50 Hz" },
    { key: "thd", label: "Harmonics", description: "Total harmonic distortion" },
    { key: "lineCurrent", label: "Line Stress", description: "Current vs thermal limit" },
    { key: "overall", label: "Overall Score", description: "Composite index" },
  ],
  circuitBreaker: [
    { key: "sf6", label: "SF6 Health", description: "Pressure, moisture & leak integrity" },
    { key: "operations", label: "Operation Duty", description: "Cumulative duty cycle" },
    { key: "timing", label: "Timing Index", description: "Trip/close operating time" },
    { key: "coilResistance", label: "Coil Integrity", description: "Close coil resistance drift" },
    { key: "mechanism", label: "Mechanism Wear", description: "Mechanical wear estimate" },
    { key: "overall", label: "Overall Score", description: "Composite index" },
  ],
  isolator: [
    { key: "status", label: "Status", description: "Commanded vs actual state" },
    { key: "alignment", label: "Blade Alignment", description: "Blade angle deviation" },
    { key: "contact", label: "Contact Resistance", description: "Contact interface quality" },
    { key: "torque", label: "Motor Torque", description: "Operating torque demand" },
    { key: "mismatch", label: "Position Mismatch", description: "Position feedback variance" },
    { key: "overall", label: "Overall Score", description: "Composite index" },
  ],
  busbar: [
    { key: "thermal", label: "Thermal Stress", description: "Conductor temperature rise" },
    { key: "hotspot", label: "Hotspot Index", description: "Joint hotspot temperature" },
    { key: "load", label: "Load Margin", description: "Load vs rated envelope" },
    { key: "current", label: "Current Margin", description: "Measured current vs capacity" },
    { key: "impedance", label: "Impedance Rise", description: "Joint impedance degradation" },
    { key: "overall", label: "Overall Score", description: "Composite index" },
  ],
}

export const COMPONENT_RATED_SPECS: Record<
  ComponentType,
  Array<{ label: string; value: string }>
> = {
  transformer: [
    { label: "Rated Voltage", value: "220 kV" },
    { label: "Rated Current", value: "1250 A" },
    { label: "Base MVA", value: "250 MVA" },
    { label: "Cooling Class", value: "ONAN / ONAF" },
  ],
  bayLines: [
    { label: "Line Voltage", value: "220 kV" },
    { label: "CT Ratio", value: "2000 / 1 A" },
    { label: "PT Ratio", value: "220 kV / √3" },
    { label: "Max THD", value: "< 5%" },
  ],
  circuitBreaker: [
    { label: "Rated Voltage", value: "220 kV" },
    { label: "Breaking Current", value: "40 kA" },
    { label: "SF6 Pressure", value: "6 bar" },
    { label: "Operating Duty", value: "O-0.3s-CO-3min-CO" },
  ],
  isolator: [
    { label: "Rated Voltage", value: "220 kV" },
    { label: "Rated Current", value: "2000 A" },
    { label: "Insulation Level", value: "1050 kVp BIL" },
    { label: "Motor Torque", value: "250 Nm" },
  ],
  busbar: [
    { label: "Rated Voltage", value: "220 kV" },
    { label: "Rated Current", value: "3150 A" },
    { label: "Conductors", value: "Quad Moose" },
    { label: "Short-Time Current", value: "40 kA / 3s" },
  ],
}

export const PARAMETER_THRESHOLDS: Record<
  ComponentType,
  Record<string, ParameterThreshold>
> = {
  transformer: {
    oilTemperature: { warning: 85, critical: 95, unit: "°C", healthyText: "<85°C" },
    windingTemperature: {
      warning: 110,
      critical: 130,
      unit: "°C",
      healthyText: "<110°C",
    },
    hotspotTemperature: {
      warning: 120,
      critical: 140,
      unit: "°C",
      healthyText: "<120°C",
    },
    oilMoisture: { warning: 25, critical: 35, unit: "ppm", healthyText: "<25 ppm" },
    hydrogenPPM: {
      warning: 250,
      critical: 300,
      unit: "ppm",
      healthyText: "<250 ppm",
    },
    methanePPM: {
      warning: 80,
      critical: 120,
      unit: "ppm",
      healthyText: "<80 ppm",
    },
    acetylenePPM: {
      warning: 3,
      critical: 5,
      unit: "ppm",
      healthyText: "<3 ppm",
    },
    transformerLoading: {
      warning: 100,
      critical: 110,
      unit: "%",
      healthyText: "<100%",
    },
    tapPosition: {
      warning: 14,
      critical: 16,
      unit: "steps",
      healthyText: "1-17 steps",
    },
    oltcDeviation: {
      warning: 6,
      critical: 10,
      unit: "steps",
      healthyText: "<6 steps",
    },
    vibrationLevel: {
      warning: 5,
      critical: 8,
      unit: "mm/s",
      healthyText: "<5 mm/s",
    },
    noiseLevel: {
      warning: 75,
      critical: 85,
      unit: "dB",
      healthyText: "<75 dB",
    },
    dielectricStrength: {
      warning: 45,
      critical: 35,
      direction: "low",
      unit: "kV",
      healthyText: ">45 kV",
    },
  },
  bayLines: {
    ctBurdenPercent: {
      warning: 100,
      critical: 120,
      unit: "%",
      healthyText: "<100%",
    },
    vtVoltageDeviation: {
      warning: 110,
      critical: 120,
      unit: "%",
      healthyText: "90-110%",
    },
    frequencyHz: {
      warning: 50.3,
      critical: 50.6,
      unit: "Hz",
      healthyText: "49.7-50.3 Hz",
    },
    powerFactor: {
      warning: 0.95,
      critical: 0.9,
      direction: "low",
      unit: "p.u.",
      healthyText: ">0.95",
    },
    lineCurrent: {
      warning: 90,
      critical: 110,
      unit: "%",
      healthyText: "<90%",
    },
    harmonicsTHDPercent: {
      warning: 4,
      critical: 6,
      unit: "%",
      healthyText: "<4%",
    },
  },
  circuitBreaker: {
    sf6DensityPercent: {
      warning: 85,
      critical: 75,
      direction: "low",
      unit: "%",
      healthyText: ">85%",
    },
    operationCountPercent: {
      warning: 70,
      critical: 90,
      unit: "%",
      healthyText: "<70%",
    },
    poleTemperature: {
      warning: 70,
      critical: 90,
      unit: "°C",
      healthyText: "<70°C",
    },
    closeCoilResistance: {
      warning: 15,
      critical: 20,
      unit: "mΩ",
      healthyText: "<15 mΩ",
    },
    mechanismWearLevel: {
      warning: 60,
      critical: 80,
      unit: "%",
      healthyText: "<60%",
    },
    lastTripTimeMs: {
      warning: 60,
      critical: 80,
      unit: "ms",
      healthyText: "<60 ms",
    },
  },
  isolator: {
    contactResistanceMicroOhm: {
      warning: 200,
      critical: 500,
      unit: "µΩ",
      healthyText: "<200 µΩ",
    },
    motorTorqueNm: {
      warning: 200,
      critical: 250,
      unit: "Nm",
      healthyText: "<200 Nm",
    },
    operatingTimeMs: {
      warning: 300,
      critical: 500,
      unit: "ms",
      healthyText: "<300 ms",
    },
    motorCurrent: {
      warning: 10,
      critical: 15,
      unit: "A",
      healthyText: "<10 A",
    },
    positionMismatchPercent: {
      warning: 3,
      critical: 6,
      unit: "%",
      healthyText: "<3%",
    },
    bladeAngleDeg: {
      warning: 10,
      critical: 15,
      unit: "°",
      healthyText: "<10° offset",
    },
  },
  busbar: {
    busbarTemperature: {
      warning: 70,
      critical: 90,
      unit: "°C",
      healthyText: "<70°C",
    },
    jointHotspotTemp: {
      warning: 95,
      critical: 110,
      unit: "°C",
      healthyText: "<95°C",
    },
    busbarLoadPercent: {
      warning: 90,
      critical: 110,
      unit: "%",
      healthyText: "<90%",
    },
    busbarCurrentA: {
      warning: 2800,
      critical: 3200,
      unit: "A",
      healthyText: "<2800 A",
    },
    impedanceMicroOhm: {
      warning: 65,
      critical: 80,
      unit: "µΩ",
      healthyText: "<65 µΩ",
    },
  },
}

export interface FaultDetail {
  type: string
  severity: "low" | "medium" | "high" | "critical"
  cause: string
  affected: string
  action: string
}

export const FAULT_LIBRARY: Record<ComponentType, FaultDetail[]> = {
  transformer: [
    {
      type: "Thermal Overload",
      severity: "high",
      cause: "Sustained winding temperature above safe limit",
      affected: "Windings, insulation, core clamps",
      action: "Reduce load, enhance cooling, inspect fans & oil pumps",
    },
    {
      type: "OLTC Imbalance",
      severity: "medium",
      cause: "Tap deviation beyond ±6 steps",
      affected: "OLTC contacts, motor drive",
      action: "Calibrate OLTC, inspect resistor contacts, lubricate drive",
    },
    {
      type: "Gas Accumulation",
      severity: "high",
      cause: "Hydrogen & acetylene levels trending upward",
      affected: "Active part & oil",
      action: "Run DGA, locate source hot spot, consider partial de-gassing",
    },
    {
      type: "Insulation Aging",
      severity: "medium",
      cause: "Oil dielectric strength reduction & high moisture",
      affected: "Solid insulation, bushings",
      action: "Process oil, dry out cellulose, plan insulation tests",
    },
  ],
  bayLines: [
    {
      type: "CT Saturation",
      severity: "high",
      cause: "CT loading exceeding rated burden",
      affected: "Protection accuracy, metering",
      action: "Balance load, inspect CT secondary wiring, recalibrate relays",
    },
    {
      type: "VT Instability",
      severity: "medium",
      cause: "Voltage deviation beyond 10%",
      affected: "Voltage dependent relays",
      action: "Check VT fuse links, verify secondary burden, review voltage control",
    },
    {
      type: "Power Factor Deterioration",
      severity: "medium",
      cause: "PF below 0.95",
      affected: "Line losses, capacitor banks",
      action: "Switch capacitor banks, investigate unbalanced loads",
    },
  ],
  circuitBreaker: [
    {
      type: "SF6 Leakage",
      severity: "critical",
      cause: "Density below alarm threshold",
      affected: "Interrupting chamber",
      action: "Isolate breaker, locate leak, refill & leak test",
    },
    {
      type: "Mechanism Fatigue",
      severity: "high",
      cause: "Operation count beyond 70%",
      affected: "Mechanical linkage",
      action: "Inspect bearings, lubricate joints, verify springs",
    },
    {
      type: "Pole Overheating",
      severity: "medium",
      cause: "Pole temperature exceeding 70°C",
      affected: "Contacts, SF6 gas",
      action: "Infrared inspection, tighten joints, verify cooling",
    },
  ],
  isolator: [
    {
      type: "Contact Deterioration",
      severity: "high",
      cause: "Contact resistance >150 µΩ",
      affected: "Blade fingers",
      action: "Clean contact surfaces, re-tension springs, silver plate if required",
    },
    {
      type: "Misalignment",
      severity: "medium",
      cause: "Position mismatch beyond 3%",
      affected: "Drive linkage",
      action: "Align blades, calibrate position switches, tune motor stops",
    },
  ],
  busbar: [
    {
      type: "Hotspot Development",
      severity: "high",
      cause: "Joint hotspots >95°C",
      affected: "Dividers, spacers, jumpers",
      action: "Thermal scan, tighten joints, clean contact surfaces",
    },
    {
      type: "Overload Thermal Stress",
      severity: "medium",
      cause: "Load >90%",
      affected: "Conductors",
      action: "Redistribute load, review switching, plan uprate",
    },
    {
      type: "Oxidation Resistance Rise",
      severity: "medium",
      cause: "Impedance >65 µΩ",
      affected: "Splices",
      action: "Service joints, apply conductive grease, monitor weekly",
    },
  ],
}

export interface TimeSeriesBlueprint {
  title: string
  parameters: Array<{ key: string; label: string; color: string }>
}

export const TIME_SERIES_BLUEPRINT: Record<
  ComponentType,
  TimeSeriesBlueprint[]
> = {
  transformer: [
    {
      title: "Thermal Profile",
      parameters: [
        { key: "oilTemperature", label: "Oil Temp (°C)", color: "#2563eb" },
        { key: "windingTemperature", label: "Winding Temp (°C)", color: "#f97316" },
        { key: "hotspotTemperature", label: "Hotspot (°C)", color: "#dc2626" },
      ],
    },
    {
      title: "Gas & Moisture",
      parameters: [
        { key: "hydrogenPPM", label: "H₂ (ppm)", color: "#14b8a6" },
        { key: "methanePPM", label: "CH₄ (ppm)", color: "#0ea5e9" },
        { key: "oilMoisture", label: "Moisture (ppm)", color: "#9333ea" },
      ],
    },
    {
      title: "Performance",
      parameters: [
        { key: "transformerLoading", label: "Loading (%)", color: "#10b981" },
        { key: "tapPosition", label: "Tap Position", color: "#f59e0b" },
        { key: "oltcDeviation", label: "OLTC Dev", color: "#7c3aed" },
      ],
    },
  ],
  bayLines: [
    {
      title: "CT / VT Stress",
      parameters: [
        { key: "ctBurdenPercent", label: "CT Load (%)", color: "#2563eb" },
        { key: "vtVoltageDeviation", label: "VT Dev (%)", color: "#dc2626" },
      ],
    },
    {
      title: "System Stability",
      parameters: [
        { key: "frequencyHz", label: "Frequency (Hz)", color: "#0ea5e9" },
        { key: "powerFactor", label: "PF (p.u.)", color: "#10b981" },
      ],
    },
    {
      title: "Line Loading",
      parameters: [
        { key: "lineCurrent", label: "Line Current (%)", color: "#f97316" },
        { key: "harmonicsTHDPercent", label: "THD (%)", color: "#9333ea" },
      ],
    },
  ],
  circuitBreaker: [
    {
      title: "Gas & Mechanism",
      parameters: [
        { key: "sf6DensityPercent", label: "SF6 Density (%)", color: "#0ea5e9" },
        { key: "operationCountPercent", label: "Operations (%)", color: "#f97316" },
      ],
    },
    {
      title: "Thermal / Timing",
      parameters: [
        { key: "poleTemperature", label: "Pole Temp (°C)", color: "#dc2626" },
        { key: "lastTripTimeMs", label: "Trip Time (ms)", color: "#10b981" },
      ],
    },
    {
      title: "Wear Indicators",
      parameters: [
        { key: "closeCoilResistance", label: "Coil Res (mΩ)", color: "#9333ea" },
        { key: "mechanismWearLevel", label: "Wear (%)", color: "#2563eb" },
      ],
    },
  ],
  isolator: [
    {
      title: "Contact Performance",
      parameters: [
        { key: "contactResistanceMicroOhm", label: "Resistance (µΩ)", color: "#dc2626" },
        { key: "motorTorqueNm", label: "Torque (Nm)", color: "#2563eb" },
      ],
    },
    {
      title: "Alignment",
      parameters: [
        { key: "positionMismatchPercent", label: "Mismatch (%)", color: "#0ea5e9" },
        { key: "bladeAngleDeg", label: "Blade Angle (°)", color: "#f97316" },
      ],
    },
  ],
  busbar: [
    {
      title: "Thermal Behavior",
      parameters: [
        { key: "busbarTemperature", label: "Busbar Temp (°C)", color: "#dc2626" },
        { key: "jointHotspotTemp", label: "Joint Hotspot (°C)", color: "#f97316" },
      ],
    },
    {
      title: "Loading Profile",
      parameters: [
        { key: "busbarLoadPercent", label: "Load (%)", color: "#2563eb" },
        { key: "busbarCurrentA", label: "Current (A)", color: "#0ea5e9" },
      ],
    },
    {
      title: "Resistance Trend",
      parameters: [
        { key: "impedanceMicroOhm", label: "Impedance (µΩ)", color: "#10b981" },
      ],
    },
  ],
}

export const PARAMETER_DETAIL_OVERRIDES: Record<
  string,
  {
    title: string
    definition: string
    healthyRange: string
    unit?: string
  }
> = {
  hotspotTemperature: {
    title: "Hotspot Temperature",
    definition:
      "Calculated hottest spot inside the transformer winding insulation. Indicates accelerated ageing risk.",
    healthyRange: "< 120°C recommended; absolute limit 140°C",
    unit: "°C",
  },
  oilMoisture: {
    title: "Oil Moisture",
    definition:
      "Dissolved moisture content in transformer insulating oil. Drives dielectric strength.",
    healthyRange: "< 25 ppm for EHV class transformers",
    unit: "ppm",
  },
  hydrogenPPM: {
    title: "Hydrogen (H₂)",
    definition: "Hydrogen gas generated inside transformer oil due to overheating faults.",
    healthyRange: "< 300 ppm; rising trend indicates incipient fault",
    unit: "ppm",
  },
  methanePPM: {
    title: "Methane (CH₄)",
    definition:
      "Gas produced due to moderate overheating (<300°C). Useful in DGA pattern recognition.",
    healthyRange: "< 80 ppm steady state",
    unit: "ppm",
  },
  acetylenePPM: {
    title: "Acetylene (C₂H₂)",
    definition: "Indicates high-energy arcing inside transformer oil.",
    healthyRange: "< 20 ppm; any sustained rise is critical",
    unit: "ppm",
  },
  transformerLoading: {
    title: "Transformer Loading",
    definition: "Percentage loading with respect to nameplate MVA.",
    healthyRange: "< 110% for short duration, <90% continuous",
    unit: "%",
  },
  tapPosition: {
    title: "Tap Position",
    definition: "Current position of OLTC relative to nominal tapping.",
    healthyRange: "±8 steps from nominal for regulated operation",
    unit: "steps",
  },
  oltcDeviation: {
    title: "Tap Deviation",
    definition: "Actual vs commanded OLTC position. Higher deviation indicates sticking contacts.",
    healthyRange: "< 6 steps deviation",
    unit: "steps",
  },
  vibrationLevel: {
    title: "Vibration Level",
    definition: "Overall vibration severity measured on transformer tank.",
    healthyRange: "< 5 mm/s RMS",
    unit: "mm/s",
  },
  noiseLevel: {
    title: "Noise Level",
    definition: "Audible noise measured near transformer body.",
    healthyRange: "< 75 dB(A)",
    unit: "dB",
  },
  dielectricStrength: {
    title: "Oil Dielectric Strength",
    definition: "Breakdown voltage of insulating oil measured using BDV kit.",
    healthyRange: "> 45 kV for 2.5 mm gap",
    unit: "kV",
  },
}


