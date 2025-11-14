import { google } from "googleapis"
import { db } from "@/lib/db"

/**
 * Get Google Calendar API client for a user
 */
export async function getCalendarClient(userId: string) {
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
      throw new Error("No refresh token is set. Please reconnect your Google account in Settings to enable Calendar access.")
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
        throw new Error("Google account connection expired. Please reconnect your Google account in Settings to enable Calendar access.")
      }
      throw refreshError
    }
  }

  return google.calendar({ version: "v3", auth: oauth2Client })
}

/**
 * Create a calendar event
 */
export async function createCalendarEvent(
  userId: string,
  event: {
    title: string
    description?: string
    startTime: Date
    endTime: Date
    location?: string
    attendees?: string[] // Email addresses
  }
) {
  try {
    const calendar = await getCalendarClient(userId)

    const calendarEvent = {
      summary: event.title,
      description: event.description || "",
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: "UTC",
      },
      location: event.location,
      attendees: event.attendees?.map((email) => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 }, // 1 day before
          { method: "popup", minutes: 15 }, // 15 minutes before
        ],
      },
    }

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: calendarEvent,
      sendUpdates: "all", // Send invites to attendees
    })

    return response.data
  } catch (error: any) {
    // Only log unexpected errors, not user-actionable ones
    if (!error?.message?.includes("reconnect") && !error?.message?.includes("refresh token")) {
      console.error("Error creating calendar event:", error)
    }
    throw error
  }
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  event: {
    title?: string
    description?: string
    startTime?: Date
    endTime?: Date
    location?: string
    attendees?: string[]
  }
) {
  try {
    const calendar = await getCalendarClient(userId)

    const updates: any = {}
    if (event.title) updates.summary = event.title
    if (event.description !== undefined) updates.description = event.description
    if (event.startTime) {
      updates.start = {
        dateTime: event.startTime.toISOString(),
        timeZone: "UTC",
      }
    }
    if (event.endTime) {
      updates.end = {
        dateTime: event.endTime.toISOString(),
        timeZone: "UTC",
      }
    }
    if (event.location !== undefined) updates.location = event.location
    if (event.attendees) {
      updates.attendees = event.attendees.map((email) => ({ email }))
    }

    const response = await calendar.events.patch({
      calendarId: "primary",
      eventId,
      requestBody: updates,
      sendUpdates: "all",
    })

    return response.data
  } catch (error: any) {
    // Only log unexpected errors, not user-actionable ones
    if (!error?.message?.includes("reconnect") && !error?.message?.includes("refresh token")) {
      console.error("Error updating calendar event:", error)
    }
    throw error
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(userId: string, eventId: string) {
  try {
    const calendar = await getCalendarClient(userId)

    await calendar.events.delete({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
    })

    return true
  } catch (error: any) {
    // Only log unexpected errors, not user-actionable ones
    if (!error?.message?.includes("reconnect") && !error?.message?.includes("refresh token")) {
      console.error("Error deleting calendar event:", error)
    }
    throw error
  }
}

/**
 * List upcoming calendar events
 */
export async function listUpcomingEvents(userId: string, maxResults: number = 10) {
  try {
    const calendar = await getCalendarClient(userId)

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    })

    return response.data.items || []
  } catch (error: any) {
    // Only log unexpected errors, not user-actionable ones
    if (!error?.message?.includes("reconnect") && !error?.message?.includes("refresh token")) {
      console.error("Error listing calendar events:", error)
    }
    throw error
  }
}

