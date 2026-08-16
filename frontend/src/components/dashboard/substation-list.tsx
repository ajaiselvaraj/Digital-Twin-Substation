"use client"

import { Eye, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getAllSubstations, deleteSubstation } from "@/lib/firebase-data"
import type { DummySubstation } from "@/lib/dummy-data"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Substation {
  id: string
  master: {
    name: string
    areaName: string
    voltageClass: string
    operator: string
    installationYear: number
    substationCode: string
  }
}

export function SubstationList() {
  const router = useRouter()
  const [substations, setSubstations] = useState<DummySubstation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [substationToDelete, setSubstationToDelete] = useState<DummySubstation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    async function fetchSubstations() {
      try {
        const data = await getAllSubstations()
        setSubstations(data)
      } catch (error) {
        console.error("Error fetching substations:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSubstations()
  }, [])

  const handleDeleteClick = (substation: DummySubstation) => {
    setSubstationToDelete(substation)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!substationToDelete) return

    setIsDeleting(true)
    try {
      await deleteSubstation(substationToDelete.id)
      // Remove from local state
      setSubstations(substations.filter((s) => s.id !== substationToDelete.id))
      setDeleteDialogOpen(false)
      setSubstationToDelete(null)
    } catch (error) {
      console.error("Error deleting substation:", error)
      alert("Failed to delete substation. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatus = () => "active" as const

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-20 bg-slate-100" />
            <CardContent className="h-32 bg-slate-50" />
          </Card>
        ))}
      </div>
    )
  }

  if (substations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">No substations found.</p>
        <p className="text-sm text-muted-foreground mt-2">Create a new substation to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {substations.map((substation) => (
        <Card key={substation.id} className="overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="border-b bg-slate-50/50 p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{substation.master.name}</CardTitle>
                <div className="text-sm text-muted-foreground">{substation.master.areaName}</div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {substation.master.substationCode}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between py-1 border-b border-dashed">
                <span className="text-muted-foreground">Voltage Class</span>
                <span className="font-medium">{substation.master.voltageClass}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed">
                <span className="text-muted-foreground">Operator</span>
                <span className="font-medium">{substation.master.operator}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed">
                <span className="text-muted-foreground">Installation Year</span>
                <span className="font-medium">{substation.master.installationYear}</span>
              </div>
              <div className="flex justify-between py-1 pt-2">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
                  Active
                </Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50/50 p-3 flex gap-2">
            <Button asChild className="flex-1" size="sm">
              <Link href={`/asset-details/${substation.id}`}>
                <Eye className="mr-2 h-4 w-4" /> View
              </Link>
            </Button>
            <Button
              onClick={() => router.push(`/edit-substation/${substation.id}`)}
              variant="outline"
              size="sm"
              className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
            >
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button
              onClick={() => handleDeleteClick(substation)}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      ))}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Substation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{substationToDelete?.master.name}</strong> ({substationToDelete?.master.substationCode})? 
              This action cannot be undone and will permanently remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-white text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
