"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle2, Circle, Clock, AlertCircle, Mail } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
}

interface ActionItemListProps {
  actionItems: ActionItem[]
  canEdit: boolean
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

export function ActionItemList({ actionItems, canEdit }: ActionItemListProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState<string | null>(null)
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)

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
            </div>
          </div>
        )
      })}
    </div>
  )
}
