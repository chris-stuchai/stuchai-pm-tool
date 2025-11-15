"use client"

import { useState, useTransition } from "react"
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
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"

interface UploadAttachmentDialogProps {
  actionItemId: string
  onUploaded: () => void
}

/**
 * Provides upload/link options for internal team attachments on an action item.
 */
export function UploadAttachmentDialog({ actionItemId, onUploaded }: UploadAttachmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [linkName, setLinkName] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [pending, startTransition] = useTransition()

  const handleFileUpload = () => {
    if (files.length === 0) {
      toast({ variant: "destructive", title: "Please select at least one file." })
      return
    }

    startTransition(async () => {
      try {
        for (const file of files) {
          const formData = new FormData()
          formData.append("file", file)
          formData.append("folder", `action-items/${actionItemId}`)

          const response = await fetch(`/api/action-items/${actionItemId}/attachments`, {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            const data = await response.json().catch(() => ({}))
            throw new Error(data.error || "Failed to upload file")
          }
        }

        setFiles([])
        setOpen(false)
        onUploaded()
      } catch (error) {
        console.error(error)
        toast({
          variant: "destructive",
          title: "Failed to upload file",
          description: error instanceof Error ? error.message : undefined,
        })
      }
    })
  }

  const handleLinkSave = () => {
    if (!linkName.trim() || !linkUrl.trim()) {
      toast({ variant: "destructive", title: "Link name and URL are required." })
      return
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/action-items/${actionItemId}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: linkName.trim(),
            url: linkUrl.trim(),
          }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || "Failed to save link")
        }

        setLinkName("")
        setLinkUrl("")
        setOpen(false)
        onUploaded()
      } catch (error) {
        console.error(error)
        toast({
          variant: "destructive",
          title: "Failed to save link",
          description: error instanceof Error ? error.message : undefined,
        })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Add Attachment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add Attachment</DialogTitle>
          <DialogDescription>Upload files or link to existing docs.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="upload">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="link">Add Link</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="space-y-3 pt-4">
            <Label htmlFor="attachment-file">Files</Label>
            <Input
              id="attachment-file"
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
            {files.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {files.length} file{files.length === 1 ? "" : "s"} selected
              </p>
            )}
          </TabsContent>
          <TabsContent value="link" className="space-y-3 pt-4">
            <div className="space-y-2">
              <Label htmlFor="link-name">Link Name</Label>
              <Input
                id="link-name"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="Design spec"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={files.length > 0 ? handleFileUpload : handleLinkSave} disabled={pending}>
            {pending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

