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
}

interface ProjectActionItemsProps {
  projectId: string
  actionItems: ActionItem[]
  canEdit: boolean
}

export function ProjectActionItems({ projectId, actionItems, canEdit }: ProjectActionItemsProps) {
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
        <ActionItemList actionItems={actionItems} canEdit={canEdit} />
      </CardContent>
    </Card>
  )
}

