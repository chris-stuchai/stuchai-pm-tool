"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Upload } from "lucide-react"

export function BulkImportDialog() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<null | {
    rowsProcessed: number
    clientsCreated: number
    projectsCreated: number
    actionItemsCreated: number
    duplicatesSkipped: number
    errors: string[]
  }>(null)

  const handleUpload = async () => {
    if (!file) {
      toast({ title: "Please select a CSV file." })
      return
    }

    setIsUploading(true)
    setResult(null)

    try {
      const data = new FormData()
      data.append("file", file)

      const response = await fetch("/api/import/actions", {
        method: "POST",
        body: data,
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Import failed")
      }

      setResult(payload)
      toast({
        title: "Bulk import complete",
        description: `Processed ${payload.rowsProcessed} rows.`,
      })
      setFile(null)
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Bulk import failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => {
      setOpen(value)
      if (!value) {
        setFile(null)
        setResult(null)
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Bulk upload projects & action items</DialogTitle>
          <DialogDescription>
            Use the CSV template to add or update clients, projects, and tasks
            in one import.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-md border border-dashed p-3 text-sm">
            <p className="font-medium">Template format</p>
            <ul className="list-disc pl-5 text-muted-foreground">
              <li>Each row creates (or updates) one project + action item.</li>
              <li>Clients are matched by email; new ones are created if needed.</li>
              <li>
                Supported project statuses: PLANNING, IN_PROGRESS, ON_HOLD, COMPLETED.
              </li>
              <li>
                Supported priorities: LOW, MEDIUM, HIGH, URGENT. Dates use YYYY-MM-DD.
              </li>
              <li>Use “Add To Timeline” to surface a task on the project timeline.</li>
              <li>
                Secure data: set “Requires Secure Response” to true and provide a prompt + field type
                (SHORT_TEXT, LONG_TEXT, SECRET) to request credentials safely.
              </li>
            </ul>
            <Button
              variant="link"
              className="px-0"
              asChild
            >
              <Link href="/templates/bulk-actions-template.csv" download>
                Download the CSV template
              </Link>
            </Button>
          </div>
          <div className="space-y-2">
            <Input
              type="file"
              accept=".csv"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null)
                setResult(null)
              }}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>
          {result && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium">Import summary</p>
              <ul className="list-disc pl-5">
                <li>Rows processed: {result.rowsProcessed}</li>
                <li>Clients created: {result.clientsCreated}</li>
                <li>Projects created: {result.projectsCreated}</li>
                <li>Action items created: {result.actionItemsCreated}</li>
                <li>Duplicates skipped: {result.duplicatesSkipped}</li>
              </ul>
              {result.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="font-medium text-destructive">
                    {result.errors.length} issues:
                  </p>
                  <ul className="list-disc pl-5 text-destructive">
                    {result.errors.slice(0, 3).map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                  {result.errors.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      Showing first 3 errors.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false)
            }}
          >
            Close
          </Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? "Importing..." : "Upload CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

