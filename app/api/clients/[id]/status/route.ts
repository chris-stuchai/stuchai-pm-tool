import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

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
    const { active } = body

    if (typeof active !== "boolean") {
      return NextResponse.json({ error: "active flag is required" }, { status: 400 })
    }

    const client = await db.client.update({
      where: { id: params.id },
      data: { active },
      select: {
        id: true,
        active: true,
      },
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error("Error updating client status:", error)
    return NextResponse.json(
      { error: "Failed to update client status" },
      { status: 500 }
    )
  }
}

