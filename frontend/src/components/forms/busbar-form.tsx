"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BusbarSchema } from "@/lib/schemas"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EquipmentDetailsFields } from "./equipment-details-fields"

type BusbarFormValues = z.infer<typeof BusbarSchema>

interface BusbarFormProps {
  onSubmit: (data: BusbarFormValues) => Promise<void>
  onCancel?: () => void
  initialData?: Partial<BusbarFormValues>
}

export function BusbarForm({ onSubmit, onCancel, initialData }: BusbarFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 50 }, (_, i) => currentYear - i)

  const form = useForm<BusbarFormValues>({
    resolver: zodResolver(BusbarSchema),
    defaultValues: initialData || {
      id: `BB-${Date.now()}`,
      manufacturer: "",
      model: "",
      installationYear: currentYear,
      busType: "Main",
      material: "",
      capacity_A: undefined,
      lastIRScanDate: null,
      maintenanceHistory: [],
      componentsReplaced: [],
      operationHistory: [],
      documents: [],
      conditionAssessment: null,
    },
  })

  async function handleSubmit(data: BusbarFormValues) {
    setIsSubmitting(true)
    try {
      const formattedData = {
        ...data,
        lastIRScanDate: data.lastIRScanDate ? new Date(data.lastIRScanDate).toISOString() : null,
      }
      await onSubmit(formattedData)
      form.reset({
        ...form.getValues(),
        id: `BB-${Date.now()}`,
      })
    } catch (error) {
      console.error("Error submitting busbar:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>{initialData ? "Edit Busbar" : "Add New Busbar"}</CardTitle>
        <p className="text-sm text-muted-foreground">Enter the busbar details below.</p>
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
              <FormField control={form.control} name="busType" render={({ field }) => (
                <FormItem><FormLabel>Bus Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Double">Double</SelectItem>
                      <SelectItem value="Main">Main</SelectItem>
                      <SelectItem value="Tie">Tie</SelectItem>
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="material" render={({ field }) => (
                <FormItem><FormLabel>Material *</FormLabel><FormControl><Input {...field} placeholder="e.g. Cu, Al" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="capacity_A" render={({ field }) => (
                <FormItem><FormLabel>Capacity (A) *</FormLabel>
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
              <FormField control={form.control} name="lastIRScanDate" render={({ field }) => (
                <FormItem><FormLabel>Last IR Scan Date</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : null)} /></FormControl><FormMessage />
                </FormItem>
              )} />
            </div>
            <EquipmentDetailsFields />
            <div className="flex justify-end gap-2 pt-4">
              {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? (initialData ? "Saving..." : "Adding...") : (initialData ? "Save Changes" : "Add Busbar")}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

