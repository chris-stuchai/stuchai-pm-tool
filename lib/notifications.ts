import { UserRole } from "@prisma/client"
import { db } from "./db"
import { sendEmail } from "./google/gmail"

function getBaseUrl() {
  return process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000"
}

async function getNotificationSenderUserId() {
  const account = await db.account.findFirst({
    where: {
      provider: "google",
      user: {
        role: {
          in: [UserRole.ADMIN, UserRole.MANAGER],
        },
        active: true,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      userId: true,
    },
  })

  return account?.userId
}

export async function sendClientMessageAlert({
  messageId,
}: {
  messageId: string
}) {
  const message = await db.message.findUnique({
    where: { id: messageId },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!message) {
    return
  }

  const recipients = await db.user.findMany({
    where: {
      role: {
        in: [UserRole.ADMIN, UserRole.MANAGER],
      },
      active: true,
      notifyOnClientMessage: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  })

  if (recipients.length === 0) {
    return
  }

  const senderUserId = await getNotificationSenderUserId()
  if (!senderUserId) {
    console.warn("No Google-connected admin found to send notification emails.")
    return
  }

  const baseUrl = getBaseUrl()
  const link =
    message.projectId
      ? `${baseUrl}/dashboard/projects/${message.projectId}`
      : message.clientId
        ? `${baseUrl}/dashboard/clients/${message.clientId}`
        : `${baseUrl}/dashboard/messages`

  const subject = `New client message from ${message.client?.name || message.sender.name || "Client"}`
  const snippet = message.content.length > 200 ? `${message.content.slice(0, 197)}...` : message.content

  const body = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <div style="max-width: 520px;">
          <p style="margin: 0 0 8px 0;">You have a new message from <strong>${message.sender.name || message.sender.email}</strong>.</p>
          ${message.client?.name ? `<p style="margin: 0 0 8px 0;">Client: <strong>${message.client.name}</strong></p>` : ""}
          ${message.project?.name ? `<p style="margin: 0 0 8px 0;">Project: <strong>${message.project.name}</strong></p>` : ""}
          <blockquote style="margin: 12px 0; padding: 12px 16px; border-left: 4px solid #2563eb; background: #f8fafc;">
            ${snippet.replace(/\n/g, "<br/>")}
          </blockquote>
          <p style="margin: 16px 0;">
            <a href="${link}" style="background: #2563eb; color: #fff; padding: 10px 16px; border-radius: 6px; text-decoration: none;">
              Open conversation
            </a>
          </p>
          <p style="font-size: 12px; color: #6b7280;">This alert was sent because you enabled “Client message” notifications in StuchAi.</p>
        </div>
      </body>
    </html>
  `

  for (const recipient of recipients) {
    if (!recipient.email) continue

    try {
      await sendEmail(senderUserId, recipient.email, subject, body, true)
    } catch (error) {
      console.error(`Failed to send client message alert to ${recipient.email}:`, error)
    }
  }
}

