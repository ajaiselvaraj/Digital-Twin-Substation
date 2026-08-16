"use client"

import * as React from "react"
import { Upload, FileJson, FileSpreadsheet, FileText, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { MasterSubstationForm } from "@/components/forms/master-substation-form"

export default function CreateSubstationPage() {
  const [activeTab, setActiveTab] = React.useState("manual")
  const [file, setFile] = React.useState<File | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadSuccess, setUploadSuccess] = React.useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setUploadSuccess(false)
    }
  }

  const handleUpload = () => {
    if (!file) return

    setIsUploading(true)
    // Simulate upload processing
    setTimeout(() => {
      setIsUploading(false)
      setUploadSuccess(true)
    }, 2000)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create New Substation</h1>
        <p className="text-muted-foreground">
          Add a new substation to the digital twin system. Choose between manual entry or bulk upload.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-transparent rounded-lg gap-2">
          <TabsTrigger
            value="upload"
            className="h-12 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white data-[state=active]:border-[#1A1A1A] text-base"
          >
            Option A: Upload Template
          </TabsTrigger>
          <TabsTrigger
            value="manual"
            className="h-12 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-white data-[state=active]:border-[#1A1A1A] text-base"
          >
            Option B: Manual Entry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-8">
          <div className="grid gap-8 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Upload Data File</CardTitle>
                <CardDescription>
                  Upload a JSON, Excel, or PDF file containing the substation data. The system will automatically
                  extract and validate the fields.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="file-upload">Select File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".json,.xlsx,.xls,.pdf"
                    onChange={handleFileChange}
                    className="cursor-pointer file:cursor-pointer file:text-purple-600 file:bg-purple-50 file:border-0 file:rounded-md file:px-2 file:mr-4 hover:file:bg-purple-100"
                  />
                  <p className="text-xs text-muted-foreground">Supported formats: .json, .xlsx, .pdf</p>
                </div>

                {file && (
                  <div className="flex items-center gap-3 p-3 border rounded-md bg-slate-50">
                    {file.name.endsWith(".json") ? (
                      <FileJson className="h-8 w-8 text-orange-500" />
                    ) : file.name.endsWith(".pdf") ? (
                      <FileText className="h-8 w-8 text-red-500" />
                    ) : (
                      <FileSpreadsheet className="h-8 w-8 text-green-500" />
                    )}
                    <div className="flex-1 truncate">
                      <div className="font-medium truncate">{file.name}</div>
                      <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</div>
                    </div>
                    {uploadSuccess && <CheckCircle2 className="h-6 w-6 text-green-600" />}
                  </div>
                )}

                {uploadSuccess && (
                  <Alert className="bg-green-50 border-green-200 text-green-800">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle>Upload Successful!</AlertTitle>
                    <AlertDescription>
                      The file has been processed. 1 substation and 24 assets identified.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  variant="default"
                  className="w-full"
                  disabled={!file || isUploading || uploadSuccess}
                  onClick={handleUpload}
                >
                  {isUploading ? (
                    <>Processing...</>
                  ) : uploadSuccess ? (
                    <>Data Verified</>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" /> Upload & Process
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Download Templates</CardTitle>
                <CardDescription>
                  Use these templates to ensure your data is formatted correctly for the system.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Button variant="outline" className="justify-start h-14 px-4 bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-sm" asChild>
                  <a href="#" className="flex items-center">
                    <div className="bg-orange-100 p-2 rounded mr-4">
                      <FileJson className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">JSON Template</div>
                      <div className="text-xs text-muted-foreground">For developers and integrations</div>
                    </div>
                  </a>
                </Button>
                <Button variant="outline" className="justify-start h-14 px-4 bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-sm" asChild>
                  <a href="#" className="flex items-center">
                    <div className="bg-green-100 p-2 rounded mr-4">
                      <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Excel Template</div>
                      <div className="text-xs text-muted-foreground">For manual data entry</div>
                    </div>
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Manual Entry Form</CardTitle>
              <CardDescription>
                Fill out the details below to create a new substation record. All fields marked with * are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MasterSubstationForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
