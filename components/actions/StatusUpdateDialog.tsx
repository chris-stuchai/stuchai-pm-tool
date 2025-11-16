"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface StatusUpdateDialogProps {
  action: {
    id: string
    title: string
    status: string
  }
  teammates: { id: string; name: string | null; email: string }[]
  currentUserRole: "ADMIN" | "MANAGER" | "CLIENT"
  onClose: () => void
  onUpdated: () => void
}

const STATUS_OPTIONS = ["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE"]
const OUTCOME_TAGS = ["Success", "Blocked", "Needs follow-up", "Waiting on client"]

export function StatusUpdateDialog({
  action,
  teammates,
  currentUserRole,
  onClose,
  onUpdated,
}: StatusUpdateDialogProps) {
  const [newStatus, setNewStatus] = useState(action.status)
  const [summary, setSummary] = useState("")
  const [outcomeTag, setOutcomeTag] = useState<string | undefined>()
  const [notifyUserIds, setNotifyUserIds] = useState<string[]>([])
  const [reviewRequired, setReviewRequired] = useState(false)
  const [reviewAssigneeId, setReviewAssigneeId] = useState<string | undefined>()
  const [followUpAssigneeId, setFollowUpAssigneeId] = useState<string | undefined>()
  const [followUpNotes, setFollowUpNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const statusChoices = useMemo(() => {
    if (currentUserRole === "CLIENT") {
      return ["PENDING", "IN_PROGRESS", "COMPLETED"]
    }
    return STATUS_OPTIONS
  }, [currentUserRole])

  useEffect(() => {
    setNewStatus(action.status)
  }, [action.status])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch(`/api/action-items/${action.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newStatus,
          summary,
          outcomeTag,
          notifyUserIds,
          reviewRequired,
          reviewAssigneeId: reviewRequired ? reviewAssigneeId : undefined,
          followUp: followUpAssigneeId
            ? {
                assigneeId: followUpAssigneeId,
                notes: followUpNotes,
              }
            : undefined,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update status.")
      }
      onUpdated()
    } catch (err: any) {
      setError(err?.message || "Status update failed.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Update status</DialogTitle>
          <DialogDescription>
            Provide a quick summary so the team understands the latest on “{action.title}”.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusChoices.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Summary</Label>
            <Textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={4}
              placeholder="What changed? Include links, blockers, outcomes…"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Outcome</Label>
            <Select
              value={outcomeTag ?? "none"}
              onValueChange={(value) => setOutcomeTag(value === "none" ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an outcome tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {OUTCOME_TAGS.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border p-3">
            <Label className="text-xs font-semibold text-muted-foreground">Notify teammates</Label>
            <div className="mt-2 space-y-2">
              {teammates.length === 0 && (
                <p className="text-xs text-muted-foreground">No teammates found.</p>
              )}
              {teammates.map((user) => (
                <label key={user.id} className="flex items-center gap-2 text-xs text-slate-700">
                  <Checkbox
                    checked={notifyUserIds.includes(user.id)}
                    onCheckedChange={(checked) => {
                      setNotifyUserIds((prev) =>
                        checked ? [...prev, user.id] : prev.filter((id) => id !== user.id)
                      )
                    }}
                  />
                  {user.name || user.email}
                </label>
              ))}
            </div>
          </div>
          {["ADMIN", "MANAGER"].includes(currentUserRole) && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Review required</Label>
                  <p className="text-xs text-muted-foreground">
                    Assign a teammate to double-check this work.
                  </p>
                </div>
                <Checkbox checked={reviewRequired} onCheckedChange={(checked) => setReviewRequired(Boolean(checked))} />
              </div>
              {reviewRequired && (
                <Select value={reviewAssigneeId} onValueChange={setReviewAssigneeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose reviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    {teammates.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          {["ADMIN", "MANAGER"].includes(currentUserRole) && (
            <div className="space-y-2 rounded-md border p-3">
              <Label className="text-sm">Create follow-up task</Label>
              <Select
                value={followUpAssigneeId ?? "none"}
                onValueChange={(value) => setFollowUpAssigneeId(value === "none" ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No follow-up" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No follow-up</SelectItem>
                  {teammates.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {followUpAssigneeId && (
                <Input
                  placeholder="Notes for the follow-up task"
                  value={followUpNotes}
                  onChange={(event) => setFollowUpNotes(event.target.value)}
                />
              )}
            </div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

