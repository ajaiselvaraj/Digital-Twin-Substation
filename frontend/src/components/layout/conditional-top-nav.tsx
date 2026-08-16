"use client"

import { usePathname } from "next/navigation"
import { TopNav } from "./top-nav"
import { LiveTrendTopNav } from "@/components/live-trend/live-trend-top-nav"
import { SimulationTopNav } from "@/components/simulation/simulation-top-nav"
import { DiagnosisTopNav } from "@/components/diagnosis/diagnosis-top-nav"

export function ConditionalTopNav() {
  const pathname = usePathname()
  
  // Show asset navigation buttons only on asset-related pages
  const isAssetPage = pathname?.startsWith("/view-substations") ||
    pathname?.startsWith("/create-substation") ||
    pathname?.startsWith("/manage-substations") ||
    pathname?.startsWith("/asset-details") ||
    pathname?.startsWith("/edit-substation")
  
  // Show different nav for live trend page
  if (pathname?.startsWith("/live-trend")) {
    return <LiveTrendTopNav />
  }
  // Diagnosis specific nav
  if (pathname?.startsWith("/diagnosis")) {
    return <DiagnosisTopNav />
  }

  
  // Show different nav for simulation page
  if (pathname?.startsWith("/simulation")) {
    return <SimulationTopNav />
  }
  
  // Show different nav for course/resources page (no buttons)
  if (pathname?.startsWith("/resources")) {
    return <TopNav showAssetButtons={false} />
  }
  
  // Show full nav with asset buttons for asset pages
  if (isAssetPage) {
  return <TopNav />
  }
  
  // Default nav without asset buttons for other pages
  return <TopNav showAssetButtons={false} />
}

