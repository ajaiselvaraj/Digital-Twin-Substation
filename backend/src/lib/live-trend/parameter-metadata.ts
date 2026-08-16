// Parameter metadata for value description popups
export interface ParameterMetadata {
  name: string
  meaning: string
  unit: string
  typicalRange: string
  sensorType: string
  iec61850LogicalNode: string
  useCase: string
  equipment?: string
  minAlarm?: string
  maxAlarm?: string
  accuracy?: string
}

export const PARAMETER_METADATA: Record<string, ParameterMetadata> = {
  // Substation Parameters
  voltage: {
    name: "Voltage",
    meaning: "The electrical potential difference between two points in the power system",
    unit: "kV",
    typicalRange: "220-400 kV",
    sensorType: "Voltage Transformer (VT)",
    iec61850LogicalNode: "MMXU",
    useCase: "Monitor system voltage levels to ensure stable power delivery"
  },
  mw: {
    name: "Active Power",
    meaning: "The real power flowing through the system, measured in megawatts",
    unit: "MW",
    typicalRange: "0-500 MW",
    sensorType: "Current Transformer (CT) + Voltage Transformer (VT)",
    iec61850LogicalNode: "MMXU",
    useCase: "Track power flow and loading conditions"
  },
  mvar: {
    name: "Reactive Power",
    meaning: "The imaginary component of power that supports voltage levels",
    unit: "MVAR",
    typicalRange: "-100 to +100 MVAR",
    sensorType: "CT + VT",
    iec61850LogicalNode: "MMXU",
    useCase: "Monitor reactive power for voltage control"
  },
  frequency: {
    name: "Frequency",
    meaning: "The rate at which alternating current changes direction per second",
    unit: "Hz",
    typicalRange: "49.5-50.5 Hz",
    sensorType: "Frequency Meter",
    iec61850LogicalNode: "MMXU",
    useCase: "Ensure grid frequency stability"
  },
  powerFactor: {
    name: "Power Factor",
    meaning: "The ratio of real power to apparent power, indicating efficiency",
    unit: "p.u.",
    typicalRange: "0.90-1.00",
    sensorType: "CT + VT",
    iec61850LogicalNode: "MMXU",
    useCase: "Optimize power system efficiency"
  },
  current: {
    name: "Current",
    meaning: "The electrical current flowing through the system",
    unit: "A",
    typicalRange: "500-2000 A",
    sensorType: "Current Transformer (CT)",
    iec61850LogicalNode: "MMXU",
    useCase: "Monitor current levels and prevent overload"
  },
  busVoltage: {
    name: "Bus Voltage",
    meaning: "Voltage magnitude measured on the transmission bus",
    unit: "kV",
    typicalRange: "380-420 kV",
    sensorType: "Voltage Transformer (PT/CVT)",
    iec61850LogicalNode: "MMXU.Voltage",
    useCase: "Assess load flow and voltage profile"
  },
  lineCurrent: {
    name: "Line Current",
    meaning: "Current magnitude flowing through the transmission line",
    unit: "A",
    typicalRange: "100-3000 A",
    sensorType: "CT / Digital Meter",
    iec61850LogicalNode: "MMXU.Current",
    useCase: "Monitor line loading and detect faults"
  },
  voltageAngle: {
    name: "Voltage Angle",
    meaning: "Instantaneous phase angle of the voltage vector",
    unit: "degrees",
    typicalRange: "-180° to +180°",
    sensorType: "PMU (C37.118)",
    iec61850LogicalNode: "PMU.VoltageAngle",
    useCase: "State estimation and dynamic stability studies"
  },
  currentAngle: {
    name: "Current Angle",
    meaning: "Instantaneous phase angle of the current vector",
    unit: "degrees",
    typicalRange: "-180° to +180°",
    sensorType: "PMU",
    iec61850LogicalNode: "PMU.CurrentAngle",
    useCase: "Stability modelling and oscillation tracking"
  },
  rocof: {
    name: "Rate of Change of Frequency",
    meaning: "First derivative of system frequency over time",
    unit: "Hz/s",
    typicalRange: "0-5 Hz/s",
    sensorType: "PMU",
    iec61850LogicalNode: "PMU.ROCOF",
    useCase: "Disturbance detection and islanding schemes"
  },
  thd: {
    name: "Total Harmonic Distortion",
    meaning: "Aggregate distortion level of the waveform",
    unit: "%",
    typicalRange: "0-5%",
    sensorType: "Power Quality Meter",
    iec61850LogicalNode: "PQTHD",
    useCase: "Power quality supervision"
  },
  apparentPower: {
    name: "Apparent Power",
    meaning: "The product of voltage and current, representing total power in the system",
    unit: "MVA",
    typicalRange: "200-400 MVA",
    sensorType: "CT + VT",
    iec61850LogicalNode: "MMXU",
    useCase: "Monitor total power capacity utilization"
  },
  phaseVoltageA: {
    name: "Phase Voltage A",
    meaning: "Voltage of phase A in three-phase system",
    unit: "kV",
    typicalRange: "190-230 kV",
    sensorType: "Voltage Transformer (VT)",
    iec61850LogicalNode: "MMXU",
    useCase: "Monitor individual phase voltage for balanced operation"
  },
  phaseVoltageB: {
    name: "Phase Voltage B",
    meaning: "Voltage of phase B in three-phase system",
    unit: "kV",
    typicalRange: "190-230 kV",
    sensorType: "Voltage Transformer (VT)",
    iec61850LogicalNode: "MMXU",
    useCase: "Monitor individual phase voltage for balanced operation"
  },
  phaseVoltageC: {
    name: "Phase Voltage C",
    meaning: "Voltage of phase C in three-phase system",
    unit: "kV",
    typicalRange: "190-230 kV",
    sensorType: "Voltage Transformer (VT)",
    iec61850LogicalNode: "MMXU",
    useCase: "Monitor individual phase voltage for balanced operation"
  },
  phaseCurrentA: {
    name: "Phase Current A",
    meaning: "Current of phase A in three-phase system",
    unit: "A",
    typicalRange: "500-2000 A",
    sensorType: "Current Transformer (CT)",
    iec61850LogicalNode: "MMXU",
    useCase: "Monitor individual phase current for balanced loading"
  },
  phaseCurrentB: {
    name: "Phase Current B",
    meaning: "Current of phase B in three-phase system",
    unit: "A",
    typicalRange: "500-2000 A",
    sensorType: "Current Transformer (CT)",
    iec61850LogicalNode: "MMXU",
    useCase: "Monitor individual phase current for balanced loading"
  },
  phaseCurrentC: {
    name: "Phase Current C",
    meaning: "Current of phase C in three-phase system",
    unit: "A",
    typicalRange: "500-2000 A",
    sensorType: "Current Transformer (CT)",
    iec61850LogicalNode: "MMXU",
    useCase: "Monitor individual phase current for balanced loading"
  },

  // Transformer Parameters
  oilLevel: {
    name: "Oil Level Gauge",
    meaning: "The level of insulating oil in the transformer tank",
    unit: "%",
    typicalRange: "90-100%",
    sensorType: "Float Switch / Level Sensor",
    iec61850LogicalNode: "YPTR",
    useCase: "Prevent transformer damage from low oil levels"
  },
  oilTemperature: {
    name: "Oil Temperature",
    meaning: "Temperature of the transformer insulating oil",
    unit: "°C",
    typicalRange: "30-80°C",
    sensorType: "RTD / Thermocouple",
    iec61850LogicalNode: "YPTR",
    useCase: "Monitor thermal conditions and prevent overheating"
  },
  gasLevel: {
    name: "Gas Level",
    meaning: "Concentration of dissolved gases in transformer oil (DGA)",
    unit: "ppm",
    typicalRange: "0-700 ppm",
    sensorType: "Gas Chromatograph / DGA Sensor",
    iec61850LogicalNode: "YPTR",
    useCase: "Early detection of transformer faults and degradation"
  },
  windingTemperature: {
    name: "Winding Temperature",
    meaning: "Temperature of transformer windings during operation",
    unit: "°C",
    typicalRange: "40-90°C",
    sensorType: "Winding Temperature Indicator (WTI)",
    iec61850LogicalNode: "YPTR",
    useCase: "Protect windings from thermal damage"
  },
  tapPosition: {
    name: "OLTC Tap Position",
    meaning: "Current position of On-Load Tap Changer for voltage regulation",
    unit: "Steps",
    typicalRange: "±16 steps from nominal",
    sensorType: "Position Sensor",
    iec61850LogicalNode: "ATCC",
    useCase: "Monitor tap changer position and deviation from nominal"
  },
  transformerLoading: {
    name: "Transformer Loading",
    meaning: "Percentage loading of transformer nameplate capacity",
    unit: "% rated",
    typicalRange: "20-130%",
    sensorType: "Meter / Relay (derived)",
    iec61850LogicalNode: "TCTR.Load",
    useCase: "Thermal modelling and overload protection"
  },
  hydrogenGas: {
    name: "Hydrogen Gas",
    meaning: "Hydrogen concentration derived from online DGA",
    unit: "ppm",
    typicalRange: "10-500 ppm",
    sensorType: "Online DGA",
    iec61850LogicalNode: "DGA.H2",
    useCase: "Incipient fault detection"
  },
  acetyleneGas: {
    name: "Acetylene Gas",
    meaning: "Acetylene accumulation indicative of arcing faults",
    unit: "ppm",
    typicalRange: "0-5 ppm",
    sensorType: "Online DGA",
    iec61850LogicalNode: "DGA.C2H2",
    useCase: "Detect arcing inside transformer"
  },
  oilMoisture: {
    name: "Oil Moisture",
    meaning: "Moisture content dissolved in transformer oil",
    unit: "ppm",
    typicalRange: "5-30 ppm",
    sensorType: "Moisture Sensor / Lab",
    iec61850LogicalNode: "DGA.Moisture",
    useCase: "Assess insulation health"
  },
  buchholzAlarm: {
    name: "Buchholz Alarm",
    meaning: "Buchholz relay alarm/trip indication",
    unit: "Alarm/Trip",
    typicalRange: "Alarm or Trip",
    sensorType: "Buchholz Relay",
    iec61850LogicalNode: "TCTR.Buchholz",
    useCase: "Detect internal transformer faults"
  },
  coolingStatus: {
    name: "Cooling Status",
    meaning: "On/Off status of transformer cooling bank",
    unit: "ON/OFF",
    typicalRange: "ON/OFF",
    sensorType: "Digital Input / Status",
    iec61850LogicalNode: "TCTR.Cooling",
    useCase: "Thermal management"
  },

  // Bays & Power Lines Parameters
  ctLoading: {
    name: "CT Loading",
    meaning: "Current Transformer loading as percentage of rated capacity",
    unit: "%",
    typicalRange: "0-120%",
    sensorType: "Current Transformer (CT)",
    iec61850LogicalNode: "TCTR",
    useCase: "Monitor current levels and prevent CT saturation"
  },
  ptVoltageDeviation: {
    name: "PT Voltage Deviation",
    meaning: "Percentage deviation of voltage from nominal value",
    unit: "%",
    typicalRange: "85-115%",
    sensorType: "Voltage Transformer (PT)",
    iec61850LogicalNode: "TVTR",
    useCase: "Ensure voltage remains within acceptable limits"
  },

  // Circuit Breaker Parameters
  sf6Density: {
    name: "SF6 Density",
    meaning: "Density of SF6 gas in circuit breaker for arc interruption",
    unit: "bar",
    typicalRange: "6-8 bar",
    sensorType: "Density Transducer",
    iec61850LogicalNode: "GIS.SF6",
    useCase: "Ensure proper arc interruption capability"
  },
  operationCount: {
    name: "Operation Count",
    meaning: "Number of operations performed by the circuit breaker",
    unit: "Count",
    typicalRange: "0-10,000 operations",
    sensorType: "Operation Counter",
    iec61850LogicalNode: "XCBR",
    useCase: "Track maintenance intervals and wear"
  },
  breakerStatus: {
    name: "Breaker Status",
    meaning: "Open or closed position of breaker contacts",
    unit: "Open/Closed",
    typicalRange: "Open or Closed",
    sensorType: "Status Contact / IED",
    iec61850LogicalNode: "XCBR.Pos",
    useCase: "Switching coordination and interlocks"
  },
  operationTime: {
    name: "Operation Time",
    meaning: "Measured opening/closing time of breaker",
    unit: "ms",
    typicalRange: "30-70 ms",
    sensorType: "High-speed timer in relay",
    iec61850LogicalNode: "XCBR.OpCnt",
    useCase: "Assess breaker mechanism health"
  },

  // Isolator Parameters
  isolatorStatus: {
    name: "Isolator Status",
    meaning: "Open or closed position of the isolator switch",
    unit: "Open/Closed",
    typicalRange: "Open or Closed",
    sensorType: "Position Switch",
    iec61850LogicalNode: "XSWI",
    useCase: "Monitor switching state for safety and operation"
  },
  driveTorque: {
    name: "Drive Torque",
    meaning: "Mechanical torque delivered by the isolator drive mechanism",
    unit: "N·m",
    typicalRange: "3000-6000 N·m",
    sensorType: "Drive torque transducer",
    iec61850LogicalNode: "XSWI.Drive",
    useCase: "Identify stiff linkages or mechanical binding"
  },
  operatingTime: {
    name: "Operating Time",
    meaning: "Time taken for isolator contacts to travel from open to closed (or vice versa)",
    unit: "s",
    typicalRange: "1.5-5 s",
    sensorType: "Timer in bay controller",
    iec61850LogicalNode: "XSWI.OpTm",
    useCase: "Detect sluggish drives before they fail"
  },
  contactResistance: {
    name: "Contact Resistance",
    meaning: "Micro-ohmic resistance measured across isolator contacts",
    unit: "µΩ",
    typicalRange: "40-150 µΩ",
    sensorType: "Micro-ohm meter / condition monitor",
    iec61850LogicalNode: "XSWI.CRes",
    useCase: "Assess contact health and contamination"
  },
  motorCurrent: {
    name: "Motor Current",
    meaning: "Current drawn by the isolator motor during operation",
    unit: "A",
    typicalRange: "10-25 A",
    sensorType: "Motor current sensor",
    iec61850LogicalNode: "XSWI.Motor",
    useCase: "Predict motor wear or jammed mechanisms"
  },

  // Busbar Parameters
  busbarLoad: {
    name: "Busbar Load",
    meaning: "Current loading of the busbar as percentage of rated capacity",
    unit: "%",
    typicalRange: "0-120%",
    sensorType: "CT",
    iec61850LogicalNode: "MMXU",
    useCase: "Monitor busbar loading and prevent overload"
  },
  busCurrent: {
    name: "Bus Current",
    meaning: "Measured current flowing through the bus section",
    unit: "A",
    typicalRange: "100-5000 A",
    sensorType: "Current Transformer (CT)",
    iec61850LogicalNode: "MMXU",
    useCase: "Track thermal loading margin of the bus"
  },
  busbarTemperature: {
    name: "Busbar Temperature",
    meaning: "Temperature of busbar conductors during operation",
    unit: "°C",
    typicalRange: "40-90°C",
    sensorType: "Thermocouple / RTD",
    iec61850LogicalNode: "MMXU",
    useCase: "Prevent thermal damage from excessive loading"
  },
  jointHotspotTemp: {
    name: "Joint Hotspot Temperature",
    meaning: "Hotspot temperature measured at busbar joints or splices",
    unit: "°C",
    typicalRange: "60-120°C",
    sensorType: "Infrared sensor / RTD",
    iec61850LogicalNode: "MMXU",
    useCase: "Detect localized overheating at bus connections"
  },
  impedanceMicroOhm: {
    name: "Joint Impedance",
    meaning: "Micro-ohmic resistance of busbar joints indicating contact quality",
    unit: "µΩ",
    typicalRange: "30-80 µΩ",
    sensorType: "Micro-ohm meter",
    iec61850LogicalNode: "MMXU",
    useCase: "Monitor joint degradation and oxidation over time"
  },
  busDifferentialCurrent: {
    name: "Bus Differential Current",
    meaning: "Residual differential current used for bus protection",
    unit: "A",
    typicalRange: "0-5 A",
    sensorType: "Differential Relay / CTs",
    iec61850LogicalNode: "BRDM.Diff",
    useCase: "Detect internal bus faults early"
  },

  // Protection Parameters
  relayStatus: {
    name: "Relay Status",
    meaning: "Operational status of protection relay",
    unit: "Active/Inactive",
    typicalRange: "Active or Inactive",
    sensorType: "Digital I/O",
    iec61850LogicalNode: "PTRC",
    useCase: "Monitor protection system availability"
  },
  tripCount: {
    name: "Trip Count",
    meaning: "Number of protection trips initiated by relay",
    unit: "Count",
    typicalRange: "0-1000 trips",
    sensorType: "Digital Counter",
    iec61850LogicalNode: "PTRC",
    useCase: "Track protection operations and fault history"
  },
  earthFaultCurrent: {
    name: "Earth Fault Current",
    meaning: "Calculated magnitude of earth fault current",
    unit: "A",
    typicalRange: "0-500 A",
    sensorType: "Relay (derived)",
    iec61850LogicalNode: "PTOC.Earth",
    useCase: "Detect ground faults rapidly"
  },
  differentialCurrent: {
    name: "Differential Current",
    meaning: "Residual current used in differential protection",
    unit: "A",
    typicalRange: "0-1 A normal",
    sensorType: "Differential Relay",
    iec61850LogicalNode: "TCTR.Diff",
    useCase: "Identify internal transformer/line faults"
  },
  tripCommand: {
    name: "Trip Command",
    meaning: "Digital output issued by protection relay",
    unit: "ON/OFF",
    typicalRange: "Inactive",
    sensorType: "Digital Output",
    iec61850LogicalNode: "XCBR.Trip",
    useCase: "Monitor breaker trip signals"
  },

  // Phasor Parameters
  phaseAngle: {
    name: "Phase Angle",
    meaning: "Phase angle difference between voltage and current",
    unit: "degrees",
    typicalRange: "-180 to +180 degrees",
    sensorType: "PMU (Phasor Measurement Unit)",
    iec61850LogicalNode: "MMXU",
    useCase: "Monitor power system stability and synchronization"
  },
  phasorMagnitude: {
    name: "Phasor Magnitude",
    meaning: "Magnitude of voltage or current phasor",
    unit: "p.u.",
    typicalRange: "0.85-1.15 p.u.",
    sensorType: "PMU",
    iec61850LogicalNode: "MMXU",
    useCase: "Real-time monitoring of power system state"
  },
  voltagePhasor: {
    name: "Voltage Phasor",
    meaning: "Vector magnitude and angle of bus voltage",
    unit: "phasor",
    typicalRange: "Matches bus voltage magnitude",
    sensorType: "PMU",
    iec61850LogicalNode: "PMU.Voltage",
    useCase: "Dynamic stability monitoring"
  },
  currentPhasor: {
    name: "Current Phasor",
    meaning: "Vector magnitude and angle of line current",
    unit: "phasor",
    typicalRange: "Matches line current magnitude",
    sensorType: "PMU",
    iec61850LogicalNode: "PMU.Current",
    useCase: "Dynamic analysis"
  },
  angleDifference: {
    name: "Angle Difference",
    meaning: "Phase angle separation between key buses",
    unit: "degrees",
    typicalRange: "0-40° normal",
    sensorType: "PMU",
    iec61850LogicalNode: "PMU.AngleDiff",
    useCase: "Stability supervision and oscillation detection"
  },

  // GIS Parameters
  gisPressure: {
    name: "GIS Pressure",
    meaning: "Pressure of SF6 gas in Gas Insulated Switchgear",
    unit: "bar",
    typicalRange: "4-6 bar",
    sensorType: "Pressure Transducer",
    iec61850LogicalNode: "XCBR / XSWI",
    useCase: "Ensure proper insulation and arc interruption"
  },
  gisTemperature: {
    name: "GIS Temperature",
    meaning: "Temperature inside GIS compartment",
    unit: "°C",
    typicalRange: "-20 to +40°C",
    sensorType: "RTD",
    iec61850LogicalNode: "XCBR / XSWI",
    useCase: "Monitor thermal conditions and prevent overheating"
  },

  // Battery Parameters
  batteryVoltage: {
    name: "Battery Voltage",
    meaning: "DC voltage of station battery system",
    unit: "V",
    typicalRange: "48-56 V (for 48V system)",
    sensorType: "Voltage Sensor",
    iec61850LogicalNode: "CSWI",
    useCase: "Ensure backup power availability for protection systems"
  },
  batteryCurrent: {
    name: "Battery Current",
    meaning: "Charging or discharging current of battery",
    unit: "A",
    typicalRange: "-50 to +50 A",
    sensorType: "Current Sensor",
    iec61850LogicalNode: "CSWI",
    useCase: "Monitor battery charging status and health"
  },
  batterySOC: {
    name: "Battery State of Charge",
    meaning: "Percentage of battery capacity remaining",
    unit: "%",
    typicalRange: "20-100%",
    sensorType: "Battery Management System",
    iec61850LogicalNode: "CSWI",
    useCase: "Track battery health and remaining capacity"
  },
  dcVoltage: {
    name: "DC Control Voltage",
    meaning: "DC bus voltage supplying control and protection circuits",
    unit: "V",
    typicalRange: "110/220 V ±10%",
    sensorType: "DC Voltage Transducer",
    iec61850LogicalNode: "BAT.Voltage",
    useCase: "Ensure reliable control power"
  },

  // Environment Parameters
  ambientTemperature: {
    name: "Ambient Temperature",
    meaning: "Temperature of surrounding environment",
    unit: "°C",
    typicalRange: "-10 to +50°C",
    sensorType: "Thermocouple / RTD",
    iec61850LogicalNode: "MMXU",
    useCase: "Monitor environmental conditions affecting equipment"
  },
  humidity: {
    name: "Humidity",
    meaning: "Relative humidity in the substation environment",
    unit: "% RH",
    typicalRange: "20-90% RH",
    sensorType: "Hygrometer",
    iec61850LogicalNode: "MMXU",
    useCase: "Prevent condensation and corrosion"
  },
  partialDischarge: {
    name: "Partial Discharge",
    meaning: "Discharge magnitude inside GIS compartments",
    unit: "pC",
    typicalRange: "0-500 pC",
    sensorType: "UHF/HFCT/Acoustic sensors",
    iec61850LogicalNode: "PD.Mon",
    useCase: "Monitor GIS insulation health"
  }
}

