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
import { InviteClientButton } from "@/components/clients/InviteClientButton"
import { ClientStatusToggle } from "@/components/clients/ClientStatusToggle"
import { UserRole } from "@prisma/client"
import { calculateProjectProgress } from "@/lib/projects"
import { DeliverablesCard } from "@/components/deliverables/DeliverablesCard"
import { FormAssignmentList } from "@/components/forms/FormAssignmentList"
import { SerializedFormAssignment, SerializedFormField } from "@/types/forms"
import { ClientBillingCard } from "@/components/billing/ClientBillingCard"

/** Converts Prisma form fields into serializable payloads for client components. */
const serializeFields = (fields: any[]): SerializedFormField[] =>
  fields.map((field: any) => ({
    id: field.id,
    label: field.label,
    type: field.type,
    required: field.required,
    options: field.options,
  }))

/** Converts form assignments with nested relations into client-safe objects. */
const serializeAssignments = (assignments: any[]): SerializedFormAssignment[] =>
  assignments.map((assignment: any) => ({
    id: assignment.id,
    status: assignment.status,
    createdAt: assignment.createdAt.toISOString(),
    client: {
      id: assignment.client.id,
      name: assignment.client.name,
      company: assignment.client.company,
    },
    project: assignment.project
      ? {
          id: assignment.project.id,
          name: assignment.project.name,
        }
      : null,
    template: {
      id: assignment.template.id,
      name: assignment.template.name,
      fields: serializeFields(assignment.template.fields),
    },
    submissions: assignment.submissions.map((submission: any) => ({
      id: submission.id,
      submittedAt: submission.submittedAt.toISOString(),
      responses: submission.responses,
      submitter: submission.submitter
        ? {
            id: submission.submitter.id,
            name: submission.submitter.name,
            email: submission.submitter.email,
          }
        : null,
    })),
  }))

const serializeContracts = (contracts: any[]) =>
  contracts.map((contract: any) => ({
    id: contract.id,
    name: contract.name,
    amount: contract.amount.toString(),
    currency: contract.currency,
    startDate: contract.startDate.toISOString(),
    endDate: contract.endDate ? contract.endDate.toISOString() : null,
    recurrence: contract.recurrence,
    paymentMethod: contract.paymentMethod,
    notes: contract.notes,
    invoices: contract.invoices.map((invoice: any) => ({
      id: invoice.id,
      amount: invoice.amount.toString(),
      currency: invoice.currency,
      dueDate: invoice.dueDate.toISOString(),
      status: invoice.status,
      externalUrl: invoice.externalUrl,
    })),
  }))

/** Loads the full client record including projects, deliverables, and assigned forms. */
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
      },
      deliverables: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
      formAssignments: {
        include: {
          template: {
            include: {
              fields: {
                orderBy: { order: "asc" },
              },
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              company: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          submissions: {
            include: {
              submitter: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: { submittedAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      contracts: {
        include: {
          invoices: {
            orderBy: { dueDate: "desc" },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  })

  return client
}

/** Client detail dashboard with documents, deliverables, forms, and messaging. */
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
  const serializedAssignments = serializeAssignments(client.formAssignments ?? [])
  const billingContracts = serializeContracts(client.contracts ?? [])

  return (
    <div className="space-y-6">
      {!client.active && (
        <Card>
          <CardContent className="text-sm text-yellow-700 bg-yellow-50 border-yellow-200">
            This client is inactive. Reactivate them to resume messaging, project updates, and
            document sharing.
          </CardContent>
        </Card>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
              <Badge variant={client.active ? "secondary" : "destructive"}>
                {client.active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">Client details and projects</p>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <InviteClientButton 
              clientId={client.id}
              clientName={client.name}
              clientEmail={client.email}
            />
            <EditClientDialogButton client={client} />
            <ClientStatusToggle clientId={client.id} isActive={client.active} />
          </div>
        )}
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
                {client.projects.map((project) => {
                  const computedProgress = calculateProjectProgress({
                    actionItems: project.actionItems,
                    milestones: project.milestones ?? [],
                    status: project.status,
                    startDate: project.startDate,
                    dueDate: project.dueDate,
                    progress: project.progress,
                  })
                  const hasSegments = (project.actionItems?.length ?? 0) + (project.milestones?.length ?? 0) > 0
                  const baseProgress = hasSegments ? computedProgress : project.progress ?? 0
                  const displayProgress = project.status === "COMPLETED" ? 100 : baseProgress
                  const openTasks = project.actionItems.filter((item) => item.status !== "COMPLETED").length
                  return (
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
                      <Progress value={displayProgress} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{displayProgress}% complete</span>
                        <span>{openTasks} open task{openTasks === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ClientDocuments clientId={client.id} canEdit={canEdit} />
          <DeliverablesCard
            clientId={client.id}
            canEdit={canEdit}
            initialItems={client.deliverables}
          />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Requests &amp; Forms</h2>
                <p className="text-sm text-muted-foreground">
                  Track onboarding questionnaires and client checklists.
                </p>
              </div>
              {canEdit && (
                <Button variant="link" className="px-0" asChild>
                  <Link href="/dashboard/forms">Manage</Link>
                </Button>
              )}
            </div>
            <FormAssignmentList
              assignments={serializedAssignments}
              variant="compact"
              allowStatusUpdates={false}
            />
          </div>
        </div>
        <div className="lg:col-span-1 space-y-6">
          <ClientBillingCard clientId={client.id} contracts={billingContracts} canEdit={canEdit} />
          <ClientMessages
            clientId={client.id}
            currentUserId={session.user.id}
            disabled={!client.active}
            isClientActive={client.active}
          />
        </div>
      </div>
    </div>
  )
}

