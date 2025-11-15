import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

const ONLINE_WINDOW_MS = 2 * 60 * 1000

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teammates = await db.user.findMany({
      where: {
        active: true,
        role: {
          in: [UserRole.ADMIN, UserRole.MANAGER],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        lastSeenAt: true,
      },
      orderBy: {
        name: "asc",
      },
    })

    const now = Date.now()
    const data = teammates.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      lastSeenAt: user.lastSeenAt,
      isOnline: !!user.lastSeenAt && now - user.lastSeenAt.getTime() <= ONLINE_WINDOW_MS,
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error("Presence fetch error:", error)
    return NextResponse.json({ error: "Failed to load presence" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { lastSeenAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Presence heartbeat error:", error)
    return NextResponse.json({ error: "Failed to record presence" }, { status: 500 })
  }
}

