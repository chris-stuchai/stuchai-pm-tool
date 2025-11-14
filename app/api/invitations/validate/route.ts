import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

/**
 * Validate invitation token
 */
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token is required" },
        { status: 400 }
      )
    }

    // Query invitation using Prisma
    const invitation = await db.clientInvitation.findUnique({
      where: { token },
      include: {
        client: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!invitation || invitation.used || invitation.expiresAt < new Date()) {
      return NextResponse.json({
        valid: false,
        error: "Invalid or expired invitation",
      })
    }

    return NextResponse.json({
      valid: true,
      client: {
        name: invitation.client.name,
        email: invitation.client.email,
      },
    })
  } catch (error) {
    console.error("Error validating invitation:", error)
    return NextResponse.json(
      { valid: false, error: "Failed to validate invitation" },
      { status: 500 }
    )
  }
}

