import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { sendActionItemReminder } from "@/lib/google/gmail"
import { UserRole } from "@prisma/client"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and MANAGER can send reminders
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { actionItemId } = body

    if (!actionItemId) {
      return NextResponse.json(
        { error: "actionItemId is required" },
        { status: 400 }
      )
    }

    const actionItem = await db.actionItem.findUnique({
      where: { id: actionItemId },
      include: {
        project: {
          include: {
            client: {
              select: {
                name: true,
              },
            },
          },
        },
        assignee: true,
      },
    })

    if (!actionItem) {
      return NextResponse.json(
        { error: "Action item not found" },
        { status: 404 }
      )
    }

    if (!actionItem.assignedTo || !actionItem.assignee) {
      return NextResponse.json(
        { error: "Action item has no assignee" },
        { status: 400 }
      )
    }

    // Send email reminder
    await sendActionItemReminder(
      session.user.id,
      {
        title: actionItem.title,
        description: actionItem.description,
        dueDate: actionItem.dueDate,
        priority: actionItem.priority,
        project: actionItem.project
          ? {
              name: actionItem.project.name,
              client: { name: actionItem.project.client.name },
            }
          : null,
      },
      actionItem.assignee.email
    )

    // Create notification
    await db.notification.create({
      data: {
        type: "REMINDER",
        message: `Reminder sent for: ${actionItem.title}`,
        userId: actionItem.assignedTo,
        actionItemId: actionItem.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error sending reminder:", error)
    
    // Check if it's a Gmail permission error
    if (error?.code === 403 || error?.message?.includes("Insufficient Permission") || error?.message?.includes("insufficient_scope")) {
      return NextResponse.json(
        { error: "Gmail permission required. Please reconnect your Google account with Gmail access." },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to send reminder. Please ensure Gmail is connected." },
      { status: 500 }
    )
  }
}

