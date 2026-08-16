"use client"

import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

export function SimulationTopNav() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<string>("run")
  
  // Get active tab from URL
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && (tab === "run" || tab === "analysis" || tab === "solution")) {
      setActiveTab(tab)
    }
  }, [searchParams])
  
  const navButtons = [
    { id: "run", label: "Run Simulation", color: "bg-blue-600 hover:bg-blue-700 text-white" },
    { id: "analysis", label: "Analysis", color: "bg-purple-600 hover:bg-purple-700 text-white" },
    { id: "solution", label: "Solution", color: "bg-teal-600 hover:bg-teal-700 text-white" },
  ]

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId)
    
    // Update URL with tab parameter, preserving other params
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tabId)
    router.push(`/simulation?${params.toString()}`)
  }

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
                className={`w-36 shadow-md transition-all ${button.color} ${
                  activeTab === button.id ? "ring-2 ring-offset-2 ring-white" : ""
                }`}
                onClick={() => handleTabClick(button.id)}
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

