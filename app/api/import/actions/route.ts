import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { parse } from "csv-parse/sync"
import { Buffer } from "buffer"
import {
  ProjectStatus,
  Priority,
  UserRole,
  Prisma,
} from "@prisma/client"
import { logActivity } from "@/lib/activity"

export const runtime = "nodejs"

const REQUIRED_COLUMNS = [
  "Client Email",
  "Project Name",
  "Action Title",
]

const projectStatusMap = new Set(Object.keys(ProjectStatus))
const priorityMap = new Set(Object.keys(Priority))

function parseDate(value?: string | null) {
  if (!value) return null
  const normalized = value.trim()
  if (!normalized) return null
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseBoolean(value?: string | null) {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === "true" || normalized === "yes" || normalized === "1"
}

function normalizeHeading(heading: string) {
  return heading.trim()
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (
      !session?.user ||
      (session.user.role !== UserRole.ADMIN &&
        session.user.role !== UserRole.MANAGER)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file && typeof (file as any).arrayBuffer === "function")) {
      return NextResponse.json(
        { error: "CSV file is required" },
        { status: 400 }
      )
    }

    const csvText =
      typeof (file as any).text === "function"
        ? await (file as any).text()
        : Buffer.from(await (file as any).arrayBuffer()).toString("utf-8")

    let rows: Record<string, string>[]
    try {
      rows = parse(csvText, {
        columns: (header: string[]) => header.map((col) => normalizeHeading(col)),
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[]
    } catch (error) {
      console.error("CSV parse error", error)
      return NextResponse.json(
        { error: "Failed to parse CSV. Please check the format." },
        { status: 400 }
      )
    }

    if (!rows.length) {
      return NextResponse.json(
        { error: "CSV file is empty." },
        { status: 400 }
      )
    }

    const missingColumns = REQUIRED_COLUMNS.filter(
      (column) => !(column in rows[0])
    )

    if (missingColumns.length > 0) {
      return NextResponse.json(
        {
          error: `CSV is missing required columns: ${missingColumns.join(
            ", "
          )}`,
        },
        { status: 400 }
      )
    }

    const summary = {
      clientsCreated: 0,
      projectsCreated: 0,
      actionItemsCreated: 0,
      duplicatesSkipped: 0,
      rowsProcessed: 0,
      errors: [] as string[],
    }

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2 // account for header row
      try {
        summary.rowsProcessed += 1
        const clientEmail = row["Client Email"]?.toLowerCase()
        if (!clientEmail) {
          throw new Error("Client Email is required")
        }

        let client = await db.client.findFirst({
          where: { email: clientEmail },
        })

        if (!client) {
          client = await db.client.create({
            data: {
              email: clientEmail,
              name: row["Client Name"] || clientEmail,
              company: row["Client Company"] || null,
              createdBy: session.user.id,
            },
          })
          summary.clientsCreated += 1
        }

        const projectName = row["Project Name"]
        if (!projectName) {
          throw new Error("Project Name is required")
        }

        const projectStatusRaw =
          row["Project Status"]?.toUpperCase() || "PLANNING"
        const projectStatus = projectStatusMap.has(projectStatusRaw)
          ? (projectStatusRaw as ProjectStatus)
          : ProjectStatus.PLANNING

        let project = await db.project.findFirst({
          where: {
            name: projectName,
            clientId: client.id,
          },
        })

        if (!project) {
          project = await db.project.create({
            data: {
              name: projectName,
              description: row["Project Description"] || null,
              status: projectStatus,
              dueDate: parseDate(row["Project Due Date (YYYY-MM-DD)"]),
              startDate: parseDate(row["Project Start Date (YYYY-MM-DD)"]),
              progress: 0,
              clientId: client.id,
              createdBy: session.user.id,
            },
          })
          summary.projectsCreated += 1
        }

        const actionTitle = row["Action Title"]
        if (!actionTitle) {
          throw new Error("Action Title is required")
        }

        const priorityRaw = row["Action Priority"]?.toUpperCase() || "MEDIUM"
        const priority = priorityMap.has(priorityRaw)
          ? (priorityRaw as Priority)
          : Priority.MEDIUM

        const existingAction = await db.actionItem.findFirst({
          where: {
            projectId: project.id,
            title: actionTitle,
          },
          select: { id: true },
        })

        if (existingAction) {
          summary.duplicatesSkipped += 1
          continue
        }

        const actionItem = await db.actionItem.create({
          data: {
            title: actionTitle,
            description: row["Action Description"] || null,
            priority,
            dueDate: parseDate(row["Action Due Date (YYYY-MM-DD)"]),
            projectId: project.id,
            createdBy: session.user.id,
            visibleToClient: parseBoolean(
              row["Visible To Client (true/false)"]
            ),
            clientCanComplete: parseBoolean(
              row["Client Can Complete (true/false)"]
            ),
            showOnTimeline: parseBoolean(
              row["Add To Timeline (true/false)"]
            ),
            timelineLabel: row["Timeline Note"]?.trim() || null,
          },
        })

        summary.actionItemsCreated += 1

        await logActivity({
          entityType: "ACTION_ITEM",
          entityId: actionItem.id,
          action: "BULK_IMPORTED",
          metadata: {
            source: "CSV",
            uploadRow: rowNumber,
          },
          userId: session.user.id,
        })
      } catch (error: any) {
        summary.errors.push(
          `Row ${rowNumber}: ${error?.message || "Unknown error"}`
        )
      }
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error("Bulk import failed", error)
    return NextResponse.json(
      { error: "Bulk import failed" },
      { status: 500 }
    )
  }
}

