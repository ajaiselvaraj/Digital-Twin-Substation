"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter } from "lucide-react"
import { getAllSubstations } from "@/lib/firebase-data"
import type { DummySubstation } from "@/lib/dummy-data"

const InteractiveMap = dynamic(
  () => import("@/components/dashboard/interactive-map").then((mod) => mod.InteractiveMap),
  {
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-slate-100 rounded-lg">
        <p className="text-slate-400">Loading map...</p>
      </div>
    ),
    ssr: false,
  },
)

export default function ViewSubstationsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedVoltage, setSelectedVoltage] = useState("all")
  const [selectedOperator, setSelectedOperator] = useState("all")
  const [substations, setSubstations] = useState<DummySubstation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchSubstations() {
      try {
        const data = await getAllSubstations()
        setSubstations(data)
      } catch (error) {
        console.error("Error fetching substations:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSubstations()
  }, [])

  // Get unique voltage classes and operators for filter
  const voltageClasses = Array.from(new Set(substations.map((s) => s.master.voltageClass)))
  const operators = Array.from(new Set(substations.map((s) => s.master.operator)))

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading substations...</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search by name, area, or code..."
            className="h-12 pl-10 border-gray-300 focus-visible:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <div className="w-full md:w-48">
            <Select value={selectedVoltage} onValueChange={setSelectedVoltage}>
              <SelectTrigger className="h-12 border-gray-300 bg-white">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <SelectValue placeholder="Voltage Class" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Voltages</SelectItem>
                {voltageClasses.map((voltage) => (
                  <SelectItem key={voltage} value={voltage}>
                    {voltage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-48">
            <Select value={selectedOperator} onValueChange={setSelectedOperator}>
              <SelectTrigger className="h-12 border-gray-300 bg-white">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <SelectValue placeholder="Operator" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Operators</SelectItem>
                {operators.map((operator) => (
                  <SelectItem key={operator} value={operator}>
                    {operator}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 h-[calc(100vh-200px)] w-full overflow-hidden rounded-lg border shadow-sm">
        <InteractiveMap
          searchQuery={searchQuery}
          selectedVoltage={selectedVoltage}
          selectedOperator={selectedOperator}
          substations={substations}
        />
      </div>
    </div>
  )
}
