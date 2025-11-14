import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

/**
 * Validate invitation token
 */
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

    // Query invitation
    const invitation: any = await db.$queryRaw`
      SELECT ci.*, c.name, c.email
      FROM client_invitations ci
      JOIN clients c ON ci.client_id = c.id
      WHERE ci.token = ${token}
        AND ci.used = false
        AND ci.expires_at > NOW()
      LIMIT 1
    `

    if (!invitation || invitation.length === 0) {
      return NextResponse.json({
        valid: false,
        error: "Invalid or expired invitation",
      })
    }

    const inv = invitation[0]

    return NextResponse.json({
      valid: true,
      client: {
        name: inv.name,
        email: inv.email,
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

