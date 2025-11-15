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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"

interface MilestoneDialogProps {
  trigger: React.ReactNode
  projectId: string
  milestone?: {
    id: string
    name: string
    description: string | null
    dueDate: Date | null
    completedAt: Date | null
  }
}

export function MilestoneDialog({ trigger, projectId, milestone }: MilestoneDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(milestone?.name ?? "")
  const [description, setDescription] = useState(milestone?.description ?? "")
  const [dueDate, setDueDate] = useState(
    milestone?.dueDate ? new Date(milestone.dueDate).toISOString().split("T")[0] : ""
  )
  const [completed, setCompleted] = useState(!!milestone?.completedAt)
  const [saving, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const resetState = () => {
    setName(milestone?.name ?? "")
    setDescription(milestone?.description ?? "")
    setDueDate(milestone?.dueDate ? new Date(milestone.dueDate).toISOString().split("T")[0] : "")
    setCompleted(!!milestone?.completedAt)
    setError(null)
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Name is required.")
      return
    }

    startTransition(async () => {
      try {
        const payload = {
          projectId,
          name: name.trim(),
          description: description.trim() || null,
          dueDate: dueDate || null,
          completed,
        }

        const response = await fetch(
          milestone ? `/api/milestones/${milestone.id}` : "/api/milestones",
          {
            method: milestone ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        )

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || "Failed to save milestone")
        }

        setOpen(false)
        router.refresh()
      } catch (err) {
        console.error("Failed to save milestone", err)
        setError(err instanceof Error ? err.message : "Failed to save milestone.")
      }
    })
  }

  const handleDelete = () => {
    if (!milestone) return

    if (!confirm("Delete this milestone? This cannot be undone.")) {
      return
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/milestones/${milestone.id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || "Failed to delete milestone")
        }

        setOpen(false)
        router.refresh()
      } catch (err) {
        console.error("Failed to delete milestone", err)
        setError(err instanceof Error ? err.message : "Failed to delete milestone.")
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          resetState()
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{milestone ? "Edit Milestone" : "New Milestone"}</DialogTitle>
          <DialogDescription>
            {milestone
              ? "Update milestone details and mark progress."
              : "Define a new milestone for this project."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="milestone-name">Name</Label>
            <Input
              id="milestone-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kickoff, Wireframes Approved, etc."
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="milestone-description">Summary</Label>
            <Textarea
              id="milestone-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a short description or acceptance criteria."
              rows={3}
              disabled={saving}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="milestone-due">Due Date</Label>
              <Input
                id="milestone-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="milestone-completed"
                checked={completed}
                onCheckedChange={(checked) => setCompleted(Boolean(checked))}
                disabled={saving}
              />
              <Label htmlFor="milestone-completed">Mark as completed</Label>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="justify-between gap-2">
          {milestone ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={saving}
            >
              Delete
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : "Save Milestone"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

