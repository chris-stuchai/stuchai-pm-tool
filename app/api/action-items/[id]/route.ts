import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, ActionItemStatus, Priority } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const actionItem = await db.actionItem.findUnique({
      where: { id: params.id },
      include: {
        project: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
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
        attachments: true,
      },
    })

    if (!actionItem) {
      return NextResponse.json({ error: "Action item not found" }, { status: 404 })
    }

    if (session.user.role === UserRole.CLIENT) {
      const clientEmail = session.user.email?.toLowerCase()
      const isOwner =
        clientEmail && actionItem.project?.client?.email?.toLowerCase() === clientEmail
      const canView =
        actionItem.assignedTo === session.user.id || (actionItem.visibleToClient && isOwner)
      if (!canView) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    return NextResponse.json(actionItem)
  } catch (error) {
    console.error("Error fetching action item:", error)
    return NextResponse.json(
      { error: "Failed to fetch action item" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const actionItem = await db.actionItem.findUnique({
      where: { id: params.id },
      include: {
        project: {
          include: {
            client: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!actionItem) {
      return NextResponse.json({ error: "Action item not found" }, { status: 404 })
    }

    const isAssignedToUser = actionItem.assignedTo === session.user.id
    const clientEmail = session.user.email?.toLowerCase()
    const isClientOwner =
      clientEmail && actionItem.project?.client?.email?.toLowerCase() === clientEmail
    const canClientEdit =
      session.user.role === UserRole.CLIENT &&
      (isAssignedToUser || (actionItem.visibleToClient && actionItem.clientCanComplete && isClientOwner))
    const canEdit =
      session.user.role === UserRole.ADMIN ||
      session.user.role === UserRole.MANAGER ||
      canClientEdit

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, status, priority, dueDate, assignedTo, visibleToClient, clientCanComplete } = body

    const updateData: any = {}
    if (title !== undefined && (session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER)) {
      updateData.title = title
    }
    if (description !== undefined && (session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER)) {
      updateData.description = description
    }
    if (status !== undefined && session.user.role !== UserRole.CLIENT) {
      updateData.status = status
      if (status === ActionItemStatus.COMPLETED) {
        updateData.completedAt = new Date()
      } else {
        updateData.completedAt = null
      }
    }
    if (session.user.role === UserRole.CLIENT && status === ActionItemStatus.COMPLETED && canClientEdit) {
      updateData.status = ActionItemStatus.COMPLETED
      updateData.completedAt = new Date()
    }
    if (priority !== undefined && (session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER)) {
      updateData.priority = priority
    }
    if (dueDate !== undefined && (session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER)) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null
    }
    if (assignedTo !== undefined && (session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER)) {
      const oldAssignee = actionItem.assignedTo
      updateData.assignedTo = assignedTo || null
      
      // Create notification for new assignee
      if (assignedTo && assignedTo !== session.user.id) {
        await db.notification.create({
          data: {
            type: "ACTION_ITEM_ASSIGNED",
            message: `You have been assigned: ${actionItem.title}`,
            userId: assignedTo,
            actionItemId: actionItem.id,
          },
        })
      }
    }
    if (visibleToClient !== undefined && (session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER)) {
      updateData.visibleToClient = !!visibleToClient
    }
    if (clientCanComplete !== undefined && (session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER)) {
      updateData.clientCanComplete = !!clientCanComplete
      if (!clientCanComplete) {
        updateData.clientCompleted = false
        updateData.clientCompletedAt = null
      }
    }

    const updated = await db.actionItem.update({
      where: { id: params.id },
      data: updateData,
      include: {
        project: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
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
        attachments: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating action item:", error)
    return NextResponse.json(
      { error: "Failed to update action item" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and MANAGER can delete action items
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await db.actionItem.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting action item:", error)
    return NextResponse.json(
      { error: "Failed to delete action item" },
      { status: 500 }
    )
  }
}

