import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { ActivityEntityType } from "@prisma/client"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const entityTypeParam = searchParams.get("entityType")
    const entityId = searchParams.get("entityId")
    const limit = Number(searchParams.get("limit") || 50)

    if (!entityTypeParam || !entityId) {
      return NextResponse.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      )
    }

    const normalizedType = entityTypeParam.toUpperCase() as ActivityEntityType

    if (!Object.values(ActivityEntityType).includes(normalizedType)) {
      return NextResponse.json({ error: "Invalid entityType" }, { status: 400 })
    }

    const logs = await db.activityLog.findMany({
      where: {
        entityType: normalizedType,
        entityId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: Math.min(Math.max(limit, 1), 200),
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error("Error fetching activity logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    )
  }
}

