import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listDriveFiles } from "@/lib/google/drive"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const folderId = searchParams.get("folderId") || undefined

    const files = await listDriveFiles(session.user.id, folderId)

    return NextResponse.json(files)
  } catch (error: any) {
    console.error("Error fetching Drive files:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch Drive files" },
      { status: 500 }
    )
  }
}

// Ensure this route is dynamic (not statically generated)
export const dynamic = 'force-dynamic'

