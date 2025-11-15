import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, ActivityEntityType, ProjectStatus } from "@prisma/client"
import { logActivity } from "@/lib/activity"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const project = await db.project.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        actionItems: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        documents: {
          orderBy: {
            createdAt: "desc",
          },
        },
        milestones: {
          orderBy: {
            dueDate: "asc",
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error fetching project:", error)
    return NextResponse.json(
      { error: "Failed to fetch project" },
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

    // Only ADMIN and MANAGER can update projects
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const existing = await db.project.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const body = await request.json()
    const { name, description, status, progress, dueDate, startDate, completedAt, completionSummary } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status
    if (progress !== undefined) updateData.progress = progress
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null
    if (completedAt !== undefined) updateData.completedAt = completedAt ? new Date(completedAt) : null
    if (completionSummary !== undefined) updateData.completionSummary = completionSummary

    if (
      status === ProjectStatus.COMPLETED &&
      existing.status !== ProjectStatus.COMPLETED &&
      !(completionSummary ?? existing.completionSummary)?.trim()
    ) {
      return NextResponse.json(
        { error: "Project completion summary is required when marking complete." },
        { status: 400 }
      )
    }

    const project = await db.project.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (Object.keys(updateData).length > 0) {
      const changes = Object.keys(updateData).reduce<Record<string, { previous: unknown; current: unknown }>>(
        (acc, key) => {
          acc[key] = {
            previous: (existing as any)[key],
            current: (project as any)[key],
          }
          return acc
        },
        {}
      )

      await logActivity({
        entityType: ActivityEntityType.PROJECT,
        entityId: project.id,
        action: "updated",
        changes,
        userId: session.user.id,
      })
    }

    if (status === ProjectStatus.COMPLETED && existing.status !== ProjectStatus.COMPLETED) {
      await logActivity({
        entityType: ActivityEntityType.PROJECT,
        entityId: project.id,
        action: "completed",
        metadata: {
          completionSummary: completionSummary ?? project.completionSummary,
        },
        userId: session.user.id,
      })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error updating project:", error)
    return NextResponse.json(
      { error: "Failed to update project" },
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

    // Only ADMIN can delete projects
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await db.project.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting project:", error)
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    )
  }
}

