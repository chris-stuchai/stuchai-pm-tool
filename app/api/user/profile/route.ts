import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

/**
 * Update user profile information or notification preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, notifyOnClientMessage } = body

    const data: Record<string, unknown> = {}

    if (name !== undefined) {
      if (!name || name.trim() === "") {
        return NextResponse.json(
          { error: "Name is required" },
          { status: 400 }
        )
      }
      data.name = name.trim()
    }

    if (notifyOnClientMessage !== undefined) {
      data.notifyOnClientMessage = !!notifyOnClientMessage
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 }
      )
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        notifyOnClientMessage: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}

