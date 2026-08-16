"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function MigratePage() {
  const [isMigrating, setIsMigrating] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleMigrate = async () => {
    setIsMigrating(true)
    setMessage("")
    setError("")

    try {
      const response = await fetch("/api/migrate", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        setMessage("Migration completed successfully! Dummy data has been pushed to Firebase.")
      } else {
        setError(data.error || "Migration failed. Please check the console for details.")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during migration.")
    } finally {
      setIsMigrating(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Migrate Dummy Data to Firebase</CardTitle>
          <CardDescription>
            This will push all dummy substation data to Firebase. This should only be run once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This migration will add 3 sample substations with complete asset data to your Firebase database.
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Chennai North Substation (400kV)</li>
              <li>Coimbatore East Substation (220kV)</li>
              <li>Madurai Substation (440kV)</li>
            </ul>
          </div>

          {message && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
              {message}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
              {error}
            </div>
          )}

          <Button
            onClick={handleMigrate}
            disabled={isMigrating}
            className="w-full"
            size="lg"
          >
            {isMigrating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Migrating...
              </>
            ) : (
              "Start Migration"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

