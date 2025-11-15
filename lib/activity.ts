import { db } from "./db"
import { ActivityEntityType, Prisma } from "@prisma/client"

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
    const changePayload = changes == null ? undefined : (changes as Prisma.InputJsonValue)
    const metadataPayload = metadata == null ? undefined : (metadata as Prisma.InputJsonValue)

    await db.activityLog.create({
      data: {
        entityType,
        entityId,
        action,
        changes: changePayload,
        metadata: metadataPayload,
        createdBy: userId ?? undefined,
      },
    })
  } catch (error) {
    console.error("Failed to log activity", error)
  }
}

