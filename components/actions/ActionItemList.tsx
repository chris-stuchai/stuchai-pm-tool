"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle2, Circle, Clock, AlertCircle, Mail, Paperclip, Pencil, Trash2, CalendarDays, ChevronDown, ChevronUp } from "lucide-react"
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
import { UploadAttachmentDialog } from "./UploadAttachmentDialog"
import { EditActionItemDialog } from "./EditActionItemDialog"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { SecureResponseSection } from "./SecureResponseSection"
import { StatusUpdateDialog } from "./StatusUpdateDialog"
import { ActionHistoryList } from "./ActionHistoryList"

interface ActionItem {
  id: string
  title: string
  description: string | null
  status: string
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  dueDate: string | Date | null
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
      id?: string
      name: string
    }
  } | null
  visibleToClient?: boolean
  clientCanComplete?: boolean
  clientCompleted?: boolean
  showOnTimeline?: boolean
  timelineLabel?: string | null
  requiresSecureResponse?: boolean
  securePrompt?: string | null
  secureFieldType?: "SHORT_TEXT" | "LONG_TEXT" | "SECRET" | null
  secureRetentionPolicy?: "UNTIL_DELETED" | "EXPIRE_AFTER_VIEW" | "EXPIRE_AFTER_HOURS" | null
  secureExpireAfterHours?: number | null
  secureViewedAt?: string | Date | null
  secureResponse?: {
    id: string
    submittedBy?: string | null
    createdAt: string | Date
    updatedAt: string | Date
  } | null
  reviewRequired?: boolean
  reviewAssignee?: {
    id: string
    name: string | null
    email: string
  } | null
  statusHistory?: Array<{
    id: string
    previousStatus?: string | null
    newStatus: string
    summary?: string | null
    outcomeTag?: string | null
    notifiedUserIds: string[]
    followUpActionId?: string | null
    createdAt: string | Date
    author: {
      id: string
      name: string | null
      email: string
    }
  }>
  attachments?: Array<{
    id: string
    name: string
    url: string
    mimeType?: string | null
    size?: number | null
  }>
}

interface ActionItemListProps {
  actionItems: ActionItem[]
  canEdit: boolean
  currentUserRole?: "ADMIN" | "MANAGER" | "CLIENT"
  currentUserId?: string
  teammates?: { id: string; name: string | null; email: string }[]
  variant?: "default" | "kanban"
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

/** Displays a detailed list of action items with status, reminder, and attachment controls. */
export function ActionItemList({
  actionItems,
  canEdit,
  currentUserRole = "ADMIN",
  currentUserId,
  teammates = [],
  variant = "default",
}: ActionItemListProps) {
  const router = useRouter()
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)
  const [clientUpdating, setClientUpdating] = useState<string | null>(null)
  const [attachmentModal, setAttachmentModal] = useState<{ id: string; title: string } | null>(null)
  const [attachmentForm, setAttachmentForm] = useState<{
    name: string
    url: string
    mimeType?: string | null
    size?: number | null
  }>({ name: "", url: "" })
  const [attachmentSubmitting, setAttachmentSubmitting] = useState(false)
  const [clientFile, setClientFile] = useState<File | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [statusDialogItem, setStatusDialogItem] = useState<ActionItem | null>(null)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

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

  /** Uploads a client-provided file before attaching it to the action item. */
  const uploadClientFile = async (actionItemId: string, file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", `action-items/${actionItemId}`)
    const uploadResponse = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    })
    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file")
    }
    return uploadResponse.json()
  }

  const handleAttachmentSubmit = async () => {
    if (!attachmentModal) return

    if (!clientFile && (!attachmentForm.name || !attachmentForm.url)) {
      alert("Upload a file or provide a link.")
      return
    }

    setAttachmentSubmitting(true)
    try {
      let payload = { ...attachmentForm }
      if (clientFile) {
        const uploaded = await uploadClientFile(attachmentModal.id, clientFile)
        payload = {
          name: uploaded.name,
          url: uploaded.url,
          mimeType: uploaded.mimeType,
          size: uploaded.size,
        }
      }
      const response = await fetch(`/api/action-items/${attachmentModal.id}/client`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attachment: payload,
        }),
      })
      if (!response.ok) {
        throw new Error("Failed to upload attachment")
      }
      setAttachmentModal(null)
      setAttachmentForm({ name: "", url: "" })
      setClientFile(null)
      router.refresh()
    } catch (error) {
      console.error("Error uploading attachment:", error)
      alert("Unable to upload attachment. Please try again.")
    } finally {
      setAttachmentSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/action-items/${deleteTarget}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete action item")
      }
      setDeleteTarget(null)
      router.refresh()
    } catch (error) {
      console.error("Error deleting action item:", error)
      alert("Unable to delete this action. Please try again.")
    } finally {
      setDeleteLoading(false)
    }
  }

  if (actionItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No action items yet</p>
      </div>
    )
  }

  const containerBaseClass =
    variant === "kanban"
      ? "flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
      : "flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"

  const showDetailsToggle = variant === "default"

  return (
    <div className="space-y-3">
      {actionItems.map((item) => {
        const StatusIcon = statusIcons[item.status as keyof typeof statusIcons] || Circle
        const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && item.status !== "COMPLETED"
        const priorityValue = (item.priority || "MEDIUM") as keyof typeof priorityColors
        const canClientSubmit =
          currentUserRole === "CLIENT" &&
          (item.visibleToClient || item.assignee?.id === currentUserId)
        const editablePayload = {
          id: item.id,
          title: item.title,
          description: item.description,
          priority: item.priority,
          dueDate: item.dueDate,
          project: item.project ? { id: item.project.id, name: item.project.name } : null,
          assignee: item.assignee
            ? { id: item.assignee.id, name: item.assignee.name, email: item.assignee.email }
            : null,
          visibleToClient: item.visibleToClient,
          clientCanComplete: item.clientCanComplete,
          showOnTimeline: item.showOnTimeline,
          timelineLabel: item.timelineLabel,
          requiresSecureResponse: item.requiresSecureResponse,
          securePrompt: item.securePrompt,
          secureFieldType: item.secureFieldType,
        }

        return (
          <div key={item.id} className={containerBaseClass}>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <StatusIcon
                  className={`h-5 w-5 ${
                    item.status === "COMPLETED"
                      ? "text-green-600"
                      : isOverdue
                      ? "text-red-600"
                      : "text-gray-400"
                  }`}
                />
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-medium">{item.title}</h4>
                    <Badge className={priorityColors[priorityValue] || ""}>
                      {item.priority || "MEDIUM"}
                    </Badge>
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {item.project && <span>{item.project.name}</span>}
                    {item.dueDate && (
                      <span
                        className={
                          isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
                        }
                      >
                        Due: {formatDate(item.dueDate)}
                      </span>
                    )}
                  </div>
                  {item.showOnTimeline && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
                      <CalendarDays className="h-3 w-3" />
                      Timeline{item.timelineLabel ? ` • ${item.timelineLabel}` : ""}
                    </div>
                  )}
                  {item.reviewRequired && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      Review pending
                      {item.reviewAssignee ? ` • ${item.reviewAssignee.name || item.reviewAssignee.email}` : ""}
                    </div>
                  )}
                  {variant === "kanban" && canEdit && (
                    <div className="flex flex-wrap gap-2">
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
                      <Button variant="outline" size="sm" onClick={() => setStatusDialogItem(item)}>
                        Update Status
                      </Button>
                      <EditActionItemDialog
                        action={editablePayload}
                        trigger={
                          <Button variant="ghost" size="icon" title="Edit action">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </div>
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
              {showDetailsToggle && (
                <div className="pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setExpandedRows((prev) => ({
                        ...prev,
                        [item.id]: !prev[item.id],
                      }))
                    }
                  >
                    {expandedRows[item.id] ? (
                      <ChevronUp className="mr-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="mr-1 h-4 w-4" />
                    )}
                    {expandedRows[item.id] ? "Hide details" : "View details"}
                  </Button>
                </div>
              )}
              {(expandedRows[item.id] || variant === "default") && (
                <div className="space-y-4">
                  {item.attachments && item.attachments.length > 0 && (
                    <div className="space-y-1">
                      {item.attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between text-xs">
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-primary hover:underline"
                          >
                            <Paperclip className="mr-1 h-3 w-3" />
                            {attachment.name}
                          </a>
                          {attachment.size && (
                            <span className="text-muted-foreground">
                              {(attachment.size / 1024).toFixed(1)} KB
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {item.requiresSecureResponse && (
                    <SecureResponseSection
                      actionId={item.id}
                      prompt={item.securePrompt}
                      fieldType={item.secureFieldType}
                      secureResponse={item.secureResponse}
                      currentUserRole={currentUserRole}
                      canClientSubmit={canClientSubmit}
                      retentionPolicy={item.secureRetentionPolicy}
                      expireAfterHours={item.secureExpireAfterHours}
                      viewedAt={item.secureViewedAt}
                    />
                  )}
                  {variant === "default" && <ActionHistoryList history={item.statusHistory || []} />}
                  {canEdit && variant === "default" && (
                    <UploadAttachmentDialog actionItemId={item.id} onUploaded={() => router.refresh()} />
                  )}
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
            {variant === "default" && (
              <div className="flex items-center gap-2 self-start">
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
                    <Button variant="outline" size="sm" onClick={() => setStatusDialogItem(item)}>
                      Update Status
                    </Button>
                    <EditActionItemDialog
                      action={editablePayload}
                      trigger={
                        <Button variant="ghost" size="icon" title="Edit action">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <AlertDialog
                      open={deleteTarget === item.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setDeleteTarget(null)
                        } else {
                          setDeleteTarget(item.id)
                        }
                      }}
                    >
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive" title="Delete action">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete action item?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove “{item.title}” and all of its attachments. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={handleDelete}
                            disabled={deleteLoading}
                          >
                            {deleteLoading ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
      <Dialog
        open={!!attachmentModal}
        onOpenChange={(open) => {
          if (!open) {
            setAttachmentModal(null)
            setAttachmentForm({ name: "", url: "" })
            setClientFile(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Attachment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="client-upload">Upload a file</Label>
              <Input
                id="client-upload"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setClientFile(file)
                  if (file) {
                    setAttachmentForm((prev) => ({ ...prev, name: file.name }))
                  }
                }}
              />
              {clientFile && (
                <p className="text-xs text-muted-foreground">{clientFile.name}</p>
              )}
            </div>
            <p className="text-center text-xs text-muted-foreground">or paste a link below</p>
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
      {statusDialogItem && (
        <StatusUpdateDialog
          action={statusDialogItem}
          teammates={teammates}
          currentUserRole={currentUserRole}
          onClose={() => setStatusDialogItem(null)}
          onUpdated={() => {
            setStatusDialogItem(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
