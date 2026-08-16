"use client"

import { Activity } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DiagnosisEventLog } from "@/lib/diagnosis/types"

interface EventsPanelProps {
  events: DiagnosisEventLog[]
}

const colorFromSeverity: Record<string, string> = {
  normal: "bg-slate-100 text-slate-700",
  warning: "bg-amber-50 text-amber-700",
  alarm: "bg-orange-50 text-orange-700",
  trip: "bg-red-50 text-red-700",
}

export function EventsPanel({ events }: EventsPanelProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Event & Notification Logs</CardTitle>
        <p className="text-sm text-slate-500">Fault events, ML alerts, and auto notifications.</p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-semibold">{event.title}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${colorFromSeverity[event.severity] ?? "bg-slate-100"}`}>
                    {event.severity}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{event.description}</p>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  {new Date(event.timestamp).toLocaleString()} · {event.source.toUpperCase()}
                </div>
              </div>
            ))}
            {events.length === 0 && <p className="text-sm text-slate-500">No events recorded in this session.</p>}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

