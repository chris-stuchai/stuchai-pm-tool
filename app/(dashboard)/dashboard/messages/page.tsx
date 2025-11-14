import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import { MessageSquare } from "lucide-react"
import { ClientMessages } from "@/components/clients/ClientMessages"

async function getClientConversations(userId: string) {
  // Get clients where user has assigned action items
  const clients = await db.client.findMany({
    where: {
      active: true,
      projects: {
        some: {
          actionItems: {
            some: {
              assignedTo: userId,
            },
          },
        },
      },
    },
    include: {
      messages: {
        take: 1,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  })

  return clients
}

export default async function MessagesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  // Only clients can access this page
  if (session.user.role !== UserRole.CLIENT) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 mt-1">This page is only available for clients.</p>
        </div>
      </div>
    )
  }

  const clients = await getClientConversations(session.user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600 mt-1">Communicate with your project team</p>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">No conversations yet</p>
            <p className="text-sm text-muted-foreground">
              Messages from your project team will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardHeader>
                <CardTitle>{client.name}</CardTitle>
                <CardDescription>
                  {client.messages.length > 0
                    ? `Last message: ${formatDate(client.messages[0].createdAt)}`
                    : "No messages yet"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ClientMessages clientId={client.id} currentUserId={session.user.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

