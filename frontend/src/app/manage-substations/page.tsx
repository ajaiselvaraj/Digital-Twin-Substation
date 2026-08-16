import { SubstationList } from "@/components/dashboard/substation-list"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default function ManageSubstationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Substations</h1>
          <p className="text-muted-foreground">View and manage your registered substations</p>
        </div>
        <Button asChild>
          <Link href="/create-substation">
            <Plus className="mr-2 h-4 w-4" />
            Add New Substation
          </Link>
        </Button>
      </div>
      <SubstationList />
    </div>
  )
}
