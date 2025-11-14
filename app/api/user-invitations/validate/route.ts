import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token is required" },
        { status: 400 }
      )
    }

    const invitation = await db.userInvitation.findUnique({
      where: { token },
    })

    if (!invitation || invitation.used || invitation.expiresAt < new Date()) {
      return NextResponse.json({
        valid: false,
        error: "Invalid or expired invitation",
      })
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
      },
    })
  } catch (error) {
    console.error("Error validating user invitation:", error)
    return NextResponse.json(
      { valid: false, error: "Failed to validate invitation" },
      { status: 500 }
    )
  }
}

