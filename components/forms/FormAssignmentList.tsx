"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FormSubmissionDialog } from "./FormSubmissionDialog"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "@/components/ui/use-toast"
import { SerializedFormAssignment } from "@/types/forms"
import { formatDate } from "@/lib/utils"

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  SUBMITTED: "bg-blue-100 text-blue-900",
  REVIEWED: "bg-emerald-100 text-emerald-900",
}

interface FormAssignmentListProps {
  assignments: SerializedFormAssignment[]
  variant?: "full" | "compact"
  allowStatusUpdates?: boolean
}

/**
 * Lists assigned forms for internal teams with review actions and quick context.
 */
export function FormAssignmentList({
  assignments,
  variant = "full",
  allowStatusUpdates = true,
}: FormAssignmentListProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const router = useRouter()
  const visibleAssignments =
    variant === "compact" ? assignments.slice(0, 3) : assignments

  const markReviewed = async (assignmentId: string) => {
    setUpdatingId(assignmentId)
    try {
      const response = await fetch(`/api/forms/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REVIEWED" }),
      })

      if (!response.ok) {
        throw new Error("Failed to update status")
      }

      router.refresh()
    } catch (error) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Unable to update status",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  if (visibleAssignments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No forms have been assigned yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {visibleAssignments.map((assignment) => {
        const latestSubmission = assignment.submissions[0]
        return (
          <Card key={assignment.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">{assignment.template.name}</CardTitle>
                <CardDescription>
                  {assignment.client.name}
                  {assignment.client.company ? ` — ${assignment.client.company}` : ""}
                  {assignment.project ? ` • ${assignment.project.name}` : ""}
                </CardDescription>
              </div>
              <Badge className={statusStyles[assignment.status] || ""}>
                {assignment.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>Assigned {formatDate(assignment.createdAt)}</span>
                {latestSubmission && (
                  <span>
                    Submitted {formatDate(latestSubmission.submittedAt)}
                    {latestSubmission.submitter
                      ? ` by ${latestSubmission.submitter.name || latestSubmission.submitter.email}`
                      : ""}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <FormSubmissionDialog
                  assignment={{
                    id: assignment.id,
                    template: {
                      name: assignment.template.name,
                      fields: assignment.template.fields,
                    },
                  }}
                  readOnly
                  existingResponses={latestSubmission?.responses ?? null}
                  trigger={
                    <Button variant="outline" disabled={!latestSubmission}>
                      {latestSubmission ? "Review submission" : "Awaiting client"}
                    </Button>
                  }
                />
                {allowStatusUpdates &&
                  assignment.status === "SUBMITTED" &&
                  latestSubmission && (
                    <Button
                      variant="ghost"
                      onClick={() => markReviewed(assignment.id)}
                      disabled={updatingId === assignment.id}
                    >
                      {updatingId === assignment.id ? "Updating..." : "Mark reviewed"}
                    </Button>
                  )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

