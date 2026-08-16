"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { IsolatorSchema } from "@/lib/schemas"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EquipmentDetailsFields } from "./equipment-details-fields"

type IsolatorFormValues = z.infer<typeof IsolatorSchema>

interface IsolatorFormProps {
  onSubmit: (data: IsolatorFormValues) => Promise<void>
  onCancel?: () => void
}

export function IsolatorForm({ onSubmit, onCancel }: IsolatorFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 50 }, (_, i) => currentYear - i)

  const form = useForm<IsolatorFormValues>({
    resolver: zodResolver(IsolatorSchema),
    defaultValues: {
      id: `ISO-${Date.now()}`,
      manufacturer: "",
      model: "",
      installationYear: currentYear,
      type: "",
      driveMechanism: "",
      interlockInfo: null,
      maintenanceHistory: [],
      componentsReplaced: [],
      operationHistory: [],
      documents: [],
      conditionAssessment: null,
    },
  })

  async function handleSubmit(data: IsolatorFormValues) {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      form.reset({
        ...form.getValues(),
        id: `ISO-${Date.now()}`,
      })
    } catch (error) {
      console.error("Error submitting isolator:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Add New Isolator</CardTitle>
        <p className="text-sm text-muted-foreground">Enter the isolator details below.</p>
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
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>Type *</FormLabel><FormControl><Input {...field} placeholder="e.g. Vertical, Horizontal" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="driveMechanism" render={({ field }) => (
                <FormItem><FormLabel>Drive Mechanism *</FormLabel><FormControl><Input {...field} placeholder="e.g. Manual, Motorized" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="interlockInfo" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Interlock Info</FormLabel><FormControl><Input {...field} value={field.value || ""} placeholder="e.g. Linked with CB-1" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <EquipmentDetailsFields />
            <div className="flex justify-end gap-2 pt-4">
              {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Isolator"}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

