import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"
import nodemailer, { type Transporter } from "nodemailer"

import type { DiagnosisComponentKey } from "@/lib/diagnosis/types"
import { getAdminRealtimeDB } from "@/lib/server/firebase-admin"

const validActions = ["notify", "markFixed"] as const

type ActionType = (typeof validActions)[number]

let cachedTransporter: Transporter | null = null

function getMailer() {
  if (cachedTransporter) return cachedTransporter

  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM
  const secure = String(process.env.SMTP_SECURE ?? "").toLowerCase() === "true"

  if (!host || !port || !user || !pass || !from) {
    console.warn("[Maintenance API] SMTP config missing; mailer disabled")
    return null
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })

  return cachedTransporter
}

export async function POST(request: Request) {
  const payload = await request.json()
  const action: ActionType = validActions.includes(payload.action) ? payload.action : "notify"
  const areaCode = payload.areaCode?.trim()
  const substationId = payload.substationId?.trim() || areaCode
  const component: DiagnosisComponentKey =
    [
      "bayLines",
      "transformer",
      "circuitBreaker",
      "busbar",
      "isolator",
      "relay",
      "pmu",
      "gis",
      "battery",
      "environment",
    ].includes(payload.component)
      ? payload.component
      : "bayLines"

  if (!areaCode) {
    return NextResponse.json({ error: "areaCode required" }, { status: 400 })
  }

  const db = getAdminRealtimeDB()
  if (!db) {
    return NextResponse.json({ ok: false, reason: "Realtime DB not configured" }, { status: 200 })
  }

  const entryId = randomUUID()
  const ref = db.ref(`/maintenance/workflows/${entryId}`)
  console.log("[Maintenance API] notify request", {
    action,
    areaCode,
    substationId,
    component,
    email: payload.email,
    faultsCount: (payload.faults ?? []).length,
  })

  const faults: string[] = payload.faults ?? []
  const mitigation: string = payload.mitigation ?? ""
  const notes: string = payload.notes ?? ""

  // Send email immediately for notify actions (best effort, does not block DB write)
  let emailSent = false
  if (action === "notify") {
    const transporter = getMailer()
    if (transporter) {
      const to = payload.email
      const from = process.env.SMTP_FROM as string
      const subject = `Fault detected - ${component} @ ${areaCode ?? "N/A"}`

      const faultsList = faults.length
        ? faults.map((f: string, idx: number) => `${idx + 1}. ${f}`).join("\n")
        : "No fault details provided."

      const text = [
        `Area: ${areaCode ?? "N/A"}`,
        `Substation: ${substationId ?? "N/A"}`,
        `Component: ${component}`,
        "",
        "Faults:",
        faultsList,
        "",
        mitigation ? `Mitigation: ${mitigation}` : "Mitigation: (not provided)",
        "",
        notes ? `Notes: ${notes}` : "Notes: (none)",
      ].join("\n")

      const html = `
        <p><strong>Area:</strong> ${areaCode ?? "N/A"}</p>
        <p><strong>Substation:</strong> ${substationId ?? "N/A"}</p>
        <p><strong>Component:</strong> ${component}</p>
        <p><strong>Faults:</strong></p>
        <ul>${faults.length ? faults.map((f: string) => `<li>${f}</li>`).join("") : "<li>No fault details provided.</li>"}</ul>
        <p><strong>Mitigation:</strong> ${mitigation || "(not provided)"}</p>
        <p><strong>Notes:</strong><br/>${notes || "(none)"}</p>
      `

      try {
        const info = await transporter.sendMail({ to, from, subject, text, html })
        emailSent = true
        console.log("[Maintenance API] mail sent", { entryId, to, messageId: info.messageId })
      } catch (error) {
        console.error("[Maintenance API] mail send failed", { error })
      }
    }
  }

  await ref.set({
    entryId,
    areaCode,
    substationId,
    component,
    email: payload.email ?? null,
    faults: payload.faults ?? [],
    mitigation: payload.mitigation ?? "",
    action,
    notes: payload.notes ?? "",
    attachments: payload.attachments ?? [],
    timestamp: new Date().toISOString(),
  })

  console.log("[Maintenance API] workflow entry created", { entryId })

  return NextResponse.json({ ok: true, entryId, emailSent })
}

