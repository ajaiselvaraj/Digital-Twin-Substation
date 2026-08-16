"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PowerFlowLineSchema } from "@/lib/schemas"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EquipmentDetailsFields } from "./equipment-details-fields"

type PowerFlowLineFormValues = z.infer<typeof PowerFlowLineSchema>

interface PowerFlowLineFormProps {
  onSubmit: (data: PowerFlowLineFormValues) => Promise<void>
  onCancel?: () => void
}

export function PowerFlowLineForm({ onSubmit, onCancel }: PowerFlowLineFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 50 }, (_, i) => currentYear - i)

  const form = useForm<PowerFlowLineFormValues>({
    resolver: zodResolver(PowerFlowLineSchema),
    defaultValues: {
      id: `LINE-${Date.now()}`,
      manufacturer: "",
      model: "",
      installationYear: currentYear,
      lineVoltage_kV: undefined,
      length_km: undefined,
      conductorType: "",
      thermalLimit_A: undefined,
      impedance_R_X: {
        R: undefined,
        X: undefined,
      },
      maintenanceHistory: [],
      componentsReplaced: [],
      operationHistory: [],
      documents: [],
      conditionAssessment: null,
    },
  })

  async function handleSubmit(data: PowerFlowLineFormValues) {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      form.reset({
        ...form.getValues(),
        id: `LINE-${Date.now()}`,
      })
    } catch (error) {
      console.error("Error submitting power flow line:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Add New Power Flow Line</CardTitle>
        <p className="text-sm text-muted-foreground">Enter the power flow line details below.</p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="id" render={({ field }) => (
                <FormItem><FormLabel>Equipment ID *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="manufacturer" render={({ field }) => (
                <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} placeholder="N/A if not applicable" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem><FormLabel>Model/Conductor Type</FormLabel><FormControl><Input {...field} placeholder="e.g. Quad Moose" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="installationYear" render={({ field }) => (
                <FormItem><FormLabel>Installation Year *</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{yearOptions.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lineVoltage_kV" render={({ field }) => (
                <FormItem><FormLabel>Line Voltage (kV) *</FormLabel>
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
              <FormField control={form.control} name="length_km" render={({ field }) => (
                <FormItem><FormLabel>Length (km) *</FormLabel>
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
              <FormField control={form.control} name="conductorType" render={({ field }) => (
                <FormItem><FormLabel>Conductor Type *</FormLabel><FormControl><Input {...field} placeholder="e.g. AAAC, ACSR" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="thermalLimit_A" render={({ field }) => (
                <FormItem><FormLabel>Thermal Limit (A) *</FormLabel>
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
              <FormField control={form.control} name="impedance_R_X.R" render={({ field }) => (
                <FormItem><FormLabel>Impedance R (Ω) *</FormLabel>
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
              <FormField control={form.control} name="impedance_R_X.X" render={({ field }) => (
                <FormItem><FormLabel>Impedance X (Ω) *</FormLabel>
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
            </div>
            <EquipmentDetailsFields />
            <div className="flex justify-end gap-2 pt-4">
              {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Power Flow Line"}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

