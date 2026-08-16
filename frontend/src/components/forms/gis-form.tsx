"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GISSchema } from "@/lib/schemas"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, X } from "lucide-react"
import { EquipmentDetailsFields } from "./equipment-details-fields"

type GISFormValues = z.infer<typeof GISSchema>

interface GISFormProps {
  onSubmit: (data: GISFormValues) => Promise<void>
  onCancel?: () => void
}

export function GISForm({ onSubmit, onCancel }: GISFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 50 }, (_, i) => currentYear - i)

  const form = useForm<GISFormValues>({
    resolver: zodResolver(GISSchema),
    defaultValues: {
      id: `GIS-${Date.now()}`,
      manufacturer: "",
      model: "",
      installationYear: currentYear,
      sf6Compartment: [{ compartmentId: "", pressure: undefined }],
      pdMonitoringInstalled: false,
      lastPDTest: null,
      maintenanceHistory: [],
      componentsReplaced: [],
      operationHistory: [],
      documents: [],
      conditionAssessment: null,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "sf6Compartment",
  })

  async function handleSubmit(data: GISFormValues) {
    setIsSubmitting(true)
    try {
      const formattedData = {
        ...data,
        lastPDTest: data.lastPDTest ? new Date(data.lastPDTest).toISOString() : null,
      }
      await onSubmit(formattedData)
      form.reset({
        ...form.getValues(),
        id: `GIS-${Date.now()}`,
        sf6Compartment: [{ compartmentId: "", pressure: undefined }],
      })
    } catch (error) {
      console.error("Error submitting GIS:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Add New GIS Equipment</CardTitle>
        <p className="text-sm text-muted-foreground">Enter the GIS (Gas Insulated Switchgear) details below.</p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="id" render={({ field }) => (
                <FormItem><FormLabel>Equipment ID *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="manufacturer" render={({ field }) => (
                <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="installationYear" render={({ field }) => (
                <FormItem><FormLabel>Installation Year *</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{yearOptions.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="pdMonitoringInstalled" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">PD Monitoring Installed *</FormLabel>
                  </div>
                  <FormControl>
                    <input type="checkbox" checked={field.value} onChange={field.onChange} className="h-4 w-4" />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="lastPDTest" render={({ field }) => (
                <FormItem><FormLabel>Last PD Test</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : null)} /></FormControl><FormMessage />
                </FormItem>
              )} />
            </div>

            {/* SF6 Compartments */}
            <div className="space-y-2">
              <FormLabel>SF6 Compartments *</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-end">
                  <FormField control={form.control} name={`sf6Compartment.${index}.compartmentId`} render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>Compartment ID</FormLabel><FormControl><Input {...field} placeholder="e.g. C1" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`sf6Compartment.${index}.pressure`} render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>Pressure (bar)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1"
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
                      </FormControl><FormMessage />
                    </FormItem>
                  )} />
                  {fields.length > 1 && (
                    <Button type="button" variant="outline" size="icon" onClick={() => remove(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append({ compartmentId: "", pressure: undefined })} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Compartment
              </Button>
            </div>

            <EquipmentDetailsFields />

            <div className="flex justify-end gap-2 pt-4">
              {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add GIS"}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

