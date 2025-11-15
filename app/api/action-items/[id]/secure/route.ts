import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"
import { encryptSecret, decryptSecret } from "@/lib/crypto"
import { logActivity } from "@/lib/activity"

interface RouteParams {
  params: { id: string }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const response = await db.actionSecureResponse.findUnique({
      where: { actionItemId: params.id },
      include: {
        submitter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        actionItem: {
          select: {
            securePrompt: true,
          },
        },
      },
    })

    if (!response) {
      return NextResponse.json({ error: "No secure response" }, { status: 404 })
    }

    const value = decryptSecret(response.encryptedData)

    return NextResponse.json({
      prompt: response.actionItem.securePrompt,
      value,
      submittedAt: response.updatedAt,
      submitter: response.submitter,
    })
  } catch (error) {
    console.error("Secure response fetch failed:", error)
    return NextResponse.json({ error: "Failed to load secure response" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const actionItem = await db.actionItem.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        requiresSecureResponse: true,
        securePrompt: true,
        visibleToClient: true,
        clientCanComplete: true,
        project: {
          select: {
            client: {
              select: {
                email: true,
              },
            },
          },
        },
        assignedTo: true,
      },
    })

    if (!actionItem || !actionItem.requiresSecureResponse) {
      return NextResponse.json({ error: "Secure response not enabled for this action." }, { status: 400 })
    }

    // Only allow clients tied to the project or the assigned user to submit.
    const clientEmail = actionItem.project?.client?.email?.toLowerCase()
    const sessionEmail = session.user.email?.toLowerCase()
    const isClientOwner = session.user.role === UserRole.CLIENT && clientEmail && clientEmail === sessionEmail
    const isAssignee = actionItem.assignedTo === session.user.id

    if (!isClientOwner && session.user.role === UserRole.CLIENT && !isAssignee) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const value = typeof body.value === "string" ? body.value.trim() : ""

    if (!value) {
      return NextResponse.json({ error: "Value is required." }, { status: 400 })
    }

    const encryptedData = encryptSecret(value)

    await db.actionSecureResponse.upsert({
      where: { actionItemId: params.id },
      create: {
        actionItemId: params.id,
        encryptedData,
        submittedBy: session.user.id,
      },
      update: {
        encryptedData,
        submittedBy: session.user.id,
      },
    })

    await logActivity({
      entityType: "ACTION_ITEM",
      entityId: params.id,
      action: "secure_response_submitted",
      userId: session.user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Secure response submit failed:", error)
    return NextResponse.json({ error: "Failed to submit response" }, { status: 500 })
  }
}

