"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSimulation } from "./simulation-context"

export function ComponentSelectorNav() {
  const { selectedComponent, setSelectedComponent } = useSimulation()

  return (
    <div className="flex-shrink-0">
      <Tabs value={selectedComponent} onValueChange={(v) => setSelectedComponent(v as any)}>
        <TabsList className="grid w-full grid-cols-5 bg-transparent p-0 gap-2">
          <TabsTrigger 
            value="transformer"
            className="bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:border-orange-600"
          >
            Transformer
          </TabsTrigger>
          <TabsTrigger 
            value="bayLines"
            className="bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:border-emerald-600"
          >
            Bays
          </TabsTrigger>
          <TabsTrigger 
            value="circuitBreaker"
            className="bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-purple-600"
          >
            Circuit Breaker
          </TabsTrigger>
          <TabsTrigger 
            value="isolator"
            className="bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:border-teal-600"
          >
            Isolator
          </TabsTrigger>
          <TabsTrigger 
            value="busbar"
            className="bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:border-orange-500"
          >
            Busbar
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}

