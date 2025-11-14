import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, ActionItemStatus, Priority } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get("projectId")
    const assignedTo = searchParams.get("assignedTo")
    const status = searchParams.get("status")

    const where: any = {}
    if (projectId) {
      where.projectId = projectId
    } else if (projectId === null) {
      // Global action items (no project)
      where.projectId = null
    }
    if (assignedTo) {
      where.assignedTo = assignedTo
    }
    if (status) {
      where.status = status
    }

    // If user is CLIENT, only show their assigned items
    if (session.user.role === UserRole.CLIENT) {
      where.assignedTo = session.user.id
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

    return NextResponse.json(actionItems)
  } catch (error) {
    console.error("Error fetching action items:", error)
    return NextResponse.json(
      { error: "Failed to fetch action items" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and MANAGER can create action items
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, projectId, assignedTo, dueDate, priority } = body

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    const actionItem = await db.actionItem.create({
      data: {
        title,
        description,
        projectId: projectId || null,
        assignedTo: assignedTo || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || Priority.MEDIUM,
        createdBy: session.user.id,
      },
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

    // Create notification for assignee if assigned
    if (assignedTo && assignedTo !== session.user.id) {
      await db.notification.create({
        data: {
          type: "ACTION_ITEM_ASSIGNED",
          message: `You have been assigned: ${title}`,
          userId: assignedTo,
          actionItemId: actionItem.id,
        },
      })
    }

    return NextResponse.json(actionItem, { status: 201 })
  } catch (error) {
    console.error("Error creating action item:", error)
    return NextResponse.json(
      { error: "Failed to create action item" },
      { status: 500 }
    )
  }
}

