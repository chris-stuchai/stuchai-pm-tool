import { ActionItemStatus, Milestone, ProjectStatus } from "@prisma/client"

interface ProgressSource {
  actionItems: { status: ActionItemStatus }[]
  milestones: { completedAt: Date | null }[]
  status?: ProjectStatus
}

export function calculateProjectProgress(source: ProgressSource) {
  if (source.status === ProjectStatus.COMPLETED) {
    return 100
  }

  const totalSegments = source.actionItems.length + source.milestones.length
  if (totalSegments === 0) {
    return 0
  }

  const completedActionItems = source.actionItems.filter(
    (item) => item.status === ActionItemStatus.COMPLETED
  ).length
  const completedMilestones = source.milestones.filter((m) => !!m.completedAt).length

  const progress = Math.round(
    ((completedActionItems + completedMilestones) / totalSegments) * 100
  )

  return Math.min(100, Math.max(0, progress))
}

