"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EarthingSchema } from "@/lib/schemas"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EquipmentDetailsFields } from "./equipment-details-fields"

type EarthingFormValues = z.infer<typeof EarthingSchema>

interface EarthingFormProps {
  onSubmit: (data: EarthingFormValues) => Promise<void>
  onCancel?: () => void
}

export function EarthingForm({ onSubmit, onCancel }: EarthingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 50 }, (_, i) => currentYear - i)

  const form = useForm<EarthingFormValues>({
    resolver: zodResolver(EarthingSchema),
    defaultValues: {
      id: `EAR-${Date.now()}`,
      manufacturer: "",
      model: "",
      installationYear: currentYear,
      gridResistance: undefined,
      soilType: "",
      lastTestDate: new Date().toISOString(),
      maintenanceHistory: [],
      componentsReplaced: [],
      operationHistory: [],
      documents: [],
      conditionAssessment: null,
    },
  })

  async function handleSubmit(data: EarthingFormValues) {
    setIsSubmitting(true)
    try {
      const formattedData = {
        ...data,
        lastTestDate: new Date(data.lastTestDate).toISOString(),
      }
      await onSubmit(formattedData)
      form.reset({
        ...form.getValues(),
        id: `EAR-${Date.now()}`,
      })
    } catch (error) {
      console.error("Error submitting earthing:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Add New Earthing System</CardTitle>
        <p className="text-sm text-muted-foreground">Enter the earthing system details below.</p>
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
              <FormField control={form.control} name="gridResistance" render={({ field }) => (
                <FormItem><FormLabel>Grid Resistance (Ω) *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
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
              <FormField control={form.control} name="soilType" render={({ field }) => (
                <FormItem><FormLabel>Soil Type *</FormLabel><FormControl><Input {...field} placeholder="e.g. Sandy clay, Red soil" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="lastTestDate" render={({ field }) => (
                <FormItem><FormLabel>Last Test Date *</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : "")} /></FormControl><FormMessage />
                </FormItem>
              )} />
            </div>
            <EquipmentDetailsFields />
            <div className="flex justify-end gap-2 pt-4">
              {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Earthing"}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

