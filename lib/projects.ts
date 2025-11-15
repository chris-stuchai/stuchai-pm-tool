import { ActionItemStatus, Milestone } from "@prisma/client"

interface ProgressSource {
  actionItems: { status: ActionItemStatus }[]
  milestones: { completedAt: Date | null }[]
}

export function calculateProjectProgress(source: ProgressSource) {
  const totalSegments = source.actionItems.length + source.milestones.length
  if (totalSegments === 0) {
    return 0
  }

  const completedActionItems = source.actionItems.filter(
    (item) => item.status === ActionItemStatus.COMPLETED
  ).length
  const completedMilestones = source.milestones.filter((m) => !!m.completedAt).length

  return Math.round(((completedActionItems + completedMilestones) / totalSegments) * 100)
}

