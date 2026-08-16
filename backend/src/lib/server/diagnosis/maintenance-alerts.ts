import { randomUUID } from "node:crypto"

import type { DiagnosisComponentKey, DiagnosisSeverity } from "@/lib/diagnosis/types"
import { getAdminRealtimeDB } from "@/lib/server/firebase-admin"

interface AlertPayload {
  substationId?: string | null
  areaCode: string
  componentType: DiagnosisComponentKey
  fault: string
  severity: DiagnosisSeverity
  faultProbability: number
  healthIndex: number
}

export async function dispatchMaintenanceAlert(payload: AlertPayload) {
  const { substationId, areaCode, componentType, fault, severity, faultProbability, healthIndex } = payload

  if (healthIndex >= 40 && faultProbability <= 0.7 && severity !== "alarm" && severity !== "trip") {
    return { persisted: false, reason: "No alert threshold met" }
  }

  const db = getAdminRealtimeDB()
  if (!db) {
    return { persisted: false, reason: "Realtime DB unavailable" }
  }

  const alertId = randomUUID()
  const ref = db.ref(`/maintenance/alerts/${alertId}`)
  await ref.set({
    alertId,
    substationId: substationId ?? areaCode,
    areaCode,
    componentType,
    fault,
    severity,
    faultProbability,
    healthIndex,
    timestamp: new Date().toISOString(),
  })

  return { persisted: true, alertId }
}

