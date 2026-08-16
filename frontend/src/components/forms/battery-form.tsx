"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BatterySchema } from "@/lib/schemas"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EquipmentDetailsFields } from "./equipment-details-fields"

type BatteryFormValues = z.infer<typeof BatterySchema>

interface BatteryFormProps {
  onSubmit: (data: BatteryFormValues) => Promise<void>
  onCancel?: () => void
}

export function BatteryForm({ onSubmit, onCancel }: BatteryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 50 }, (_, i) => currentYear - i)

  const form = useForm<BatteryFormValues>({
    resolver: zodResolver(BatterySchema),
    defaultValues: {
      id: `BAT-${Date.now()}`,
      manufacturer: "",
      model: "",
      installationYear: currentYear,
      batteryType: "",
      ratedVoltage_V: undefined,
      capacity_Ah: undefined,
      floatVoltage: undefined,
      internalResistance: undefined,
      maintenanceHistory: [],
      componentsReplaced: [],
      operationHistory: [],
      documents: [],
      conditionAssessment: null,
    },
  })

  async function handleSubmit(data: BatteryFormValues) {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      form.reset({
        ...form.getValues(),
        id: `BAT-${Date.now()}`,
      })
    } catch (error) {
      console.error("Error submitting battery:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Add New Battery System</CardTitle>
        <p className="text-sm text-muted-foreground">Enter the battery/DC system details below.</p>
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
              <FormField control={form.control} name="batteryType" render={({ field }) => (
                <FormItem><FormLabel>Battery Type *</FormLabel><FormControl><Input {...field} placeholder="e.g. VRLA, Lead-Acid" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="ratedVoltage_V" render={({ field }) => (
                <FormItem><FormLabel>Rated Voltage (V) *</FormLabel>
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
                  </FormControl><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="capacity_Ah" render={({ field }) => (
                <FormItem><FormLabel>Capacity (Ah) *</FormLabel>
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
                  </FormControl><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="floatVoltage" render={({ field }) => (
                <FormItem><FormLabel>Float Voltage *</FormLabel>
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
              <FormField control={form.control} name="internalResistance" render={({ field }) => (
                <FormItem><FormLabel>Internal Resistance *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.001"
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
            </div>
            <EquipmentDetailsFields />
            <div className="flex justify-end gap-2 pt-4">
              {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Battery"}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

