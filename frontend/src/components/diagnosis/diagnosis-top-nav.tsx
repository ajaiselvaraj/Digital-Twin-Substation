"use client"

import { useTransition } from "react"

import { Button } from "@/components/ui/button"
import { useDiagnosisNav } from "./diagnosis-context"
import { PRIMARY_COMPONENTS, COMPONENT_DEFINITIONS } from "@/lib/diagnosis/component-config"


export function DiagnosisTopNav() {
  const { activeComponent, setActiveComponent } = useDiagnosisNav()
  const [isPending, startTransition] = useTransition()
  const palette = {
    bayLines: "bg-blue-600 hover:bg-blue-700 text-white",
    transformer: "bg-emerald-600 hover:bg-emerald-700 text-white",
    circuitBreaker: "bg-purple-600 hover:bg-purple-700 text-white",
    busbar: "bg-orange-500 hover:bg-orange-600 text-white",
    isolator: "bg-teal-600 hover:bg-teal-700 text-white",
    relay: "bg-slate-600 hover:bg-slate-700 text-white",
    pmu: "bg-slate-600 hover:bg-slate-700 text-white",
    gis: "bg-slate-600 hover:bg-slate-700 text-white",
    battery: "bg-slate-600 hover:bg-slate-700 text-white",
    environment: "bg-slate-600 hover:bg-slate-700 text-white",
  } as const

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="flex h-16 items-center gap-4 px-4">
        <div className="mr-4 hidden md:flex">
          <div className="flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block text-xl tracking-tight">
              OCEANBERG <span className="text-blue-600">DIGITAL TWIN</span>
            </span>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-end gap-4 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto">
            {PRIMARY_COMPONENTS.map((key) => (
              <Button
                key={key}
                size="sm"
                variant="default"
                className={`w-28 shadow transition-all ${palette[key]} ${
                  activeComponent === key ? "ring-2 ring-offset-2 ring-white" : ""
                } ${isPending ? "opacity-90" : ""}`}
                onClick={() =>
                  startTransition(() => {
                    setActiveComponent(key)
                  })
                }
              >
                {COMPONENT_DEFINITIONS[key].title}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}

