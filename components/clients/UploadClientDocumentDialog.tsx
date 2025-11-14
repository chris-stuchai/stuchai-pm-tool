"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"

interface UploadClientDocumentDialogProps {
  clientId: string
  onUpload: () => void
}

export function UploadClientDocumentDialog({
  clientId,
  onUpload,
}: UploadClientDocumentDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState("")
  const [url, setUrl] = useState("")
  const [googleDriveId, setGoogleDriveId] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/client-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          name,
          type: type || null,
          url: url || null,
          googleDriveId: googleDriveId || null,
        }),
      })

      if (response.ok) {
        setOpen(false)
        setName("")
        setType("")
        setUrl("")
        setGoogleDriveId("")
        onUpload()
      } else {
        alert("Failed to upload document")
      }
    } catch (error) {
      console.error("Error uploading document:", error)
      alert("Failed to upload document")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Add a document to this client profile (contract, proposal, invoice, etc.)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Document Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contract - 2024"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Document Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="agreement">Agreement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="url">Document URL</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="googleDriveId">Google Drive File ID</Label>
              <Input
                id="googleDriveId"
                value={googleDriveId}
                onChange={(e) => setGoogleDriveId(e.target.value)}
                placeholder="1ABC123..."
              />
              <p className="text-xs text-muted-foreground">
                Optional: Paste the Google Drive file ID to link this document
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

