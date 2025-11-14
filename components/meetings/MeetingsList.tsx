"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { Calendar, Clock, MapPin, Users } from "lucide-react"
import { format } from "date-fns"

interface Meeting {
  id: string
  title: string
  description: string | null
  startTime: Date
  endTime: Date
  location: string | null
  status: string
  client: {
    id: string
    name: string
    email: string
  } | null
  project: {
    id: string
    name: string
  } | null
  creator: {
    id: string
    name: string | null
    email: string
  }
  attendees: Array<{
    id: string
    userId: string
    status: string | null
    user: {
      id: string
      name: string | null
      email: string
      image: string | null
    }
  }>
}

interface MeetingsListProps {
  meetings: Meeting[]
  canEdit: boolean
}

export function MeetingsList({ meetings, canEdit }: MeetingsListProps) {
  if (meetings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">No upcoming meetings</p>
          <p className="text-sm text-muted-foreground">
            {canEdit ? "Schedule a meeting to get started" : "You have no upcoming meetings scheduled"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {meetings.map((meeting) => (
        <Card key={meeting.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl">{meeting.title}</CardTitle>
                {meeting.description && (
                  <CardDescription className="mt-2">{meeting.description}</CardDescription>
                )}
              </div>
              <Badge variant="outline">{meeting.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(meeting.startTime), "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(meeting.startTime), "h:mm a")} - {format(new Date(meeting.endTime), "h:mm a")}
                </span>
              </div>
              {meeting.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{meeting.location}</span>
                </div>
              )}
              {meeting.client && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Client: </span>
                  <span className="font-medium">{meeting.client.name}</span>
                </div>
              )}
              {meeting.project && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Project: </span>
                  <span className="font-medium">{meeting.project.name}</span>
                </div>
              )}
              {meeting.attendees.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Attendees: </span>
                  <span className="font-medium">
                    {meeting.attendees.map((a) => a.user.name || a.user.email).join(", ")}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

