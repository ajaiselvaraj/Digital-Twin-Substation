import type { ComponentDefinition, DiagnosisComponentKey } from "./types"

export const COMPONENT_DEFINITIONS: Record<DiagnosisComponentKey, ComponentDefinition> = {
  bayLines: {
    title: "Bays",
    description: "Power flow health across each outgoing feeder and bus section.",
    category: "primary",
    parameters: [
      { key: "busVoltage", label: "Bus Voltage", unit: "kV", min: 380, max: 420, minAlarm: 370, maxAlarm: 430, sensor: "PT / CVT", iecLn: "MMXU.Voltage" },
      { key: "lineCurrent", label: "Line Current", unit: "A", min: 100, max: 3000, minAlarm: 0, maxAlarm: 4000, sensor: "CT", iecLn: "MMXU.Current" },
      { key: "mw", label: "Active Power (MW)", unit: "MW", min: 10, max: 1500, minAlarm: -100, maxAlarm: 2000, sensor: "Energy Meter", iecLn: "MMXU.TotW" },
      { key: "mvar", label: "Reactive Power (MVAR)", unit: "MVAR", min: -500, max: 500, minAlarm: -800, maxAlarm: 800, sensor: "Meter", iecLn: "MMXU.TotVAr" },
      { key: "powerFactor", label: "Power Factor", unit: "p.u.", min: 0.7, max: 1.0, minAlarm: 0.5, maxAlarm: 1.1, sensor: "Meter", iecLn: "MMXU.PF" },
      { key: "frequency", label: "Frequency", unit: "Hz", min: 49.5, max: 50.5, minAlarm: 47, maxAlarm: 52, sensor: "PMU", iecLn: "MMXU.Hz" },
      { key: "voltageAngle", label: "Voltage Angle", unit: "°", min: -180, max: 180, minAlarm: -180, maxAlarm: 180, sensor: "PMU", iecLn: "PMU.VoltageAngle" },
      { key: "currentAngle", label: "Current Angle", unit: "°", min: -180, max: 180, minAlarm: -180, maxAlarm: 180, sensor: "PMU", iecLn: "PMU.CurrentAngle" },
      { key: "rocof", label: "ROCOF", unit: "Hz/s", min: 0, max: 5, minAlarm: -10, maxAlarm: 10, sensor: "PMU", iecLn: "PMU.ROCOF" },
      { key: "thd", label: "THD", unit: "%", min: 0, max: 5, minAlarm: 0, maxAlarm: 8, sensor: "PQ Meter", iecLn: "PQTHD" },
    ],
    maintenancePlaybook: [
      {
        title: "Power Swing / Voltage Sag workflow",
        steps: [
          "Verify relay flags and synch-check permissives.",
          "Compare PMU phasors with adjacent bays for islanding.",
          "Dispatch crew for patrolling if swing persists > 15 min.",
        ],
      },
    ],
    mlModels: [
      { key: "lstm", label: "LSTM Forecast", description: "Short-term MW & voltage prediction" },
      { key: "isolationForest", label: "Isolation Forest", description: "Outlier detection from ROCOF + THD" },
      { key: "xgboost", label: "XGBoost Fault Classifier", description: "Multi-class power flow fault" },
    ],
    defaultTrends: ["busVoltage", "lineCurrent", "mw"],
  },
  transformer: {
    title: "Transformer",
    description: "Core, winding and insulation diagnostics.",
    category: "primary",
    parameters: [
      { key: "windingTemp", label: "Winding Temperature", unit: "°C", min: 40, max: 90, minAlarm: 35, maxAlarm: 85 },
      { key: "oilTemp", label: "Oil Temperature", unit: "°C", min: 30, max: 80, minAlarm: 25, maxAlarm: 85 },
      { key: "loading", label: "Loading", unit: "%", min: 20, max: 110, minAlarm: 0, maxAlarm: 120 },
      { key: "tapPosition", label: "Tap Position", unit: "step", min: 1, max: 17, minAlarm: 1, maxAlarm: 17 },
      { key: "hydrogen", label: "Hydrogen (ppm)", unit: "ppm", min: 10, max: 300, minAlarm: 0, maxAlarm: 350 },
      { key: "acetylene", label: "Acetylene (ppm)", unit: "ppm", min: 0, max: 5, minAlarm: 5, maxAlarm: 50 },
      { key: "oilLevel", label: "Oil Level", unit: "%", min: 90, max: 100, minAlarm: 85, maxAlarm: 100 },
      { key: "moisture", label: "Moisture", unit: "ppm", min: 15, max: 20, minAlarm: 10, maxAlarm: 25 },
      { key: "buchholz", label: "Buchholz", type: "status", description: "Alarm / Trip" },
      { key: "cooling", label: "Cooling Status", type: "status" },
    ],
    maintenancePlaybook: [
      {
        title: "Thermal fault workflow",
        steps: [
          "Cross check DGA ratios with Duval triangle.",
          "Force cooling ON and trend winding temp for 30 min.",
          "Plan load transfer if hotspot persists > 110°C.",
        ],
      },
    ],
    mlModels: [
      { key: "lstm", label: "Thermal LSTM", description: "Predicts winding temp & loading" },
      { key: "isolationForest", label: "Gas Anomaly", description: "Hydrogen + acetylene divergence" },
      { key: "xgboost", label: "Fault Mode Classifier", description: "Identifies winding / insulation issues" },
    ],
    defaultTrends: ["windingTemp", "oilTemp", "loading"],
  },
  circuitBreaker: {
    title: "Circuit Breaker",
    description: "Mechanism & SF6 diagnostics.",
    category: "primary",
    parameters: [
      { key: "breakerStatus", label: "Breaker Status", type: "status" },
      { key: "operationTime", label: "Operation Time", unit: "ms", min: 30, max: 70, minAlarm: 10, maxAlarm: 200 },
      { key: "sf6Density", label: "SF6 Density", unit: "bar", min: 6, max: 8, minAlarm: 5.5, maxAlarm: 5.5 },
    ],
    maintenancePlaybook: [
      {
        title: "Slow operation workflow",
        steps: [
          "Check spring charge + hydraulic pressure.",
          "Review interrupter wear counters.",
          "Schedule mechanism overhaul if deviation > 40 ms.",
        ],
      },
    ],
    mlModels: [
      { key: "lstm", label: "Stroke LSTM", description: "Trends mechanism timing" },
      { key: "isolationForest", label: "SF6 Leak Detector", description: "Density vs temperature outliers" },
      { key: "xgboost", label: "Trip Reliability", description: "Predicts failure-to-trip probability" },
    ],
    defaultTrends: ["operationTime", "sf6Density"],
  },
  busbar: {
    title: "Busbar",
    description: "Thermal and load monitoring.",
    category: "primary",
    parameters: [
      { key: "busVoltage", label: "Bus Voltage", unit: "kV", min: 380, max: 420, minAlarm: 370, maxAlarm: 430 },
      { key: "busCurrent", label: "Bus Current", unit: "A", min: 100, max: 5000, minAlarm: 0, maxAlarm: 6000 },
      { key: "busTemperature", label: "Bus Temperature", unit: "°C", min: 40, max: 90, minAlarm: 30, maxAlarm: 100 },
    ],
    maintenancePlaybook: [
      {
        title: "Thermal hotspot workflow",
        steps: [
          "Trigger IR scan for affected phase.",
          "Tighten spacer clamps and verify torque.",
          "Plan load redistribution if hotspot > 130°C.",
        ],
      },
    ],
    mlModels: [
      { key: "lstm", label: "Load LSTM", description: "Forecast current loading" },
      { key: "isolationForest", label: "IR Anomaly", description: "Detects temperature spikes" },
      { key: "xgboost", label: "Fault Classifier", description: "Predicts bus faults (AB, BC, CA)" },
    ],
    defaultTrends: ["busVoltage", "busCurrent", "busTemperature"],
  },
  isolator: {
    title: "Isolator",
    description: "Mechanical drive diagnostics.",
    category: "primary",
    parameters: [
      { key: "status", label: "Status", type: "status" },
      { key: "driveTorque", label: "Drive Torque", unit: "Nm", min: 20, max: 200, minAlarm: 10, maxAlarm: 250 },
      { key: "operatingTime", label: "Operating Time", unit: "ms", min: 100, max: 300, minAlarm: 50, maxAlarm: 500 },
      { key: "contactResistance", label: "Contact Resistance", unit: "µΩ", min: 10, max: 200, minAlarm: 200, maxAlarm: 500 },
      { key: "motorCurrent", label: "Motor Current", unit: "A", min: 2, max: 10, minAlarm: 1, maxAlarm: 15 },
    ],
    maintenancePlaybook: [
      {
        title: "High resistance workflow",
        steps: [
          "Clean and polish main contacts.",
          "Measure torque & lubricate drive.",
          "Replace contact set if > 300 µΩ persists.",
        ],
      },
    ],
    mlModels: [
      { key: "lstm", label: "Motion LSTM", description: "Trends drive torque profile" },
      { key: "isolationForest", label: "Contact Outlier", description: "Detects resistance spikes" },
      { key: "xgboost", label: "Failure Predictor", description: "Predicts drive / contact faults" },
    ],
    defaultTrends: ["driveTorque", "contactResistance"],
  },
  relay: {
    title: "Protection Relay",
    description: "Logic health and trip analytics.",
    category: "secondary",
    parameters: [
      { key: "relayStatus", label: "Status", type: "status" },
      { key: "tripCount", label: "Trip Count", unit: "count", min: 0, max: 5000 },
      { key: "firmwareVersion", label: "Firmware", type: "status" },
      { key: "selfTest", label: "Self Test", type: "status" },
    ],
    maintenancePlaybook: [
      {
        title: "Firmware mismatch workflow",
        steps: [
          "Validate checksum vs golden image.",
          "Backup settings & event records.",
          "Reload firmware and run functional test.",
        ],
      },
    ],
    mlModels: [
      { key: "lstm", label: "Trip Density LSTM", description: "Predicts trip bursts" },
      { key: "isolationForest", label: "Logic Anomaly", description: "Detects enabling/disabling anomalies" },
      { key: "xgboost", label: "Misoperation Risk", description: "Predicts false trips" },
    ],
    defaultTrends: ["tripCount"],
  },
  pmu: {
    title: "PMU",
    description: "Synchrophasor data quality.",
    category: "secondary",
    parameters: [
      { key: "gpsSync", label: "GPS Sync", type: "status" },
      { key: "phasorAngle", label: "Phasor Angle", unit: "°", min: -180, max: 180, minAlarm: -180, maxAlarm: 180 },
      { key: "phasorMagnitude", label: "Phasor Magnitude", unit: "p.u.", min: 0.9, max: 1.1, minAlarm: 0.8, maxAlarm: 1.2 },
      { key: "rocof", label: "ROCOF", unit: "Hz/s", min: 0, max: 5, minAlarm: -10, maxAlarm: 10 },
    ],
    maintenancePlaybook: [
      {
        title: "Time-sync workflow",
        steps: [
          "Check GPS antenna & cable loss.",
          "Validate IRIG-B / PTP feed.",
          "Recalibrate time source if unlock > 60s.",
        ],
      },
    ],
    mlModels: [
      { key: "lstm", label: "Synch LSTM", description: "Predicts drift in phasors" },
      { key: "isolationForest", label: "Data Quality", description: "Flags missing frames" },
      { key: "xgboost", label: "Angle Stability", description: "Predicts oscillations" },
    ],
    defaultTrends: ["phasorAngle", "phasorMagnitude"],
  },
  gis: {
    title: "GIS",
    description: "Gas insulated switchgear diagnostics.",
    category: "secondary",
    parameters: [
      { key: "sf6Pressure", label: "SF6 Pressure", unit: "bar", min: 6, max: 7, minAlarm: 5.5, maxAlarm: 5.5 },
      { key: "pdLevel", label: "Partial Discharge", unit: "pC", min: 0, max: 50, minAlarm: 50, maxAlarm: 2000 },
      { key: "gasMoisture", label: "Gas Moisture", unit: "ppm", min: 0, max: 50, minAlarm: 50, maxAlarm: 200 },
    ],
    maintenancePlaybook: [
      {
        title: "PD workflow",
        steps: [
          "Pinpoint compartment using UHF sensors.",
          "Schedule controlled outage for inspection.",
          "Purge compartment and refill SF6 if needed.",
        ],
      },
    ],
    mlModels: [
      { key: "lstm", label: "Pressure LSTM", description: "Forecast SF6 leakage trend" },
      { key: "isolationForest", label: "PD Outlier", description: "Deterministic PD spikes" },
      { key: "xgboost", label: "Fault Severity", description: "Estimates conductor-to-enclosure faults" },
    ],
    defaultTrends: ["sf6Pressure", "pdLevel"],
  },
  battery: {
    title: "Battery",
    description: "DC auxiliary supply health.",
    category: "secondary",
    parameters: [
      { key: "batteryVoltage", label: "Voltage", unit: "V", min: 198, max: 264, minAlarm: 180, maxAlarm: 280 },
      { key: "batteryCurrent", label: "Current", unit: "A", min: 0, max: 100, minAlarm: 0, maxAlarm: 150 },
      { key: "soc", label: "State of Charge", unit: "%", min: 20, max: 100, minAlarm: 10, maxAlarm: 100 },
      { key: "temperature", label: "Temperature", unit: "°C", min: 10, max: 50, minAlarm: 0, maxAlarm: 60 },
    ],
    maintenancePlaybook: [
      {
        title: "Low SOC workflow",
        steps: [
          "Check charger settings & float voltage.",
          "Perform cell equalisation.",
          "Plan cell replacement if IR high.",
        ],
      },
    ],
    mlModels: [
      { key: "lstm", label: "SOC LSTM", description: "Predicts discharge curve" },
      { key: "isolationForest", label: "Cell Outlier", description: "Detects failing cells" },
      { key: "xgboost", label: "Backup Risk", description: "Estimates DC supply readiness" },
    ],
    defaultTrends: ["batteryVoltage", "soc"],
  },
  environment: {
    title: "Ambient & Rooms",
    description: "Environmental stress and weather links.",
    category: "secondary",
    parameters: [
      { key: "ambientTemperature", label: "Ambient Temperature", unit: "°C", min: -10, max: 55, minAlarm: -20, maxAlarm: 60 },
      { key: "humidity", label: "Humidity", unit: "%", min: 10, max: 80, minAlarm: 0, maxAlarm: 90 },
      { key: "windSpeed", label: "Wind Speed", unit: "m/s", min: 0, max: 40, minAlarm: 0, maxAlarm: 60 },
      { key: "solarIrradiance", label: "Solar Irradiance", unit: "W/m²", min: 0, max: 1000, minAlarm: 0, maxAlarm: 1200 },
    ],
    maintenancePlaybook: [
      {
        title: "Thermal stress workflow",
        steps: [
          "Adjust transformer cooling schedule.",
          "Check HVAC filters and airflow.",
          "Issue derating advisory if heat index > 50°C.",
        ],
      },
    ],
    mlModels: [
      { key: "lstm", label: "Heat Index LSTM", description: "Predicts ambient peaks" },
      { key: "isolationForest", label: "Humidity Outlier", description: "Flags moisture spikes" },
      { key: "xgboost", label: "Stress Classifier", description: "Correlates environment with equipment risk" },
    ],
    defaultTrends: ["ambientTemperature", "humidity"],
  },
}

export const PRIMARY_COMPONENTS: DiagnosisComponentKey[] = ["bayLines", "transformer", "circuitBreaker", "busbar", "isolator"]

