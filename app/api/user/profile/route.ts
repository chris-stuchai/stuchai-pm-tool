import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

/**
 * Update user profile information
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { name: name.trim() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
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

