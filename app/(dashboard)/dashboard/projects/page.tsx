import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { Prisma, UserRole } from "@prisma/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog"
import { calculateProjectProgress } from "@/lib/projects"

const projectQuery = Prisma.validator<Prisma.ProjectFindManyArgs>()({
  include: {
    client: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    creator: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    actionItems: {
      select: {
        id: true,
        status: true,
      },
    },
    milestones: true,
  },
  orderBy: {
    updatedAt: "desc",
  },
})

type ProjectWithRelations = Prisma.ProjectGetPayload<typeof projectQuery>

async function getProjectsForUser(user: {
  id: string
  role: UserRole
  email?: string | null
}): Promise<ProjectWithRelations[]> {
  if (user.role !== UserRole.CLIENT) {
    return db.project.findMany(projectQuery)
  }

  if (!user.email) {
    return [] as ProjectWithRelations[]
  }

  const client = await db.client.findFirst({
    where: {
      email: user.email.toLowerCase(),
      active: true,
    },
    select: {
      id: true,
    },
  })

  if (!client) {
    return [] as ProjectWithRelations[]
  }

  return db.project.findMany({
    where: {
      clientId: client.id,
    },
    ...projectQuery,
  })
}

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const projects = await getProjectsForUser({
    id: session.user.id,
    role: session.user.role,
    email: session.user.email,
  })
  const canCreate = session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER
  const isClient = session.user.role === UserRole.CLIENT

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isClient ? "My Projects" : "Projects"}
          </h1>
          <p className="text-gray-600 mt-1">
            {isClient ? "Everything we are building for you" : "Manage all your projects"}
          </p>
        </div>
        {canCreate && <CreateProjectDialog />}
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No projects yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first project to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const computedProgress = calculateProjectProgress({
              actionItems: project.actionItems,
              milestones: project.milestones ?? [],
              status: project.status,
            })
            const hasSegments = (project.actionItems?.length ?? 0) + (project.milestones?.length ?? 0) > 0
            const baseProgress = hasSegments ? computedProgress : project.progress ?? 0
            const displayProgress = project.status === "COMPLETED" ? 100 : baseProgress
            const openTasks = project.actionItems.filter((item) => item.status !== "COMPLETED").length
            return (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <Badge variant="outline">{project.status}</Badge>
                </div>
                <CardDescription>
                  {isClient ? project.status : project.client.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{displayProgress}%</span>
                    </div>
                    <Progress value={displayProgress} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Open tasks</span>
                    <span>{openTasks} item{openTasks === 1 ? "" : "s"}</span>
                  </div>
                  {project.dueDate && (
                    <div className="text-sm text-muted-foreground">
                      Due: {formatDate(project.dueDate)}
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/dashboard/projects/${project.id}`}>
                        View Project
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      )}
    </div>
  )
}

