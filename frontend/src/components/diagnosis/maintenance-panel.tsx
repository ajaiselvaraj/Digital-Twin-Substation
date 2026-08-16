"use client"

import { useState } from "react"

import { Bell, CheckCircle, UploadCloud } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { DiagnosisMaintenanceRecord } from "@/lib/diagnosis/types"
import { cn } from "@/lib/utils"

interface MaintenancePanelProps {
  automaticAlerts: DiagnosisMaintenanceRecord[]
  pendingIssues: DiagnosisMaintenanceRecord[]
  suggestions: string[]
  onNotify: (payload: { notes: string; files: File[] }) => Promise<void>
  onMarkFixed: (payload: { notes: string; files: File[] }) => Promise<void>
}

const severityBadge: Record<string, string> = {
  normal: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  alarm: "bg-orange-50 text-orange-700",
  trip: "bg-red-50 text-red-700",
}

export function MaintenancePanel({
  automaticAlerts,
  pendingIssues,
  suggestions,
  onNotify,
  onMarkFixed,
}: MaintenancePanelProps) {
  const [notifyNotes, setNotifyNotes] = useState("")
  const [closeNotes, setCloseNotes] = useState("")
  const [notifyFiles, setNotifyFiles] = useState<File[]>([])
  const [closeFiles, setCloseFiles] = useState<File[]>([])
  const [workingAction, setWorkingAction] = useState<"notify" | "close" | null>(null)

  const triggerNotify = async () => {
    setWorkingAction("notify")
    await onNotify({ notes: notifyNotes, files: notifyFiles })
    setNotifyNotes("")
    setNotifyFiles([])
    setWorkingAction(null)
  }

  const triggerClose = async () => {
    setWorkingAction("close")
    await onMarkFixed({ notes: closeNotes, files: closeFiles })
    setCloseNotes("")
    setCloseFiles([])
    setWorkingAction(null)
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle>Maintenance Workflow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Bell className="h-4 w-4 text-amber-500" />
            Automatic Alerts
          </div>
          <div className="space-y-3">
            {automaticAlerts.length === 0 && <p className="text-xs text-slate-500">No current auto alerts.</p>}
            {automaticAlerts.map((alert) => (
              <div key={alert.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{alert.title}</p>
                  <Badge className={cn("capitalize", severityBadge[alert.severity] ?? "bg-slate-100 text-slate-600")}>
                    {alert.severity}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">{alert.description}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            Pending Issues
          </div>
          <div className="space-y-3">
            {pendingIssues.length === 0 && <p className="text-xs text-slate-500">No pending tickets available.</p>}
            {pendingIssues.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <Badge variant="outline" className="text-xs capitalize">
                    {item.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">{item.description}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  Owner: {item.owner} · {new Date(item.timestamp).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <h4 className="text-sm font-semibold">Notify maintenance team</h4>
          <p className="text-xs text-slate-500">Share context and supporting evidence.</p>
          <Textarea
            value={notifyNotes}
            onChange={(event) => setNotifyNotes(event.target.value)}
            placeholder="Add context or instructions..."
            className="mt-3 min-h-[140px]"
          />
          <div className="mt-3 space-y-2">
            <Label className="text-xs text-slate-500">Attach reports / captures</Label>
            <Input type="file" multiple onChange={(event) => setNotifyFiles(Array.from(event.target.files ?? []))} />
          </div>
          <Button
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700"
            disabled={workingAction === "notify"}
            onClick={triggerNotify}
          >
            <UploadCloud className="mr-2 h-4 w-4" />
            {workingAction === "notify" ? "Sending..." : "Notify maintenance team"}
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <h4 className="text-sm font-semibold">Mark issue fixed</h4>
          <p className="text-xs text-slate-500">Capture closure notes and test evidence.</p>
          <Textarea
            value={closeNotes}
            onChange={(event) => setCloseNotes(event.target.value)}
            placeholder="Closure notes, tests performed..."
            className="mt-3 min-h-[140px]"
          />
          <div className="mt-3 space-y-2">
            <Label className="text-xs text-slate-500">Upload evidence</Label>
            <Input type="file" multiple onChange={(event) => setCloseFiles(Array.from(event.target.files ?? []))} />
          </div>
          <Button
            variant="outline"
            className="mt-4 w-full border-emerald-500 text-emerald-700 hover:bg-emerald-50"
            disabled={workingAction === "close"}
            onClick={triggerClose}
          >
            {workingAction === "close" ? "Submitting..." : "Mark fixed"}
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <h4 className="text-sm font-semibold">Suggested next actions</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            {suggestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
            {suggestions.length === 0 && <li className="text-slate-500">No additional recommendations.</li>}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}