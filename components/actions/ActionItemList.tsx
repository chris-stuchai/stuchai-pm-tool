"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle2, Circle, Clock, AlertCircle, Mail, Paperclip } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface ActionItem {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: Date | null
  assignee: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
  project: {
    id: string
    name: string
    client: {
      name: string
    }
  } | null
  visibleToClient?: boolean
  clientCanComplete?: boolean
  clientCompleted?: boolean
  attachments?: Array<{
    id: string
    name: string
    url: string
  }>
}

interface ActionItemListProps {
  actionItems: ActionItem[]
  canEdit: boolean
  currentUserRole?: "ADMIN" | "MANAGER" | "CLIENT"
}

const priorityColors = {
  LOW: "bg-blue-100 text-blue-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
}

const statusIcons = {
  PENDING: Circle,
  IN_PROGRESS: Clock,
  COMPLETED: CheckCircle2,
  OVERDUE: AlertCircle,
}

export function ActionItemList({
  actionItems,
  canEdit,
  currentUserRole = "ADMIN",
}: ActionItemListProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState<string | null>(null)
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)
  const [clientUpdating, setClientUpdating] = useState<string | null>(null)
  const [attachmentModal, setAttachmentModal] = useState<{ id: string; title: string } | null>(null)
  const [attachmentForm, setAttachmentForm] = useState({ name: "", url: "" })
  const [attachmentSubmitting, setAttachmentSubmitting] = useState(false)

  const handleStatusChange = async (itemId: string, newStatus: string) => {
    setUpdating(itemId)
    try {
      const response = await fetch(`/api/action-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update status")
      }

      router.refresh()
    } catch (error) {
      console.error("Error updating status:", error)
      alert("Failed to update status. Please try again.")
    } finally {
      setUpdating(null)
    }
  }

  const handleSendReminder = async (itemId: string) => {
    setSendingReminder(itemId)
    try {
      const response = await fetch("/api/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionItemId: itemId }),
      })

      if (!response.ok) {
        throw new Error("Failed to send reminder")
      }

      alert("Reminder sent successfully!")
      router.refresh()
    } catch (error) {
      console.error("Error sending reminder:", error)
      alert("Failed to send reminder. Please ensure Gmail is connected.")
    } finally {
      setSendingReminder(null)
    }
  }

  const handleClientCompletion = async (itemId: string, completed: boolean) => {
    setClientUpdating(itemId)
    try {
      const response = await fetch(`/api/action-items/${itemId}/client`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      })

      if (!response.ok) {
        throw new Error("Failed to update task")
      }

      router.refresh()
    } catch (error) {
      console.error("Error updating client task:", error)
      alert("Unable to update the task. Please try again.")
    } finally {
      setClientUpdating(null)
    }
  }

  const handleAttachmentSubmit = async () => {
    if (!attachmentModal || !attachmentForm.name || !attachmentForm.url) return
    setAttachmentSubmitting(true)
    try {
      const response = await fetch(`/api/action-items/${attachmentModal.id}/client`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attachment: { ...attachmentForm },
        }),
      })
      if (!response.ok) {
        throw new Error("Failed to upload attachment")
      }
      setAttachmentModal(null)
      setAttachmentForm({ name: "", url: "" })
      router.refresh()
    } catch (error) {
      console.error("Error uploading attachment:", error)
      alert("Unable to upload attachment. Please try again.")
    } finally {
      setAttachmentSubmitting(false)
    }
  }

  if (actionItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No action items yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {actionItems.map((item) => {
        const StatusIcon = statusIcons[item.status as keyof typeof statusIcons] || Circle
        const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && item.status !== "COMPLETED"

        return (
          <div
            key={item.id}
            className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1">
                  <StatusIcon
                    className={`h-5 w-5 mt-0.5 ${
                      item.status === "COMPLETED"
                        ? "text-green-600"
                        : isOverdue
                        ? "text-red-600"
                        : "text-gray-400"
                    }`}
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{item.title}</h4>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {item.project && (
                        <span className="text-xs text-muted-foreground">
                          {item.project.name}
                        </span>
                      )}
                      {item.dueDate && (
                        <span
                          className={`text-xs ${
                            isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
                          }`}
                        >
                          Due: {formatDate(item.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={priorityColors[item.priority as keyof typeof priorityColors] || ""}
                  >
                    {item.priority}
                  </Badge>
                  {canEdit && (
                    <>
                      {item.assignee && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSendReminder(item.id)}
                          disabled={sendingReminder === item.id}
                          title="Send email reminder"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      <Select
                        value={item.status}
                        onValueChange={(value) => handleStatusChange(item.id, value)}
                        disabled={updating === item.id}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="OVERDUE">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              </div>
              {item.assignee && (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={item.assignee.image || undefined} />
                    <AvatarFallback>
                      {item.assignee.name?.charAt(0) || item.assignee.email.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {item.assignee.name || item.assignee.email}
                  </span>
                </div>
              )}
              {item.attachments && item.attachments.length > 0 && (
                <div className="mt-3 space-y-1">
                  {item.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-xs text-primary hover:underline"
                    >
                      <Paperclip className="mr-1 h-3 w-3" />
                      {attachment.name}
                    </a>
                  ))}
                </div>
              )}
              {currentUserRole === "CLIENT" && item.visibleToClient && (
                <div className="flex flex-wrap gap-2 pt-3">
                  {item.clientCanComplete && (
                    <Button
                      size="sm"
                      variant={item.clientCompleted ? "outline" : "default"}
                      onClick={() => handleClientCompletion(item.id, !item.clientCompleted)}
                      disabled={clientUpdating === item.id}
                    >
                      {clientUpdating === item.id
                        ? "Updating..."
                        : item.clientCompleted
                        ? "Mark Incomplete"
                        : "Mark Complete"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAttachmentModal({ id: item.id, title: item.title })}
                  >
                    Add Attachment
                  </Button>
                </div>
              )}
            </div>
          </div>
        )
      })}
      <Dialog
        open={!!attachmentModal}
        onOpenChange={(open) => {
          if (!open) {
            setAttachmentModal(null)
            setAttachmentForm({ name: "", url: "" })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Attachment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Attachment name"
              value={attachmentForm.name}
              onChange={(e) => setAttachmentForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <Input
              placeholder="https://link-to-file"
              value={attachmentForm.url}
              onChange={(e) => setAttachmentForm((prev) => ({ ...prev, url: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAttachmentModal(null)
                setAttachmentForm({ name: "", url: "" })
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAttachmentSubmit} disabled={attachmentSubmitting}>
              {attachmentSubmitting ? "Uploading..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
