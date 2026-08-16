"use client"

import { useFieldArray, useFormContext } from "react-hook-form"
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function EquipmentDetailsFields() {
  const form = useFormContext()

  // Maintenance History
  const {
    fields: maintenanceFields,
    append: appendMaintenance,
    remove: removeMaintenance,
  } = useFieldArray({
    control: form.control,
    name: "maintenanceHistory",
  })

  // Components Replaced
  const {
    fields: componentsFields,
    append: appendComponent,
    remove: removeComponent,
  } = useFieldArray({
    control: form.control,
    name: "componentsReplaced",
  })

  // Operation History
  const {
    fields: operationFields,
    append: appendOperation,
    remove: removeOperation,
  } = useFieldArray({
    control: form.control,
    name: "operationHistory",
  })

  // Documents
  const {
    fields: documentFields,
    append: appendDocument,
    remove: removeDocument,
  } = useFieldArray({
    control: form.control,
    name: "documents",
  })

  return (
    <div className="space-y-6">
      {/* Maintenance History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium border-b pb-2 w-full">Maintenance History</h3>
        </div>
        {maintenanceFields.map((field, index) => (
          <Card key={field.id} className="p-4">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-medium">Maintenance Entry {index + 1}</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeMaintenance(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name={`maintenanceHistory.${index}.date`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                        onChange={(e) => field.onChange(new Date(e.target.value).toISOString())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`maintenanceHistory.${index}.vendor`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`maintenanceHistory.${index}.technician`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Technician</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`maintenanceHistory.${index}.notes`}
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            appendMaintenance({
              date: new Date().toISOString(),
              vendor: null,
              technician: null,
              notes: null,
              documents: [],
            })
          }
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Maintenance Entry
        </Button>
      </div>

      {/* Components Replaced */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium border-b pb-2 w-full">Components Replaced</h3>
        </div>
        {componentsFields.map((field, index) => (
          <Card key={field.id} className="p-4">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-medium">Component {index + 1}</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeComponent(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name={`componentsReplaced.${index}.componentName`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Component Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`componentsReplaced.${index}.date`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                        onChange={(e) => field.onChange(new Date(e.target.value).toISOString())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`componentsReplaced.${index}.reason`}
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Reason *</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`componentsReplaced.${index}.vendor`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`componentsReplaced.${index}.cost`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost</FormLabel>
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            appendComponent({
              componentName: "",
              reason: "",
              date: new Date().toISOString(),
              vendor: null,
              cost: null,
              documents: [],
            })
          }
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Component Replaced
        </Button>
      </div>

      {/* Operation History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium border-b pb-2 w-full">Operation History</h3>
        </div>
        {operationFields.map((field, index) => (
          <Card key={field.id} className="p-4">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-medium">Operation Entry {index + 1}</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeOperation(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name={`operationHistory.${index}.date`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                        onChange={(e) => field.onChange(new Date(e.target.value).toISOString())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`operationHistory.${index}.eventType`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Tap Change, Trip, etc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`operationHistory.${index}.description`}
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`operationHistory.${index}.comtradeUrl`}
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>COMTRADE URL</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} type="url" placeholder="https://..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            appendOperation({
              date: new Date().toISOString(),
              eventType: "",
              description: null,
              comtradeUrl: null,
            })
          }
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Operation Entry
        </Button>
      </div>

      {/* Documents */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium border-b pb-2 w-full">Documents</h3>
        </div>
        {documentFields.map((field, index) => (
          <Card key={field.id} className="p-4">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-medium">Document {index + 1}</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeDocument(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name={`documents.${index}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`documents.${index}.url`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL *</FormLabel>
                    <FormControl>
                      <Input {...field} type="url" placeholder="https://..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`documents.${index}.uploadedAt`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Uploaded At *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                        onChange={(e) => field.onChange(new Date(e.target.value).toISOString())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            appendDocument({
              url: "",
              name: "",
              uploadedAt: new Date().toISOString(),
            })
          }
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Document
        </Button>
      </div>

      {/* Condition Assessment */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium border-b pb-2">Condition Assessment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="conditionAssessment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={(value) =>
                    form.setValue("conditionAssessment", {
                      status: value as "Excellent" | "Good" | "Fair" | "Poor",
                      notes: form.getValues("conditionAssessment")?.notes || null,
                    })
                  }
                  value={form.watch("conditionAssessment")?.status || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Excellent">Excellent</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="conditionAssessment"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    value={field.value?.notes || ""}
                    onChange={(e) =>
                      form.setValue("conditionAssessment", {
                        status: form.getValues("conditionAssessment")?.status || "Good",
                        notes: e.target.value || null,
                      })
                    }
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  )
}

