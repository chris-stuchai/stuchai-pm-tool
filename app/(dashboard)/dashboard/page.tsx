import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Users, FolderKanban, CheckSquare, AlertCircle } from "lucide-react"

async function getDashboardData(userId: string) {
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

  const data = await getDashboardData(session.user.id)

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
              {data.recentProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects yet</p>
              ) : (
                data.recentProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.client.name}</p>
                    </div>
                    <div className="text-right">
                      <Progress value={project.progress} className="w-24 mb-1" />
                      <p className="text-xs text-muted-foreground">{project.progress}%</p>
                    </div>
                  </div>
                ))
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
              {data.upcomingActionItems.length === 0 ? (
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

