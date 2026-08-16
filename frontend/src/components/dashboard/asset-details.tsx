"use client"
import { ArrowLeft, Calendar, FileText, Activity, Wrench, Download, Zap, Edit, ChevronRight, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useState } from "react"
import type { DummySubstation } from "@/lib/dummy-data"

interface AssetDetailsProps {
  substation: DummySubstation
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function AssetDetailsView({ asset, assetType }: { asset: any; assetType: string }) {
  if (!asset) return null

  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold">{assetType} - {asset.id}</h3>
          <p className="text-sm text-muted-foreground">{asset.manufacturer} {asset.model}</p>
        </div>
        {asset.conditionAssessment && (
          <Badge variant={asset.conditionAssessment.status === "Good" ? "default" : "secondary"}>
            {asset.conditionAssessment.status}
          </Badge>
        )}
      </div>

      {/* Basic Info */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {/* Installation Year - shown separately */}
        {asset.installationYear && (
          <div>
            <p className="text-xs text-muted-foreground">Installation Year</p>
            <p className="font-medium">{asset.installationYear}</p>
          </div>
        )}
        
        {Object.entries(asset).map(([key, value]: [string, any]) => {
          if (["id", "manufacturer", "model", "maintenanceHistory", "operationHistory", "documents", "componentsReplaced", "conditionAssessment", "installationYear"].includes(key)) return null
          if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            if (key === "DGA") {
              return (
                <div key={key} className="md:col-span-2 lg:col-span-3">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Dissolved Gas Analysis (DGA)</p>
                  <div className="grid grid-cols-5 gap-2 p-3 bg-white rounded border">
                    <div><span className="text-xs text-muted-foreground">H2:</span> <span className="font-medium">{value.H2} ppm</span></div>
                    <div><span className="text-xs text-muted-foreground">CH4:</span> <span className="font-medium">{value.CH4} ppm</span></div>
                    <div><span className="text-xs text-muted-foreground">C2H2:</span> <span className="font-medium">{value.C2H2} ppm</span></div>
                    <div><span className="text-xs text-muted-foreground">C2H4:</span> <span className="font-medium">{value.C2H4} ppm</span></div>
                    <div><span className="text-xs text-muted-foreground">CO:</span> <span className="font-medium">{value.CO} ppm</span></div>
                  </div>
                </div>
              )
            }
            if (key === "oltc") {
              return (
                <div key={key} className="md:col-span-2 lg:col-span-3">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">OLTC (On-Load Tap Changer)</p>
                  <div className="grid grid-cols-3 gap-2 p-3 bg-white rounded border">
                    <div><span className="text-xs text-muted-foreground">Type:</span> <span className="font-medium">{value.type}</span></div>
                    <div><span className="text-xs text-muted-foreground">Steps:</span> <span className="font-medium">{value.steps}</span></div>
                    <div><span className="text-xs text-muted-foreground">Last Service:</span> <span className="font-medium">{formatDate(value.lastService)}</span></div>
                  </div>
                </div>
              )
            }
            if (key === "impedance_R_X") {
              return (
                <div key={key}>
                  <p className="text-xs text-muted-foreground">Impedance (R/X)</p>
                  <p className="font-medium">{value.R} / {value.X}</p>
                </div>
              )
            }
            if (key === "sf6Compartment") {
              return (
                <div key={key} className="md:col-span-2 lg:col-span-3">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">SF6 Compartments</p>
                  <div className="space-y-2">
                    {value.map((comp: any, idx: number) => (
                      <div key={idx} className="p-2 bg-white rounded border text-sm">
                        <span className="font-medium">{comp.compartmentId}:</span> {comp.pressure} bar
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
            if (key === "sensors") {
              return (
                <div key={key} className="md:col-span-2 lg:col-span-3">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Sensors</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {value.map((sensor: any, idx: number) => (
                      <div key={idx} className="p-2 bg-white rounded border text-sm">
                        <span className="capitalize font-medium">{sensor.type}:</span> Threshold: {sensor.threshold}
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
            return (
              <div key={key}>
                <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                <div className="space-y-1">
                  {Object.entries(value).map(([subKey, subValue]: [string, any]) => (
                    <p key={subKey} className="font-medium text-sm">
                      {subKey}: {String(subValue)}
                    </p>
                  ))}
                </div>
              </div>
            )
          }
          if (Array.isArray(value)) return null
          return (
            <div key={key}>
              <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
              <p className="font-medium">{String(value)}</p>
            </div>
          )
        })}
      </div>

      {/* Condition Assessment */}
      {asset.conditionAssessment && (
        <div className="p-3 bg-white rounded border">
          <p className="text-sm font-medium mb-2">Condition Assessment</p>
          <div className="flex items-center gap-2">
            <Badge variant={asset.conditionAssessment.status === "Good" ? "default" : "secondary"}>
              {asset.conditionAssessment.status}
            </Badge>
            {asset.conditionAssessment.notes && (
              <p className="text-sm text-muted-foreground">{asset.conditionAssessment.notes}</p>
            )}
          </div>
        </div>
      )}

      {/* Maintenance History */}
      {asset.maintenanceHistory && asset.maintenanceHistory.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2 flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance History
          </p>
          <div className="space-y-2">
            {asset.maintenanceHistory.map((maintenance: any, idx: number) => (
              <div key={idx} className="p-3 bg-white rounded border text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{formatDate(maintenance.date)}</span>
                  <Badge variant="outline">{maintenance.vendor}</Badge>
                </div>
                <p className="text-muted-foreground text-xs">Technician: {maintenance.technician}</p>
                <p className="mt-1">{maintenance.notes}</p>
                {maintenance.documents && maintenance.documents.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                    <FileText className="h-3 w-3" />
                    {maintenance.documents.length} document(s)
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operation History */}
      {asset.operationHistory && asset.operationHistory.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Operation History
          </p>
          <div className="space-y-2">
            {asset.operationHistory.map((operation: any, idx: number) => (
              <div key={idx} className="p-3 bg-white rounded border text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{formatDateTime(operation.date)}</span>
                  <Badge variant="outline">{operation.eventType}</Badge>
                </div>
                <p className="mt-1">{operation.description}</p>
                {operation.comtradeUrl && (
                  <Button variant="link" size="sm" className="mt-2 p-0 h-auto text-xs">
                    View COMTRADE
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function AssetDetails({ substation }: AssetDetailsProps) {
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const [selectedAssetType, setSelectedAssetType] = useState<string>("")
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set())

  // Collect all maintenance and operation history
  const allMaintenanceHistory: any[] = []
  const allOperationHistory: any[] = []

  // Collect from all asset types
  Object.values(substation.assets).forEach((assetArray) => {
    assetArray.forEach((asset: any) => {
      if (asset.maintenanceHistory) {
        asset.maintenanceHistory.forEach((maint: any) => {
          allMaintenanceHistory.push({
            ...maint,
            assetId: asset.id,
            assetType: asset.manufacturer + " " + asset.model,
          })
        })
      }
      if (asset.operationHistory) {
        asset.operationHistory.forEach((op: any) => {
          allOperationHistory.push({
            ...op,
            assetId: asset.id,
            assetType: asset.manufacturer + " " + asset.model,
          })
        })
      }
    })
  })

  // Sort by date (newest first)
  allMaintenanceHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  allOperationHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const handleAssetClick = (asset: any, assetType: string) => {
    const assetKey = `${assetType}-${asset.id}`
    if (expandedAssets.has(assetKey)) {
      setExpandedAssets(prev => {
        const newSet = new Set(prev)
        newSet.delete(assetKey)
        return newSet
      })
      setSelectedAsset(null)
      setSelectedAssetType("")
    } else {
      setExpandedAssets(prev => new Set(prev).add(assetKey))
      setSelectedAsset(asset)
      setSelectedAssetType(assetType)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="h-9 w-9 rounded-full bg-transparent">
            <Link href="/view-substations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{substation.master.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{substation.master.areaName}</span>
              <span>•</span>
              <span>ID: {substation.master.substationCode}</span>
              <span>•</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Operational
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="default" asChild>
            <Link href={`/edit-substation/${substation.id}`}>
              <Edit className="mr-2 h-4 w-4" />
            Edit Substation
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Master Data */}
        <div className="space-y-6 md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Master Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">Voltage Class</span>
                <span className="font-medium text-right">{substation.master.voltageClass}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">Installation Year</span>
                <span className="font-medium text-right">{substation.master.installationYear}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">Operator</span>
                <span className="font-medium text-right">{substation.master.operator}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">Coordinates</span>
                <span className="font-medium text-right truncate">
                  {substation.master.latitude.toFixed(4)}° N, {substation.master.longitude.toFixed(4)}° E
                </span>
              </div>
              {substation.master.notes && (
                <div className="grid grid-cols-1 gap-1 pt-2 border-t">
                  <span className="text-muted-foreground">Notes</span>
                  <span className="font-medium text-sm">{substation.master.notes}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Asset Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transformers</span>
                <Badge>{substation.assets.transformers.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Breakers</span>
                <Badge>{substation.assets.breakers.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CT/VT</span>
                <Badge>{substation.assets.ctvt.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Busbars</span>
                <Badge>{substation.assets.busbars.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Relays</span>
                <Badge>{substation.assets.relays.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">PMU</span>
                <Badge>{substation.assets.pmu.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Battery</span>
                <Badge>{substation.assets.battery.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GIS</span>
                <Badge>{substation.assets.gis.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Isolators</span>
                <Badge>{substation.assets.isolators.length}</Badge>
                </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Power Flow Lines</span>
                <Badge>{substation.assets.powerFlowLines.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Earthing</span>
                <Badge>{substation.assets.earthing.length}</Badge>
                </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment</span>
                <Badge>{substation.assets.environment.length}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Assets & History */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="assets" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger
                value="assets"
                className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-4 py-2"
              >
                Assets & Equipment
              </TabsTrigger>
              <TabsTrigger
                value="maintenance"
                className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-4 py-2"
              >
                Maintenance History ({allMaintenanceHistory.length})
              </TabsTrigger>
              <TabsTrigger
                value="operation"
                className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-4 py-2"
              >
                Operation History ({allOperationHistory.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assets" className="pt-4">
              <Accordion type="single" collapsible className="w-full space-y-2">
                {/* Transformers */}
                {substation.assets.transformers.length > 0 && (
                <AccordionItem value="transformers" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center text-blue-700">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Transformers</span>
                          <span className="text-xs text-muted-foreground">
                            {substation.assets.transformers.length} Units
                          </span>
                        </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2 pb-4 space-y-3">
                        {substation.assets.transformers.map((transformer: any) => {
                          const assetKey = `Transformer-${transformer.id}`
                          const isExpanded = expandedAssets.has(assetKey)
                          return (
                            <div key={transformer.id}>
                              <div className="p-3 rounded-lg bg-slate-50 border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="font-medium">{transformer.id} - {transformer.manufacturer} {transformer.model}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {transformer.ratedMVA} MVA • {transformer.HV_kV}kV/{transformer.LV_kV}kV • {transformer.installationYear}
                                    </div>
                        </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={transformer.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                      {transformer.conditionAssessment?.status || "Unknown"}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAssetClick(transformer, "Transformer")}
                                      className="h-8 w-8 p-0"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                        </Button>
                      </div>
                                </div>
                              </div>
                              {isExpanded && selectedAsset?.id === transformer.id && (
                                <div className="mt-2">
                                  <AssetDetailsView asset={transformer} assetType="Transformer" />
                                </div>
                              )}
                        </div>
                          )
                        })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                )}

                {/* Breakers */}
                {substation.assets.breakers.length > 0 && (
                <AccordionItem value="breakers" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-orange-100 flex items-center justify-center text-orange-700">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Circuit Breakers</span>
                          <span className="text-xs text-muted-foreground">{substation.assets.breakers.length} Units</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 pb-4 space-y-3">
                        {substation.assets.breakers.map((breaker: any) => {
                          const assetKey = `Circuit Breaker-${breaker.id}`
                          const isExpanded = expandedAssets.has(assetKey)
                          return (
                            <div key={breaker.id}>
                              <div className="p-3 rounded-lg bg-slate-50 border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="font-medium">{breaker.id} - {breaker.manufacturer} {breaker.model}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {breaker.type} • {breaker.ratedVoltage_kV}kV • {breaker.ratedCurrent_A}A
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={breaker.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                      {breaker.conditionAssessment?.status || "Unknown"}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAssetClick(breaker, "Circuit Breaker")}
                                      className="h-8 w-8 p-0"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              {isExpanded && selectedAsset?.id === breaker.id && (
                                <div className="mt-2">
                                  <AssetDetailsView asset={breaker} assetType="Circuit Breaker" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* CT/VT */}
                {substation.assets.ctvt.length > 0 && (
                  <AccordionItem value="ctvt" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-purple-100 flex items-center justify-center text-purple-700">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">CT/VT</span>
                          <span className="text-xs text-muted-foreground">{substation.assets.ctvt.length} Units</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 pb-4 space-y-3">
                        {substation.assets.ctvt.map((ctvt: any) => {
                          const assetKey = `CT/VT-${ctvt.id}`
                          const isExpanded = expandedAssets.has(assetKey)
                          return (
                            <div key={ctvt.id}>
                              <div className="p-3 rounded-lg bg-slate-50 border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="font-medium">{ctvt.id} - {ctvt.manufacturer} {ctvt.model}</div>
                                    <div className="text-xs text-muted-foreground">
                                      Ratio: {ctvt.ratio} • Accuracy: {ctvt.accuracyClass}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={ctvt.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                      {ctvt.conditionAssessment?.status || "Unknown"}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAssetClick(ctvt, "CT/VT")}
                                      className="h-8 w-8 p-0"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              {isExpanded && selectedAsset?.id === ctvt.id && (
                                <div className="mt-2">
                                  <AssetDetailsView asset={ctvt} assetType="CT/VT" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Busbars */}
                {substation.assets.busbars.length > 0 && (
                  <AccordionItem value="busbars" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-green-100 flex items-center justify-center text-green-700">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Busbars</span>
                          <span className="text-xs text-muted-foreground">{substation.assets.busbars.length} Units</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                      <div className="pt-2 pb-4 space-y-3">
                        {substation.assets.busbars.map((busbar: any) => {
                          const assetKey = `Busbar-${busbar.id}`
                          const isExpanded = expandedAssets.has(assetKey)
                          return (
                            <div key={busbar.id}>
                              <div className="p-3 rounded-lg bg-slate-50 border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="font-medium">{busbar.id} - {busbar.manufacturer} {busbar.model}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {busbar.busType} • {busbar.material} • {busbar.capacity_A}A
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={busbar.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                      {busbar.conditionAssessment?.status || "Unknown"}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAssetClick(busbar, "Busbar")}
                                      className="h-8 w-8 p-0"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              {isExpanded && selectedAsset?.id === busbar.id && (
                                <div className="mt-2">
                                  <AssetDetailsView asset={busbar} assetType="Busbar" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                  </AccordionContent>
                </AccordionItem>
                )}

                {/* Relays */}
                {substation.assets.relays.length > 0 && (
                <AccordionItem value="relays" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-purple-100 flex items-center justify-center text-purple-700">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Protection Relays</span>
                          <span className="text-xs text-muted-foreground">{substation.assets.relays.length} Units</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 pb-4 space-y-3">
                        {substation.assets.relays.map((relay: any) => {
                          const assetKey = `Protection Relay-${relay.id}`
                          const isExpanded = expandedAssets.has(assetKey)
                          return (
                            <div key={relay.id}>
                              <div className="p-3 rounded-lg bg-slate-50 border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="font-medium">{relay.id} - {relay.manufacturer} {relay.model}</div>
                                    <div className="text-xs text-muted-foreground">{relay.relayType}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={relay.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                      {relay.conditionAssessment?.status || "Unknown"}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAssetClick(relay, "Protection Relay")}
                                      className="h-8 w-8 p-0"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              {isExpanded && selectedAsset?.id === relay.id && (
                                <div className="mt-2">
                                  <AssetDetailsView asset={relay} assetType="Protection Relay" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* PMU */}
                {substation.assets.pmu.length > 0 && (
                  <AccordionItem value="pmu" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-teal-100 flex items-center justify-center text-teal-700">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">PMU</span>
                          <span className="text-xs text-muted-foreground">{substation.assets.pmu.length} Units</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 pb-4 space-y-3">
                        {substation.assets.pmu.map((pmu: any) => {
                          const assetKey = `PMU-${pmu.id}`
                          const isExpanded = expandedAssets.has(assetKey)
                          return (
                            <div key={pmu.id}>
                              <div className="p-3 rounded-lg bg-slate-50 border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="font-medium">{pmu.id} - {pmu.manufacturer} {pmu.model}</div>
                                    <div className="text-xs text-muted-foreground">GPS: {pmu.gpsSyncStatus}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={pmu.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                      {pmu.conditionAssessment?.status || "Unknown"}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAssetClick(pmu, "PMU")}
                                      className="h-8 w-8 p-0"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              {isExpanded && selectedAsset?.id === pmu.id && (
                                <div className="mt-2">
                                  <AssetDetailsView asset={pmu} assetType="PMU" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Battery */}
                {substation.assets.battery.length > 0 && (
                  <AccordionItem value="battery" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-yellow-100 flex items-center justify-center text-yellow-700">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Battery</span>
                          <span className="text-xs text-muted-foreground">{substation.assets.battery.length} Units</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 pb-4 space-y-3">
                        {substation.assets.battery.map((battery: any) => {
                          const assetKey = `Battery-${battery.id}`
                          const isExpanded = expandedAssets.has(assetKey)
                          return (
                            <div key={battery.id}>
                              <div className="p-3 rounded-lg bg-slate-50 border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="font-medium">{battery.id} - {battery.manufacturer} {battery.model}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {battery.batteryType} • {battery.ratedVoltage_V}V • {battery.capacity_Ah}Ah
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={battery.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                      {battery.conditionAssessment?.status || "Unknown"}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAssetClick(battery, "Battery")}
                                      className="h-8 w-8 p-0"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              {isExpanded && selectedAsset?.id === battery.id && (
                                <div className="mt-2">
                                  <AssetDetailsView asset={battery} assetType="Battery" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* GIS */}
                {substation.assets.gis.length > 0 && (
                  <AccordionItem value="gis" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-indigo-100 flex items-center justify-center text-indigo-700">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">GIS</span>
                          <span className="text-xs text-muted-foreground">{substation.assets.gis.length} Units</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 pb-4 space-y-3">
                        {substation.assets.gis.map((gis: any) => {
                          const assetKey = `GIS-${gis.id}`
                          const isExpanded = expandedAssets.has(assetKey)
                          return (
                            <div key={gis.id}>
                              <div className="p-3 rounded-lg bg-slate-50 border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="font-medium">{gis.id} - {gis.manufacturer} {gis.model}</div>
                                    <div className="text-xs text-muted-foreground">PD Monitoring: {gis.pdMonitoringInstalled ? "Yes" : "No"}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={gis.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                      {gis.conditionAssessment?.status || "Unknown"}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAssetClick(gis, "GIS")}
                                      className="h-8 w-8 p-0"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              {isExpanded && selectedAsset?.id === gis.id && (
                                <div className="mt-2">
                                  <AssetDetailsView asset={gis} assetType="GIS" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Isolators */}
                {substation.assets.isolators.length > 0 && (
                  <AccordionItem value="isolators" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-cyan-100 flex items-center justify-center text-cyan-700">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Isolators</span>
                          <span className="text-xs text-muted-foreground">{substation.assets.isolators.length} Units</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 pb-4 space-y-3">
                        {substation.assets.isolators.map((isolator: any) => {
                          const assetKey = `Isolator-${isolator.id}`
                          const isExpanded = expandedAssets.has(assetKey)
                          return (
                            <div key={isolator.id}>
                              <div className="p-3 rounded-lg bg-slate-50 border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="font-medium">{isolator.id} - {isolator.manufacturer} {isolator.model}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {isolator.type} • {isolator.driveMechanism}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={isolator.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                      {isolator.conditionAssessment?.status || "Unknown"}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAssetClick(isolator, "Isolator")}
                                      className="h-8 w-8 p-0"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              {isExpanded && selectedAsset?.id === isolator.id && (
                                <div className="mt-2">
                                  <AssetDetailsView asset={isolator} assetType="Isolator" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Power Flow Lines */}
                {substation.assets.powerFlowLines.length > 0 && (
                  <AccordionItem value="powerFlowLines" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-pink-100 flex items-center justify-center text-pink-700">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Power Flow Lines</span>
                          <span className="text-xs text-muted-foreground">{substation.assets.powerFlowLines.length} Units</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 pb-4 space-y-3">
                        {substation.assets.powerFlowLines.map((line: any) => {
                          const assetKey = `Power Flow Line-${line.id}`
                          const isExpanded = expandedAssets.has(assetKey)
                          return (
                            <div key={line.id}>
                              <div className="p-3 rounded-lg bg-slate-50 border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="font-medium">{line.id} - {line.model}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {line.lineVoltage_kV}kV • {line.length_km}km • {line.conductorType}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={line.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                      {line.conditionAssessment?.status || "Unknown"}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAssetClick(line, "Power Flow Line")}
                                      className="h-8 w-8 p-0"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              {isExpanded && selectedAsset?.id === line.id && (
                                <div className="mt-2">
                                  <AssetDetailsView asset={line} assetType="Power Flow Line" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Earthing */}
                {substation.assets.earthing.length > 0 && (
                  <AccordionItem value="earthing" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-amber-100 flex items-center justify-center text-amber-700">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Earthing</span>
                          <span className="text-xs text-muted-foreground">{substation.assets.earthing.length} Units</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 pb-4 space-y-3">
                        {substation.assets.earthing.map((earthing: any) => {
                          const assetKey = `Earthing-${earthing.id}`
                          const isExpanded = expandedAssets.has(assetKey)
                          return (
                            <div key={earthing.id}>
                              <div className="p-3 rounded-lg bg-slate-50 border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="font-medium">{earthing.id} - {earthing.manufacturer} {earthing.model}</div>
                                    <div className="text-xs text-muted-foreground">
                                      Resistance: {earthing.gridResistance}Ω • {earthing.soilType}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={earthing.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                      {earthing.conditionAssessment?.status || "Unknown"}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAssetClick(earthing, "Earthing")}
                                      className="h-8 w-8 p-0"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              {isExpanded && selectedAsset?.id === earthing.id && (
                                <div className="mt-2">
                                  <AssetDetailsView asset={earthing} assetType="Earthing" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Environment */}
                {substation.assets.environment.length > 0 && (
                  <AccordionItem value="environment" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-emerald-100 flex items-center justify-center text-emerald-700">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Environment</span>
                          <span className="text-xs text-muted-foreground">{substation.assets.environment.length} Units</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                      <div className="pt-2 pb-4 space-y-3">
                        {substation.assets.environment.map((env: any) => {
                          const assetKey = `Environment-${env.id}`
                          const isExpanded = expandedAssets.has(assetKey)
                          return (
                            <div key={env.id}>
                              <div className="p-3 rounded-lg bg-slate-50 border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="font-medium">{env.id} - {env.manufacturer} {env.model}</div>
                                    <div className="text-xs text-muted-foreground">
                                      Sensors: {env.sensors?.length || 0} configured
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={env.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                      {env.conditionAssessment?.status || "Unknown"}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAssetClick(env, "Environment")}
                                      className="h-8 w-8 p-0"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              {isExpanded && selectedAsset?.id === env.id && (
                                <div className="mt-2">
                                  <AssetDetailsView asset={env} assetType="Environment" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                  </AccordionContent>
                </AccordionItem>
                )}
              </Accordion>
            </TabsContent>

            <TabsContent value="maintenance" className="pt-4">
              <div className="space-y-4">
                {allMaintenanceHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No maintenance history available</p>
                ) : (
                  allMaintenanceHistory.map((maintenance, idx) => (
                    <div key={idx} className="flex gap-4 pb-4 border-b last:border-0">
                    <div className="mt-1">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Wrench className="h-4 w-4" />
                      </div>
                    </div>
                      <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                          <span className="font-medium">{maintenance.assetType}</span>
                        <Badge variant="outline">Completed</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">{maintenance.notes}</div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {formatDate(maintenance.date)}
                          </span>
                          <span>Vendor: {maintenance.vendor}</span>
                          <span>Technician: {maintenance.technician}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="operation" className="pt-4">
              <div className="space-y-4">
                {allOperationHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No operation history available</p>
                ) : (
                  allOperationHistory.map((operation, idx) => (
                    <div key={idx} className="flex gap-4 pb-4 border-b last:border-0">
                      <div className="mt-1">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                          <Activity className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{operation.assetType}</span>
                          <Badge variant="outline">{operation.eventType}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">{operation.description}</div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {formatDateTime(operation.date)}
                        </span>
                          {operation.comtradeUrl && (
                            <Button variant="link" size="sm" className="p-0 h-auto text-xs">
                              View COMTRADE
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

    </div>
  )
}
