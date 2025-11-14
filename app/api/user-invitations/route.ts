import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"
import crypto from "crypto"

export const dynamic = "force-dynamic"

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER]

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const email = (body.email as string | undefined)?.trim().toLowerCase()
    const name = (body.name as string | undefined)?.trim() || null
    const requestedRole = body.role as UserRole | undefined

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const role = requestedRole && ALLOWED_ROLES.includes(requestedRole)
      ? requestedRole
      : UserRole.MANAGER

    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      )
    }

    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await db.userInvitation.upsert({
      where: { email },
      create: {
        email,
        name,
        role,
        token,
        expiresAt,
        createdBy: session.user.id,
      },
      update: {
        name,
        role,
        token,
        expiresAt,
        used: false,
        createdBy: session.user.id,
        createdAt: new Date(),
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const invitationUrl = `${baseUrl}/auth/accept-user-invitation?token=${token}`

    return NextResponse.json({
      success: true,
      invitationUrl,
    })
  } catch (error) {
    console.error("Error creating user invitation:", error)
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    )
  }
}

