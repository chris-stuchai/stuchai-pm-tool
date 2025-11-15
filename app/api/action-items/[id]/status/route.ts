import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, ActionItemStatus, NotificationType } from "@prisma/client"
import { logActivity } from "@/lib/activity"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      newStatus,
      summary,
      outcomeTag,
      notifyUserIds = [],
      reviewRequired,
      reviewAssigneeId,
      followUp,
    } = body

    if (!newStatus) {
      return NextResponse.json({ error: "New status is required." }, { status: 400 })
    }

    if (!summary || typeof summary !== "string" || !summary.trim()) {
      return NextResponse.json({ error: "Summary is required." }, { status: 400 })
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
      return NextResponse.json({ error: "Action item not found." }, { status: 404 })
    }

    const isAdmin = session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER
    const isClient = session.user.role === UserRole.CLIENT
    const isAssignedToUser = actionItem.assignedTo === session.user.id
    const clientEmail = session.user.email?.toLowerCase()
    const isClientOwner =
      isClient && clientEmail && actionItem.project?.client?.email?.toLowerCase() === clientEmail

    if (!isAdmin && !(isClient && (isAssignedToUser || isClientOwner))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const statusEnum = ActionItemStatus[newStatus as keyof typeof ActionItemStatus]
    if (!statusEnum) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 })
    }

    const notifyIds = Array.isArray(notifyUserIds)
      ? notifyUserIds.filter((id: unknown): id is string => typeof id === "string")
      : []

    const followUpAssigneeId =
      followUp && typeof followUp.assigneeId === "string" ? followUp.assigneeId : undefined
    const followUpNotes = followUp?.notes

    const history = await db.$transaction(async (tx) => {
      const updated = await tx.actionItem.update({
        where: { id: params.id },
        data: {
          status: statusEnum,
          completedAt: statusEnum === ActionItemStatus.COMPLETED ? new Date() : null,
          reviewRequired: Boolean(reviewRequired),
          reviewAssigneeId: reviewRequired ? reviewAssigneeId || null : null,
        },
      })

      const followUpAction = followUpAssigneeId
        ? await tx.actionItem.create({
            data: {
              title: `Follow up: ${updated.title}`,
              description:
                followUpNotes ||
                `Please review the status update for "${updated.title}" and handle next steps.`,
              priority: updated.priority,
              projectId: updated.projectId,
              assignedTo: followUpAssigneeId,
              createdBy: session.user.id,
              visibleToClient: false,
            },
          })
        : null

      const historyEntry = await tx.actionStatusHistory.create({
        data: {
          actionItemId: params.id,
          previousStatus: actionItem.status,
          newStatus: statusEnum,
          summary: summary.trim(),
          outcomeTag: outcomeTag || null,
          notifiedUserIds: notifyIds,
          followUpActionId: followUpAction?.id ?? null,
          createdBy: session.user.id,
        },
      })

      return { updated, historyEntry, followUpAction }
    })

    if (notifyIds.length > 0) {
      await db.notification.createMany({
        data: notifyIds.map((userId: string) => ({
          type: "ACTION_ITEM_STATUS" as NotificationType,
          message: `${session.user.name || session.user.email} updated ${actionItem.title}`,
          userId,
          actionItemId: actionItem.id,
        })),
      })
    }

    if (history.followUpAction) {
      await db.notification.create({
        data: {
          type: "ACTION_ITEM_FOLLOW_UP" as NotificationType,
          message: `New follow-up task created from ${actionItem.title}`,
          userId: history.followUpAction.assignedTo!,
          actionItemId: history.followUpAction.id,
        },
      })
    }

    await logActivity({
      entityType: "ACTION_ITEM",
      entityId: actionItem.id,
      action: "status_updated",
      userId: session.user.id,
      metadata: {
        newStatus,
        summary: summary.trim(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Status update failed:", error)
    return NextResponse.json({ error: "Failed to update status." }, { status: 500 })
  }
}

