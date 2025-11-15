import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, ActivityEntityType } from "@prisma/client"
import { logActivity } from "@/lib/activity"
import { sendClientMessageAlert } from "@/lib/notifications"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const projectId = searchParams.get("projectId")

    const where: any = {}
    if (clientId) where.clientId = clientId
    if (projectId) where.projectId = projectId

    // Users can see messages they sent or received, or all messages if admin/manager
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER) {
      where.OR = [
        { senderId: session.user.id },
        { recipientId: session.user.id },
      ]
    }

    const messages = await db.message.findMany({
      where,
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
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json(
      { error: "Failed to fetch messages" },
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

    const body = await request.json()
    const { content, clientId, projectId, recipientId, mentions } = body

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      )
    }

    let finalRecipientId = recipientId || null

    if (!finalRecipientId && clientId) {
      const client = await db.client.findUnique({
        where: { id: clientId },
        select: {
          email: true,
          createdBy: true,
        },
      })

      if (client) {
        if (session.user.role === UserRole.CLIENT) {
          finalRecipientId = client.createdBy
        } else if (client.email) {
          const clientUser = await db.user.findFirst({
            where: {
              email: client.email.toLowerCase(),
              active: true,
            },
            select: { id: true },
          })
          finalRecipientId = clientUser?.id || null
        }
      }
    }

    const message = await db.message.create({
      data: {
        content,
        clientId,
        projectId,
        recipientId: finalRecipientId,
        senderId: session.user.id,
        mentions: mentions
          ? {
              create: mentions.map((userId: string) => ({
                mentionedUserId: userId,
              })),
            }
          : undefined,
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

    // Create notifications for mentioned users
    if (mentions && mentions.length > 0) {
      await db.notification.createMany({
        data: mentions.map((userId: string) => ({
          type: "MENTIONED",
          message: `${session.user.name || session.user.email} mentioned you in a message`,
          userId,
        })),
      })
    }

    await logActivity({
      entityType: ActivityEntityType.MESSAGE,
      entityId: message.id,
      action: "created",
      metadata: {
        clientId,
        projectId,
        preview: content.slice(0, 140),
      },
      userId: session.user.id,
    })

    if (session.user.role === UserRole.CLIENT) {
      await sendClientMessageAlert({ messageId: message.id })
    }

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error("Error creating message:", error)
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    )
  }
}

