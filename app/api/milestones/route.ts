import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, ActivityEntityType } from "@prisma/client"
import { logActivity } from "@/lib/activity"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { projectId, name, description, dueDate, completed } = body

    if (!projectId || !name) {
      return NextResponse.json(
        { error: "projectId and name are required" },
        { status: 400 }
      )
    }

    const milestone = await db.milestone.create({
      data: {
        projectId,
        name,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        completedAt: completed ? new Date() : null,
      },
    })

    await logActivity({
      entityType: ActivityEntityType.PROJECT,
      entityId: projectId,
      action: "milestone_created",
      metadata: {
        milestoneId: milestone.id,
        name: milestone.name,
      },
      userId: session.user.id,
    })

    return NextResponse.json(milestone, { status: 201 })
  } catch (error) {
    console.error("Error creating milestone:", error)
    return NextResponse.json(
      { error: "Failed to create milestone" },
      { status: 500 }
    )
  }
}

