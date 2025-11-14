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
    })

    if (!actionItem) {
      return NextResponse.json({ error: "Action item not found" }, { status: 404 })
    }

    // CLIENT can only view their assigned items
    if (session.user.role === UserRole.CLIENT && actionItem.assignedTo !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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
    })

    if (!actionItem) {
      return NextResponse.json({ error: "Action item not found" }, { status: 404 })
    }

    // CLIENT can only update status of their assigned items
    const isAssignedToUser = actionItem.assignedTo === session.user.id
    const canEdit = session.user.role === UserRole.ADMIN || 
                   session.user.role === UserRole.MANAGER ||
                   (session.user.role === UserRole.CLIENT && isAssignedToUser)

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, status, priority, dueDate, assignedTo } = body

    const updateData: any = {}
    if (title !== undefined && (session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER)) {
      updateData.title = title
    }
    if (description !== undefined && (session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER)) {
      updateData.description = description
    }
    if (status !== undefined) {
      updateData.status = status
      if (status === ActionItemStatus.COMPLETED) {
        updateData.completedAt = new Date()
      } else {
        updateData.completedAt = null
      }
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

