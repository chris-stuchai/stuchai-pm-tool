"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CreateActionItemDialog } from "@/components/actions/CreateActionItemDialog"
import { ActionItemList } from "@/components/actions/ActionItemList"

interface ActionItem {
  id: string
  title: string
  description: string | null
  status: string
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  dueDate: string | Date | null
  assignee: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
  project: {
    id: string
    name: string
    client: {
      name: string
    }
  } | null
  showOnTimeline?: boolean
  timelineLabel?: string | null
  visibleToClient?: boolean
  clientCanComplete?: boolean
  requiresSecureResponse?: boolean
  securePrompt?: string | null
  secureFieldType?: "SHORT_TEXT" | "LONG_TEXT" | "SECRET" | null
  secureRetentionPolicy?: "UNTIL_DELETED" | "EXPIRE_AFTER_VIEW" | "EXPIRE_AFTER_HOURS" | null
  secureExpireAfterHours?: number | null
  secureViewedAt?: string | Date | null
  secureResponse?: {
    id: string
    submittedBy?: string | null
    createdAt: string | Date
    updatedAt: string | Date
  } | null
  attachments?: Array<{
    id: string
    name: string
    url: string
    mimeType?: string | null
    size?: number | null
  }>
  reviewRequired?: boolean
  reviewAssignee?: {
    id: string
    name: string | null
    email: string
  } | null
  statusHistory?: Array<{
    id: string
    previousStatus?: string | null
    newStatus: string
    summary?: string | null
    outcomeTag?: string | null
    notifiedUserIds: string[]
    followUpActionId?: string | null
    createdAt: string | Date
    author: {
      id: string
      name: string | null
      email: string
    }
  }>
}

interface ProjectActionItemsProps {
  projectId: string
  actionItems: ActionItem[]
  canEdit: boolean
  currentUserRole?: "ADMIN" | "MANAGER" | "CLIENT"
  currentUserId?: string
  teammates?: { id: string; name: string | null; email: string }[]
}

export function ProjectActionItems({
  projectId,
  actionItems,
  canEdit,
  currentUserRole = "ADMIN",
  currentUserId,
  teammates = [],
}: ProjectActionItemsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Action Items</CardTitle>
          {canEdit && (
            <CreateActionItemDialog projectId={projectId} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ActionItemList
          actionItems={actionItems}
          canEdit={canEdit}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          teammates={teammates}
        />
      </CardContent>
    </Card>
  )
}

