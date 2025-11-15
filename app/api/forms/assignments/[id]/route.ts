import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { FormAssignmentStatus, UserRole } from "@prisma/client"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { status } = body as { status?: FormAssignmentStatus }

    if (!status || !Object.values(FormAssignmentStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const updated = await db.formAssignment.update({
      where: { id: params.id },
      data: {
        status,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update assignment status", error)
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 })
  }
}

