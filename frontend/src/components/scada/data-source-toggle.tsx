"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useDataSource } from "@/lib/scada/data-source-context"
import { Database, Server, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function DataSourceToggle() {
  const { dataSource, setDataSource, scadaUrl } = useDataSource()
  const [isTesting, setIsTesting] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestError(null)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    try {
      const response = await fetch(scadaUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }
      // Connection successful
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === "AbortError") {
        setTestError("Connection timeout")
      } else {
        setTestError(error instanceof Error ? error.message : "Connection failed")
      }
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Data Source:</Label>
        <RadioGroup
          value={dataSource}
          onValueChange={(value) => setDataSource(value as "firebase" | "scada")}
          className="flex items-center gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="firebase" id="firebase" />
            <Label htmlFor="firebase" className="flex items-center gap-2 cursor-pointer">
              <Database className="h-4 w-4 text-blue-600" />
              <span>Firebase</span>
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="scada" id="scada" />
            <Label htmlFor="scada" className="flex items-center gap-2 cursor-pointer">
              <Server className="h-4 w-4 text-green-600" />
              <span>SCADA System</span>
            </Label>
          </div>
        </RadioGroup>
        <Badge
          variant="outline"
          className={
            dataSource === "scada"
              ? "bg-green-50 text-green-700 border-green-300"
              : "bg-blue-50 text-blue-700 border-blue-300"
          }
        >
          {dataSource === "scada" ? "SCADA Active" : "Firebase Active"}
        </Badge>
      </div>
      {dataSource === "scada" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">URL: {scadaUrl}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="h-7 text-xs"
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
          {testError && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-3 w-3" />
              <AlertDescription className="text-xs">{testError}</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}

