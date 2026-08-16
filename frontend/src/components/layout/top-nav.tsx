"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function TopNav({ showAssetButtons = true }: { showAssetButtons?: boolean }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="flex h-16 items-center px-4 gap-4">
        <SidebarTrigger className="md:hidden" />

        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block text-xl tracking-tight">
              OCEANBERG <span className="text-blue-600">DIGITAL TWIN</span>
            </span>
          </Link>
        </div>

        {showAssetButtons && (
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-2">
              <Button
                variant="default"
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all"
                asChild
              >
                <Link href="/view-substations">View Substations</Link>
              </Button>
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700 text-white shadow-md transition-all"
                asChild
              >
                <Link href="/create-substation">Create Substation</Link>
              </Button>
              <Button
                variant="default"
                className="bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-all"
                asChild
              >
                <Link href="/manage-substations">Manage Substations</Link>
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
