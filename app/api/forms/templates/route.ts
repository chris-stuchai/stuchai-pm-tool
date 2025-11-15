import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, FormFieldType, Prisma } from "@prisma/client"

export async function GET() {
  try {
    const templates = await db.formTemplate.findMany({
      include: {
        fields: {
          orderBy: { order: "asc" },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    return NextResponse.json(templates)
  } catch (error) {
    console.error("Error fetching form templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch form templates" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, fields } = body as {
      name?: string
      description?: string
      fields?: Array<{
        label: string
        type: string
        required?: boolean
        options?: string[]
      }>
    }

    if (!name || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { error: "Name and at least one field are required." },
        { status: 400 }
      )
    }

    const created = await db.formTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        createdBy: session.user.id,
        fields: {
          create: fields.map((field, index) => ({
            label: field.label.trim(),
            type: field.type as FormFieldType,
            required: Boolean(field.required),
            options: field.options?.length
              ? (field.options as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            order: index,
          })),
        },
      },
      include: {
        fields: {
          orderBy: { order: "asc" },
        },
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Error creating form template:", error)
    return NextResponse.json(
      { error: "Failed to create form template" },
      { status: 500 }
    )
  }
}

