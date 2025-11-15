import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { ActivityEntityType, UserRole } from "@prisma/client"
import { uploadToS3 } from "@/lib/storage"
import { logActivity } from "@/lib/activity"

export const runtime = "nodejs"

/** Determines whether the current user can upload an attachment to the action item. */
async function canUploadAttachment(actionItemId: string, userId: string, role: UserRole) {
  if (role === UserRole.ADMIN || role === UserRole.MANAGER) {
    return true
  }

  if (role === UserRole.CLIENT) {
    const actionItem = await db.actionItem.findUnique({
      where: { id: actionItemId },
      select: {
        assignedTo: true,
      },
    })

    return actionItem?.assignedTo === userId
  }

  return false
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canUpload = await canUploadAttachment(
      params.id,
      session.user.id,
      session.user.role
    )

    if (!canUpload) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const contentType = request.headers.get("content-type") || ""

    let attachmentData: {
      name: string
      url: string
      mimeType?: string
      size?: number
    } | null = null

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const file = formData.get("file")
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "File is required" }, { status: 400 })
      }
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")
      const key = `action-items/${params.id}/${Date.now()}-${safeName}`
      const url = await uploadToS3(buffer, key, file.type)
      attachmentData = {
        name: file.name,
        url,
        mimeType: file.type,
        size: file.size,
      }
    } else {
      const body = await request.json().catch(() => null)
      if (!body?.name || !body?.url) {
        return NextResponse.json(
          { error: "name and url are required" },
          { status: 400 }
        )
      }
      attachmentData = {
        name: body.name,
        url: body.url,
        mimeType: body.mimeType,
        size: body.size,
      }
    }

    if (!attachmentData) {
      return NextResponse.json(
        { error: "Invalid attachment payload" },
        { status: 400 }
      )
    }

    const attachment = await db.actionItemAttachment.create({
      data: {
        actionItemId: params.id,
        name: attachmentData.name,
        url: attachmentData.url,
        mimeType: attachmentData.mimeType,
        size: attachmentData.size,
        uploadedBy: session.user.id,
      },
    })

    await logActivity({
      entityType: ActivityEntityType.ACTION_ITEM,
      entityId: params.id,
      action: "attachment_added",
      metadata: {
        name: attachment.name,
        url: attachment.url,
      },
      userId: session.user.id,
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    console.error("Failed to add attachment", error)
    return NextResponse.json(
      { error: "Failed to add attachment" },
      { status: 500 }
    )
  }
}
