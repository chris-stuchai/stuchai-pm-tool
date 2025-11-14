import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")

    if (!clientId) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 })
    }

    const documents = await db.clientDocument.findMany({
      where: { clientId },
      include: {
        uploader: {
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
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error("Error fetching client documents:", error)
    return NextResponse.json(
      { error: "Failed to fetch documents" },
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

    const canUpload = session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER
    if (!canUpload) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { clientId, name, googleDriveId, url, mimeType, size, type } = body

    if (!clientId || !name) {
      return NextResponse.json(
        { error: "Client ID and name are required" },
        { status: 400 }
      )
    }

    const document = await db.clientDocument.create({
      data: {
        clientId,
        name,
        googleDriveId,
        url,
        mimeType,
        size,
        type,
        uploadedBy: session.user.id,
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error("Error creating client document:", error)
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    )
  }
}

