"use client"

import { useState } from "react"
import { Loader2, Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface DiagnosisSearchBarProps {
  areaQuery: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  activeArea?: string | null
  isLoading?: boolean
}

export function DiagnosisSearchBar({
  areaQuery,
  onChange,
  onSubmit,
  activeArea,
  isLoading = false,
}: DiagnosisSearchBarProps) {
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = () => {
    const trimmed = areaQuery.trim()
    if (!trimmed) {
      setLocalError("Please enter an area code or name.")
      return
    }
    setLocalError(null)
    onSubmit(trimmed)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={areaQuery}
            onChange={(event) => {
              setLocalError(null)
              onChange(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="Type Area Code or Name (e.g. Madurai / CHN001)"
            className="pl-10"
          />
        </div>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="md:min-w-[160px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            "Load Area Diagnosis"
          )}
        </Button>
      </div>
      {localError && <p className="text-sm text-red-600">{localError}</p>}
      {!localError && (
        <div className="text-xs text-slate-500">
          {activeArea ? (
            <>Showing diagnostics for <span className="font-semibold text-slate-900">{activeArea}</span>.</>
          ) : (
            <>Bays drives the context. Other tabs reuse the same area snapshot.</>
          )}
        </div>
      )}
    </div>
  )
}

