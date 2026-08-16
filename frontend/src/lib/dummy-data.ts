// Dummy data service for substations
export interface DummySubstation {
  id: string
  master: {
    name: string
    areaName: string
    substationCode: string
    latitude: number
    longitude: number
    installationYear: number
    voltageClass: string
    operator: string
    notes: string
  }
  assets: {
    transformers: any[]
    breakers: any[]
    ctvt: any[]
    busbars: any[]
    relays: any[]
    pmu: any[]
    battery: any[]
    gis: any[]
    isolators: any[]
    powerFlowLines: any[]
    earthing: any[]
    environment: any[]
  }
}

// Three dummy substations with complete data
export const DUMMY_SUBSTATIONS: DummySubstation[] = [
  {
    id: "1",
    master: {
      name: "Chennai North Substation",
      areaName: "Chennai",
      substationCode: "CHN-482153",
      latitude: 13.0827,
      longitude: 80.2707,
      installationYear: 2010,
      voltageClass: "400kV",
      operator: "TANTRANSCO",
      notes: "Critical load center feeding North Chennai.",
    },
    assets: {
      transformers: [
        {
          id: "TRF-1",
          manufacturer: "BHEL",
          model: "BHEL-400/230",
          installationYear: 2010,
          maintenanceHistory: [
            {
              date: "2023-06-11T09:30:00.000Z",
              vendor: "BHEL Services",
              technician: "R. Kumar",
              notes: "Full oil processing & tightening checks",
              documents: [
                {
                  url: "https://storage/dga_report_trf1.pdf",
                  name: "dga_report_trf1.pdf",
                  uploadedAt: "2023-06-11T10:00:00.000Z",
                },
              ],
            },
          ],
          componentsReplaced: [
            {
              componentName: "HV Bushing",
              reason: "Insulation cracks",
              date: "2021-03-10T08:00:00.000Z",
              vendor: "BHEL Spares",
              cost: 145000,
              documents: [],
            },
          ],
          operationHistory: [
            {
              date: "2022-09-05T14:12:00.000Z",
              eventType: "Tap Change",
              description: "Automatic tap change triggered",
              comtradeUrl: null,
            },
          ],
          documents: [
            {
              url: "https://storage/nameplate_trf1.jpg",
              name: "nameplate_trf1.jpg",
              uploadedAt: "2010-03-01T12:00:00.000Z",
            },
          ],
          conditionAssessment: {
            status: "Good",
            notes: "No abnormal heating detected",
          },
          ratedMVA: 315,
          HV_kV: 400,
          LV_kV: 230,
          vectorGroup: "YNd11",
          coolingType: "ONAF",
          coreMaterial: "CRGO",
          windingMaterial: "Cu",
          oilType: "Mineral",
          lastOilChangeDate: "2023-06-10T00:00:00.000Z",
          oltc: {
            type: "Resistive",
            steps: 17,
            lastService: "2023-03-15T00:00:00.000Z",
          },
          DGA: { H2: 45, CH4: 32, C2H2: 0, C2H4: 18, CO: 220 },
          oilMoisture_ppm: 18,
          buchholzInstalled: true,
          oltcOpsCount: 5400,
        },
      ],
      breakers: [
        {
          id: "CB-1",
          manufacturer: "ABB",
          model: "HPL-400",
          installationYear: 2011,
          maintenanceHistory: [
            {
              date: "2024-01-18T11:00:00.000Z",
              vendor: "ABB Services",
              technician: "S. Iyer",
              notes: "Mechanism lubrication & SF6 refill",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Spring Mechanism",
              reason: "Wear & fatigue",
              date: "2023-05-11T08:00:00.000Z",
              vendor: "ABB",
              cost: 85000,
              documents: [],
            },
          ],
          operationHistory: [
            {
              date: "2022-12-18T07:45:00.000Z",
              eventType: "Trip",
              description: "Line fault cleared",
              comtradeUrl: "https://storage/cb_trip1.zip",
            },
          ],
          documents: [],
          conditionAssessment: { status: "Good", notes: "SF6 steady" },
          type: "SF6",
          ratedVoltage_kV: 400,
          ratedCurrent_A: 2000,
          shortCircuitBreaking_kA: 40,
          makingCapacity_kA: 100,
          mechanismType: "Spring",
          opCount: 860,
          operatingTime_ms: 68,
          sf6Pressure: 6.2,
        },
      ],
      ctvt: [
        {
          id: "CT-1",
          manufacturer: "L&T",
          model: "LNT-CT-2000",
          installationYear: 2010,
          maintenanceHistory: [
            {
              date: "2023-09-10T10:30:00.000Z",
              vendor: "L&T Field",
              technician: "V. Arun",
              notes: "Secondary wiring inspected",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Terminal Block",
              reason: "Loose contacts",
              date: "2022-02-11T07:00:00.000Z",
              vendor: "L&T",
              cost: 5000,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Excellent", notes: "" },
          ratio: "2000/1",
          accuracyClass: "0.5",
          burdenVA: 15,
          lastCalibrationDate: "2023-08-10T09:00:00.000Z",
        },
      ],
      busbars: [
        {
          id: "BB-1",
          manufacturer: "Tata",
          model: "TATA-BB400",
          installationYear: 2011,
          maintenanceHistory: [
            {
              date: "2024-02-01T10:00:00.000Z",
              vendor: "Tata Maintenance",
              technician: "S. Mani",
              notes: "IR scan done",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Spacer Clamp",
              reason: "Corrosion",
              date: "2022-10-05T09:00:00.000Z",
              vendor: "Tata",
              cost: 12000,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Good", notes: "" },
          busType: "Main",
          material: "Cu",
          capacity_A: 5000,
          lastIRScanDate: "2023-11-10T09:45:00.000Z",
        },
      ],
      relays: [
        {
          id: "REL-1",
          manufacturer: "Schneider",
          model: "MICOM-P442",
          installationYear: 2012,
          maintenanceHistory: [
            {
              date: "2024-03-12T12:00:00.000Z",
              vendor: "Schneider",
              technician: "T. Prakash",
              notes: "Firmware update",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "LCD Screen",
              reason: "Dark spots",
              date: "2021-11-22T10:00:00.000Z",
              vendor: "Schneider",
              cost: 10000,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Good", notes: "" },
          relayType: "Line Differential",
          firmwareVersion: "v3.4.2",
          enabledFunctions: ["21", "50", "87L"],
          ctPtMappings: { CT1: "CT-1", PT1: "PT-1" },
          lastConfigUpload: "2024-03-12T11:50:00.000Z",
        },
      ],
      pmu: [
        {
          id: "PMU-1",
          manufacturer: "SEL",
          model: "SEL-3379",
          installationYear: 2016,
          maintenanceHistory: [
            {
              date: "2024-08-18T08:00:00.000Z",
              vendor: "SEL India",
              technician: "Harish",
              notes: "Time sync precision test",
              documents: [],
            },
          ],
          componentsReplaced: [],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Excellent", notes: "" },
          gpsSyncStatus: "Locked",
          accuracy: 0.02,
          lastSync: "2024-10-01T05:20:00.000Z",
        },
      ],
      battery: [
        {
          id: "BAT-1",
          manufacturer: "Exide",
          model: "EXD-220V150",
          installationYear: 2015,
          maintenanceHistory: [
            {
              date: "2024-06-25T09:00:00.000Z",
              vendor: "Exide",
              technician: "Mohan",
              notes: "Specific gravity check",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Cell #14",
              reason: "Low capacity",
              date: "2023-12-10T09:30:00.000Z",
              vendor: "Exide",
              cost: 15000,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Fair", notes: "Ageing signs" },
          batteryType: "VRLA",
          ratedVoltage_V: 220,
          capacity_Ah: 150,
          floatVoltage: 2.25,
          internalResistance: 0.015,
        },
      ],
      gis: [
        {
          id: "GIS-1",
          manufacturer: "Hitachi",
          model: "HIT-GIS-400",
          installationYear: 2018,
          maintenanceHistory: [
            {
              date: "2024-01-20T10:00:00.000Z",
              vendor: "Hitachi Field",
              technician: "Senthil",
              notes: "PD Test done",
              documents: [],
            },
          ],
          componentsReplaced: [],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Good", notes: "" },
          sf6Compartment: [
            { compartmentId: "C1", pressure: 7.2 },
            { compartmentId: "C2", pressure: 7.1 },
          ],
          pdMonitoringInstalled: true,
          lastPDTest: "2024-01-20T09:00:00.000Z",
        },
      ],
      isolators: [
        {
          id: "ISO-1",
          manufacturer: "Kirloskar",
          model: "KIR-ISO-400",
          installationYear: 2011,
          maintenanceHistory: [
            {
              date: "2023-07-20T09:00:00.000Z",
              vendor: "Kirloskar",
              technician: "Vimal",
              notes: "Lubrication & rotation test",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Drive Gear",
              reason: "Wear",
              date: "2022-03-18T08:00:00.000Z",
              vendor: "Kirloskar",
              cost: 9000,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Excellent", notes: "" },
          type: "Vertical",
          driveMechanism: "Manual",
          interlockInfo: "Linked with CB-1",
        },
      ],
      powerFlowLines: [
        {
          id: "LINE-1",
          manufacturer: "N/A",
          model: "Quad Moose",
          installationYear: 2010,
          maintenanceHistory: [
            {
              date: "2024-04-10T09:00:00.000Z",
              vendor: "LineTech",
              technician: "Praveen",
              notes: "Patrolling completed",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Insulator Disc",
              reason: "Flashover marks",
              date: "2023-01-11T09:00:00.000Z",
              vendor: "LineTech",
              cost: 6000,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Good", notes: "" },
          lineVoltage_kV: 400,
          length_km: 12.5,
          conductorType: "AAAC",
          thermalLimit_A: 2500,
          impedance_R_X: { R: 0.12, X: 0.85 },
        },
      ],
      earthing: [
        {
          id: "EAR-1",
          manufacturer: "EarthGrid",
          model: "EG-400",
          installationYear: 2010,
          maintenanceHistory: [
            {
              date: "2024-02-05T07:30:00.000Z",
              vendor: "EarthGrid",
              technician: "Rajan",
              notes: "Earth pit refilled",
              documents: [],
            },
          ],
          componentsReplaced: [],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Good", notes: "" },
          gridResistance: 0.32,
          soilType: "Sandy clay",
          lastTestDate: "2024-02-05T07:00:00.000Z",
        },
      ],
      environment: [
        {
          id: "ENV-1",
          manufacturer: "EnviroSense",
          model: "ES-THFW",
          installationYear: 2019,
          maintenanceHistory: [
            {
              date: "2024-07-30T06:30:00.000Z",
              vendor: "EnviroSense",
              technician: "Venkat",
              notes: "Sensor calibration",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Humidity Sensor",
              reason: "Drift observed",
              date: "2023-04-12T07:00:00.000Z",
              vendor: "EnviroSense",
              cost: 9000,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Excellent", notes: "" },
          sensors: [
            { type: "temp", threshold: 55 },
            { type: "humidity", threshold: 80 },
            { type: "fire", threshold: 1 },
            { type: "wind", threshold: 40 },
          ],
          lastCalibration: "2024-07-30T06:00:00.000Z",
        },
      ],
    },
  },
  {
    id: "2",
    master: {
      name: "Coimbatore East Substation",
      areaName: "Coimbatore",
      substationCode: "CBE-912744",
      latitude: 11.0168,
      longitude: 76.9558,
      installationYear: 2015,
      voltageClass: "220kV",
      operator: "TANGEDCO",
      notes: "Feeds major industrial segments of Eastern Coimbatore.",
    },
    assets: {
      transformers: [
        {
          id: "TRF-2",
          manufacturer: "Siemens",
          model: "SIE-230/110",
          installationYear: 2015,
          maintenanceHistory: [
            {
              date: "2023-10-12T10:00:00.000Z",
              vendor: "Siemens Field",
              technician: "A. Ragu",
              notes: "Oil filtration and DGA sample collection.",
              documents: [
                {
                  url: "https://storage/reports/trf2_dga_oct23.pdf",
                  name: "trf2_dga_oct23.pdf",
                  uploadedAt: "2023-10-12T11:00:00.000Z",
                },
              ],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Oil Level Gauge",
              reason: "Incorrect readings",
              date: "2022-07-15T09:00:00.000Z",
              vendor: "Siemens Spares",
              cost: 33000,
              documents: [],
            },
          ],
          operationHistory: [
            {
              date: "2023-02-10T08:15:00.000Z",
              eventType: "Overload Event",
              description: "Load touched 96% for 17 minutes.",
              comtradeUrl: null,
            },
          ],
          documents: [
            {
              url: "https://storage/docs/trf2_nameplate.jpg",
              name: "trf2_nameplate.jpg",
              uploadedAt: "2015-03-01T10:00:00.000Z",
            },
          ],
          conditionAssessment: {
            status: "Good",
            notes: "Oil acidity slightly rising but within limits.",
          },
          ratedMVA: 160,
          HV_kV: 230,
          LV_kV: 110,
          vectorGroup: "Dyn11",
          coolingType: "ONAN",
          coreMaterial: "CRGO",
          windingMaterial: "Al",
          oilType: "Mineral",
          lastOilChangeDate: "2022-11-20T00:00:00.000Z",
          oltc: {
            type: "Inductive",
            steps: 19,
            lastService: "2022-09-01T00:00:00.000Z",
          },
          DGA: {
            H2: 22,
            CH4: 9,
            C2H2: 0,
            C2H4: 6,
            CO: 140,
          },
          oilMoisture_ppm: 12,
          buchholzInstalled: true,
          oltcOpsCount: 3100,
        },
      ],
      breakers: [
        {
          id: "CB-2",
          manufacturer: "GE",
          model: "GL-230",
          installationYear: 2016,
          maintenanceHistory: [
            {
              date: "2024-04-11T09:00:00.000Z",
              vendor: "GE Grid Field Services",
              technician: "R. Gopinath",
              notes: "Operating mechanism checked & lubrication completed.",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Trip Coil A",
              reason: "Slow response",
              date: "2022-12-01T08:00:00.000Z",
              vendor: "GE Spares",
              cost: 28000,
              documents: [],
            },
          ],
          operationHistory: [
            {
              date: "2023-04-14T11:45:00.000Z",
              eventType: "Trip",
              description: "Earth fault on 110kV feeder",
              comtradeUrl: "https://storage/comtrade/cb2_trip_20230414.zip",
            },
          ],
          documents: [],
          conditionAssessment: {
            status: "Good",
            notes: "SF6 pressure stable",
          },
          type: "SF6",
          ratedVoltage_kV: 230,
          ratedCurrent_A: 1600,
          shortCircuitBreaking_kA: 31.5,
          makingCapacity_kA: 80,
          mechanismType: "Hydraulic",
          opCount: 510,
          operatingTime_ms: 74,
          sf6Pressure: 5.8,
        },
      ],
      ctvt: [
        {
          id: "CT-2",
          manufacturer: "BHEL",
          model: "BHEL-CT-110",
          installationYear: 2015,
          maintenanceHistory: [
            {
              date: "2023-06-21T10:00:00.000Z",
              vendor: "BHEL",
              technician: "Manikandan",
              notes: "Primary injection test completed.",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Jumper Cable",
              reason: "Loose termination",
              date: "2021-05-12T07:00:00.000Z",
              vendor: "BHEL",
              cost: 3000,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: {
            status: "Excellent",
            notes: "Accuracy class maintained",
          },
          ratio: "1000/1",
          accuracyClass: "0.2",
          burdenVA: 10,
          lastCalibrationDate: "2023-06-22T09:00:00.000Z",
        },
      ],
      busbars: [
        {
          id: "BB-2",
          manufacturer: "Tata",
          model: "TATA-BB-230",
          installationYear: 2016,
          maintenanceHistory: [
            {
              date: "2024-02-12T08:30:00.000Z",
              vendor: "Tata Power Services",
              technician: "Vignesh",
              notes: "Thermal scanning at joints",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Clamp Bolt",
              reason: "Corrosion",
              date: "2023-01-11T09:00:00.000Z",
              vendor: "Tata Hardware",
              cost: 1800,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Good", notes: "" },
          busType: "Double",
          material: "Al",
          capacity_A: 3200,
          lastIRScanDate: "2023-05-15T10:00:00.000Z",
        },
      ],
      relays: [
        {
          id: "REL-2",
          manufacturer: "ABB",
          model: "RET-615",
          installationYear: 2017,
          maintenanceHistory: [
            {
              date: "2024-03-18T11:00:00.000Z",
              vendor: "ABB Protection",
              technician: "S. Bala",
              notes: "Settings verification & firmware patch",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Relay Push Button",
              reason: "Non-responsive",
              date: "2022-10-08T08:00:00.000Z",
              vendor: "ABB",
              cost: 1500,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: {
            status: "Excellent",
            notes: "",
          },
          relayType: "Feeder Protection",
          firmwareVersion: "7.5.1",
          enabledFunctions: ["Overcurrent", "Earthfault", "Directional"],
          ctPtMappings: {
            CT_A: "CT-2",
            PT_A: "PT-1",
          },
          lastConfigUpload: "2024-01-04T09:30:00.000Z",
        },
      ],
      pmu: [
        {
          id: "PMU-2",
          manufacturer: "GE",
          model: "GE-PMU200",
          installationYear: 2019,
          maintenanceHistory: [
            {
              date: "2024-07-24T10:00:00.000Z",
              vendor: "GE Synchrophasor Lab",
              technician: "R. Karthik",
              notes: "GPS sync and frequency drift test",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "GPS Antenna",
              reason: "Weak signal",
              date: "2023-02-11T07:00:00.000Z",
              vendor: "GE",
              cost: 17000,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Excellent", notes: "" },
          gpsSyncStatus: "Locked",
          accuracy: 0.01,
          lastSync: "2024-09-12T08:00:00.000Z",
        },
      ],
      battery: [
        {
          id: "BAT-2",
          manufacturer: "Amara Raja",
          model: "AR-220V100",
          installationYear: 2016,
          maintenanceHistory: [
            {
              date: "2024-05-16T09:00:00.000Z",
              vendor: "Amara Raja Service",
              technician: "G. Murali",
              notes: "Electrolyte top-up & load test",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Cell #7",
              reason: "Low voltage",
              date: "2023-06-18T08:00:00.000Z",
              vendor: "Amara Raja",
              cost: 14000,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: {
            status: "Good",
            notes: "Uniform charging",
          },
          batteryType: "Lead-Acid",
          ratedVoltage_V: 220,
          capacity_Ah: 100,
          floatVoltage: 2.20,
          internalResistance: 0.020,
        },
      ],
      gis: [
        {
          id: "GIS-2",
          manufacturer: "Hyosung",
          model: "HYO-GIS230",
          installationYear: 2018,
          maintenanceHistory: [
            {
              date: "2024-02-18T09:00:00.000Z",
              vendor: "Hyosung GIS Team",
              technician: "K. Sanjay",
              notes: "PD measurement done.",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "SF6 Nozzle",
              reason: "Minor leakage",
              date: "2022-11-21T07:00:00.000Z",
              vendor: "Hyosung",
              cost: 25000,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Good", notes: "" },
          sf6Compartment: [
            { compartmentId: "C1", pressure: 6.5 },
          ],
          pdMonitoringInstalled: true,
          lastPDTest: "2024-02-18T09:00:00.000Z",
        },
      ],
      isolators: [
        {
          id: "ISO-2",
          manufacturer: "L&T",
          model: "LNT-ISO-230",
          installationYear: 2016,
          maintenanceHistory: [
            {
              date: "2024-06-14T10:00:00.000Z",
              vendor: "L&T",
              technician: "S. Varun",
              notes: "Drive motor check & greasing",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Limit Switch",
              reason: "Failure to sense end position",
              date: "2022-03-19T09:00:00.000Z",
              vendor: "L&T",
              cost: 3500,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Excellent", notes: "" },
          type: "Horizontal",
          driveMechanism: "Motorized",
          interlockInfo: "Interlocked with CB-2",
        },
      ],
      powerFlowLines: [
        {
          id: "LINE-2",
          manufacturer: "N/A",
          model: "Panther",
          installationYear: 2015,
          maintenanceHistory: [
            {
              date: "2024-03-12T08:00:00.000Z",
              vendor: "LineTech",
              technician: "Naveen",
              notes: "Annual patrolling & insulator cleaning",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Jumper Clamp",
              reason: "Arcing marks",
              date: "2023-04-21T08:00:00.000Z",
              vendor: "LineTech",
              cost: 2400,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Good", notes: "" },
          lineVoltage_kV: 230,
          length_km: 18.2,
          conductorType: "ACSR",
          thermalLimit_A: 1800,
          impedance_R_X: { R: 0.15, X: 0.70 },
        },
      ],
      earthing: [
        {
          id: "EAR-2",
          manufacturer: "EarthTech",
          model: "EAR-230",
          installationYear: 2015,
          maintenanceHistory: [
            {
              date: "2024-03-04T07:00:00.000Z",
              vendor: "EarthTech",
              technician: "Syed",
              notes: "Earth resistance check completed",
              documents: [],
            },
          ],
          componentsReplaced: [],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Excellent", notes: "" },
          gridResistance: 0.45,
          soilType: "Red soil",
          lastTestDate: "2024-03-04T07:30:00.000Z",
        },
      ],
      environment: [
        {
          id: "ENV-2",
          manufacturer: "Siemens",
          model: "ENV-PACK",
          installationYear: 2020,
          maintenanceHistory: [
            {
              date: "2024-06-12T11:00:00.000Z",
              vendor: "Siemens",
              technician: "Martyn",
              notes: "Calibration completed",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Temp Sensor",
              reason: "Erratic reading",
              date: "2023-05-11T09:00:00.000Z",
              vendor: "Siemens",
              cost: 7500,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Good", notes: "" },
          sensors: [
            { type: "temp", threshold: 60 },
            { type: "humidity", threshold: 75 },
          ],
          lastCalibration: "2024-06-12T12:00:00.000Z",
        },
      ],
    },
  },
  {
    id: "3",
    master: {
      name: "Madurai Substation",
      areaName: "Madurai",
      substationCode: "MDU-332129",
      latitude: 9.9252,
      longitude: 78.1198,
      installationYear: 2018,
      voltageClass: "440kV",
      operator: "TANTRANSCO",
      notes: "Strategic GIS installation improving southern Tamil Nadu reliability.",
    },
    assets: {
      transformers: [
        {
          id: "TRF-3",
          manufacturer: "ABB",
          model: "ABB-440/230",
          installationYear: 2018,
          maintenanceHistory: [
            {
              date: "2024-05-19T10:00:00.000Z",
              vendor: "ABB Field Services",
              technician: "N. Farook",
              notes: "OFAF cooling fan servicing & oil circulation completed.",
              documents: [
                {
                  url: "https://storage/docs/trf3_cooling_report.pdf",
                  name: "trf3_cooling_report.pdf",
                  uploadedAt: "2024-05-19T11:00:00.000Z",
                },
              ],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Cooling Fan 2",
              reason: "Bearing noise & overheating",
              date: "2023-08-10T08:00:00.000Z",
              vendor: "ABB Motors",
              cost: 62000,
              documents: [],
            },
          ],
          operationHistory: [
            {
              date: "2023-11-25T07:50:00.000Z",
              eventType: "Tap Change",
              description: "Voltage regulation under high load.",
              comtradeUrl: null,
            },
          ],
          documents: [
            {
              url: "https://storage/docs/trf3_nameplate.jpg",
              name: "trf3_nameplate.jpg",
              uploadedAt: "2018-02-10T08:00:00.000Z",
            },
          ],
          conditionAssessment: {
            status: "Good",
            notes: "Minor moisture increase during monsoon; no action required.",
          },
          ratedMVA: 500,
          HV_kV: 440,
          LV_kV: 230,
          vectorGroup: "YNd11",
          coolingType: "OFAF",
          coreMaterial: "CRGO",
          windingMaterial: "Cu",
          oilType: "Naphthenic",
          lastOilChangeDate: "2023-03-12T00:00:00.000Z",
          oltc: {
            type: "Resistive",
            steps: 21,
            lastService: "2023-02-10T00:00:00.000Z",
          },
          DGA: {
            H2: 60,
            CH4: 40,
            C2H2: 1,
            C2H4: 25,
            CO: 260,
          },
          oilMoisture_ppm: 22,
          buchholzInstalled: true,
          oltcOpsCount: 8900,
        },
      ],
      breakers: [
        {
          id: "CB-3",
          manufacturer: "ABB",
          model: "HDVC-440",
          installationYear: 2019,
          maintenanceHistory: [
            {
              date: "2024-03-10T09:00:00.000Z",
              vendor: "ABB HV Services",
              technician: "S. Murugan",
              notes: "Operating mechanism verified and SF6 top-up.",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Trip Coil B",
              reason: "High pick-up time",
              date: "2022-11-15T08:00:00.000Z",
              vendor: "ABB Spares",
              cost: 32000,
              documents: [],
            },
          ],
          operationHistory: [
            {
              date: "2023-12-18T06:45:00.000Z",
              eventType: "Trip",
              description: "Transient line-to-ground fault cleared.",
              comtradeUrl: "https://storage/comtrade/cb3_trip_20231218.zip",
            },
          ],
          documents: [],
          conditionAssessment: { status: "Excellent", notes: "Fast response" },
          type: "SF6",
          ratedVoltage_kV: 440,
          ratedCurrent_A: 3150,
          shortCircuitBreaking_kA: 50,
          makingCapacity_kA: 125,
          mechanismType: "Spring",
          opCount: 210,
          operatingTime_ms: 58,
          sf6Pressure: 6.9,
        },
      ],
      ctvt: [
        {
          id: "CT-3",
          manufacturer: "Hyosung",
          model: "HY-CT-400",
          installationYear: 2018,
          maintenanceHistory: [
            {
              date: "2024-01-20T10:00:00.000Z",
              vendor: "Hyosung Calibration Team",
              technician: "K. Gani",
              notes: "Primary injection test and accuracy verification.",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Terminal Lug",
              reason: "Hotspot observed",
              date: "2022-06-15T09:00:00.000Z",
              vendor: "Hyosung",
              cost: 2500,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Excellent", notes: "" },
          ratio: "2500/1",
          accuracyClass: "0.2",
          burdenVA: 20,
          lastCalibrationDate: "2024-01-20T09:30:00.000Z",
        },
      ],
      busbars: [
        {
          id: "BB-3",
          manufacturer: "ABB",
          model: "ABB-BB-440",
          installationYear: 2019,
          maintenanceHistory: [
            {
              date: "2024-04-01T08:00:00.000Z",
              vendor: "ABB Bus Diagnostics",
              technician: "P. Ilango",
              notes: "Full thermal scan completed.",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Phase Spacer",
              reason: "Mechanical fatigue",
              date: "2022-12-10T07:00:00.000Z",
              vendor: "ABB",
              cost: 18000,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Good", notes: "" },
          busType: "Main",
          material: "Cu",
          capacity_A: 6300,
          lastIRScanDate: "2024-04-01T08:00:00.000Z",
        },
      ],
      relays: [
        {
          id: "REL-3",
          manufacturer: "Schneider",
          model: "MICOM-P741",
          installationYear: 2019,
          maintenanceHistory: [
            {
              date: "2024-02-15T10:00:00.000Z",
              vendor: "Schneider Electric",
              technician: "T. Jaya",
              notes: "Communication port test & firmware validation.",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Front Panel Keypad",
              reason: "Faulty keys",
              date: "2022-09-14T09:00:00.000Z",
              vendor: "Schneider",
              cost: 4200,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Good", notes: "" },
          relayType: "Line Distance Relay",
          firmwareVersion: "v5.2",
          enabledFunctions: ["21", "21N", "50", "87L"],
          ctPtMappings: {
            CT_MAIN: "CT-3",
            PT_MAIN: "PT-1",
          },
          lastConfigUpload: "2024-02-15T09:20:00.000Z",
        },
      ],
      pmu: [
        {
          id: "PMU-3",
          manufacturer: "SEL",
          model: "SEL-351S",
          installationYear: 2020,
          maintenanceHistory: [
            {
              date: "2024-09-10T10:00:00.000Z",
              vendor: "SEL India",
              technician: "L. Rohit",
              notes: "Timestamp drift analysis performed.",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "IRIG-B Receiver",
              reason: "Intermittent sync loss",
              date: "2023-01-13T08:00:00.000Z",
              vendor: "SEL",
              cost: 9000,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Excellent", notes: "" },
          gpsSyncStatus: "Locked",
          accuracy: 0.015,
          lastSync: "2024-09-10T10:30:00.000Z",
        },
      ],
      battery: [
        {
          id: "BAT-3",
          manufacturer: "Exide",
          model: "EXD-220V200",
          installationYear: 2019,
          maintenanceHistory: [
            {
              date: "2024-08-12T09:00:00.000Z",
              vendor: "Exide Service",
              technician: "D. Surya",
              notes: "Full discharge test completed.",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Cell #5",
              reason: "Reduced backup time",
              date: "2023-04-21T08:00:00.000Z",
              vendor: "Exide",
              cost: 16000,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: {
            status: "Good",
            notes: "Stable charge distribution",
          },
          batteryType: "VRLA",
          ratedVoltage_V: 220,
          capacity_Ah: 200,
          floatVoltage: 2.25,
          internalResistance: 0.018,
        },
      ],
      gis: [
        {
          id: "GIS-3",
          manufacturer: "Hitachi Energy",
          model: "HIT-GIS-440",
          installationYear: 2018,
          maintenanceHistory: [
            {
              date: "2024-01-22T10:00:00.000Z",
              vendor: "Hitachi GIS Support",
              technician: "S. Thameem",
              notes: "SF6 quality analysis performed.",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Pressure Sensor",
              reason: "Erratic values",
              date: "2023-07-12T07:00:00.000Z",
              vendor: "Hitachi",
              cost: 30000,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: {
            status: "Good",
            notes: "PD levels normal",
          },
          sf6Compartment: [
            { compartmentId: "A1", pressure: 7.3 },
            { compartmentId: "A2", pressure: 7.2 },
          ],
          pdMonitoringInstalled: true,
          lastPDTest: "2024-01-22T09:00:00.000Z",
        },
      ],
      isolators: [
        {
          id: "ISO-3",
          manufacturer: "Kirloskar",
          model: "KIR-ISO-440",
          installationYear: 2019,
          maintenanceHistory: [
            {
              date: "2024-04-09T08:00:00.000Z",
              vendor: "Kirloskar Tech",
              technician: "R. Divakar",
              notes: "Drive mechanism inspection & lubrication.",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Drive Rod",
              reason: "Bent due to mechanical stress",
              date: "2022-09-10T09:00:00.000Z",
              vendor: "Kirloskar",
              cost: 11000,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Excellent", notes: "" },
          type: "Vertical",
          driveMechanism: "Motorized",
          interlockInfo: "Interlocked with GIS Section A",
        },
      ],
      powerFlowLines: [
        {
          id: "LINE-3",
          manufacturer: "N/A",
          model: "Zebra Conductor",
          installationYear: 2018,
          maintenanceHistory: [
            {
              date: "2024-02-11T07:00:00.000Z",
              vendor: "LineTech",
              technician: "A. Balaji",
              notes: "Line patrolling completed. Birds nests cleared.",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Insulator Disc",
              reason: "Tracking marks",
              date: "2023-03-15T09:00:00.000Z",
              vendor: "LineTech",
              cost: 5500,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Good", notes: "" },
          lineVoltage_kV: 440,
          length_km: 15.4,
          conductorType: "ACSR Zebra",
          thermalLimit_A: 3100,
          impedance_R_X: { R: 0.09, X: 0.65 },
        },
      ],
      earthing: [
        {
          id: "EAR-3",
          manufacturer: "EarthGrid",
          model: "EG-440",
          installationYear: 2018,
          maintenanceHistory: [
            {
              date: "2024-03-01T08:00:00.000Z",
              vendor: "EarthGrid Services",
              technician: "T. Manohar",
              notes: "Earth res testing and pit refilling",
              documents: [],
            },
          ],
          componentsReplaced: [],
          operationHistory: [],
          documents: [],
          conditionAssessment: { status: "Excellent", notes: "" },
          gridResistance: 0.28,
          soilType: "Black cotton soil",
          lastTestDate: "2024-03-01T07:30:00.000Z",
        },
      ],
      environment: [
        {
          id: "ENV-3",
          manufacturer: "EnviroSense",
          model: "ES-HYBRID",
          installationYear: 2020,
          maintenanceHistory: [
            {
              date: "2024-05-17T10:00:00.000Z",
              vendor: "EnviroSense",
              technician: "S. Venkatesh",
              notes: "Calibration & threshold tuning completed.",
              documents: [],
            },
          ],
          componentsReplaced: [
            {
              componentName: "Fire Sensor",
              reason: "False alarms detected",
              date: "2023-10-13T08:00:00.000Z",
              vendor: "EnviroSense",
              cost: 5000,
              documents: [],
            },
          ],
          operationHistory: [],
          documents: [],
          conditionAssessment: {
            status: "Good",
            notes: "All sensors operational",
          },
          sensors: [
            { type: "temp", threshold: 60 },
            { type: "humidity", threshold: 75 },
            { type: "fire", threshold: 1 },
            { type: "wind", threshold: 45 },
          ],
          lastCalibration: "2024-05-17T09:00:00.000Z",
        },
      ],
    },
  },
]

// Note: These functions are deprecated. Use functions from lib/firebase-data.ts instead
// Keeping this file only for the DummySubstation interface type definition
