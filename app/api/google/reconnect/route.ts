import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Remove stored Google accounts so the user must grant fresh permissions
    await db.account.deleteMany({
      where: {
        userId: session.user.id,
        provider: "google",
      },
    })

    await db.user.update({
      where: { id: session.user.id },
      data: {
        googleId: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error resetting Google connection:", error)
    return NextResponse.json(
      { error: "Failed to reset Google connection" },
      { status: 500 }
    )
  }
}

