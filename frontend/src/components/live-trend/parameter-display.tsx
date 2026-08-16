"use client"

import { getGlowColor } from "@/lib/live-trend/glow-utils"
import { getTransformerParameterColor } from "@/lib/live-trend/transformer-glow-utils"
import { getCircuitBreakerParameterColor } from "@/lib/live-trend/circuit-breaker-glow-utils"
import { ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMounted } from "@/hooks/use-is-mounted"

interface ParameterDisplayProps {
  label: string
  value?: number | string | null
  unit: string
  parameterKey: string
  onDetailClick: (key: string) => void
  isExpanded?: boolean
  componentType?: string
}

const formatValue = (value?: number | string | null): string => {
  if (value === null || value === undefined) {
    return "—"
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return "—"
    }
    if (Math.abs(value) >= 1000) return value.toFixed(0)
    if (Math.abs(value) >= 100) return value.toFixed(1)
    if (Math.abs(value) >= 10) return value.toFixed(1)
    if (Math.abs(value) >= 1) return value.toFixed(2)
    return value.toFixed(3)
  }
  return value ?? "—"
}

const withAlpha = (hex: string, alpha: string) => {
  if (!hex?.startsWith("#") || (hex.length !== 7 && hex.length !== 9)) {
    return hex
  }
  const base = hex.slice(1, 7)
  return `#${base}${alpha}`
}

export function ParameterDisplay({
  label,
  value,
  unit,
  parameterKey,
  onDetailClick,
  isExpanded = false,
  componentType,
}: ParameterDisplayProps) {
  const isMounted = useIsMounted()
  
  // Use component-specific color logic
  let glowColor: string | null = null
  if (componentType === "transformer") {
    glowColor = getTransformerParameterColor(parameterKey, value)
  } else if (componentType === "circuitBreaker") {
    glowColor = getCircuitBreakerParameterColor(parameterKey, value)
  } else {
    glowColor = getGlowColor(parameterKey, value ?? 0)
  }
  
  const formattedValue = formatValue(value)
  const indicatorColor = glowColor ? withAlpha(glowColor, "ff") : "#CBD5F5"

  const handleToggle = () => {
    onDetailClick(parameterKey)
  }

  if (!isMounted) {
    return (
      <div
        className="rounded-lg border px-4 py-3 bg-white/70 shadow-sm animate-pulse"
        role="presentation"
        aria-hidden="true"
        suppressHydrationWarning
      >
        <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
        <div className="h-6 w-24 bg-slate-100 rounded" />
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={handleToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          handleToggle()
        }
      }}
      className={cn(
        "rounded-lg border px-4 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        "shadow-sm hover:shadow-md bg-white/90",
        isExpanded && "ring-2 ring-blue-500/40",
      )}
      suppressHydrationWarning
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2 text-left">
            <span className="text-sm font-semibold text-slate-800">{label}</span>
            <span className="text-lg font-semibold text-slate-900">
              {formattedValue}
              {unit && <span className="ml-1 text-sm text-slate-500">{unit}</span>}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 text-slate-400 self-stretch min-w-[32px]">
          <span
            className="inline-flex h-2.5 w-2.5 rounded-full border border-white/50 shadow-sm"
            style={{ backgroundColor: indicatorColor }}
            aria-hidden="true"
          />
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </div>
    </div>
  )
}

