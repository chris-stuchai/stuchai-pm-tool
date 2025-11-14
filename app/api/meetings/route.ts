import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, MeetingStatus } from "@prisma/client"
import { createCalendarEvent } from "@/lib/google/calendar"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get("clientId")
    const projectId = searchParams.get("projectId")
    const upcoming = searchParams.get("upcoming") === "true"

    const where: any = {}

    // If user is CLIENT, only show meetings they're attending
    if (session.user.role === UserRole.CLIENT) {
      where.attendees = {
        some: {
          userId: session.user.id,
        },
      }
    } else {
      // ADMIN/MANAGER can see all meetings or filter by client/project
      if (clientId) {
        where.clientId = clientId
      }
      if (projectId) {
        where.projectId = projectId
      }
    }

    if (upcoming) {
      where.startTime = {
        gte: new Date(),
      }
    }

    const meetings = await db.meeting.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    })

    return NextResponse.json(meetings)
  } catch (error) {
    console.error("Error fetching meetings:", error)
    return NextResponse.json(
      { error: "Failed to fetch meetings" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and MANAGER can create meetings
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, startTime, endTime, location, clientId, projectId, attendeeIds, syncToCalendar } = body

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Title, start time, and end time are required" },
        { status: 400 }
      )
    }

    let googleEventId: string | null = null

    // Sync to Google Calendar if requested
    if (syncToCalendar) {
      try {
        // Get attendee emails
        const attendees = await db.user.findMany({
          where: {
            id: {
              in: attendeeIds || [],
            },
          },
          select: {
            email: true,
          },
        })

        const attendeeEmails = attendees.map((u) => u.email).filter(Boolean) as string[]

        // Get client email if clientId is provided
        if (clientId) {
          const client = await db.client.findUnique({
            where: { id: clientId },
            select: { email: true },
          })
          if (client?.email) {
            attendeeEmails.push(client.email)
          }
        }

        const calendarEvent = await createCalendarEvent(session.user.id, {
          title,
          description,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          location,
          attendees: attendeeEmails,
        })

        googleEventId = calendarEvent.id || null
      } catch (error) {
        console.error("Error syncing to Google Calendar:", error)
        // Continue with meeting creation even if calendar sync fails
      }
    }

    // Create meeting
    const meeting = await db.meeting.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        googleEventId,
        clientId: clientId || null,
        projectId: projectId || null,
        createdBy: session.user.id,
        attendees: attendeeIds && attendeeIds.length > 0
          ? {
              create: attendeeIds.map((userId: string) => ({
                userId,
                status: "needsAction",
              })),
            }
          : undefined,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    })

    // Create notifications for attendees
    if (attendeeIds && attendeeIds.length > 0) {
      await db.notification.createMany({
        data: attendeeIds.map((userId: string) => ({
          type: "MEETING_SCHEDULED",
          message: `Meeting scheduled: ${title}`,
          userId,
        })),
      })
    }

    return NextResponse.json(meeting, { status: 201 })
  } catch (error) {
    console.error("Error creating meeting:", error)
    return NextResponse.json(
      { error: "Failed to create meeting" },
      { status: 500 }
    )
  }
}

