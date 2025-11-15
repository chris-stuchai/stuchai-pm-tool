import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { uploadToS3 } from "@/lib/storage"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file")
    const folder = formData.get("folder")?.toString() || "uploads"

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")
    const key = `${folder}/${session.user.id}/${Date.now()}-${safeName}`
    const url = await uploadToS3(buffer, key, file.type)

    return NextResponse.json({
      url,
      key,
      name: file.name,
      mimeType: file.type,
      size: file.size,
    })
  } catch (error) {
    console.error("Upload failed", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
