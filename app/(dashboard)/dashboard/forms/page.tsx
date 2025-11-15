import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"
import { FormTemplateBuilder } from "@/components/forms/FormTemplateBuilder"
import { FormAssignmentPanel } from "@/components/forms/FormAssignmentPanel"
import { FormAssignmentList } from "@/components/forms/FormAssignmentList"
import { ClientFormList } from "@/components/forms/ClientFormList"
import { SerializedFormAssignment, SerializedFormField } from "@/types/forms"

/** Maps Prisma form fields into serializable structures for client components. */
function serializeFields(fields: any[]): SerializedFormField[] {
  return fields.map((field) => ({
    id: field.id,
    label: field.label,
    type: field.type,
    required: field.required,
    options: field.options,
  }))
}

/** Normalizes form assignment records for hydrated React components. */
function serializeAssignments(assignments: any[]): SerializedFormAssignment[] {
  return assignments.map((assignment) => ({
    id: assignment.id,
    status: assignment.status,
    createdAt: assignment.createdAt.toISOString(),
    client: {
      id: assignment.client.id,
      name: assignment.client.name,
      company: assignment.client.company,
    },
    project: assignment.project
      ? { id: assignment.project.id, name: assignment.project.name }
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
}

/** Server component for creating, assigning, and completing custom client forms. */
export default async function FormsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect("/auth/signin")
  }

  if (session.user.role === UserRole.CLIENT) {
    const client = await db.client.findFirst({
      where: {
        email: session.user.email?.toLowerCase(),
      },
    })

    if (!client) {
      return (
        <div>
          <h1 className="text-3xl font-bold">Forms & Requests</h1>
          <p className="text-muted-foreground mt-2">
            We could not find any assignments for your account yet.
          </p>
        </div>
      )
    }

    const assignments = await db.formAssignment.findMany({
      where: { clientId: client.id },
      include: {
        template: {
          include: {
            fields: {
              orderBy: { order: "asc" },
            },
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
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { submittedAt: "desc" },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Forms & Requests</h1>
          <p className="text-muted-foreground mt-2">
            Complete questionnaires and shared checklists directly in your portal.
          </p>
        </div>
        <ClientFormList assignments={serializeAssignments(assignments)} />
      </div>
    )
  }

  const [templates, clients, projects, assignments] = await Promise.all([
    db.formTemplate.findMany({
      include: {
        fields: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.client.findMany({
      select: {
        id: true,
        name: true,
        company: true,
      },
      orderBy: { name: "asc" },
    }),
    db.project.findMany({
      select: {
        id: true,
        name: true,
        clientId: true,
      },
      orderBy: { name: "asc" },
    }),
    db.formAssignment.findMany({
      include: {
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
        template: {
          include: {
            fields: {
              orderBy: { order: "asc" },
            },
          },
        },
        submissions: {
          include: {
            submitter: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { submittedAt: "desc" },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Custom Forms</h1>
        <p className="text-muted-foreground mt-2">
          Create templates, assign them to clients, and review submissions with a single click.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FormTemplateBuilder templateCount={templates.length} />
        <FormAssignmentPanel
          clients={clients}
          projects={projects}
          templates={templates.map((template) => ({ id: template.id, name: template.name }))}
        />
      </div>

      <FormAssignmentList assignments={serializeAssignments(assignments)} />
    </div>
  )
}

