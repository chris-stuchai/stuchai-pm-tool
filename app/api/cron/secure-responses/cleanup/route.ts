import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { SecureRetentionPolicy } from "@prisma/client"

export async function GET() {
  try {
    const now = Date.now()
    const responses = await db.actionSecureResponse.findMany({
      where: {
        actionItem: {
          secureRetentionPolicy: SecureRetentionPolicy.EXPIRE_AFTER_HOURS,
          secureExpireAfterHours: {
            not: null,
          },
        },
      },
      include: {
        actionItem: {
          select: {
            id: true,
            secureExpireAfterHours: true,
          },
        },
      },
    })

    let deleted = 0
    for (const response of responses) {
      const hours = response.actionItem.secureExpireAfterHours ?? 0
      const expiresAt = new Date(response.createdAt).getTime() + hours * 60 * 60 * 1000
      if (hours > 0 && now > expiresAt) {
        await db.actionSecureResponse.delete({
          where: { actionItemId: response.actionItemId },
        })
        deleted += 1
      }
    }

    return NextResponse.json({ deleted })
  } catch (error) {
    console.error("Secure response cleanup failed:", error)
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 })
  }
}

