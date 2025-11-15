import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Users, FolderKanban, CheckSquare, AlertCircle, Calendar, FileText, MessageSquare } from "lucide-react"
import { UserRole } from "@prisma/client"
import { calculateProjectProgress } from "@/lib/projects"

async function getDashboardData(userId: string, role: UserRole, email?: string | null) {
  if (role === UserRole.CLIENT) {
    // Client view
    const clientRecord = email
      ? await db.client.findFirst({
          where: { email: email.toLowerCase() },
          select: { id: true },
        })
      : null

    const [actionItems, overdueItems, upcomingMeetings, recentDocuments, deliverables] = await Promise.all([
      db.actionItem.count({
        where: {
          assignedTo: userId,
        },
      }),
      db.actionItem.count({
        where: {
          assignedTo: userId,
          status: {
            not: "COMPLETED",
          },
          dueDate: {
            lt: new Date(),
          },
        },
      }),
      db.meeting.findMany({
        where: {
          attendees: {
            some: {
              userId,
            },
          },
          startTime: {
            gte: new Date(),
          },
        },
        take: 5,
        orderBy: { startTime: "asc" },
        include: {
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
      }),
      db.clientDocument.findMany({
        where: clientRecord
          ? {
              clientId: clientRecord.id,
            }
          : undefined,
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          uploader: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      db.deliverable.findMany({
        where: clientRecord ? { clientId: clientRecord.id } : undefined,
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ])

    const myProjects = await db.project.findMany({
      where: clientRecord
        ? {
            clientId: clientRecord.id,
          }
        : {
            actionItems: {
              some: {
                assignedTo: userId,
              },
            },
          },
      include: {
        client: true,
        actionItems: {
          where: {
            assignedTo: userId,
            status: {
              not: "COMPLETED",
            },
          },
        },
        milestones: true,
      },
    })

    const myActionItems = await db.actionItem.findMany({
      where: {
        assignedTo: userId,
        status: {
          not: "COMPLETED",
        },
      },
      take: 5,
      orderBy: { dueDate: "asc" },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
    })

    const timeline = [
      ...myProjects.flatMap((project) =>
        project.milestones.map((milestone) => ({
          id: milestone.id,
          title: milestone.name,
          date: milestone.dueDate,
          type: "Milestone" as const,
          project: project.name,
          status: milestone.completedAt ? "Completed" : "Upcoming",
        }))
      ),
      ...myActionItems.map((item) => ({
        id: item.id,
        title: item.title,
        date: item.dueDate,
        type: "Task" as const,
        project: item.project?.name || "General",
        status: item.status,
      })),
    ].sort((a, b) => {
      if (!a.date || !b.date) return 0
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })

    return {
      isClient: true,
      stats: {
        actionItems,
        overdueItems,
        meetings: upcomingMeetings.length,
        documents: recentDocuments.length,
      },
      upcomingMeetings,
      recentDocuments,
      myProjects,
      myActionItems,
      deliverables,
      timeline,
    }
  }

  // Admin/Manager view
  const [clients, projects, actionItems, overdueItems] = await Promise.all([
    db.client.count(),
    db.project.count(),
    db.actionItem.count({
      where: {
        OR: [
          { assignedTo: userId },
          { createdBy: userId },
        ],
      },
    }),
    db.actionItem.count({
      where: {
        assignedTo: userId,
        status: {
          not: "COMPLETED",
        },
        dueDate: {
          lt: new Date(),
        },
      },
    }),
  ])

  const recentProjects = await db.project.findMany({
    take: 5,
    orderBy: { updatedAt: "desc" },
    include: {
      client: true,
      actionItems: true,
      milestones: true,
    },
  })

  const upcomingActionItems = await db.actionItem.findMany({
    where: {
      OR: [
        { assignedTo: userId },
        { createdBy: userId },
      ],
      status: {
        not: "COMPLETED",
      },
      dueDate: {
        gte: new Date(),
      },
    },
    take: 5,
    orderBy: { dueDate: "asc" },
    include: {
      project: {
        include: {
          client: true,
        },
      },
      assignee: true,
    },
  })

  return {
    isClient: false,
    stats: {
      clients,
      projects,
      actionItems,
      overdueItems,
    },
    recentProjects,
    upcomingActionItems,
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const data = await getDashboardData(session.user.id, session.user.role, session.user.email)

  if (data.isClient) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Portal</h1>
          <p className="text-gray-600 mt-1">Welcome back, {session.user.name}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Project Timeline</CardTitle>
            <CardDescription>Milestones and tasks with key dates</CardDescription>
          </CardHeader>
          <CardContent>
            {!data.timeline || data.timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Timeline updates will appear here as tasks and milestones are scheduled.
              </p>
            ) : (
              <div className="space-y-4">
                {data.timeline.map((entry: any) => (
                  <div key={entry.id} className="flex items-start gap-4">
                    <div className="w-28 text-xs text-muted-foreground">
                      {entry.date ? formatDate(entry.date) : "TBD"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{entry.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.project} • {entry.type} • {entry.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.actionItems}</div>
              <p className="text-xs text-muted-foreground">Assigned to me</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{data.stats.overdueItems}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.meetings}</div>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.documents}</div>
              <p className="text-xs text-muted-foreground">Shared with me</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Meetings</CardTitle>
              <CardDescription>Your scheduled meetings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!data.upcomingMeetings || data.upcomingMeetings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming meetings</p>
                ) : (
                  data.upcomingMeetings.map((meeting) => (
                    <div key={meeting.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{meeting.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(meeting.startTime)} • {meeting.client?.name || meeting.project?.name || ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Button variant="ghost" className="w-full mt-4" asChild>
                <Link href="/dashboard/meetings">
                  View all meetings <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Tasks</CardTitle>
              <CardDescription>Tasks assigned to you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!data.myActionItems || data.myActionItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks assigned</p>
                ) : (
                  data.myActionItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.project ? `${item.project.name} • ` : ""}
                          {item.dueDate ? `Due ${formatDate(item.dueDate)}` : "No due date"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Button variant="ghost" className="w-full mt-4" asChild>
                <Link href="/dashboard/actions">
                  View all tasks <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Deliverables</CardTitle>
              <CardDescription>Latest uploads and shared assets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {!data.deliverables || data.deliverables.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Your deliverables will appear here as soon as your team shares them.
                  </p>
                ) : (
                  data.deliverables.map((deliverable: any) => (
                    <div key={deliverable.id} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{deliverable.name}</p>
                      <p className="text-xs text-muted-foreground">{deliverable.status}</p>
                      {deliverable.link && (
                        <a
                          href={deliverable.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline mt-1 inline-flex items-center"
                        >
                          Access Deliverable
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {session.user.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.clients}</div>
            <p className="text-xs text-muted-foreground">Total clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.projects}</div>
            <p className="text-xs text-muted-foreground">Active projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Items</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.actionItems}</div>
            <p className="text-xs text-muted-foreground">Your tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{data.stats.overdueItems}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Latest project updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!data.recentProjects || data.recentProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects yet</p>
              ) : (
                data.recentProjects.map((project) => {
                  const computedProgress = calculateProjectProgress({
                    actionItems: project.actionItems,
                    milestones: project.milestones || [],
                    status: project.status,
                    startDate: project.startDate,
                    dueDate: project.dueDate,
                    progress: project.progress,
                  })
                  const hasSegments =
                    (project.actionItems?.length ?? 0) + (project.milestones?.length ?? 0) > 0
                  const baseProgress = hasSegments ? computedProgress : project.progress ?? 0
                  const displayProgress = project.status === "COMPLETED" ? 100 : baseProgress
                  return (
                    <div key={project.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">{project.client.name}</p>
                      </div>
                      <div className="text-right">
                        <Progress value={displayProgress} className="w-24 mb-1" />
                        <p className="text-xs text-muted-foreground">{displayProgress}%</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <Button variant="ghost" className="w-full mt-4" asChild>
              <Link href="/dashboard/projects">
                View all projects <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Action Items</CardTitle>
            <CardDescription>Tasks due soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!data.upcomingActionItems || data.upcomingActionItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming tasks</p>
              ) : (
                data.upcomingActionItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.project ? `${item.project.name} • ` : ""}
                        {item.dueDate ? `Due ${formatDate(item.dueDate)}` : "No due date"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Button variant="ghost" className="w-full mt-4" asChild>
              <Link href="/dashboard/actions">
                View all actions <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

