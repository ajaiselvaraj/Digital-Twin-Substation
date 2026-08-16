"use client"

import { Button } from "@/components/ui/button"
import { useLiveTrend } from "./live-trend-context"

export function LiveTrendTopNav() {
  const { activeCategory, setActiveCategory } = useLiveTrend()
  
  const navButtons = [
    { id: "substation", label: "Substation", color: "bg-blue-600 hover:bg-blue-700 text-white" },
    { id: "bayLines", label: "Bays", color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    { id: "transformer", label: "Transformer", color: "bg-orange-600 hover:bg-orange-700 text-white" },
    { id: "circuitBreaker", label: "Circuit Breaker", color: "bg-purple-600 hover:bg-purple-700 text-white" },
    { id: "busbar", label: "Busbar", color: "bg-orange-500 hover:bg-orange-600 text-white" },
    { id: "isolator", label: "Isolator", color: "bg-teal-600 hover:bg-teal-700 text-white" },
    { id: "others", label: "Others", color: "bg-slate-600 hover:bg-slate-700 text-white" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="flex h-16 items-center px-4 gap-4">
        <div className="mr-4 hidden md:flex">
          <span className="hidden font-bold sm:inline-block text-xl tracking-tight">
            OCEANBERG <span className="text-blue-600">DIGITAL TWIN</span>
          </span>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            {navButtons.map((button) => (
              <Button
                key={button.id}
                variant="default"
                className={`w-32 shadow-md transition-all ${button.color} ${
                  activeCategory === button.id ? "ring-2 ring-offset-2 ring-white" : ""
                }`}
                onClick={() => setActiveCategory(button.id)}
              >
                {button.label}
              </Button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}

