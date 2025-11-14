import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NotificationList } from "@/components/notifications/NotificationList"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

async function getNotifications(userId: string) {
  const notifications = await db.notification.findMany({
    where: { userId },
    include: {
      actionItem: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return notifications
}

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const notifications = await getNotifications(session.user.id)
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Notifications</CardTitle>
          <CardDescription>
            Stay updated on your projects and action items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationList notifications={notifications} />
        </CardContent>
      </Card>
    </div>
  )
}

