"use client"

import { Shield } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getOverallHealthTextClass } from "@/lib/simulation-color-coding"
import { cn } from "@/lib/utils"

interface HealthPanelProps {
  healthIndex: number
  top3Factors?: string[]
}

export function HealthPanel({ healthIndex, top3Factors = [] }: HealthPanelProps) {
  const severity =
    healthIndex < 40 ? "bg-red-100 text-red-700" : healthIndex < 60 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"

  // Format factor names for display
  const formatFactorName = (factor: string): string => {
    return factor
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex items-center justify-between gap-4">
        <div>
          <CardTitle>Health Index</CardTitle>
          <p className="text-sm text-slate-500">ML-based health assessment with top impact factors.</p>
        </div>
        <Shield className="h-6 w-6 text-blue-600" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Overall Health</p>
              <p className={cn("text-3xl font-semibold", getOverallHealthTextClass(healthIndex))}>
                {Math.round(healthIndex)}%
              </p>
            </div>
            <Badge className={severity}>{healthIndex < 40 ? "Alert" : healthIndex < 60 ? "Watch" : "Healthy"}</Badge>
          </div>
          <Progress value={healthIndex} className="mt-4 h-2 bg-slate-100" />
        </div>

        {top3Factors.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">Top Health Impact Factors</p>
            {top3Factors.map((factor, index) => (
              <div key={factor} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      {index + 1}
                    </span>
                    <span>{formatFactorName(factor)}</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {index === 0
                    ? "Primary factor affecting equipment health. Monitor closely for changes."
                    : index === 1
                      ? "Secondary contributing factor. Track trends over time."
                      : "Tertiary factor. Consider in overall assessment."}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-100 p-4 text-center text-sm text-slate-500">
            <p>Impact factors analysis pending...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

