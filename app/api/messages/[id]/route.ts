import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { ActivityEntityType, UserRole } from "@prisma/client"
import { logActivity } from "@/lib/activity"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const content = body.content?.trim()

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    const existing = await db.message.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        senderId: true,
        clientId: true,
        projectId: true,
        content: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    const canEdit =
      existing.senderId === session.user.id ||
      session.user.role === UserRole.ADMIN ||
      session.user.role === UserRole.MANAGER

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const message = await db.message.update({
      where: { id: params.id },
      data: {
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
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
      },
    })

    await logActivity({
      entityType: ActivityEntityType.MESSAGE,
      entityId: message.id,
      action: "updated",
      changes: {
        content: {
          previous: existing.content,
          current: content,
        },
      },
      userId: session.user.id,
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error("Error updating message:", error)
    return NextResponse.json(
      { error: "Failed to update message" },
      { status: 500 }
    )
  }
}

