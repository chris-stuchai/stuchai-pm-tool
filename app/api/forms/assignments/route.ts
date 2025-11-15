import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, FormAssignmentStatus } from "@prisma/client"

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
    const { templateId, clientId, projectId } = body

    if (!templateId || !clientId) {
      return NextResponse.json(
        { error: "templateId and clientId are required" },
        { status: 400 }
      )
    }

    const assignment = await db.formAssignment.create({
      data: {
        templateId,
        clientId,
        projectId: projectId || null,
        assignedBy: session.user.id,
        status: FormAssignmentStatus.PENDING,
      },
      include: {
        template: {
          include: {
            fields: {
              orderBy: { order: "asc" },
            },
          },
        },
        client: true,
        project: true,
      },
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error("Error assigning form:", error)
    return NextResponse.json(
      { error: "Failed to assign form" },
      { status: 500 }
    )
  }
}

