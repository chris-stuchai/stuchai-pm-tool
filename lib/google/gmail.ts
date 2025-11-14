import { google } from "googleapis"
import { db } from "@/lib/db"

/**
 * Get Gmail API client for a user
 */
export async function getGmailClient(userId: string) {
  const account = await db.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
  })

  if (!account?.access_token) {
    throw new Error("No Google access token found for user")
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  )

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  })

  // Refresh token if needed
  if (account.expires_at && account.expires_at * 1000 < Date.now()) {
    if (!account.refresh_token) {
      throw new Error("No refresh token is set. Please reconnect your Google account in Settings to enable Gmail access.")
    }
    
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      
      await db.account.update({
        where: { id: account.id },
        data: {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || account.refresh_token,
          expires_at: credentials.expiry_date ? Math.floor(credentials.expiry_date / 1000) : null,
        },
      })

      oauth2Client.setCredentials(credentials)
    } catch (refreshError: any) {
      // If refresh fails, provide helpful error message
      if (refreshError?.message?.includes("refresh_token") || refreshError?.message?.includes("invalid_grant")) {
        throw new Error("Google account connection expired. Please reconnect your Google account in Settings to enable Gmail access.")
      }
      throw refreshError
    }
  }

  return google.gmail({ version: "v1", auth: oauth2Client })
}

/**
 * Send an email via Gmail API
 */
export async function sendEmail(
  userId: string,
  to: string,
  subject: string,
  body: string,
  isHtml: boolean = false
) {
  try {
    const gmail = await getGmailClient(userId)

    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: ${isHtml ? "text/html" : "text/plain"}; charset=utf-8`,
      "",
      body,
    ].join("\n")

    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    })

    return response.data
  } catch (error: any) {
    // Only log unexpected errors, not user-actionable ones
    if (!error?.message?.includes("reconnect") && !error?.message?.includes("refresh token")) {
      console.error("Error sending email:", error)
    }
    throw error
  }
}

/**
 * Send action item reminder email
 */
export async function sendActionItemReminder(
  userId: string,
  actionItem: {
    title: string
    description: string | null
    dueDate: Date | null
    priority: string
    project: { name: string; client: { name: string } } | null
  },
  assigneeEmail: string
) {
  const subject = `Reminder: ${actionItem.title}`
  const dueDateText = actionItem.dueDate
    ? new Date(actionItem.dueDate).toLocaleDateString()
    : "No due date"
  
  const projectText = actionItem.project
    ? `Project: ${actionItem.project.name} (${actionItem.project.client.name})`
    : "Global Action Item"

  const body = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Action Item Reminder</h2>
        <p><strong>${actionItem.title}</strong></p>
        ${actionItem.description ? `<p>${actionItem.description}</p>` : ""}
        <ul>
          <li>Priority: ${actionItem.priority}</li>
          <li>Due Date: ${dueDateText}</li>
          <li>${projectText}</li>
        </ul>
        <p>Please review and update the status of this action item.</p>
        <p style="color: #666; font-size: 0.9em;">This is an automated reminder from Stuchai PM Tool.</p>
      </body>
    </html>
  `

  return sendEmail(userId, assigneeEmail, subject, body, true)
}

