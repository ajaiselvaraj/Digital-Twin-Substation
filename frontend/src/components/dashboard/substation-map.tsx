"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

// Since we can't install leaflet right now, we'll create a mock map component
// In a real app, this would use react-leaflet or mapbox-gl
export function SubstationMap() {
  const [searchQuery, setSearchQuery] = React.useState("")

  return (
    <div className="relative h-[calc(100vh-140px)] w-full overflow-hidden rounded-lg border bg-slate-100">
      {/* Map Filters - Floating on top left */}
      <div className="absolute left-4 top-4 z-10 w-80 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search substations..."
            className="h-12 rounded-full border-0 bg-white pl-10 shadow-lg ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {searchQuery && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-2">
              <div className="text-xs font-medium text-gray-500 px-2 py-1">SUGGESTIONS</div>
              <div className="space-y-1">
                <div className="cursor-pointer rounded px-2 py-2 text-sm hover:bg-slate-100">North Area Substation</div>
                <div className="cursor-pointer rounded px-2 py-2 text-sm hover:bg-slate-100">West Power Grid</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mock Map Visualization */}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400">
        <div className="relative h-full w-full bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center opacity-20"></div>

        {/* Mock Substation Pins */}
        <div className="absolute top-1/3 left-1/4 h-4 w-4 cursor-pointer rounded-full bg-blue-600 ring-4 ring-blue-600/30 hover:scale-110 transition-transform"></div>
        <div className="absolute top-1/2 left-1/2 h-4 w-4 cursor-pointer rounded-full bg-green-600 ring-4 ring-green-600/30 hover:scale-110 transition-transform"></div>
        <div className="absolute bottom-1/3 right-1/3 h-4 w-4 cursor-pointer rounded-full bg-orange-600 ring-4 ring-orange-600/30 hover:scale-110 transition-transform"></div>
      </div>
    </div>
  )
}
