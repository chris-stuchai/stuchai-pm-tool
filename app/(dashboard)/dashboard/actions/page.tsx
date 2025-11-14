import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreateActionItemDialog } from "@/components/actions/CreateActionItemDialog"
import { ActionItemList } from "@/components/actions/ActionItemList"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ActionItemsFilter } from "@/components/actions/ActionItemsFilter"

async function getActionItems(userId: string, userRole: UserRole) {
  const where: any = {}
  
  // CLIENT can only see their assigned items
  if (userRole === UserRole.CLIENT) {
    where.assignedTo = userId
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

  const actionItems = await getActionItems(session.user.id, session.user.role)
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

      <ActionItemsFilter initialItems={actionItems} canEdit={canCreate} />
    </div>
  )
}

