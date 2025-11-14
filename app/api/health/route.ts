import { NextResponse } from "next/server"

/**
 * Health check endpoint for Railway deployment
 * Railway uses this to verify the app is running
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "stuchai-pm-tool",
    },
    { status: 200 }
  )
}

