import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { DeliverableStatus, UserRole } from "@prisma/client"

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

    if (session.user.role === UserRole.CLIENT) {
      const email = session.user.email?.toLowerCase()
      if (!email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      where.client = { email }
    }

    const deliverables = await db.deliverable.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        uploader: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    return NextResponse.json(deliverables)
  } catch (error) {
    console.error("Error fetching deliverables:", error)
    return NextResponse.json(
      { error: "Failed to fetch deliverables" },
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

    if (session.user.role === UserRole.CLIENT) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, status, link, clientId, projectId } = body

    if (!name || !clientId) {
      return NextResponse.json(
        { error: "Name and clientId are required" },
        { status: 400 }
      )
    }

    const deliverable = await db.deliverable.create({
      data: {
        name,
        description,
        status: status || DeliverableStatus.IN_PROGRESS,
        link,
        clientId,
        projectId: projectId || null,
        uploadedBy: session.user.id,
      },
    })

    return NextResponse.json(deliverable, { status: 201 })
  } catch (error) {
    console.error("Error creating deliverable:", error)
    return NextResponse.json(
      { error: "Failed to create deliverable" },
      { status: 500 }
    )
  }
}

