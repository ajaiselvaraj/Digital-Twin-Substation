"use client"

import { COMPONENT_DEFINITIONS, PRIMARY_COMPONENTS } from "@/lib/diagnosis/component-config"
import type { DiagnosisComponentKey } from "@/lib/diagnosis/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ComponentTabsProps {
  active: DiagnosisComponentKey
  onChange: (component: DiagnosisComponentKey) => void
}

const primaryButtonPalette: Record<DiagnosisComponentKey, string> = {
  bayLines: "bg-blue-600 hover:bg-blue-700",
  transformer: "bg-emerald-600 hover:bg-emerald-700",
  circuitBreaker: "bg-purple-600 hover:bg-purple-700",
  busbar: "bg-orange-500 hover:bg-orange-600",
  isolator: "bg-teal-600 hover:bg-teal-700",
  relay: "bg-slate-600 hover:bg-slate-700",
  pmu: "bg-slate-600 hover:bg-slate-700",
  gis: "bg-slate-600 hover:bg-slate-700",
  battery: "bg-slate-600 hover:bg-slate-700",
  environment: "bg-slate-600 hover:bg-slate-700",
}

export function DiagnosisComponentTabs({ active, onChange }: ComponentTabsProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {PRIMARY_COMPONENTS.map((component) => {
            const isActive = active === component
            return (
              <Button
                key={component}
                type="button"
                variant="default"
                className={cn(
                  "text-white shadow-md transition-all",
                  primaryButtonPalette[component],
                  isActive && "ring-2 ring-offset-2 ring-blue-100",
                )}
                onClick={() => onChange(component)}
              >
                {COMPONENT_DEFINITIONS[component].title}
              </Button>
            )
          })}
        </div>
      </div>
      <p className="text-xs text-slate-500">Select equipment to review live diagnostics and health analytics.</p>
    </div>
  )
}

