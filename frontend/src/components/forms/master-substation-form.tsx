"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MasterSubstationSchema, FullSubstationSchema } from "@/lib/schemas"
import { MapPin, Calendar } from "lucide-react"
import { useState } from "react"

type MasterSubstationFormValues = z.infer<typeof MasterSubstationSchema>

// Default values for the form
const defaultValues: Partial<MasterSubstationFormValues> = {
  substationCode: `AREA-${Math.floor(100000 + Math.random() * 900000)}`,
  name: "",
  areaName: "",
  operator: "",
  voltageClass: "220kV",
  installationYear: new Date().getFullYear(),
  latitude: undefined,
  longitude: undefined,
  notes: "",
}

export function MasterSubstationForm() {
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)

  const form = useForm<MasterSubstationFormValues>({
    resolver: zodResolver(MasterSubstationSchema),
    defaultValues,
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
          console.log("[v0] Location set:", position.coords.latitude, position.coords.longitude)
        },
        (error) => {
          console.log("[v0] Location error:", error.message)
          setIsLoadingLocation(false)
          alert("Unable to get your location. Please enter coordinates manually.")
        },
      )
    } else {
      setIsLoadingLocation(false)
      alert("Geolocation is not supported by your browser.")
    }
  }

  async function onSubmit(data: MasterSubstationFormValues) {
    try {
      const { collection, addDoc } = await import("firebase/firestore")
      const { db } = await import("@/lib/firebase")
      
      // Prepare master data with proper types
      const masterData = {
        name: data.name.trim(),
        areaName: data.areaName.trim(),
        substationCode: data.substationCode || `AREA-${Math.floor(100000 + Math.random() * 900000)}`,
        voltageClass: data.voltageClass,
        installationYear: data.installationYear,
        operator: data.operator?.trim() || null,
        notes: data.notes?.trim() || null,
        latitude: typeof data.latitude === "number" ? data.latitude : parseFloat(String(data.latitude || 0)),
        longitude: typeof data.longitude === "number" ? data.longitude : parseFloat(String(data.longitude || 0)),
      }

      // Validate master data using schema
      const validatedMaster = MasterSubstationSchema.parse(masterData)

      // Prepare full substation data structure
      const substationData = {
        master: validatedMaster,
        assets: {
          transformers: [],
          breakers: [],
          ctvt: [],
          busbars: [],
          relays: [],
          pmu: [],
          battery: [],
          gis: [],
          isolators: [],
          powerFlowLines: [],
          earthing: [],
          environment: [],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Validate full substation schema
      const validatedData = FullSubstationSchema.parse(substationData)

      // Save to Firebase
      const docRef = await addDoc(collection(db, "substations"), validatedData)
      console.log("Substation created with ID: ", docRef.id)
      alert("Substation created successfully! ID: " + docRef.id)
      
      // Redirect to edit page
      window.location.href = `/edit-substation/${docRef.id}`
    } catch (error: any) {
      console.error("Error creating substation:", error)
      
      // Handle Zod validation errors
      if (error.errors && Array.isArray(error.errors)) {
        const validationErrors = error.errors.map((err: any) => {
          const path = err.path.join(".")
          return `${path}: ${err.message}`
        }).join("\n")
        alert(`Validation Error:\n\n${validationErrors}\n\nPlease correct the fields and try again.`)
        return
      }
      
      const errorMessage = error?.message || "Unknown error occurred"
      const errorDetails = error?.code ? `Error code: ${error.code}. ` : ""
      alert(`Error creating substation.\n\n${errorDetails}${errorMessage}\n\nPlease check:\n- All required fields are filled\n- Latitude is between -90 and 90\n- Longitude is between -180 and 180\n- You have proper Firebase permissions`)
    }
  }

  function onError(errors: any) {
    console.error("Form validation errors:", errors)
    const errorMessages: string[] = []
    
    if (errors.root) {
      errorMessages.push(`General: ${errors.root.message || "Validation failed"}`)
    }
    
    Object.keys(errors).forEach((field) => {
      if (field !== "root" && errors[field]?.message) {
        errorMessages.push(`${field}: ${errors[field].message}`)
      }
    })
    
    if (errorMessages.length > 0) {
      alert("Please correct the following errors:\n\n" + errorMessages.join("\n"))
    } else {
      const errorFields = Object.keys(errors).filter(f => f !== "root").join(", ")
      alert(`Please correct the following fields: ${errorFields}`)
    }
  }

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 50 }, (_, i) => currentYear - i)

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Basic Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-800">
                    Substation Name <span className="text-red-600">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter substation name"
                      {...field}
                      className="border-gray-300 focus-visible:ring-blue-500"
                    />
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
                  <FormLabel className="text-gray-800">
                    Area Name <span className="text-red-600">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. North District"
                      {...field}
                      className="border-gray-300 focus-visible:ring-blue-500"
                    />
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
                  <FormLabel className="text-gray-800">Substation Code</FormLabel>
                  <FormControl>
                    <Input {...field} disabled className="bg-gray-100 text-gray-500" />
                  </FormControl>
                  <FormDescription>Auto-generated unique identifier</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="operator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-800">
                    Operator <span className="text-red-600">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Operating company/entity"
                      {...field}
                      className="border-gray-300 focus-visible:ring-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Section 2: Technical Specifications */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Technical Specifications</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="voltageClass"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-800">
                    Voltage Class <span className="text-red-600">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-gray-300 focus:ring-blue-500">
                        <SelectValue placeholder="Select voltage class" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="220kV" className="text-blue-700 font-medium">
                        220kV
                      </SelectItem>
                      <SelectItem value="400kV" className="text-green-700 font-medium">
                        400kV
                      </SelectItem>
                      <SelectItem value="440kV" className="text-orange-700 font-medium">
                        440kV
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="installationYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-800">
                    Installation Year <span className="text-red-600">*</span>
                  </FormLabel>
                  <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger className="border-gray-300 focus:ring-blue-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <SelectValue placeholder="Select year" />
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
          </div>
        </div>

        {/* Section 3: Location */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Location</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="latitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-800">Latitude</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0.000000"
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
                        className="border-gray-300 focus-visible:ring-blue-500 pr-10"
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
                  <FormLabel className="text-gray-800">Longitude</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0.000000"
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
                        className="border-gray-300 focus-visible:ring-blue-500 pr-10"
                      />
                    </FormControl>
                    <MapPin className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2">
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
        </div>

        {/* Section 4: Additional Notes */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Additional Information</h3>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-800">Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter any additional details..."
                    {...field}
                    className="border-gray-300 focus-visible:ring-blue-500 min-h-[100px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" className="min-w-[150px]">
            Save & Continue
          </Button>
        </div>
      </form>
    </Form>
  )
}
