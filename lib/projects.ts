import { ActionItemStatus, ProjectStatus } from "@prisma/client"

interface ProgressSource {
  actionItems: { status: ActionItemStatus }[]
  milestones: { completedAt: Date | null }[]
  status?: ProjectStatus
  startDate?: Date | null
  dueDate?: Date | null
  progress?: number | null
}

function getTaskRatio(source: ProgressSource) {
  const totalSegments = source.actionItems.length + source.milestones.length
  if (totalSegments === 0) {
    // fall back to stored progress if available
    return typeof source.progress === "number" ? source.progress / 100 : 0
  }

  const completedActionItems = source.actionItems.filter(
    (item) => item.status === ActionItemStatus.COMPLETED
  ).length
  const completedMilestones = source.milestones.filter((m) => !!m.completedAt).length

  return (completedActionItems + completedMilestones) / totalSegments
}

function getTimeRatio(startDate?: Date | null, dueDate?: Date | null) {
  if (!dueDate) {
    return 0
  }

  const start = startDate ?? new Date(new Date(dueDate).getTime() - 1000 * 60 * 60 * 24 * 30)
  const now = new Date()

  if (now <= start) {
    return 0
  }

  const totalMs = new Date(dueDate).getTime() - new Date(start).getTime()
  if (totalMs <= 0) {
    return 1
  }

  const elapsedMs = Math.min(now.getTime() - new Date(start).getTime(), totalMs)
  return elapsedMs / totalMs
}

export function calculateProjectProgress(source: ProgressSource) {
  if (source.status === ProjectStatus.COMPLETED) {
    return 100
  }

  const taskRatio = getTaskRatio(source)
  const timeRatio = getTimeRatio(source.startDate, source.dueDate)

  // Weight tasks more heavily than pure time
  const weighted = taskRatio * 0.7 + timeRatio * 0.3
  const computed = Math.round(weighted * 100)

  // Prevent showing 100% until manually completed
  return Math.max(0, Math.min(99, computed))
}

