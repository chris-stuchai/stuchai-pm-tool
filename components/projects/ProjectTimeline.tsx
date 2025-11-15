"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MilestoneDialog } from "./MilestoneDialog"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

type TimelineStatus = "completed" | "in-progress" | "upcoming" | "overdue"

interface TimelineMilestone {
  id: string
  name: string
  description: string | null
  dueDate: Date | null
  completedAt: Date | null
}

interface TimelineAction {
  id: string
  title: string
  description?: string | null
  status: string
  dueDate: Date | string | null
  showOnTimeline?: boolean
  timelineLabel?: string | null
}

interface ProjectTimelineProps {
  projectId: string
  milestones: TimelineMilestone[]
  actions?: TimelineAction[]
  startDate?: Date | null
  dueDate?: Date | null
  canEdit: boolean
}

const statusStyles: Record<TimelineStatus, { dot: string; badge: string; label: string }> = {
  completed: {
    dot: "border-emerald-500 bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
    label: "Completed",
  },
  "in-progress": {
    dot: "border-blue-500 bg-blue-500",
    badge: "bg-blue-50 text-blue-700",
    label: "In progress",
  },
  upcoming: {
    dot: "border-slate-300 bg-white",
    badge: "bg-slate-50 text-slate-700",
    label: "Upcoming",
  },
  overdue: {
    dot: "border-rose-500 bg-rose-500",
    badge: "bg-rose-50 text-rose-700",
    label: "Overdue",
  },
}

function formatDate(value: Date | null) {
  if (!value) return "TBD"
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function normalizeDate(value?: Date | string | null) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getMilestoneStatus(milestone: TimelineMilestone, now: Date): TimelineStatus {
  if (milestone.completedAt) return "completed"
  if (milestone.dueDate && milestone.dueDate < now) return "overdue"
  if (milestone.dueDate && milestone.dueDate <= now) return "in-progress"
  return "upcoming"
}

function getActionStatus(action: TimelineAction, now: Date): TimelineStatus {
  if (action.status === "COMPLETED") return "completed"
  const due = normalizeDate(action.dueDate)
  if (due && due < now) return "overdue"
  if (due) return "in-progress"
  return "upcoming"
}

interface TimelineEntry {
  id: string
  type: "milestone" | "action"
  title: string
  description?: string | null
  date: Date | null
  status: TimelineStatus
  milestone?: TimelineMilestone
  action?: TimelineAction
  subtitle?: string
}

/** Visualizes project milestones plus curated action items on a single timeline. */
export function ProjectTimeline({
  projectId,
  milestones,
  actions = [],
  startDate,
  dueDate,
  canEdit,
}: ProjectTimelineProps) {
  const normalizedStartDate = startDate ? new Date(startDate) : null
  const normalizedDueDate = dueDate ? new Date(dueDate) : null

  const entries = useMemo<TimelineEntry[]>(() => {
    const now = new Date()
    const milestoneEntries = milestones.map((milestone) => ({
      id: milestone.id,
      type: "milestone" as const,
      title: milestone.name,
      description: milestone.description,
      date: milestone.dueDate ? new Date(milestone.dueDate) : null,
      status: getMilestoneStatus(
        {
          ...milestone,
          dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null,
        },
        now
      ),
      milestone,
      subtitle: milestone.description || undefined,
    }))

    const actionEntries = actions
      .filter((action) => action.showOnTimeline)
      .map((action) => {
        const date = normalizeDate(action.dueDate)
        return {
          id: action.id,
          type: "action" as const,
          title: action.timelineLabel || action.title,
          description: action.description ?? null,
          date,
          status: getActionStatus(action, now),
          action,
          subtitle: date ? `Task due ${formatDate(date)}` : "Task with no due date",
        }
      })

    return [...milestoneEntries, ...actionEntries].sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return a.date.getTime() - b.date.getTime()
    })
  }, [milestones, actions])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {normalizedStartDate ? `Start: ${formatDate(normalizedStartDate)}` : "Start date TBD"}
          </p>
          <p className="text-sm font-medium text-muted-foreground">
            {normalizedDueDate ? `Due: ${formatDate(normalizedDueDate)}` : "Due date TBD"}
          </p>
        </div>
        {canEdit && (
          <MilestoneDialog
            projectId={projectId}
            trigger={
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add milestone
              </Button>
            }
          />
        )}
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-gradient-to-b from-slate-50 to-white p-6 text-center text-sm text-muted-foreground">
          No timeline items yet. {canEdit ? "Convert an action to a timeline marker or create a milestone." : ""}
        </div>
      ) : (
        <div className="relative border-l border-slate-200 pl-6">
          {entries.map((entry, index) => {
            const styles = statusStyles[entry.status]
            return (
              <div key={entry.id} className={cn("relative pb-8", index === entries.length - 1 && "pb-0")}>
                <span
                  className={cn(
                    "absolute -left-[9px] top-2 block h-4 w-4 rounded-full border-2 bg-white",
                    styles.dot
                  )}
                />
                <div className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{entry.type === "milestone" ? "Milestone" : "Action"}</Badge>
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", styles.badge)}>
                        {styles.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(entry.date ?? null)}</span>
                  </div>
                  <p className="mt-2 text-base font-semibold text-slate-900">{entry.title}</p>
                  {entry.subtitle && <p className="text-xs text-muted-foreground">{entry.subtitle}</p>}
                  {entry.description && (
                    <p className="mt-2 text-sm text-slate-600">{entry.description}</p>
                  )}
                  {entry.type === "milestone" && canEdit && entry.milestone && (
                    <div className="mt-3">
                      <MilestoneDialog
                        projectId={projectId}
                        milestone={entry.milestone}
                        trigger={
                          <Button variant="ghost" size="sm">
                            Edit milestone
                          </Button>
                        }
                      />
                    </div>
                  )}
                  {entry.type === "action" && (
                    <p className="mt-3 text-xs text-slate-500">
                      Linked action item • manage from the Action Items panel.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(statusStyles).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={cn("inline-block h-2 w-2 rounded-full border", value.dot)} />
            {value.label}
          </div>
        ))}
      </div>
    </div>
  )
}

