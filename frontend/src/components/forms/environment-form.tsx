"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EnvironmentSchema } from "@/lib/schemas"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, X } from "lucide-react"
import { EquipmentDetailsFields } from "./equipment-details-fields"

type EnvironmentFormValues = z.infer<typeof EnvironmentSchema>

interface EnvironmentFormProps {
  onSubmit: (data: EnvironmentFormValues) => Promise<void>
  onCancel?: () => void
}

export function EnvironmentForm({ onSubmit, onCancel }: EnvironmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 50 }, (_, i) => currentYear - i)

  const form = useForm<EnvironmentFormValues>({
    resolver: zodResolver(EnvironmentSchema),
    defaultValues: {
      id: `ENV-${Date.now()}`,
      manufacturer: "",
      model: "",
      installationYear: currentYear,
      sensors: [{ type: "temp", threshold: null }],
      lastCalibration: null,
      maintenanceHistory: [],
      componentsReplaced: [],
      operationHistory: [],
      documents: [],
      conditionAssessment: null,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "sensors",
  })

  async function handleSubmit(data: EnvironmentFormValues) {
    setIsSubmitting(true)
    try {
      const formattedData = {
        ...data,
        lastCalibration: data.lastCalibration ? new Date(data.lastCalibration).toISOString() : null,
      }
      await onSubmit(formattedData)
      form.reset({
        ...form.getValues(),
        id: `ENV-${Date.now()}`,
        sensors: [{ type: "temp", threshold: null }],
      })
    } catch (error) {
      console.error("Error submitting environment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Add New Environment Monitoring System</CardTitle>
        <p className="text-sm text-muted-foreground">Enter the environment monitoring system details below.</p>
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
              <FormField control={form.control} name="lastCalibration" render={({ field }) => (
                <FormItem><FormLabel>Last Calibration</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : null)} /></FormControl><FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Sensors */}
            <div className="space-y-2">
              <FormLabel>Sensors *</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-end">
                  <FormField control={form.control} name={`sensors.${index}.type`} render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>Sensor Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="temp">Temperature</SelectItem>
                          <SelectItem value="humidity">Humidity</SelectItem>
                          <SelectItem value="fire">Fire</SelectItem>
                          <SelectItem value="wind">Wind</SelectItem>
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`sensors.${index}.threshold`} render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>Threshold</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          value={field.value !== undefined && field.value !== null ? String(field.value) : ""} 
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === "" || val === "-") {
                              field.onChange(null)
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
              <Button type="button" variant="outline" size="sm" onClick={() => append({ type: "temp", threshold: null })} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Sensor
              </Button>
            </div>

            <EquipmentDetailsFields />

            <div className="flex justify-end gap-2 pt-4">
              {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Environment System"}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

