import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { DeliverableStatus, UserRole } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const deliverable = await db.deliverable.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        project: true,
        uploader: true,
      },
    })

    if (!deliverable) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    if (session.user.role === UserRole.CLIENT) {
      const email = session.user.email?.toLowerCase()
      if (deliverable.client.email?.toLowerCase() !== email) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    return NextResponse.json(deliverable)
  } catch (error) {
    console.error("Error fetching deliverable:", error)
    return NextResponse.json({ error: "Failed to fetch deliverable" }, { status: 500 })
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

    if (session.user.role === UserRole.CLIENT) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, status, link } = body

    const deliverable = await db.deliverable.update({
      where: { id: params.id },
      data: {
        name,
        description,
        status: status as DeliverableStatus | undefined,
        link,
      },
    })

    return NextResponse.json(deliverable)
  } catch (error) {
    console.error("Error updating deliverable:", error)
    return NextResponse.json({ error: "Failed to update deliverable" }, { status: 500 })
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

    if (session.user.role === UserRole.CLIENT) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await db.deliverable.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting deliverable:", error)
    return NextResponse.json({ error: "Failed to delete deliverable" }, { status: 500 })
  }
}

