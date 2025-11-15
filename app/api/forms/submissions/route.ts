import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { FormAssignmentStatus, UserRole, Prisma } from "@prisma/client"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { assignmentId, responses } = body as {
      assignmentId?: string
      responses?: Record<string, unknown>
    }

    if (!assignmentId || !responses) {
      return NextResponse.json(
        { error: "assignmentId and responses are required" },
        { status: 400 }
      )
    }

    const assignment = await db.formAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        client: true,
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    if (session.user.role === UserRole.CLIENT) {
      const client = await db.client.findFirst({
        where: {
          id: assignment.clientId,
          email: session.user.email?.toLowerCase(),
        },
      })

      if (!client) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const submission = await db.formSubmission.create({
      data: {
        assignmentId,
        submittedBy: session.user.id,
        responses: responses as Prisma.InputJsonValue,
      },
    })

    const attachmentPayload: Array<{
      name: string
      url: string
      mimeType?: string
      size?: number
      fieldId?: string
    }> = []

    Object.entries(responses).forEach(([fieldId, value]) => {
      if (Array.isArray(value)) {
        value.forEach((file) => {
          if (file && typeof file === "object" && "url" in file) {
            attachmentPayload.push({
              fieldId,
              name: (file as any).name || "Attachment",
              url: (file as any).url,
              mimeType: (file as any).mimeType,
              size: (file as any).size,
            })
          }
        })
      }
    })

    if (attachmentPayload.length > 0) {
      await db.formSubmissionAttachment.createMany({
        data: attachmentPayload.map((file) => ({
          submissionId: submission.id,
          name: file.name,
          url: file.url,
          mimeType: file.mimeType,
          size: file.size,
          fieldId: file.fieldId,
        })),
      })
    }

    await db.formAssignment.update({
      where: { id: assignmentId },
      data: {
        status: FormAssignmentStatus.SUBMITTED,
      },
    })

    return NextResponse.json(submission, { status: 201 })
  } catch (error) {
    console.error("Error submitting form:", error)
    return NextResponse.json(
      { error: "Failed to submit form" },
      { status: 500 }
    )
  }
}

