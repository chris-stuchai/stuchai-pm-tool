import { NextRequest, NextResponse } from "next/server"
import { checkOverdueItems, checkDueSoon } from "@/lib/reminders"

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if set
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [overdueCount, dueSoonCount] = await Promise.all([
      checkOverdueItems(),
      checkDueSoon(),
    ])

    return NextResponse.json({
      success: true,
      overdue: overdueCount,
      dueSoon: dueSoonCount,
    })
  } catch (error) {
    console.error("Error running reminder cron:", error)
    return NextResponse.json(
      { error: "Failed to run reminders" },
      { status: 500 }
    )
  }
}

// Ensure this route is dynamic (not statically generated)
export const dynamic = 'force-dynamic'

