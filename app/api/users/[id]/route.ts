import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, email } = body as { name?: string; email?: string }

    if (!name && !email) {
      return NextResponse.json(
        { error: "Nothing to update" },
        { status: 400 }
      )
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      )
    }

    const user = await db.user.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined ? { name: name.trim() || null } : {}),
        ...(email !== undefined ? { email: email.toLowerCase() } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    return NextResponse.json(user)
  } catch (error: any) {
    console.error("Failed to update user", error)
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 400 }
      )
    }

    await db.user.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete user", error)
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }
}

