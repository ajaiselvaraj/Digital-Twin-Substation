import { z } from "zod";

/* ---------- Shared Reusable Schemas ---------- */

export const DocumentSchema = z.object({
  url: z.string().url(),
  name: z.string(),
  uploadedAt: z.string().datetime()
});

export const MaintenanceHistorySchema = z.object({
  date: z.string().datetime(),
  vendor: z.string().optional().nullable(),
  technician: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  documents: z.array(DocumentSchema).optional().nullable()
});

export const ComponentReplacedSchema = z.object({
  componentName: z.string(),
  reason: z.string(),
  date: z.string().datetime(),
  vendor: z.string().optional().nullable(),
  cost: z.number().optional().nullable(),
  documents: z.array(DocumentSchema).optional().nullable()
});

export const OperationHistorySchema = z.object({
  date: z.string().datetime(),
  eventType: z.string(),
  description: z.string().optional().nullable(),
  comtradeUrl: z.string().url().optional().nullable()
});

export const ConditionAssessmentSchema = z.object({
  status: z.enum(["Excellent", "Good", "Fair", "Poor"]),
  notes: z.string().optional().nullable()
});

/* ---------- MASTER SUBSTATION SCHEMA ---------- */

export const MasterSubstationSchema = z.object({
  name: z.string().min(3, "Substation name must be at least 3 characters"),
  areaName: z.string().min(2, "Area name must be at least 2 characters"),
  substationCode: z.string().regex(/^[A-Za-z0-9-_]+$/, "Substation code must contain only letters, numbers, hyphens, and underscores"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  installationYear: z.number().min(1950).max(new Date().getFullYear()),
  voltageClass: z.enum(["220kV", "400kV", "440kV"]),
  operator: z.string().min(1, "Operator is required").nullable(),
  notes: z.string().optional().nullable()
});

/* ---------- EQUIPMENT SHARED BASE ---------- */

export const EquipmentBaseSchema = z.object({
  id: z.string().min(1),
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  installationYear: z.number().min(1950).max(new Date().getFullYear()),
  maintenanceHistory: z.array(MaintenanceHistorySchema).optional().default([]),
  componentsReplaced: z.array(ComponentReplacedSchema).optional().default([]),
  operationHistory: z.array(OperationHistorySchema).optional().default([]),
  documents: z.array(DocumentSchema).optional().default([]),
  conditionAssessment: ConditionAssessmentSchema.optional().nullable()
});

/* ---------- EQUIPMENT TYPE-SPECIFIC SCHEMAS ---------- */

/* --- TRANSFORMER --- */
export const TransformerSchema = EquipmentBaseSchema.extend({
  ratedMVA: z.number().positive(),
  HV_kV: z.number().positive(),
  LV_kV: z.number().positive(),
  vectorGroup: z.string(),
  coolingType: z.enum(["ONAN", "ONAF", "OFAF", "ODAF", "Other"]),
  coreMaterial: z.enum(["CRGO", "NO", "Other"]),
  windingMaterial: z.enum(["Cu", "Al"]),
  oilType: z.string(),
  lastOilChangeDate: z.string().datetime().optional().nullable(),
  oltc: z.object({
    type: z.string(),
    steps: z.number().min(1),
    lastService: z.string().datetime().optional().nullable()
  }),
  DGA: z.object({
    H2: z.number().min(0),
    CH4: z.number().min(0),
    C2H2: z.number().min(0),
    C2H4: z.number().min(0),
    CO: z.number().min(0)
  }),
  oilMoisture_ppm: z.number().min(0),
  buchholzInstalled: z.boolean(),
  oltcOpsCount: z.number().min(0)
});

/* --- BREAKER --- */
export const BreakerSchema = EquipmentBaseSchema.extend({
  type: z.enum(["SF6", "Vacuum", "Oil"]),
  ratedVoltage_kV: z.number().positive(),
  ratedCurrent_A: z.number().positive(),
  shortCircuitBreaking_kA: z.number().positive(),
  makingCapacity_kA: z.number().positive(),
  mechanismType: z.string(),
  opCount: z.number().min(0),
  operatingTime_ms: z.number().min(0),
  sf6Pressure: z.number().min(0).optional()
});

/* --- CT/VT/CVT --- */
export const CTVTSchema = EquipmentBaseSchema.extend({
  ratio: z.string(),
  accuracyClass: z.string(),
  burdenVA: z.number().min(0),
  lastCalibrationDate: z.string().datetime()
});

/* --- BUSBAR --- */
export const BusbarSchema = EquipmentBaseSchema.extend({
  busType: z.enum(["Single", "Double", "Main", "Tie"]),
  material: z.string(),
  capacity_A: z.number().positive(),
  lastIRScanDate: z.string().datetime().optional().nullable()
});

/* --- RELAY --- */
export const RelaySchema = EquipmentBaseSchema.extend({
  relayType: z.string(),
  firmwareVersion: z.string().optional(),
  enabledFunctions: z.array(z.string()).optional().default([]),
  ctPtMappings: z.record(z.any()).optional(),
  lastConfigUpload: z.string().datetime().optional().nullable()
});

/* --- PMU --- */
export const PMUSchema = EquipmentBaseSchema.extend({
  gpsSyncStatus: z.string(),
  accuracy: z.number().min(0),
  lastSync: z.string().datetime()
});

/* --- BATTERY / DC --- */
export const BatterySchema = EquipmentBaseSchema.extend({
  batteryType: z.string(),
  ratedVoltage_V: z.number().positive(),
  capacity_Ah: z.number().positive(),
  floatVoltage: z.number().positive(),
  internalResistance: z.number().positive()
});

/* --- GIS --- */
export const GISSchema = EquipmentBaseSchema.extend({
  sf6Compartment: z.array(
    z.object({
      compartmentId: z.string(),
      pressure: z.number().min(0)
    })
  ),
  pdMonitoringInstalled: z.boolean(),
  lastPDTest: z.string().datetime().optional().nullable()
});

/* --- ISOLATOR --- */
export const IsolatorSchema = EquipmentBaseSchema.extend({
  type: z.string(),
  driveMechanism: z.string(),
  interlockInfo: z.string().optional().nullable()
});

/* --- POWER FLOW LINES --- */
export const PowerFlowLineSchema = EquipmentBaseSchema.extend({
  lineVoltage_kV: z.number().positive(),
  length_km: z.number().positive(),
  conductorType: z.string(),
  thermalLimit_A: z.number().positive(),
  impedance_R_X: z.object({
    R: z.number().min(0),
    X: z.number().min(0)
  })
});

/* --- EARTHING --- */
export const EarthingSchema = EquipmentBaseSchema.extend({
  gridResistance: z.number().positive(),
  soilType: z.string(),
  lastTestDate: z.string().datetime()
});

/* --- ENVIRONMENT --- */
export const EnvironmentSchema = EquipmentBaseSchema.extend({
  sensors: z.array(
    z.object({
      type: z.enum(["temp", "humidity", "fire", "wind"]),
      threshold: z.number().optional().nullable()
    })
  ),
  lastCalibration: z.string().datetime().optional().nullable()
});

/* ---------- FULL SUBSTATION SCHEMA ---------- */

export const FullSubstationSchema = z.object({
  master: MasterSubstationSchema,
  assets: z.object({
    transformers: z.array(TransformerSchema).optional().default([]),
    breakers: z.array(BreakerSchema).optional().default([]),
    ctvt: z.array(CTVTSchema).optional().default([]),
    busbars: z.array(BusbarSchema).optional().default([]),
    relays: z.array(RelaySchema).optional().default([]),
    pmu: z.array(PMUSchema).optional().default([]),
    battery: z.array(BatterySchema).optional().default([]),
    gis: z.array(GISSchema).optional().default([]),
    isolators: z.array(IsolatorSchema).optional().default([]),
    powerFlowLines: z.array(PowerFlowLineSchema).optional().default([]),
    earthing: z.array(EarthingSchema).optional().default([]),
    environment: z.array(EnvironmentSchema).optional().default([])
  })
});

export type FullSubstation = z.infer<typeof FullSubstationSchema>
