import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { linkDriveFile } from "@/lib/google/drive"
import { UserRole } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get("projectId")

    const documents = await db.document.findMany({
      where: projectId ? { projectId } : undefined,
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error("Error fetching documents:", error)
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

    // Only ADMIN and MANAGER can link documents
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { fileId, fileName, projectId } = body

    if (!fileId || !fileName) {
      return NextResponse.json(
        { error: "fileId and fileName are required" },
        { status: 400 }
      )
    }

    const document = await linkDriveFile(
      session.user.id,
      projectId || null,
      fileId,
      fileName
    )

    return NextResponse.json(document, { status: 201 })
  } catch (error: any) {
    console.error("Error linking document:", error)
    return NextResponse.json(
      { error: error.message || "Failed to link document" },
      { status: 500 }
    )
  }
}

