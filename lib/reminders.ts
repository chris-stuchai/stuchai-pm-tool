import { db } from "./db"
import { sendActionItemReminder } from "./google/gmail"
import { ActionItemStatus } from "@prisma/client"

/**
 * Check for overdue action items and send reminders
 */
export async function checkOverdueItems() {
  const overdueItems = await db.actionItem.findMany({
    where: {
      status: {
        not: ActionItemStatus.COMPLETED,
      },
      dueDate: {
        lt: new Date(),
      },
      assignedTo: {
        not: null,
      },
    },
    include: {
      assignee: true,
      project: {
        include: {
          client: {
            select: {
              name: true,
            },
          },
        },
      },
      creator: true,
    },
  })

  for (const item of overdueItems) {
    // Update status to OVERDUE if not already
    if (item.status !== ActionItemStatus.OVERDUE) {
      await db.actionItem.update({
        where: { id: item.id },
        data: { status: ActionItemStatus.OVERDUE },
      })
    }

    // Create notification
    await db.notification.create({
      data: {
        type: "ACTION_ITEM_OVERDUE",
        message: `Action item is overdue: ${item.title}`,
        userId: item.assignedTo!,
        actionItemId: item.id,
      },
    })

    // Try to send email if creator has Gmail access
    if (item.assignee && item.creator) {
      try {
        await sendActionItemReminder(
          item.creator.id,
          {
            title: item.title,
            description: item.description,
            dueDate: item.dueDate,
            priority: item.priority,
            project: item.project
              ? {
                  name: item.project.name,
                  client: { name: item.project.client.name },
                }
              : null,
          },
          item.assignee.email
        )
      } catch (error) {
        console.error(`Failed to send email reminder for item ${item.id}:`, error)
        // Continue with other items even if one fails
      }
    }
  }

  return overdueItems.length
}

/**
 * Check for items due soon (within 24 hours) and send reminders
 */
export async function checkDueSoon() {
  const tomorrow = new Date()
  tomorrow.setHours(24, 0, 0, 0)

  const dueSoonItems = await db.actionItem.findMany({
    where: {
      status: {
        not: ActionItemStatus.COMPLETED,
      },
      dueDate: {
        gte: new Date(),
        lte: tomorrow,
      },
      assignedTo: {
        not: null,
      },
    },
    include: {
      assignee: true,
      project: {
        include: {
          client: {
            select: {
              name: true,
            },
          },
        },
      },
      creator: true,
    },
  })

  for (const item of dueSoonItems) {
    // Check if notification already exists
    const existingNotification = await db.notification.findFirst({
      where: {
        type: "ACTION_ITEM_DUE_SOON",
        actionItemId: item.id,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
        },
      },
    })

    if (!existingNotification) {
      // Create notification
      await db.notification.create({
        data: {
          type: "ACTION_ITEM_DUE_SOON",
          message: `Action item due soon: ${item.title}`,
          userId: item.assignedTo!,
          actionItemId: item.id,
        },
      })

      // Try to send email if creator has Gmail access
      if (item.assignee && item.creator) {
        try {
          await sendActionItemReminder(
            item.creator.id,
            {
              title: item.title,
              description: item.description,
              dueDate: item.dueDate,
              priority: item.priority,
              project: item.project
                ? {
                    name: item.project.name,
                    client: { name: item.project.client.name },
                  }
                : null,
            },
            item.assignee.email
          )
        } catch (error) {
          console.error(`Failed to send email reminder for item ${item.id}:`, error)
        }
      }
    }
  }

  return dueSoonItems.length
}

