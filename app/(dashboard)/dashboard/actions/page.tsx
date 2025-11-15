import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"
import { CreateActionItemDialog } from "@/components/actions/CreateActionItemDialog"
import { ActionItemsFilter } from "@/components/actions/ActionItemsFilter"

async function getActionItems(userId: string, userRole: UserRole, email?: string | null) {
  const where: any = {}

  if (userRole === UserRole.CLIENT) {
    const client = email
      ? await db.client.findFirst({
          where: { email: email.toLowerCase() },
          select: { id: true },
        })
      : null

    where.OR = [
      { assignedTo: userId },
      ...(client
        ? [
            {
              visibleToClient: true,
              project: {
                clientId: client.id,
              },
            },
          ]
        : []),
    ]
  }

  const actionItems = await db.actionItem.findMany({
    where,
    include: {
      project: {
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      mentions: {
        include: {
          mentionedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      attachments: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return actionItems
}

export default async function ActionItemsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const actionItems = await getActionItems(session.user.id, session.user.role, session.user.email)
  const canCreate = session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Action Items</h1>
          <p className="text-gray-600 mt-1">Track and manage your tasks</p>
        </div>
        {canCreate && <CreateActionItemDialog />}
      </div>

      <ActionItemsFilter
        initialItems={actionItems}
        canEdit={canCreate}
        currentUserRole={session.user.role}
        currentUserId={session.user.id}
      />
    </div>
  )
}

