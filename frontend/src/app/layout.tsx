import React, { Suspense } from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { ConditionalTopNav } from "@/components/layout/conditional-top-nav"
import { LiveTrendWrapper } from "@/components/live-trend/live-trend-wrapper"
import { SimulationWrapper } from "@/components/simulation/simulation-wrapper"
import { DiagnosisWrapper } from "@/components/diagnosis/diagnosis-wrapper"
import { CourseWrapper } from "@/components/course/course-wrapper"
import { DataSourceProvider } from "@/lib/scada/data-source-context"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Oceanberg Digital Twin",
  description: "Substation Management System",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon.jpg",
        type: "image/jpeg",
      },
    ],
    apple: "/icon.jpg",
    shortcut: "/icon.jpg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased bg-gray-50`}>
        <DataSourceProvider>
          <CourseWrapper>
            <SidebarProvider defaultOpen={true}>
              <AppSidebar />
              <LiveTrendWrapper>
                <SimulationWrapper>
                  <DiagnosisWrapper>
                    <SidebarInset className="flex flex-col min-h-screen bg-gray-50">
                      <Suspense fallback={<div className="h-16 border-b bg-white" />}>
                        <ConditionalTopNav />
                      </Suspense>
                      <main className="flex-1 overflow-auto p-6">{children}</main>
                    </SidebarInset>
                  </DiagnosisWrapper>
                </SimulationWrapper>
              </LiveTrendWrapper>
            </SidebarProvider>
          </CourseWrapper>
        </DataSourceProvider>
      </body>
    </html>
  )
}
