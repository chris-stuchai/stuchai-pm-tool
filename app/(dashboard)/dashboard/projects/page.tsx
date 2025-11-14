import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog"

async function getProjects() {
  const projects = await db.project.findMany({
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
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  return projects
}

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const projects = await getProjects()
  const canCreate = session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">Manage all your projects</p>
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
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <Badge variant="outline">{project.status}</Badge>
                </div>
                <CardDescription>{project.client.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tasks</span>
                    <span>{project.actionItems.length} items</span>
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
          ))}
        </div>
      )}
    </div>
  )
}

