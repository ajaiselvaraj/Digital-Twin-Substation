"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TransformerSchema } from "@/lib/schemas"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EquipmentDetailsFields } from "./equipment-details-fields"

type TransformerFormValues = z.infer<typeof TransformerSchema>

interface TransformerFormProps {
  onSubmit: (data: TransformerFormValues) => Promise<void>
  onCancel?: () => void
  initialData?: Partial<TransformerFormValues>
}

export function TransformerForm({ onSubmit, onCancel, initialData }: TransformerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 50 }, (_, i) => currentYear - i)

  const form = useForm<TransformerFormValues>({
    resolver: zodResolver(TransformerSchema),
    defaultValues: initialData || {
      id: `TRF-${Date.now()}`,
      manufacturer: "",
      model: "",
      installationYear: currentYear,
      ratedMVA: undefined,
      HV_kV: undefined,
      LV_kV: undefined,
      vectorGroup: "",
      coolingType: "ONAN",
      coreMaterial: "CRGO",
      windingMaterial: "Cu",
      oilType: "",
      lastOilChangeDate: null,
      oltc: {
        type: "",
        steps: undefined,
        lastService: null,
      },
      DGA: {
        H2: undefined,
        CH4: undefined,
        C2H2: undefined,
        C2H4: undefined,
        CO: undefined,
      },
      oilMoisture_ppm: undefined,
      buchholzInstalled: false,
      oltcOpsCount: undefined,
      maintenanceHistory: [],
      componentsReplaced: [],
      operationHistory: [],
      documents: [],
      conditionAssessment: null,
    },
  })

  async function handleSubmit(data: TransformerFormValues) {
    setIsSubmitting(true)
    try {
      // Convert dates to ISO strings
      const formattedData = {
        ...data,
        lastOilChangeDate: data.lastOilChangeDate ? new Date(data.lastOilChangeDate).toISOString() : null,
        oltc: {
          ...data.oltc,
          lastService: data.oltc.lastService ? new Date(data.oltc.lastService).toISOString() : null,
        },
      }
      await onSubmit(formattedData)
      form.reset({
        ...form.getValues(),
        id: `TRF-${Date.now()}`,
      })
    } catch (error) {
      console.error("Error submitting transformer:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>{initialData ? "Edit Transformer" : "Add New Transformer"}</CardTitle>
        <p className="text-sm text-muted-foreground">Enter the transformer details below. All required fields are marked with *</p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipment ID *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="installationYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Installation Year *</FormLabel>
                      <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {yearOptions.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Technical Specifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ratedMVA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rated MVA *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="any" 
                          value={field.value !== undefined && field.value !== null ? String(field.value) : ""} 
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === "" || val === "-") {
                              field.onChange(undefined)
                            } else {
                              const numValue = parseFloat(val)
                              if (!isNaN(numValue)) {
                                field.onChange(numValue)
                              }
                            }
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="HV_kV"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HV (kV) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="any" 
                          value={field.value !== undefined && field.value !== null ? String(field.value) : ""} 
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === "" || val === "-") {
                              field.onChange(undefined)
                            } else {
                              const numValue = parseFloat(val)
                              if (!isNaN(numValue)) {
                                field.onChange(numValue)
                              }
                            }
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="LV_kV"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LV (kV) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="any" 
                          value={field.value !== undefined && field.value !== null ? String(field.value) : ""} 
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === "" || val === "-") {
                              field.onChange(undefined)
                            } else {
                              const numValue = parseFloat(val)
                              if (!isNaN(numValue)) {
                                field.onChange(numValue)
                              }
                            }
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vectorGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vector Group *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. YNd11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="coolingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cooling Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ONAN">ONAN</SelectItem>
                          <SelectItem value="ONAF">ONAF</SelectItem>
                          <SelectItem value="OFAF">OFAF</SelectItem>
                          <SelectItem value="ODAF">ODAF</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="coreMaterial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Core Material *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CRGO">CRGO</SelectItem>
                          <SelectItem value="NO">NO</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="windingMaterial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Winding Material *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Cu">Copper (Cu)</SelectItem>
                          <SelectItem value="Al">Aluminum (Al)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="oilType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Oil Type *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Mineral" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* OLTC Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">OLTC (On-Load Tap Changer)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="oltc.type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OLTC Type *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Resistive" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="oltc.steps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Steps *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          value={field.value !== undefined && field.value !== null ? String(field.value) : ""} 
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === "" || val === "-") {
                              field.onChange(undefined)
                            } else {
                              const numValue = parseInt(val)
                              if (!isNaN(numValue)) {
                                field.onChange(numValue)
                              }
                            }
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="oltcOpsCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OLTC Operations Count *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          value={field.value !== undefined && field.value !== null ? String(field.value) : ""} 
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === "" || val === "-") {
                              field.onChange(undefined)
                            } else {
                              const numValue = parseInt(val)
                              if (!isNaN(numValue)) {
                                field.onChange(numValue)
                              }
                            }
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* DGA Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Dissolved Gas Analysis (DGA)</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <FormField
                  control={form.control}
                  name="DGA.H2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>H2 (ppm) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          value={field.value !== undefined && field.value !== null ? String(field.value) : ""} 
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === "" || val === "-") {
                              field.onChange(undefined)
                            } else {
                              const numValue = parseFloat(val)
                              if (!isNaN(numValue)) {
                                field.onChange(numValue)
                              }
                            }
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="DGA.CH4"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CH4 (ppm) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          value={field.value !== undefined && field.value !== null ? String(field.value) : ""} 
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === "" || val === "-") {
                              field.onChange(undefined)
                            } else {
                              const numValue = parseFloat(val)
                              if (!isNaN(numValue)) {
                                field.onChange(numValue)
                              }
                            }
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="DGA.C2H2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>C2H2 (ppm) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          value={field.value !== undefined && field.value !== null ? String(field.value) : ""} 
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === "" || val === "-") {
                              field.onChange(undefined)
                            } else {
                              const numValue = parseFloat(val)
                              if (!isNaN(numValue)) {
                                field.onChange(numValue)
                              }
                            }
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="DGA.C2H4"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>C2H4 (ppm) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          value={field.value !== undefined && field.value !== null ? String(field.value) : ""} 
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === "" || val === "-") {
                              field.onChange(undefined)
                            } else {
                              const numValue = parseFloat(val)
                              if (!isNaN(numValue)) {
                                field.onChange(numValue)
                              }
                            }
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="DGA.CO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CO (ppm) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          value={field.value !== undefined && field.value !== null ? String(field.value) : ""} 
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === "" || val === "-") {
                              field.onChange(undefined)
                            } else {
                              const numValue = parseFloat(val)
                              if (!isNaN(numValue)) {
                                field.onChange(numValue)
                              }
                            }
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="oilMoisture_ppm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Oil Moisture (ppm) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          value={field.value !== undefined && field.value !== null ? String(field.value) : ""} 
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === "" || val === "-") {
                              field.onChange(undefined)
                            } else {
                              const numValue = parseFloat(val)
                              if (!isNaN(numValue)) {
                                field.onChange(numValue)
                              }
                            }
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="buchholzInstalled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Buchholz Installed *</FormLabel>
                        <FormDescription>Is Buchholz relay installed?</FormDescription>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Equipment Details Fields */}
            <EquipmentDetailsFields />

            <div className="flex justify-end gap-2 pt-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (initialData ? "Saving..." : "Adding...") : (initialData ? "Save Changes" : "Add Transformer")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

