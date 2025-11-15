"use client"

import { cn } from "@/lib/utils"
import { MilestoneDialog } from "./MilestoneDialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useMemo } from "react"

interface TimelineMilestone {
  id: string
  name: string
  description: string | null
  dueDate: Date | null
  completedAt: Date | null
}

interface ProjectTimelineProps {
  projectId: string
  milestones: TimelineMilestone[]
  startDate?: Date | null
  dueDate?: Date | null
  canEdit: boolean
}

function getStatus(milestone: TimelineMilestone) {
  if (milestone.completedAt) {
    return "completed" as const
  }
  if (milestone.dueDate && milestone.dueDate < new Date()) {
    return "in-progress" as const
  }
  return "upcoming" as const
}

function formatDate(value: Date | null) {
  if (!value) return "TBD"
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

export function ProjectTimeline({
  projectId,
  milestones,
  startDate,
  dueDate,
  canEdit,
}: ProjectTimelineProps) {
  const normalizedStartDate = startDate ? new Date(startDate) : null
  const normalizedDueDate = dueDate ? new Date(dueDate) : null

  const normalizedMilestones = useMemo(
    () =>
      milestones.map((m) => ({
        ...m,
        dueDate: m.dueDate ? new Date(m.dueDate) : null,
        completedAt: m.completedAt ? new Date(m.completedAt) : null,
      })),
    [milestones]
  )

  const sorted = useMemo(() => {
    return [...normalizedMilestones].sort((a, b) => {
      const aDate = a.dueDate ? a.dueDate.getTime() : Infinity
      const bDate = b.dueDate ? b.dueDate.getTime() : Infinity
      return aDate - bDate
    })
  }, [normalizedMilestones])

  const now = new Date()
  const progressRatio = (() => {
    if (!normalizedStartDate || !normalizedDueDate) return null
    const total = normalizedDueDate.getTime() - normalizedStartDate.getTime()
    if (total <= 0) return null
    const elapsed = Math.min(Math.max(now.getTime() - normalizedStartDate.getTime(), 0), total)
    return elapsed / total
  })()

  const timelinePoints = sorted.length > 0 ? sorted : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
                Add Milestone
              </Button>
            }
          />
        )}
      </div>
      <div className="relative mt-6">
        <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full bg-muted" />
        {progressRatio !== null && (
          <div
            className="absolute top-0 bottom-0 w-px bg-primary/40"
            style={{ left: `${Math.min(Math.max(progressRatio * 100, 0), 100)}%` }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-medium text-primary">
              Today
            </div>
          </div>
        )}
        <div className="relative flex w-full items-start justify-between">
          {timelinePoints.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No milestones yet. {canEdit ? "Add one to build the timeline." : ""}
            </p>
          ) : (
            timelinePoints.map((milestone) => {
              const status = getStatus(milestone)
              return (
                <div
                  key={milestone.id}
                  className="flex flex-col items-center text-center"
                  style={{ minWidth: `${100 / Math.max(timelinePoints.length, 1)}%` }}
                >
                    {canEdit ? (
                      <MilestoneDialog
                        projectId={projectId}
                        milestone={milestone}
                        trigger={
                          <button
                            className={cn(
                              "relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition",
                              status === "completed" && "border-green-500 bg-green-500 text-white",
                              status === "in-progress" && "border-blue-500 bg-blue-500 text-white",
                              status === "upcoming" && "border-gray-300 bg-white text-muted-foreground"
                            )}
                          >
                            <span className="text-xs font-semibold">
                              {status === "completed" ? "✓" : "•"}
                            </span>
                          </button>
                        }
                      />
                    ) : (
                      <div
                        className={cn(
                          "relative flex h-8 w-8 items-center justify-center rounded-full border-2",
                          status === "completed" && "border-green-500 bg-green-500 text-white",
                          status === "in-progress" && "border-blue-500 bg-blue-500 text-white",
                          status === "upcoming" && "border-gray-300 bg-white text-muted-foreground"
                        )}
                      >
                        <span className="text-xs font-semibold">
                          {status === "completed" ? "✓" : "•"}
                        </span>
                      </div>
                    )}
                  <div className="mt-2 text-sm font-medium text-foreground">
                    {milestone.name}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(milestone.dueDate)}</p>
                  {milestone.description && (
                    <p className="mt-1 text-xs text-muted-foreground max-w-[140px]">
                      {milestone.description}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>
        <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            Completed
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            In Progress
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
            Upcoming
          </div>
        </div>
      </div>
    </div>
  )
}

