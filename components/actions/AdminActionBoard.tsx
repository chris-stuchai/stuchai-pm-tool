"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ActionItemList } from "./ActionItemList"

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
  attachments?: Array<{
    id: string
    name: string
    url: string
    mimeType?: string | null
    size?: number | null
  }>
}

type Role = "ADMIN" | "MANAGER" | "CLIENT"
type StatusKey = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE"

const STATUS_ORDER: StatusKey[] = ["PENDING", "IN_PROGRESS", "OVERDUE", "COMPLETED"]
const STATUS_LABELS: Record<StatusKey, string> = {
  PENDING: "Queued",
  IN_PROGRESS: "In Progress",
  OVERDUE: "Overdue",
  COMPLETED: "Completed",
}
const STATUS_HINT: Record<StatusKey, string> = {
  PENDING: "Needs kickoff",
  IN_PROGRESS: "Actively moving",
  OVERDUE: "Behind target",
  COMPLETED: "Wrapped",
}

interface AdminActionBoardProps {
  items: ActionItem[]
  canEdit: boolean
  currentUserRole: Role
  teammates?: { id: string; name: string | null; email: string }[]
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
  teammates = [],
}: AdminActionBoardProps) {
  const [viewMode, setViewMode] = useState<"status" | "client">("status")

  const statusSummary = useMemo(() => {
    const base = STATUS_ORDER.reduce<Record<StatusKey, { count: number; overdue: number }>>(
      (acc, status) => {
        acc[status] = { count: 0, overdue: 0 }
        return acc
      },
      {} as Record<StatusKey, { count: number; overdue: number }>
    )
    const now = Date.now()
    items.forEach((item) => {
      const status = (STATUS_ORDER.includes(item.status as StatusKey) ? item.status : "PENDING") as StatusKey
      base[status].count += 1
      if (status !== "COMPLETED" && item.dueDate && new Date(item.dueDate).getTime() < now) {
        base[status].overdue += 1
      }
    })
    const totalOpen = items.filter((item) => item.status !== "COMPLETED").length
    return {
      byStatus: base,
      total: items.length,
      open: totalOpen,
    }
  }, [items])

  const statusColumns = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        title: STATUS_LABELS[status],
        hint: STATUS_HINT[status],
        items: items.filter((item) => item.status === status),
      })),
    [items]
  )

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

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STATUS_ORDER.map((status) => (
          <Card key={status} className="border border-slate-100">
            <CardHeader className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{STATUS_LABELS[status]}</p>
              <CardTitle className="text-3xl">{statusSummary.byStatus[status].count}</CardTitle>
              <CardDescription>{STATUS_HINT[status]}</CardDescription>
            </CardHeader>
            {status !== "COMPLETED" && (
              <CardContent className="pt-0">
                <p className="text-xs text-amber-600">
                  {statusSummary.byStatus[status].overdue} overdue
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">
            {statusSummary.open} open tasks • {statusSummary.total} total
          </h3>
          <p className="text-sm text-muted-foreground">Switch between status lanes or client groupings.</p>
        </div>
        <div className="inline-flex gap-2 rounded-md border bg-muted/40 p-1">
          <Button
            size="sm"
            variant={viewMode === "status" ? "default" : "ghost"}
            onClick={() => setViewMode("status")}
          >
            Kanban by Status
          </Button>
          <Button
            size="sm"
            variant={viewMode === "client" ? "default" : "ghost"}
            onClick={() => setViewMode("client")}
          >
            Group by Client
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            No action items found with the current filters.
          </CardContent>
        </Card>
      ) : viewMode === "status" ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {statusColumns.map((column) => (
            <Card key={column.status} className="border border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{column.title}</CardTitle>
                    <CardDescription>{column.items.length} items</CardDescription>
                  </div>
                  {column.status === "OVERDUE" && column.items.length > 0 && (
                    <Badge variant="destructive">{column.items.length} overdue</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {column.items.length > 0 ? (
                  <ActionItemList
                    actionItems={column.items}
                    canEdit={canEdit}
                    currentUserRole={currentUserRole}
                    teammates={teammates}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No items in this column.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        groups.map((group) => (
          <Card key={group.id} className="border border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{group.name}</CardTitle>
                  <CardDescription>
                    {group.stats.open} open • {group.stats.overdue} overdue • {group.stats.assigned} assigned
                  </CardDescription>
                </div>
                {group.stats.overdue > 0 && <Badge variant="destructive">{group.stats.overdue} overdue</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <ActionItemList
                actionItems={group.items}
                canEdit={canEdit}
                currentUserRole={currentUserRole}
                teammates={teammates}
              />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

