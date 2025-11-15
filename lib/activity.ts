import { db } from "./db"
import { ActivityEntityType } from "@prisma/client"

interface ActivityPayload {
  entityType: ActivityEntityType
  entityId: string
  action: string
  changes?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  userId?: string | null
}

export async function logActivity({
  entityType,
  entityId,
  action,
  changes,
  metadata,
  userId,
}: ActivityPayload) {
  try {
    await db.activityLog.create({
      data: {
        entityType,
        entityId,
        action,
        changes: changes ?? undefined,
        metadata: metadata ?? undefined,
        createdBy: userId ?? undefined,
      },
    })
  } catch (error) {
    console.error("Failed to log activity", error)
  }
}

