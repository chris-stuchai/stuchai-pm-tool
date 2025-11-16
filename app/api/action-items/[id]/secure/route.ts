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

const prisma = db as any

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const response = await prisma.actionSecureResponse.findUnique({
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
            secureRetentionPolicy: true,
            secureExpireAfterHours: true,
            secureViewedAt: true,
          },
        },
      },
    })

    if (!response) {
      return NextResponse.json({ error: "No secure response" }, { status: 404 })
    }

    const now = Date.now()
    const expiresAt =
      response.actionItem.secureRetentionPolicy === "EXPIRE_AFTER_HOURS" &&
      response.actionItem.secureExpireAfterHours
        ? new Date(response.createdAt).getTime() + response.actionItem.secureExpireAfterHours * 60 * 60 * 1000
        : null

    if (response.actionItem.secureRetentionPolicy === "EXPIRE_AFTER_VIEW" && response.actionItem.secureViewedAt) {
      return NextResponse.json({ error: "Secure response already viewed and purged." }, { status: 404 })
    }

    if (expiresAt && now > expiresAt) {
      await prisma.actionSecureResponse.delete({
        where: { actionItemId: params.id },
      })
      return NextResponse.json({ error: "Secure response expired." }, { status: 404 })
    }

    const value = decryptSecret(response.encryptedData)

    if (response.actionItem.secureRetentionPolicy === "EXPIRE_AFTER_VIEW") {
      await prisma.$transaction([
        prisma.actionSecureResponse.delete({
          where: { actionItemId: params.id },
        }),
        prisma.actionItem.update({
          where: { id: params.id },
          data: { secureViewedAt: new Date() },
        }),
      ])
    } else {
      await prisma.actionItem.update({
        where: { id: params.id },
        data: { secureViewedAt: new Date() },
      })
    }

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

    const actionItem = await prisma.actionItem.findUnique({
      where: { id: params.id },
      include: {
        project: {
          select: {
            client: {
              select: {
                email: true,
              },
            },
          },
        },
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
    let value = ""

    if (typeof body.value === "string") {
      value = body.value.trim()
    } else if (typeof body.password === "string" || typeof body.username === "string") {
      const username = typeof body.username === "string" ? body.username.trim() : ""
      const password = typeof body.password === "string" ? body.password.trim() : ""
      if (!password) {
        return NextResponse.json({ error: "Password is required." }, { status: 400 })
      }
      value = JSON.stringify({ username, password })
    }

    if (!value) {
      return NextResponse.json({ error: "Value is required." }, { status: 400 })
    }

    const encryptedData = encryptSecret(value)

      await prisma.$transaction([
        prisma.actionSecureResponse.upsert({
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
      }),
      prisma.actionItem.update({
        where: { id: params.id },
        data: { secureViewedAt: null },
      }),
    ])

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

