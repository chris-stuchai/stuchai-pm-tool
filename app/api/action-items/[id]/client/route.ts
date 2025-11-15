import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== UserRole.CLIENT) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const actionItem = await db.actionItem.findUnique({
      where: { id: params.id },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
    })

    if (!actionItem) {
      return NextResponse.json({ error: "Action item not found" }, { status: 404 })
    }

    const clientEmail = session.user.email?.toLowerCase()
    const isClientOwner =
      clientEmail && actionItem.project?.client?.email?.toLowerCase() === clientEmail

    if (!actionItem.visibleToClient || !(actionItem.clientCanComplete || actionItem.assignedTo === session.user.id) || (!isClientOwner && actionItem.assignedTo !== session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { completed, notes, attachment } = body

    const updated = await db.actionItem.update({
      where: { id: params.id },
      data: {
        clientCompleted: completed,
        clientCompletedAt: completed ? new Date() : null,
        clientNotes: notes ?? actionItem.clientNotes,
      },
    })

    if (attachment?.name && attachment?.url) {
      await db.actionItemAttachment.create({
        data: {
          actionItemId: params.id,
          name: attachment.name,
          url: attachment.url,
          uploadedBy: session.user.id,
        },
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating client action item:", error)
    return NextResponse.json(
      { error: "Failed to update action item" },
      { status: 500 }
    )
  }
}

