"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState } from "react"
import type { ZodSchema } from "zod"

interface GenericAssetFormProps<T extends z.ZodType> {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: z.infer<T>) => Promise<void>
  schema: T
  title: string
  description: string
  defaultValues: Partial<z.infer<T>>
  fields: Array<{
    name: string
    label: string
    type: "text" | "number" | "select" | "date" | "checkbox"
    options?: Array<{ value: string; label: string }>
    required?: boolean
  }>
}

export function GenericAssetForm<T extends z.ZodType>({
  open,
  onOpenChange,
  onSubmit,
  schema,
  title,
  description,
  defaultValues,
  fields,
}: GenericAssetFormProps<T>) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 50 }, (_, i) => currentYear - i)

  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as z.infer<T>,
  })

  async function handleSubmit(data: z.infer<T>) {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error("Error submitting asset:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((field) => (
                <FormField
                  key={field.name}
                  control={form.control}
                  name={field.name as any}
                  render={({ field: formField }) => {
                    if (field.type === "select") {
                      return (
                        <FormItem>
                          <FormLabel>
                            {field.label} {field.required && "*"}
                          </FormLabel>
                          <Select
                            onValueChange={(value) => {
                              if (field.name.includes("Year")) {
                                formField.onChange(Number(value))
                              } else {
                                formField.onChange(value)
                              }
                            }}
                            value={formField.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {field.name.includes("Year")
                                ? yearOptions.map((y) => (
                                    <SelectItem key={y} value={y.toString()}>
                                      {y}
                                    </SelectItem>
                                  ))
                                : field.options?.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )
                    }
                    if (field.type === "number") {
                      return (
                        <FormItem>
                          <FormLabel>
                            {field.label} {field.required && "*"}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...formField}
                              value={formField.value ?? ""}
                              onChange={(e) => formField.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )
                    }
                    if (field.type === "checkbox") {
                      return (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              {field.label} {field.required && "*"}
                            </FormLabel>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={formField.value as boolean}
                              onChange={formField.onChange}
                              className="h-4 w-4"
                            />
                          </FormControl>
                        </FormItem>
                      )
                    }
                    return (
                      <FormItem>
                        <FormLabel>
                          {field.label} {field.required && "*"}
                        </FormLabel>
                        <FormControl>
                          <Input {...formField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Asset"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

