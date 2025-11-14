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
import { ArrowLeft, Mail, Building2, Phone, FileText } from "lucide-react"
import { EditClientDialogButton } from "@/components/clients/EditClientDialogButton"
import { ClientDocuments } from "@/components/clients/ClientDocuments"
import { ClientMessages } from "@/components/clients/ClientMessages"
import { UserRole } from "@prisma/client"

async function getClient(id: string) {
  const client = await db.client.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      projects: {
        include: {
          actionItems: {
            where: {
              status: {
                not: "COMPLETED",
              },
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
    },
  })

  return client
}

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const client = await getClient(params.id)
  if (!client) {
    notFound()
  }

  const canEdit = session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-gray-600 mt-1">Client details and projects</p>
          </div>
        </div>
        {canEdit && <EditClientDialogButton client={client} />}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{client.email}</span>
            </div>
            {client.company && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{client.company}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.notes && (
              <div className="flex items-start gap-3 pt-2 border-t">
                <FileText className="h-4 w-4 text-muted-foreground mt-1" />
                <p className="text-sm text-muted-foreground">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>{client.projects.length} total projects</CardDescription>
          </CardHeader>
          <CardContent>
            {client.projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet</p>
            ) : (
              <div className="space-y-4">
                {client.projects.map((project) => (
                  <div key={project.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="font-medium hover:underline"
                      >
                        {project.name}
                      </Link>
                      <Badge variant="outline">{project.status}</Badge>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{project.progress}% complete</span>
                      <span>{project.actionItems.length} open tasks</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ClientDocuments clientId={client.id} canEdit={canEdit} />
        <ClientMessages clientId={client.id} currentUserId={session.user.id} />
      </div>
    </div>
  )
}

