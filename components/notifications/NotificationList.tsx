"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/utils"
import { CheckCircle2, X, Bell } from "lucide-react"
import Link from "next/link"

interface Notification {
  id: string
  type: string
  message: string
  read: boolean
  createdAt: Date
  actionItem: {
    id: string
    title: string
  } | null
}

interface NotificationListProps {
  notifications: Notification[]
}

const notificationTypeLabels: Record<string, string> = {
  ACTION_ITEM_ASSIGNED: "Assignment",
  ACTION_ITEM_DUE_SOON: "Due Soon",
  ACTION_ITEM_OVERDUE: "Overdue",
  ACTION_ITEM_COMPLETED: "Completed",
  PROJECT_UPDATED: "Project Update",
  CLIENT_ADDED: "New Client",
  REMINDER: "Reminder",
}

export function NotificationList({ notifications }: NotificationListProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState<string | null>(null)

  const handleMarkRead = async (id: string, read: boolean) => {
    setUpdating(id)
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read }),
      })

      if (!response.ok) {
        throw new Error("Failed to update notification")
      }

      router.refresh()
    } catch (error) {
      console.error("Error updating notification:", error)
    } finally {
      setUpdating(null)
    }
  }

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: unreadIds, read: true }),
      })

      if (!response.ok) {
        throw new Error("Failed to update notifications")
      }

      router.refresh()
    } catch (error) {
      console.error("Error updating notifications:", error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete notification")
      }

      router.refresh()
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No notifications yet</p>
      </div>
    )
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        </div>
      )}
      <div className="space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-start gap-4 p-4 border rounded-lg transition-colors ${
              notification.read
                ? "bg-white"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {notificationTypeLabels[notification.type] || notification.type}
                </Badge>
                {!notification.read && (
                  <div className="h-2 w-2 rounded-full bg-blue-600" />
                )}
              </div>
              <p className="text-sm font-medium">{notification.message}</p>
              {notification.actionItem && (
                <Link
                  href={`/dashboard/actions`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  View action item: {notification.actionItem.title}
                </Link>
              )}
              <p className="text-xs text-muted-foreground">
                {formatDateTime(notification.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMarkRead(notification.id, true)}
                  disabled={updating === notification.id}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(notification.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

