"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MasterSubstationSchema } from "@/lib/schemas"
import { MapPin, Calendar } from "lucide-react"
import { useState } from "react"
import type { DummySubstation } from "@/lib/dummy-data"

type MasterSubstationFormValues = z.infer<typeof MasterSubstationSchema>

interface EditableMasterFormProps {
  substation: DummySubstation
  onSave: (data: MasterSubstationFormValues) => void
}

export function EditableMasterForm({ substation, onSave }: EditableMasterFormProps) {
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)

  const form = useForm<MasterSubstationFormValues>({
    resolver: zodResolver(MasterSubstationSchema),
    defaultValues: {
      name: substation.master.name,
      areaName: substation.master.areaName,
      substationCode: substation.master.substationCode,
      voltageClass: substation.master.voltageClass as "220kV" | "400kV" | "440kV",
      installationYear: substation.master.installationYear,
      operator: substation.master.operator,
      notes: substation.master.notes || "",
      latitude: substation.master.latitude,
      longitude: substation.master.longitude,
    },
    mode: "onChange",
  })

  const handleUseCurrentLocation = () => {
    setIsLoadingLocation(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue("latitude", position.coords.latitude)
          form.setValue("longitude", position.coords.longitude)
          setIsLoadingLocation(false)
        },
        (error) => {
          console.log("Location error:", error.message)
          setIsLoadingLocation(false)
          alert("Unable to get your location. Please enter coordinates manually.")
        },
      )
    } else {
      setIsLoadingLocation(false)
      alert("Geolocation is not supported by your browser.")
    }
  }

  function onSubmit(data: MasterSubstationFormValues) {
    onSave(data)
  }

  function onError(errors: any) {
    console.error("Form validation errors:", errors)
    const errorFields = Object.keys(errors).join(", ")
    alert(`Please correct the following fields: ${errorFields}`)
  }

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 50 }, (_, i) => currentYear - i)

  return (
    <Form {...form}>
      <form id="master-form" onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Substation Name</FormLabel>
                <FormControl>
                  <Input {...field} className="font-medium" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="areaName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Area Name</FormLabel>
                <FormControl>
                  <Input {...field} className="font-medium" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="substationCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Substation Code</FormLabel>
                <FormControl>
                  <Input {...field} disabled className="font-medium bg-gray-100" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="voltageClass"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Voltage Class</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="font-medium">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="220kV">220kV</SelectItem>
                    <SelectItem value="400kV">400kV</SelectItem>
                    <SelectItem value="440kV">440kV</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="operator"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Operator</FormLabel>
                <FormControl>
                  <Input {...field} className="font-medium" />
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
                <FormLabel className="text-sm text-muted-foreground">Installation Year</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[300px]">
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

          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Latitude</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="font-medium pr-10"
                    />
                  </FormControl>
                  <MapPin className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="longitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-muted-foreground">Longitude</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="font-medium pr-10"
                    />
                  </FormControl>
                  <MapPin className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="md:col-span-3">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="text-sm min-h-[100px]" value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="md:col-span-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseCurrentLocation}
              disabled={isLoadingLocation}
              className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
            >
              <MapPin className="mr-2 h-3 w-3" />
              {isLoadingLocation ? "Getting Location..." : "Use Current Location"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

