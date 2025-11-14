import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import { Calendar, Clock, MapPin, Users } from "lucide-react"
import { CreateMeetingDialog } from "@/components/meetings/CreateMeetingDialog"
import { MeetingsList } from "@/components/meetings/MeetingsList"

async function getMeetings(userId: string, role: UserRole) {
  const where: any = {
    startTime: {
      gte: new Date(),
    },
  }

  if (role === UserRole.CLIENT) {
    where.attendees = {
      some: {
        userId,
      },
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
    take: 20,
  })

  return meetings
}

export default async function MeetingsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const meetings = await getMeetings(session.user.id, session.user.role)
  const canCreate = session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-600 mt-1">
            {canCreate ? "Schedule and manage meetings" : "Your upcoming meetings"}
          </p>
        </div>
        {canCreate && <CreateMeetingDialog />}
      </div>

      <MeetingsList meetings={meetings} canEdit={canCreate} />
    </div>
  )
}

