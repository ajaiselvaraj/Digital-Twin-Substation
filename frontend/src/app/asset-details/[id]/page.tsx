"use client"

import { use, useState, useEffect } from "react"
import { getSubstationById } from "@/lib/firebase-data"
import { AssetDetails } from "@/components/dashboard/asset-details"
import type { DummySubstation } from "@/lib/dummy-data"

interface AssetDetailsPageProps {
  params: Promise<{ id: string }>
}

export default function AssetDetailsPage({ params }: AssetDetailsPageProps) {
  const resolvedParams = use(params)
  const [substation, setSubstation] = useState<DummySubstation | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchSubstation() {
      setIsLoading(true)
      try {
        const data = await getSubstationById(resolvedParams.id)
        setSubstation(data || null)
      } catch (error) {
        console.error("Error fetching substation:", error)
        setSubstation(null)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSubstation()
  }, [resolvedParams.id])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <h1 className="text-2xl font-bold">Loading...</h1>
        <p className="text-muted-foreground">Fetching substation data...</p>
      </div>
    )
  }

  if (!substation) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <h1 className="text-2xl font-bold">Substation Not Found</h1>
        <p className="text-muted-foreground">The substation you're looking for doesn't exist.</p>
      </div>
    )
  }

  return <AssetDetails substation={substation} />
}
