import { NextResponse } from "next/server"

/**
 * Health check endpoint for Railway deployment
 * Railway uses this to verify the app is running
 * This endpoint must return 200 OK for Railway to consider the deployment successful
 */
export async function GET() {
  try {
    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "stuchai-pm-tool",
        uptime: process.uptime(),
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: "Health check failed" },
      { status: 500 }
    )
  }
}

// Ensure this route is dynamic (not statically generated)
export const dynamic = 'force-dynamic'

