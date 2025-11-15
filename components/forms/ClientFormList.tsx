"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SerializedFormAssignment } from "@/types/forms"
import { FormSubmissionDialog } from "./FormSubmissionDialog"
import { formatDate } from "@/lib/utils"
import { useRouter } from "next/navigation"

const statusCopy: Record<string, string> = {
  PENDING: "Awaiting your response",
  SUBMITTED: "Submitted",
  REVIEWED: "Reviewed",
}

interface ClientFormListProps {
  assignments: SerializedFormAssignment[]
}

/**
 * Renders the client-facing list of assigned forms with submission actions.
 */
export function ClientFormList({ assignments }: ClientFormListProps) {
  const router = useRouter()

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nothing is pending right now. New questionnaires will appear here.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {assignments.map((assignment) => {
        const latestSubmission = assignment.submissions[0]
        return (
          <Card key={assignment.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{assignment.template.name}</CardTitle>
                <CardDescription>
                  {assignment.project ? assignment.project.name : "General request"}
                </CardDescription>
              </div>
              <Badge variant="outline">{statusCopy[assignment.status]}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {latestSubmission
                  ? `Last submitted ${formatDate(latestSubmission.submittedAt)}`
                  : "Not submitted yet"}
              </div>
              <FormSubmissionDialog
                assignment={{
                  id: assignment.id,
                  template: {
                    name: assignment.template.name,
                    fields: assignment.template.fields,
                  },
                }}
                existingResponses={latestSubmission?.responses ?? null}
                onSubmitted={() => router.refresh()}
                trigger={
                  <Button>
                    {latestSubmission ? "Update submission" : "Start form"}
                  </Button>
                }
              />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

