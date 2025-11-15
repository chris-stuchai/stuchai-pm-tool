import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ProjectActionItems } from "@/components/projects/ProjectActionItems"
import { EditProjectDialog } from "@/components/projects/EditProjectDialog"
import { UserRole } from "@prisma/client"
import { calculateProjectProgress } from "@/lib/projects"

async function getProject(id: string) {
  const project = await db.project.findUnique({
    where: { id },
    include: {
      client: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      actionItems: {
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          project: {
            include: {
              client: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      milestones: {
        orderBy: {
          dueDate: "asc",
        },
      },
    },
  })

  return project
}

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const project = await getProject(params.id)
  if (!project) {
    notFound()
  }

  const canEdit = session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER
  const computedProgress = calculateProjectProgress({
    actionItems: project.actionItems,
    milestones: project.milestones ?? [],
  })
  const displayProgress = project.status === "COMPLETED" ? 100 : computedProgress

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600 mt-1">
              Client: <Link href={`/dashboard/clients/${project.client.id}`} className="hover:underline">{project.client.name}</Link>
            </p>
          </div>
        </div>
        {canEdit && <EditProjectDialog project={project} />}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.description && (
              <div>
                <p className="text-sm text-muted-foreground">{project.description}</p>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{displayProgress}%</span>
              </div>
              <Progress value={displayProgress} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status</span>
                <div className="mt-1">
                  <Badge variant="outline">{project.status}</Badge>
                </div>
              </div>
              {project.dueDate && (
                <div>
                  <span className="text-muted-foreground">Due Date</span>
                  <div className="mt-1 font-medium">{formatDate(project.dueDate)}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-2xl font-bold">{project.actionItems.length}</div>
              <div className="text-sm text-muted-foreground">Action Items</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {project.actionItems.filter((item) => item.status === "COMPLETED").length}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {project.actionItems.filter((item) => item.status !== "COMPLETED").length}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ProjectActionItems projectId={project.id} actionItems={project.actionItems} canEdit={canEdit} />
    </div>
  )
}

