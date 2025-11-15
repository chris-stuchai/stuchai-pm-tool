import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

/**
 * Accept invitation and create user account
 */
export const dynamic = 'force-dynamic'

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

    // Validate invitation using Prisma
    const invitation = await db.clientInvitation.findUnique({
      where: { token },
      include: {
        client: {
          select: {
            email: true,
          },
        },
      },
    })

    if (!invitation || invitation.used || invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const normalizedEmail = invitation.client.email.toLowerCase()

    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user account and mark invitation as used in a transaction
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: name.trim(),
          password: hashedPassword,
          role: UserRole.CLIENT,
          emailVerified: new Date(),
        },
      })

      await tx.clientInvitation.update({
        where: { id: invitation.id },
        data: { used: true },
      })

      return user
    })

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      userId: result.id,
    })
  } catch (error) {
    console.error("Error accepting invitation:", error)
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    )
  }
}

