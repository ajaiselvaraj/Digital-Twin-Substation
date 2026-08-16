"use client"

import { use, useState, useEffect } from "react"
import { getSubstationByIdFromFirebase } from "@/lib/firebase-data"
import type { DummySubstation } from "@/lib/dummy-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, Calendar, FileText, Wrench, Activity } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { EditableMasterForm } from "@/components/forms/editable-master-form"
import { TransformerForm } from "@/components/forms/transformer-form"
import { BreakerForm } from "@/components/forms/breaker-form"
import { CTVTForm } from "@/components/forms/ctvt-form"
import { BusbarForm } from "@/components/forms/busbar-form"
import { RelayForm } from "@/components/forms/relay-form"
import { PMUForm } from "@/components/forms/pmu-form"
import { BatteryForm } from "@/components/forms/battery-form"
import { GISForm } from "@/components/forms/gis-form"
import { IsolatorForm } from "@/components/forms/isolator-form"
import { PowerFlowLineForm } from "@/components/forms/power-flow-line-form"
import { EarthingForm } from "@/components/forms/earthing-form"
import { EnvironmentForm } from "@/components/forms/environment-form"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Plus, Edit } from "lucide-react"
import type { z } from "zod"
import { TransformerSchema, BreakerSchema, CTVTSchema, BusbarSchema, RelaySchema, PMUSchema, BatterySchema, GISSchema, IsolatorSchema, PowerFlowLineSchema, EarthingSchema, EnvironmentSchema } from "@/lib/schemas"

interface EditSubstationPageProps {
  params: Promise<{ id: string }>
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

export default function EditSubstationPage({ params }: EditSubstationPageProps) {
  const resolvedParams = use(params)
  const [substation, setSubstation] = useState<DummySubstation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showTransformerForm, setShowTransformerForm] = useState(false)
  const [showBreakerForm, setShowBreakerForm] = useState(false)
  const [showCTVTForm, setShowCTVTForm] = useState(false)
  const [showBusbarForm, setShowBusbarForm] = useState(false)
  const [showRelayForm, setShowRelayForm] = useState(false)
  const [showPMUForm, setShowPMUForm] = useState(false)
  const [showBatteryForm, setShowBatteryForm] = useState(false)
  const [showGISForm, setShowGISForm] = useState(false)
  const [showIsolatorForm, setShowIsolatorForm] = useState(false)
  const [showPowerFlowLineForm, setShowPowerFlowLineForm] = useState(false)
  const [showEarthingForm, setShowEarthingForm] = useState(false)
  const [showEnvironmentForm, setShowEnvironmentForm] = useState(false)
  const [editingTransformerId, setEditingTransformerId] = useState<string | null>(null)
  const [editingBreakerId, setEditingBreakerId] = useState<string | null>(null)
  const [editingCTVTId, setEditingCTVTId] = useState<string | null>(null)
  const [editingBusbarId, setEditingBusbarId] = useState<string | null>(null)
  const [editingRelayId, setEditingRelayId] = useState<string | null>(null)
  const [editingPMUId, setEditingPMUId] = useState<string | null>(null)
  const [editingBatteryId, setEditingBatteryId] = useState<string | null>(null)
  const [editingGISId, setEditingGISId] = useState<string | null>(null)
  const [editingIsolatorId, setEditingIsolatorId] = useState<string | null>(null)
  const [editingPowerFlowLineId, setEditingPowerFlowLineId] = useState<string | null>(null)
  const [editingEarthingId, setEditingEarthingId] = useState<string | null>(null)
  const [editingEnvironmentId, setEditingEnvironmentId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSubstation() {
      setIsLoading(true)
      try {
        const data = await getSubstationByIdFromFirebase(resolvedParams.id)
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
        <Button asChild>
          <Link href="/manage-substations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Manage
          </Link>
        </Button>
      </div>
    )
  }

  const handleSaveMaster = async (data: any) => {
    setIsSaving(true)
    try {
      // Update in Firestore
      const substationRef = doc(db, "substations", substation!.id)
      await updateDoc(substationRef, {
        master: data,
        updatedAt: new Date().toISOString(),
      })
      // Refresh substation data
      const updated = await getSubstationByIdFromFirebase(substation!.id)
      setSubstation(updated || null)
      alert("Master data saved successfully!")
    } catch (error) {
      console.error("Error saving master data:", error)
      alert("Error saving data. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddTransformer = async (data: z.infer<typeof TransformerSchema>) => {
    if (!substation) return
    setIsSaving(true)
    try {
      if (editingTransformerId) {
        // Update existing transformer
        const updatedTransformers = substation.assets.transformers.map((t) =>
          t.id === editingTransformerId ? data : t
        )
        const substationRef = doc(db, "substations", substation.id)
        await updateDoc(substationRef, {
          "assets.transformers": updatedTransformers,
          updatedAt: new Date().toISOString(),
        })
        setEditingTransformerId(null)
        setShowTransformerForm(false)
        alert("Transformer updated successfully!")
      } else {
        // Add new transformer
        const updatedTransformers = [...(substation.assets.transformers || []), data]
        const substationRef = doc(db, "substations", substation.id)
        await updateDoc(substationRef, {
          "assets.transformers": updatedTransformers,
          updatedAt: new Date().toISOString(),
        })
        setShowTransformerForm(false)
        alert("Transformer added successfully!")
      }
      // Refresh substation data
      const updated = await getSubstationByIdFromFirebase(substation.id)
      setSubstation(updated || null)
    } catch (error) {
      console.error("Error saving transformer:", error)
      alert("Error saving transformer. Please try again.")
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddBreaker = async (data: z.infer<typeof BreakerSchema>) => {
    if (!substation) return
    setIsSaving(true)
    try {
      if (editingBreakerId) {
        const updatedBreakers = substation.assets.breakers.map((b) =>
          b.id === editingBreakerId ? data : b
        )
        const substationRef = doc(db, "substations", substation.id)
        await updateDoc(substationRef, {
          "assets.breakers": updatedBreakers,
          updatedAt: new Date().toISOString(),
        })
        setEditingBreakerId(null)
        setShowBreakerForm(false)
        alert("Breaker updated successfully!")
      } else {
        const updatedBreakers = [...(substation.assets.breakers || []), data]
        const substationRef = doc(db, "substations", substation.id)
        await updateDoc(substationRef, {
          "assets.breakers": updatedBreakers,
          updatedAt: new Date().toISOString(),
        })
        setShowBreakerForm(false)
        alert("Breaker added successfully!")
      }
      const updated = await getSubstationByIdFromFirebase(substation.id)
      setSubstation(updated || null)
    } catch (error) {
      console.error("Error saving breaker:", error)
      alert("Error saving breaker. Please try again.")
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  // Generic handler function for adding/updating assets
  const createAssetHandler = (
    assetType: keyof DummySubstation["assets"],
    setShowForm: (show: boolean) => void,
    assetName: string,
    editingId: string | null,
    setEditingId: (id: string | null) => void
  ) => {
    return async (data: any) => {
      if (!substation) return
      setIsSaving(true)
      try {
        const currentAssets = substation.assets[assetType] || []
        let updatedAssets
        if (editingId) {
          updatedAssets = currentAssets.map((asset: any) =>
            asset.id === editingId ? data : asset
          )
          setEditingId(null)
          setShowForm(false)
          alert(`${assetName} updated successfully!`)
        } else {
          updatedAssets = [...currentAssets, data]
          setShowForm(false)
          alert(`${assetName} added successfully!`)
        }
        const substationRef = doc(db, "substations", substation.id)
        await updateDoc(substationRef, {
          [`assets.${assetType}`]: updatedAssets,
          updatedAt: new Date().toISOString(),
        })
        const updated = await getSubstationByIdFromFirebase(substation.id)
        setSubstation(updated || null)
      } catch (error) {
        console.error(`Error saving ${assetName}:`, error)
        alert(`Error saving ${assetName}. Please try again.`)
        throw error
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleAddCTVT = createAssetHandler("ctvt", setShowCTVTForm, "CT/VT", editingCTVTId, setEditingCTVTId)
  const handleAddBusbar = createAssetHandler("busbars", setShowBusbarForm, "Busbar", editingBusbarId, setEditingBusbarId)
  const handleAddRelay = createAssetHandler("relays", setShowRelayForm, "Relay", editingRelayId, setEditingRelayId)
  const handleAddPMU = createAssetHandler("pmu", setShowPMUForm, "PMU", editingPMUId, setEditingPMUId)
  const handleAddBattery = createAssetHandler("battery", setShowBatteryForm, "Battery", editingBatteryId, setEditingBatteryId)
  const handleAddGIS = createAssetHandler("gis", setShowGISForm, "GIS", editingGISId, setEditingGISId)
  const handleAddIsolator = createAssetHandler("isolators", setShowIsolatorForm, "Isolator", editingIsolatorId, setEditingIsolatorId)
  const handleAddPowerFlowLine = createAssetHandler("powerFlowLines", setShowPowerFlowLineForm, "Power Flow Line", editingPowerFlowLineId, setEditingPowerFlowLineId)
  const handleAddEarthing = createAssetHandler("earthing", setShowEarthingForm, "Earthing", editingEarthingId, setEditingEarthingId)
  const handleAddEnvironment = createAssetHandler("environment", setShowEnvironmentForm, "Environment System", editingEnvironmentId, setEditingEnvironmentId)

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/manage-substations">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{substation.master.name}</h1>
              <p className="text-sm text-muted-foreground">
                {substation.master.areaName} • {substation.master.substationCode}
              </p>
            </div>
          </div>
        </div>
        <Button
          type="submit"
          form="master-form"
          className="bg-green-600 hover:bg-green-700 text-white"
          disabled={isSaving}
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Master Data Section */}
      <Card>
        <CardHeader>
          <CardTitle>Master Data</CardTitle>
        </CardHeader>
        <CardContent>
          <EditableMasterForm substation={substation} onSave={handleSaveMaster} />
        </CardContent>
      </Card>

      {/* Assets Section */}
      <Tabs defaultValue="transformers" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1 overflow-x-auto">
          <TabsTrigger value="transformers">Transformers</TabsTrigger>
          <TabsTrigger value="breakers">Breakers</TabsTrigger>
          <TabsTrigger value="ctvt">CT/VT</TabsTrigger>
          <TabsTrigger value="busbars">Busbars</TabsTrigger>
          <TabsTrigger value="relays">Relays</TabsTrigger>
          <TabsTrigger value="pmu">PMU</TabsTrigger>
          <TabsTrigger value="battery">Battery</TabsTrigger>
          <TabsTrigger value="gis">GIS</TabsTrigger>
          <TabsTrigger value="isolators">Isolators</TabsTrigger>
          <TabsTrigger value="powerFlowLines">Power Flow Lines</TabsTrigger>
          <TabsTrigger value="earthing">Earthing</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
        </TabsList>

        {/* Transformers Tab */}
        <TabsContent value="transformers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Transformers ({substation.assets.transformers.length})</CardTitle>
                <Button onClick={() => setShowTransformerForm(!showTransformerForm)} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  {showTransformerForm ? "Hide Form" : "Add New"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {substation.assets.transformers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transformers available</p>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {substation.assets.transformers.map((transformer) => (
                    <AccordionItem key={transformer.id} value={transformer.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{transformer.id}</Badge>
                          <span className="font-medium">
                            {transformer.manufacturer} - {transformer.model}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 p-4 bg-slate-50 rounded-md">
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Rated MVA</p>
                              <p className="font-medium">{transformer.ratedMVA} MVA</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">HV/LV</p>
                              <p className="font-medium">
                                {transformer.HV_kV}kV / {transformer.LV_kV}kV
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Cooling Type</p>
                              <p className="font-medium">{transformer.coolingType}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Vector Group</p>
                              <p className="font-medium">{transformer.vectorGroup}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Installation Year</p>
                              <p className="font-medium">{transformer.installationYear}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Condition</p>
                              <Badge
                                variant={transformer.conditionAssessment?.status === "Good" ? "default" : "secondary"}
                              >
                                {transformer.conditionAssessment?.status || "N/A"}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Core Material</p>
                              <p className="font-medium">{transformer.coreMaterial}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Winding Material</p>
                              <p className="font-medium">{transformer.windingMaterial}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Oil Type</p>
                              <p className="font-medium">{transformer.oilType}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Oil Moisture</p>
                              <p className="font-medium">{transformer.oilMoisture_ppm} ppm</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">OLTC Operations</p>
                              <p className="font-medium">{transformer.oltcOpsCount}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Buchholz Installed</p>
                              <p className="font-medium">{transformer.buchholzInstalled ? "Yes" : "No"}</p>
                            </div>
                          </div>

                          {/* DGA Data */}
                          {transformer.DGA && (
                            <div className="mt-4 p-3 bg-white rounded border">
                              <p className="text-sm font-medium mb-2">Dissolved Gas Analysis (DGA)</p>
                              <div className="grid grid-cols-5 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">H2:</span> {transformer.DGA.H2} ppm
                                </div>
                                <div>
                                  <span className="text-muted-foreground">CH4:</span> {transformer.DGA.CH4} ppm
                                </div>
                                <div>
                                  <span className="text-muted-foreground">C2H2:</span> {transformer.DGA.C2H2} ppm
                                </div>
                                <div>
                                  <span className="text-muted-foreground">C2H4:</span> {transformer.DGA.C2H4} ppm
                                </div>
                                <div>
                                  <span className="text-muted-foreground">CO:</span> {transformer.DGA.CO} ppm
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Maintenance History */}
                          {transformer.maintenanceHistory && transformer.maintenanceHistory.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Maintenance History
                              </p>
                              <div className="space-y-2">
                                {transformer.maintenanceHistory.map((maintenance: any, idx: number) => (
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
                          {transformer.operationHistory && transformer.operationHistory.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                Operation History
                              </p>
                              <div className="space-y-2">
                                {transformer.operationHistory.map((operation: any, idx: number) => (
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

                          {/* Edit Button */}
                          <div className="mt-4 flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingTransformerId(transformer.id)
                                setShowTransformerForm(true)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Transformer
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
          
          {/* Inline Transformer Form */}
          {(showTransformerForm || editingTransformerId) && (
            <TransformerForm
              onSubmit={handleAddTransformer}
              onCancel={() => {
                setShowTransformerForm(false)
                setEditingTransformerId(null)
              }}
              initialData={editingTransformerId ? substation.assets.transformers.find(t => t.id === editingTransformerId) : undefined}
            />
          )}
        </TabsContent>

        {/* Breakers Tab */}
        <TabsContent value="breakers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Circuit Breakers ({substation.assets.breakers.length})</CardTitle>
                <Button onClick={() => setShowBreakerForm(!showBreakerForm)} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  {showBreakerForm ? "Hide Form" : "Add New"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {substation.assets.breakers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No breakers available</p>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {substation.assets.breakers.map((breaker) => (
                    <AccordionItem key={breaker.id} value={breaker.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{breaker.id}</Badge>
                          <span className="font-medium">
                            {breaker.manufacturer} - {breaker.model}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 p-4 bg-slate-50 rounded-md">
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Type</p>
                              <p className="font-medium">{breaker.type}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Rated Voltage</p>
                              <p className="font-medium">{breaker.ratedVoltage_kV} kV</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Rated Current</p>
                              <p className="font-medium">{breaker.ratedCurrent_A} A</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Short Circuit Breaking</p>
                              <p className="font-medium">{breaker.shortCircuitBreaking_kA} kA</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Making Capacity</p>
                              <p className="font-medium">{breaker.makingCapacity_kA} kA</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Mechanism</p>
                              <p className="font-medium">{breaker.mechanismType}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Operation Count</p>
                              <p className="font-medium">{breaker.opCount}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Operating Time</p>
                              <p className="font-medium">{breaker.operatingTime_ms} ms</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">SF6 Pressure</p>
                              <p className="font-medium">{breaker.sf6Pressure} bar</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Condition</p>
                              <Badge variant={breaker.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                {breaker.conditionAssessment?.status || "N/A"}
                              </Badge>
                            </div>
                          </div>

                          {/* Maintenance History */}
                          {breaker.maintenanceHistory && breaker.maintenanceHistory.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Maintenance History
                              </p>
                              <div className="space-y-2">
                                {breaker.maintenanceHistory.map((maintenance: any, idx: number) => (
                                  <div key={idx} className="p-3 bg-white rounded border text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium">{formatDate(maintenance.date)}</span>
                                      <Badge variant="outline">{maintenance.vendor}</Badge>
                                    </div>
                                    <p className="text-muted-foreground text-xs">Technician: {maintenance.technician}</p>
                                    <p className="mt-1">{maintenance.notes}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Operation History */}
                          {breaker.operationHistory && breaker.operationHistory.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                Operation History
                              </p>
                              <div className="space-y-2">
                                {breaker.operationHistory.map((operation: any, idx: number) => (
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

                          {/* Edit Button */}
                          <div className="mt-4 flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingBreakerId(breaker.id)
                                setShowBreakerForm(true)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Breaker
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
          
          {/* Inline Breaker Form */}
          {(showBreakerForm || editingBreakerId) && (
            <BreakerForm
              onSubmit={handleAddBreaker}
              onCancel={() => {
                setShowBreakerForm(false)
                setEditingBreakerId(null)
              }}
              initialData={editingBreakerId ? substation.assets.breakers.find(b => b.id === editingBreakerId) : undefined}
            />
          )}
        </TabsContent>

        {/* CT/VT Tab */}
        <TabsContent value="ctvt" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Current & Voltage Transformers ({substation.assets.ctvt.length})
                </CardTitle>
                <Button size="sm" className="gap-2" onClick={() => setShowCTVTForm(!showCTVTForm)}>
                  <Plus className="h-4 w-4" />
                  {showCTVTForm ? "Hide Form" : "Add New"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {substation.assets.ctvt.length === 0 ? (
                <p className="text-sm text-muted-foreground">No CT/VT data available</p>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {substation.assets.ctvt.map((ctvt) => (
                    <AccordionItem key={ctvt.id} value={ctvt.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{ctvt.id}</Badge>
                          <span className="font-medium">
                            {ctvt.manufacturer} - {ctvt.model}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 p-4 bg-slate-50 rounded-md">
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Ratio</p>
                              <p className="font-medium">{ctvt.ratio}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Accuracy Class</p>
                              <p className="font-medium">{ctvt.accuracyClass}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Burden</p>
                              <p className="font-medium">{ctvt.burdenVA} VA</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Last Calibration</p>
                              <p className="font-medium">{formatDate(ctvt.lastCalibrationDate)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Condition</p>
                              <Badge variant={ctvt.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                {ctvt.conditionAssessment?.status || "N/A"}
                              </Badge>
                            </div>
                          </div>

                          {/* Maintenance History */}
                          {ctvt.maintenanceHistory && ctvt.maintenanceHistory.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Maintenance History
                              </p>
                              <div className="space-y-2">
                                {ctvt.maintenanceHistory.map((maintenance: any, idx: number) => (
                                  <div key={idx} className="p-3 bg-white rounded border text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium">{formatDate(maintenance.date)}</span>
                                      <Badge variant="outline">{maintenance.vendor}</Badge>
                                    </div>
                                    <p className="text-muted-foreground text-xs">Technician: {maintenance.technician}</p>
                                    <p className="mt-1">{maintenance.notes}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Edit Button */}
                          <div className="mt-4 flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingCTVTId(ctvt.id)
                                setShowCTVTForm(true)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit CT/VT
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
          
          {/* Inline CT/VT Form */}
          {(showCTVTForm || editingCTVTId) && (
            <CTVTForm
              onSubmit={handleAddCTVT}
              onCancel={() => {
                setShowCTVTForm(false)
                setEditingCTVTId(null)
              }}
              initialData={editingCTVTId ? substation.assets.ctvt.find(c => c.id === editingCTVTId) : undefined}
            />
          )}
        </TabsContent>

        {/* Busbars Tab */}
        <TabsContent value="busbars" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Busbars ({substation.assets.busbars.length})</CardTitle>
                <Button size="sm" className="gap-2" onClick={() => setShowBusbarForm(!showBusbarForm)}>
                  <Plus className="h-4 w-4" />
                  {showBusbarForm ? "Hide Form" : "Add New"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {substation.assets.busbars.length === 0 ? (
                <p className="text-sm text-muted-foreground">No busbars available</p>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {substation.assets.busbars.map((busbar) => (
                    <AccordionItem key={busbar.id} value={busbar.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{busbar.id}</Badge>
                          <span className="font-medium">
                            {busbar.manufacturer} - {busbar.model}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 p-4 bg-slate-50 rounded-md">
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Bus Type</p>
                              <p className="font-medium">{busbar.busType}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Material</p>
                              <p className="font-medium">{busbar.material}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Capacity</p>
                              <p className="font-medium">{busbar.capacity_A} A</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Last IR Scan</p>
                              <p className="font-medium">{formatDate(busbar.lastIRScanDate)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Condition</p>
                              <Badge variant={busbar.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                {busbar.conditionAssessment?.status || "N/A"}
                              </Badge>
                            </div>
                          </div>

                          {/* Maintenance History */}
                          {busbar.maintenanceHistory && busbar.maintenanceHistory.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Maintenance History
                              </p>
                              <div className="space-y-2">
                                {busbar.maintenanceHistory.map((maintenance: any, idx: number) => (
                                  <div key={idx} className="p-3 bg-white rounded border text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium">{formatDate(maintenance.date)}</span>
                                      <Badge variant="outline">{maintenance.vendor}</Badge>
                                    </div>
                                    <p className="text-muted-foreground text-xs">Technician: {maintenance.technician}</p>
                                    <p className="mt-1">{maintenance.notes}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Edit Button */}
                          <div className="mt-4 flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingBusbarId(busbar.id)
                                setShowBusbarForm(true)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Busbar
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
          
          {/* Inline Busbar Form */}
          {(showBusbarForm || editingBusbarId) && (
            <BusbarForm
              onSubmit={handleAddBusbar}
              onCancel={() => {
                setShowBusbarForm(false)
                setEditingBusbarId(null)
              }}
              initialData={editingBusbarId ? substation.assets.busbars.find(b => b.id === editingBusbarId) : undefined}
            />
          )}
        </TabsContent>

        {/* Relays Tab */}
        <TabsContent value="relays" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Protection Relays ({substation.assets.relays.length})</CardTitle>
                <Button size="sm" className="gap-2" onClick={() => setShowRelayForm(!showRelayForm)}>
                  <Plus className="h-4 w-4" />
                  {showRelayForm ? "Hide Form" : "Add New"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {substation.assets.relays.length === 0 ? (
                <p className="text-sm text-muted-foreground">No relay data available</p>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {substation.assets.relays.map((relay) => (
                    <AccordionItem key={relay.id} value={relay.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{relay.id}</Badge>
                          <span className="font-medium">
                            {relay.manufacturer} - {relay.model}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 p-4 bg-slate-50 rounded-md">
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Relay Type</p>
                              <p className="font-medium">{relay.relayType}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Firmware Version</p>
                              <p className="font-medium">{relay.firmwareVersion}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Last Config Upload</p>
                              <p className="font-medium">{formatDateTime(relay.lastConfigUpload)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Enabled Functions</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {relay.enabledFunctions.map((func: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {func}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Condition</p>
                              <Badge variant={relay.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                {relay.conditionAssessment?.status || "N/A"}
                              </Badge>
                            </div>
                          </div>

                          {/* Maintenance History */}
                          {relay.maintenanceHistory && relay.maintenanceHistory.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Maintenance History
                              </p>
                              <div className="space-y-2">
                                {relay.maintenanceHistory.map((maintenance: any, idx: number) => (
                                  <div key={idx} className="p-3 bg-white rounded border text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium">{formatDate(maintenance.date)}</span>
                                      <Badge variant="outline">{maintenance.vendor}</Badge>
                                    </div>
                                    <p className="text-muted-foreground text-xs">Technician: {maintenance.technician}</p>
                                    <p className="mt-1">{maintenance.notes}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
          
          {/* Inline Relay Form */}
          {showRelayForm && (
            <RelayForm
              onSubmit={handleAddRelay}
              onCancel={() => setShowRelayForm(false)}
            />
          )}
        </TabsContent>

        {/* PMU Tab */}
        <TabsContent value="pmu" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">PMU ({substation.assets.pmu.length})</CardTitle>
                <Button size="sm" className="gap-2" onClick={() => setShowPMUForm(!showPMUForm)}>
                  <Plus className="h-4 w-4" />
                  {showPMUForm ? "Hide Form" : "Add New"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {substation.assets.pmu.length === 0 ? (
                <p className="text-sm text-muted-foreground">No PMU data available</p>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {substation.assets.pmu.map((pmu) => (
                    <AccordionItem key={pmu.id} value={pmu.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{pmu.id}</Badge>
                          <span className="font-medium">
                            {pmu.manufacturer} - {pmu.model}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 p-4 bg-slate-50 rounded-md">
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground">GPS Sync Status</p>
                              <Badge variant={pmu.gpsSyncStatus === "Locked" ? "default" : "secondary"}>
                                {pmu.gpsSyncStatus}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Accuracy</p>
                              <p className="font-medium">{pmu.accuracy} ms</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Last Sync</p>
                              <p className="font-medium">{formatDateTime(pmu.lastSync)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Condition</p>
                              <Badge variant={pmu.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                {pmu.conditionAssessment?.status || "N/A"}
                              </Badge>
                            </div>
                          </div>

                          {/* Maintenance History */}
                          {pmu.maintenanceHistory && pmu.maintenanceHistory.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Maintenance History
                              </p>
                              <div className="space-y-2">
                                {pmu.maintenanceHistory.map((maintenance: any, idx: number) => (
                                  <div key={idx} className="p-3 bg-white rounded border text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium">{formatDate(maintenance.date)}</span>
                                      <Badge variant="outline">{maintenance.vendor}</Badge>
                                    </div>
                                    <p className="text-muted-foreground text-xs">Technician: {maintenance.technician}</p>
                                    <p className="mt-1">{maintenance.notes}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
          
          {/* Inline PMU Form */}
          {showPMUForm && (
            <PMUForm
              onSubmit={handleAddPMU}
              onCancel={() => setShowPMUForm(false)}
            />
          )}
        </TabsContent>

        {/* Battery Tab */}
        <TabsContent value="battery" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Battery Systems ({substation.assets.battery.length})</CardTitle>
                <Button size="sm" className="gap-2" onClick={() => setShowBatteryForm(!showBatteryForm)}>
                  <Plus className="h-4 w-4" />
                  {showBatteryForm ? "Hide Form" : "Add New"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {substation.assets.battery.length === 0 ? (
                <p className="text-sm text-muted-foreground">No battery data available</p>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {substation.assets.battery.map((battery) => (
                    <AccordionItem key={battery.id} value={battery.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{battery.id}</Badge>
                          <span className="font-medium">
                            {battery.manufacturer} - {battery.model}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 p-4 bg-slate-50 rounded-md">
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Battery Type</p>
                              <p className="font-medium">{battery.batteryType}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Rated Voltage</p>
                              <p className="font-medium">{battery.ratedVoltage_V} V</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Capacity</p>
                              <p className="font-medium">{battery.capacity_Ah} Ah</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Float Voltage</p>
                              <p className="font-medium">{battery.floatVoltage} V</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Internal Resistance</p>
                              <p className="font-medium">{battery.internalResistance} Ω</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Condition</p>
                              <Badge variant={battery.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                {battery.conditionAssessment?.status || "N/A"}
                              </Badge>
                            </div>
                          </div>

                          {/* Maintenance History */}
                          {battery.maintenanceHistory && battery.maintenanceHistory.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Maintenance History
                              </p>
                              <div className="space-y-2">
                                {battery.maintenanceHistory.map((maintenance: any, idx: number) => (
                                  <div key={idx} className="p-3 bg-white rounded border text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium">{formatDate(maintenance.date)}</span>
                                      <Badge variant="outline">{maintenance.vendor}</Badge>
                                    </div>
                                    <p className="text-muted-foreground text-xs">Technician: {maintenance.technician}</p>
                                    <p className="mt-1">{maintenance.notes}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
          
          {/* Inline Battery Form */}
          {showBatteryForm && (
            <BatteryForm
              onSubmit={handleAddBattery}
              onCancel={() => setShowBatteryForm(false)}
            />
          )}
        </TabsContent>

        {/* GIS Tab */}
        <TabsContent value="gis" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">GIS Equipment ({substation.assets.gis.length})</CardTitle>
                <Button size="sm" className="gap-2" onClick={() => setShowGISForm(!showGISForm)}>
                  <Plus className="h-4 w-4" />
                  {showGISForm ? "Hide Form" : "Add New"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {substation.assets.gis.length === 0 ? (
                <p className="text-sm text-muted-foreground">No GIS data available</p>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {substation.assets.gis.map((gis) => (
                    <AccordionItem key={gis.id} value={gis.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{gis.id}</Badge>
                          <span className="font-medium">
                            {gis.manufacturer} - {gis.model}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 p-4 bg-slate-50 rounded-md">
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground">PD Monitoring</p>
                              <p className="font-medium">{gis.pdMonitoringInstalled ? "Installed" : "Not Installed"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Last PD Test</p>
                              <p className="font-medium">{formatDate(gis.lastPDTest)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Condition</p>
                              <Badge variant={gis.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                {gis.conditionAssessment?.status || "N/A"}
                              </Badge>
                            </div>
                          </div>

                          {/* SF6 Compartments */}
                          {gis.sf6Compartment && gis.sf6Compartment.length > 0 && (
                            <div className="mt-4 p-3 bg-white rounded border">
                              <p className="text-sm font-medium mb-2">SF6 Compartments</p>
                              <div className="space-y-2">
                                {gis.sf6Compartment.map((comp: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between text-sm">
                                    <span>
                                      <span className="font-medium">{comp.compartmentId}:</span> {comp.pressure} bar
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Maintenance History */}
                          {gis.maintenanceHistory && gis.maintenanceHistory.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Maintenance History
                              </p>
                              <div className="space-y-2">
                                {gis.maintenanceHistory.map((maintenance: any, idx: number) => (
                                  <div key={idx} className="p-3 bg-white rounded border text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium">{formatDate(maintenance.date)}</span>
                                      <Badge variant="outline">{maintenance.vendor}</Badge>
                                    </div>
                                    <p className="text-muted-foreground text-xs">Technician: {maintenance.technician}</p>
                                    <p className="mt-1">{maintenance.notes}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
          
          {/* Inline GIS Form */}
          {showGISForm && (
            <GISForm
              onSubmit={handleAddGIS}
              onCancel={() => setShowGISForm(false)}
            />
          )}
        </TabsContent>

        {/* Isolators Tab */}
        <TabsContent value="isolators" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Isolators ({substation.assets.isolators.length})</CardTitle>
                <Button size="sm" className="gap-2" onClick={() => setShowIsolatorForm(!showIsolatorForm)}>
                  <Plus className="h-4 w-4" />
                  {showIsolatorForm ? "Hide Form" : "Add New"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {substation.assets.isolators.length === 0 ? (
                <p className="text-sm text-muted-foreground">No isolators available</p>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {substation.assets.isolators.map((isolator) => (
                    <AccordionItem key={isolator.id} value={isolator.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{isolator.id}</Badge>
                          <span className="font-medium">
                            {isolator.manufacturer} - {isolator.model}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 p-4 bg-slate-50 rounded-md">
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Type</p>
                              <p className="font-medium">{isolator.type}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Drive Mechanism</p>
                              <p className="font-medium">{isolator.driveMechanism}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Interlock Info</p>
                              <p className="font-medium text-xs">{isolator.interlockInfo}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Condition</p>
                              <Badge variant={isolator.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                {isolator.conditionAssessment?.status || "N/A"}
                              </Badge>
                            </div>
                          </div>

                          {/* Maintenance History */}
                          {isolator.maintenanceHistory && isolator.maintenanceHistory.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Maintenance History
                              </p>
                              <div className="space-y-2">
                                {isolator.maintenanceHistory.map((maintenance: any, idx: number) => (
                                  <div key={idx} className="p-3 bg-white rounded border text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium">{formatDate(maintenance.date)}</span>
                                      <Badge variant="outline">{maintenance.vendor}</Badge>
                                    </div>
                                    <p className="text-muted-foreground text-xs">Technician: {maintenance.technician}</p>
                                    <p className="mt-1">{maintenance.notes}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
          
          {/* Inline Isolator Form */}
          {showIsolatorForm && (
            <IsolatorForm
              onSubmit={handleAddIsolator}
              onCancel={() => setShowIsolatorForm(false)}
            />
          )}
        </TabsContent>

        {/* Power Flow Lines Tab */}
        <TabsContent value="powerFlowLines" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Power Flow Lines ({substation.assets.powerFlowLines.length})</CardTitle>
                <Button size="sm" className="gap-2" onClick={() => setShowPowerFlowLineForm(!showPowerFlowLineForm)}>
                  <Plus className="h-4 w-4" />
                  {showPowerFlowLineForm ? "Hide Form" : "Add New"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {substation.assets.powerFlowLines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No power flow lines available</p>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {substation.assets.powerFlowLines.map((line) => (
                    <AccordionItem key={line.id} value={line.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{line.id}</Badge>
                          <span className="font-medium">
                            {line.model} - {line.lineVoltage_kV}kV
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 p-4 bg-slate-50 rounded-md">
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Line Voltage</p>
                              <p className="font-medium">{line.lineVoltage_kV} kV</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Length</p>
                              <p className="font-medium">{line.length_km} km</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Conductor Type</p>
                              <p className="font-medium">{line.conductorType}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Thermal Limit</p>
                              <p className="font-medium">{line.thermalLimit_A} A</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Impedance (R/X)</p>
                              <p className="font-medium">
                                {line.impedance_R_X.R} / {line.impedance_R_X.X}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Condition</p>
                              <Badge variant={line.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                {line.conditionAssessment?.status || "N/A"}
                              </Badge>
                            </div>
                          </div>

                          {/* Maintenance History */}
                          {line.maintenanceHistory && line.maintenanceHistory.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Maintenance History
                              </p>
                              <div className="space-y-2">
                                {line.maintenanceHistory.map((maintenance: any, idx: number) => (
                                  <div key={idx} className="p-3 bg-white rounded border text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium">{formatDate(maintenance.date)}</span>
                                      <Badge variant="outline">{maintenance.vendor}</Badge>
                                    </div>
                                    <p className="text-muted-foreground text-xs">Technician: {maintenance.technician}</p>
                                    <p className="mt-1">{maintenance.notes}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
          
          {/* Inline Power Flow Line Form */}
          {showPowerFlowLineForm && (
            <PowerFlowLineForm
              onSubmit={handleAddPowerFlowLine}
              onCancel={() => setShowPowerFlowLineForm(false)}
            />
          )}
        </TabsContent>

        {/* Earthing Tab */}
        <TabsContent value="earthing" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Earthing ({substation.assets.earthing.length})</CardTitle>
                <Button size="sm" className="gap-2" onClick={() => setShowEarthingForm(!showEarthingForm)}>
                  <Plus className="h-4 w-4" />
                  {showEarthingForm ? "Hide Form" : "Add New"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {substation.assets.earthing.length === 0 ? (
                <p className="text-sm text-muted-foreground">No earthing data available</p>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {substation.assets.earthing.map((earthing) => (
                    <AccordionItem key={earthing.id} value={earthing.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{earthing.id}</Badge>
                          <span className="font-medium">
                            {earthing.manufacturer} - {earthing.model}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 p-4 bg-slate-50 rounded-md">
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Grid Resistance</p>
                              <p className="font-medium">{earthing.gridResistance} Ω</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Soil Type</p>
                              <p className="font-medium">{earthing.soilType}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Last Test Date</p>
                              <p className="font-medium">{formatDate(earthing.lastTestDate)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Condition</p>
                              <Badge variant={earthing.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                {earthing.conditionAssessment?.status || "N/A"}
                              </Badge>
                            </div>
                          </div>

                          {/* Maintenance History */}
                          {earthing.maintenanceHistory && earthing.maintenanceHistory.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Maintenance History
                              </p>
                              <div className="space-y-2">
                                {earthing.maintenanceHistory.map((maintenance: any, idx: number) => (
                                  <div key={idx} className="p-3 bg-white rounded border text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium">{formatDate(maintenance.date)}</span>
                                      <Badge variant="outline">{maintenance.vendor}</Badge>
                                    </div>
                                    <p className="text-muted-foreground text-xs">Technician: {maintenance.technician}</p>
                                    <p className="mt-1">{maintenance.notes}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
          
          {/* Inline Earthing Form */}
          {showEarthingForm && (
            <EarthingForm
              onSubmit={handleAddEarthing}
              onCancel={() => setShowEarthingForm(false)}
            />
          )}
        </TabsContent>

        {/* Environment Tab */}
        <TabsContent value="environment" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Environment ({substation.assets.environment.length})</CardTitle>
                <Button size="sm" className="gap-2" onClick={() => setShowEnvironmentForm(!showEnvironmentForm)}>
                  <Plus className="h-4 w-4" />
                  {showEnvironmentForm ? "Hide Form" : "Add New"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {substation.assets.environment.length === 0 ? (
                <p className="text-sm text-muted-foreground">No environment data available</p>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {substation.assets.environment.map((env) => (
                    <AccordionItem key={env.id} value={env.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{env.id}</Badge>
                          <span className="font-medium">
                            {env.manufacturer} - {env.model}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 p-4 bg-slate-50 rounded-md">
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Last Calibration</p>
                              <p className="font-medium">{formatDate(env.lastCalibration)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Condition</p>
                              <Badge variant={env.conditionAssessment?.status === "Good" ? "default" : "secondary"}>
                                {env.conditionAssessment?.status || "N/A"}
                              </Badge>
                            </div>
                          </div>

                          {/* Sensors */}
                          {env.sensors && env.sensors.length > 0 && (
                            <div className="mt-4 p-3 bg-white rounded border">
                              <p className="text-sm font-medium mb-2">Sensors</p>
                              <div className="space-y-2">
                                {env.sensors.map((sensor: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between text-sm">
                                    <span className="capitalize font-medium">{sensor.type}:</span>
                                    <span className="text-muted-foreground">Threshold: {sensor.threshold}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Maintenance History */}
                          {env.maintenanceHistory && env.maintenanceHistory.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Maintenance History
                              </p>
                              <div className="space-y-2">
                                {env.maintenanceHistory.map((maintenance: any, idx: number) => (
                                  <div key={idx} className="p-3 bg-white rounded border text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium">{formatDate(maintenance.date)}</span>
                                      <Badge variant="outline">{maintenance.vendor}</Badge>
                                    </div>
                                    <p className="text-muted-foreground text-xs">Technician: {maintenance.technician}</p>
                                    <p className="mt-1">{maintenance.notes}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
          
          {/* Inline Environment Form */}
          {showEnvironmentForm && (
            <EnvironmentForm
              onSubmit={handleAddEnvironment}
              onCancel={() => setShowEnvironmentForm(false)}
            />
          )}
        </TabsContent>
      </Tabs>

    </div>
  )
}
