import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

/**
 * Accept invitation and create user account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, name, password } = body

    if (!token || !name || !password) {
      return NextResponse.json(
        { error: "Token, name, and password are required" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    // Validate invitation
    const invitation: any = await db.$queryRaw`
      SELECT ci.*, c.email, c.id as client_id
      FROM client_invitations ci
      JOIN clients c ON ci.client_id = c.id
      WHERE ci.token = ${token}
        AND ci.used = false
        AND ci.expires_at > NOW()
      LIMIT 1
    `

    if (!invitation || invitation.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 }
      )
    }

    const inv = invitation[0]

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: inv.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user account
    const user = await db.user.create({
      data: {
        email: inv.email,
        name: name.trim(),
        password: hashedPassword,
        role: UserRole.CLIENT,
        emailVerified: new Date(),
      },
    })

    // Mark invitation as used
    await db.$executeRaw`
      UPDATE client_invitations
      SET used = true
      WHERE token = ${token}
    `

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      userId: user.id,
    })
  } catch (error) {
    console.error("Error accepting invitation:", error)
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    )
  }
}

