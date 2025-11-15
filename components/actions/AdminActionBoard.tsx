"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ActionItemList } from "./ActionItemList"
import { useMemo } from "react"

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
      id?: string
      name: string
    }
  } | null
  visibleToClient?: boolean
  clientCanComplete?: boolean
  clientCompleted?: boolean
  showOnTimeline?: boolean
  timelineLabel?: string | null
  attachments?: Array<{
    id: string
    name: string
    url: string
    mimeType?: string | null
    size?: number | null
  }>
}

type Role = "ADMIN" | "MANAGER" | "CLIENT"

interface AdminActionBoardProps {
  items: ActionItem[]
  canEdit: boolean
  currentUserRole: Role
}

interface ActionGroup {
  id: string
  name: string
  items: ActionItem[]
  stats: {
    open: number
    overdue: number
    assigned: number
  }
}

export function AdminActionBoard({
  items,
  canEdit,
  currentUserRole,
}: AdminActionBoardProps) {
  const groups = useMemo<ActionGroup[]>(() => {
    const now = Date.now()
    const map = new Map<string, ActionGroup>()

    items.forEach((item) => {
      const key = item.project?.client?.id ?? "internal"
      const label = item.project?.client?.name ?? "Internal / Global"

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: label,
          items: [],
          stats: { open: 0, overdue: 0, assigned: 0 },
        })
      }

      const group = map.get(key)!
      group.items.push(item)

      const isOpen = item.status !== "COMPLETED"
      if (isOpen) {
        group.stats.open += 1
      }
      if (
        isOpen &&
        item.dueDate &&
        new Date(item.dueDate).getTime() < now
      ) {
        group.stats.overdue += 1
      }
      if (item.assignee) {
        group.stats.assigned += 1
      }
    })

    return Array.from(map.values()).sort(
      (a, b) => b.stats.open - a.stats.open
    )
  }, [items])

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          No action items found with the current filters.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Card key={group.id} className="border border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{group.name}</CardTitle>
                <CardDescription>
                  {group.stats.open} open • {group.stats.overdue} overdue •{" "}
                  {group.stats.assigned} assigned
                </CardDescription>
              </div>
              {group.stats.overdue > 0 && (
                <Badge variant="destructive">
                  {group.stats.overdue} overdue
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ActionItemList
              actionItems={group.items}
              canEdit={canEdit}
              currentUserRole={currentUserRole}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

