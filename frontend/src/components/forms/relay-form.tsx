"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RelaySchema } from "@/lib/schemas"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EquipmentDetailsFields } from "./equipment-details-fields"

type RelayFormValues = z.infer<typeof RelaySchema>

interface RelayFormProps {
  onSubmit: (data: RelayFormValues) => Promise<void>
  onCancel?: () => void
}

export function RelayForm({ onSubmit, onCancel }: RelayFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 50 }, (_, i) => currentYear - i)

  const form = useForm<RelayFormValues>({
    resolver: zodResolver(RelaySchema),
    defaultValues: {
      id: `REL-${Date.now()}`,
      manufacturer: "",
      model: "",
      installationYear: currentYear,
      relayType: "",
      firmwareVersion: "",
      enabledFunctions: [],
      ctPtMappings: {},
      lastConfigUpload: null,
      maintenanceHistory: [],
      componentsReplaced: [],
      operationHistory: [],
      documents: [],
      conditionAssessment: null,
    },
  })

  async function handleSubmit(data: RelayFormValues) {
    setIsSubmitting(true)
    try {
      const formattedData = {
        ...data,
        lastConfigUpload: data.lastConfigUpload ? new Date(data.lastConfigUpload).toISOString() : null,
      }
      await onSubmit(formattedData)
      form.reset({
        ...form.getValues(),
        id: `REL-${Date.now()}`,
      })
    } catch (error) {
      console.error("Error submitting relay:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Add New Protection Relay</CardTitle>
        <p className="text-sm text-muted-foreground">Enter the relay details below.</p>
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
              <FormField control={form.control} name="relayType" render={({ field }) => (
                <FormItem><FormLabel>Relay Type *</FormLabel><FormControl><Input {...field} placeholder="e.g. Line Differential" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="firmwareVersion" render={({ field }) => (
                <FormItem><FormLabel>Firmware Version</FormLabel><FormControl><Input {...field} placeholder="e.g. v3.4.2" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="lastConfigUpload" render={({ field }) => (
                <FormItem><FormLabel>Last Config Upload</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : null)} /></FormControl><FormMessage />
                </FormItem>
              )} />
            </div>
            <EquipmentDetailsFields />
            <div className="flex justify-end gap-2 pt-4">
              {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Relay"}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

