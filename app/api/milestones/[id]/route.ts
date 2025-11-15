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

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, dueDate, completed } = body

    const existing = await db.milestone.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 })
    }

    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (completed !== undefined) {
      updateData.completedAt = completed ? new Date() : null
    }

    const milestone = await db.milestone.update({
      where: { id: params.id },
      data: updateData,
    })

    if (Object.keys(updateData).length > 0) {
      const changes = Object.keys(updateData).reduce<Record<string, { previous: unknown; current: unknown }>>(
        (acc, key) => {
          acc[key] = {
            previous: (existing as any)[key],
            current: (milestone as any)[key],
          }
          return acc
        },
        {}
      )

      await logActivity({
        entityType: ActivityEntityType.PROJECT,
        entityId: milestone.projectId,
        action: "milestone_updated",
        changes,
        metadata: { milestoneId: milestone.id, name: milestone.name },
        userId: session.user.id,
      })
    }

    return NextResponse.json(milestone)
  } catch (error) {
    console.error("Error updating milestone:", error)
    return NextResponse.json(
      { error: "Failed to update milestone" },
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

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const milestone = await db.milestone.delete({
      where: { id: params.id },
    })

    await logActivity({
      entityType: ActivityEntityType.PROJECT,
      entityId: milestone.projectId,
      action: "milestone_deleted",
      metadata: {
        milestoneId: milestone.id,
        name: milestone.name,
      },
      userId: session.user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting milestone:", error)
    return NextResponse.json(
      { error: "Failed to delete milestone" },
      { status: 500 }
    )
  }
}

