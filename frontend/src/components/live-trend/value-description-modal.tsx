"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PARAMETER_METADATA } from "@/lib/live-trend/parameter-metadata"
import { Info } from "lucide-react"

interface ValueDescriptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parameterKey: string
}

export function ValueDescriptionModal({
  open,
  onOpenChange,
  parameterKey,
}: ValueDescriptionModalProps) {
  const metadata = PARAMETER_METADATA[parameterKey]

  if (!metadata) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            {metadata.name} - Parameter Description
          </DialogTitle>
          <DialogDescription>
            Detailed information about this monitoring parameter
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                Parameter Meaning
              </h4>
              <p className="text-sm">{metadata.meaning}</p>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                Unit
              </h4>
              <p className="text-sm font-mono">{metadata.unit}</p>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                Typical Range
              </h4>
              <p className="text-sm font-mono">{metadata.typicalRange}</p>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                Sensor Type
              </h4>
              <p className="text-sm">{metadata.sensorType}</p>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                IEC61850 Logical Node
              </h4>
              <p className="text-sm font-mono">{metadata.iec61850LogicalNode}</p>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                Use Case
              </h4>
              <p className="text-sm">{metadata.useCase}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

