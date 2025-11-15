"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DeliverableStatus } from "@prisma/client"
import { ExternalLink } from "lucide-react"
import Link from "next/link"

interface Deliverable {
  id: string
  name: string
  description: string | null
  status: DeliverableStatus
  link: string | null
  project?: {
    id: string
    name: string
  } | null
}

interface DeliverablesCardProps {
  clientId: string
  canEdit: boolean
  initialItems: Deliverable[]
}

const statusBadges: Record<DeliverableStatus, string> = {
  PLANNED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
}

export function DeliverablesCard({ clientId, canEdit, initialItems }: DeliverablesCardProps) {
  const [items, setItems] = useState(initialItems)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<{
    name: string
    description: string
    link: string
    status: DeliverableStatus
  }>({
    name: "",
    description: "",
    link: "",
    status: DeliverableStatus.IN_PROGRESS,
  })
  const [submitting, setSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!form.name) return
    setSubmitting(true)
    try {
      const response = await fetch("/api/deliverables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          link: form.link || null,
          status: form.status,
          clientId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create deliverable")
      }

      const created = await response.json()
      setItems((prev) => [created, ...prev])
      setDialogOpen(false)
      setForm({
        name: "",
        description: "",
        link: "",
        status: DeliverableStatus.IN_PROGRESS,
      })
    } catch (error) {
      console.error(error)
      alert("Unable to create deliverable. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (id: string, status: DeliverableStatus) => {
    setUpdatingId(id)
    try {
      const response = await fetch(`/api/deliverables/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) {
        throw new Error("Failed to update status")
      }
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
    } catch (error) {
      console.error(error)
      alert("Unable to update status. Please try again.")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Deliverables & Products</CardTitle>
          <CardDescription>Share completed assets and purchased services</CardDescription>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add Deliverable</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Deliverable</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Website Build - Phase 1"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Share any context or access instructions"
                    rows={3}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Link</label>
                  <Input
                    value={form.link}
                    onChange={(e) => setForm((prev) => ({ ...prev, link: e.target.value }))}
                    placeholder="https://"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, status: value as DeliverableStatus }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLANNED">Planned</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setDialogOpen(false)} variant="outline">
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {canEdit
              ? "No deliverables yet. Add a deliverable to share progress with the client."
              : "Deliverables shared by your project team will appear here."}
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                  {item.project && (
                    <p className="text-xs text-muted-foreground mt-1">{item.project.name}</p>
                  )}
                  {item.link && (
                    <Link
                      href={item.link}
                      target="_blank"
                      className="inline-flex items-center text-sm text-primary hover:underline mt-2"
                    >
                      Open deliverable <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {canEdit ? (
                    <Select
                      value={item.status}
                      onValueChange={(value) => handleStatusChange(item.id, value as DeliverableStatus)}
                      disabled={updatingId === item.id}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PLANNED">Planned</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={statusBadges[item.status]}>{item.status}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

