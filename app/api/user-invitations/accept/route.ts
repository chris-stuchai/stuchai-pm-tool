import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, name, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    const invitation = await db.userInvitation.findUnique({
      where: { token },
    })

    if (!invitation || invitation.used || invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 }
      )
    }

    const existingUser = await db.user.findUnique({
      where: { email: invitation.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const displayName = (name as string | undefined)?.trim() || invitation.name || invitation.email

    const user = await db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: invitation.email,
          name: displayName,
          password: hashedPassword,
          role: invitation.role,
          emailVerified: new Date(),
        },
      })

      await tx.userInvitation.update({
        where: { id: invitation.id },
        data: { used: true },
      })

      return createdUser
    })

    return NextResponse.json({
      success: true,
      userId: user.id,
    })
  } catch (error) {
    console.error("Error accepting user invitation:", error)
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    )
  }
}

