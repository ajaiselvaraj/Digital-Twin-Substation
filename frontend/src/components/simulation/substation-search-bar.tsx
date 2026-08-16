"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Loader2 } from "lucide-react"
import { getSubstationById, getAllSubstations } from "@/lib/firebase-data"
import type { DummySubstation } from "@/lib/dummy-data"

interface SubstationSearchBarProps {
  onSubstationSelect: (substation: DummySubstation | null) => void
}

export function SubstationSearchBar({ onSubstationSelect }: SubstationSearchBarProps) {
  const [substationId, setSubstationId] = useState("")
  const [substation, setSubstation] = useState<DummySubstation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!substationId.trim()) {
      setError("Please enter a substation ID, code, name, or area name")
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const searchTerm = substationId.trim().toLowerCase()
      const data = await getSubstationById(searchTerm)
      
      if (data) {
        setSubstation(data)
        onSubstationSelect(data)
      } else {
        const allSubstations = await getAllSubstations()
        const found = allSubstations.find(s => 
          s.id.toLowerCase() === searchTerm ||
          s.master.substationCode?.toLowerCase() === searchTerm ||
          s.master.name?.toLowerCase().includes(searchTerm) ||
          s.master.areaName?.toLowerCase().includes(searchTerm)
        )
        
        if (found) {
          setSubstation(found)
          onSubstationSelect(found)
        } else {
          setError("Substation not found")
          setSubstation(null)
          onSubstationSelect(null)
        }
      }
    } catch (err) {
      console.error("Error fetching substation:", err)
      setError("Error fetching substation. Please try again.")
      setSubstation(null)
      onSubstationSelect(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-4 flex-shrink-0">
      <CardContent className="p-0">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Enter Substation ID, Code, Name, or Area Name..."
              value={substationId}
              onChange={(e) => setSubstationId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch()
                }
              }}
              className="pl-10"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Search"
            )}
          </Button>
        </div>
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        {substation && (
          <div className="mt-2 text-sm text-green-600">
            Showing data for: {substation.master.name} ({substation.master.substationCode})
          </div>
        )}
      </CardContent>
    </Card>
  )
}

