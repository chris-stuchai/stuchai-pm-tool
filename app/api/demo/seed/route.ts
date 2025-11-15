import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { UserRole, Priority } from "@prisma/client"

export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminPassword = process.env.DEMO_ADMIN_PASSWORD || "DemoAdmin!234"
    const clientPassword = process.env.DEMO_CLIENT_PASSWORD || "DemoClient!234"
    const adminHash = await bcrypt.hash(adminPassword, 10)
    const clientHash = await bcrypt.hash(clientPassword, 10)

    const demoAdmin = await db.user.upsert({
      where: { email: "demo.admin@stuchai.com" },
      update: {
        name: "Demo Admin",
        role: UserRole.ADMIN,
        password: adminHash,
        active: true,
      },
      create: {
        email: "demo.admin@stuchai.com",
        name: "Demo Admin",
        role: UserRole.ADMIN,
        password: adminHash,
        active: true,
      },
    })

    const demoClientUser = await db.user.upsert({
      where: { email: "client.demo@stuchai.com" },
      update: {
        name: "Demo Client",
        role: UserRole.CLIENT,
        password: clientHash,
        active: true,
      },
      create: {
        email: "client.demo@stuchai.com",
        name: "Demo Client",
        role: UserRole.CLIENT,
        password: clientHash,
        active: true,
      },
    })

    const demoClient = await db.client.upsert({
      where: { email: "client.demo@stuchai.com" },
      update: {
        name: "Demo Holdings",
        company: "Demo Holdings LLC",
        createdBy: demoAdmin.id,
      },
      create: {
        email: "client.demo@stuchai.com",
        name: "Demo Holdings",
        company: "Demo Holdings LLC",
        createdBy: demoAdmin.id,
      },
    })

    const existingProject = await db.project.findFirst({
      where: {
        clientId: demoClient.id,
        name: "Website Refresh",
      },
    })

    const project = existingProject
      ? await db.project.update({
          where: { id: existingProject.id },
          data: {
            description: "Full-funnel marketing site revamp with automations.",
            status: "IN_PROGRESS",
            startDate: new Date(),
          },
        })
      : await db.project.create({
          data: {
            name: "Website Refresh",
            description: "Full-funnel marketing site revamp with automations.",
            status: "IN_PROGRESS",
            clientId: demoClient.id,
            createdBy: demoAdmin.id,
            startDate: new Date(),
          },
        })

    await db.actionItem.deleteMany({
      where: {
        projectId: project.id,
      },
    })

    const actionA = await db.actionItem.create({
      data: {
        title: "Upload brand assets",
        description: "Share logo, fonts, and brand guidelines.",
        priority: Priority.HIGH,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        projectId: project.id,
        createdBy: demoAdmin.id,
        visibleToClient: true,
        clientCanComplete: true,
      },
    })

    await db.actionItem.create({
      data: {
        title: "Map integrations",
        description: "List every system that needs to connect to the portal.",
        priority: Priority.MEDIUM,
        projectId: project.id,
        createdBy: demoAdmin.id,
        assignedTo: demoAdmin.id,
        showOnTimeline: true,
        timelineLabel: "Integration scope",
      },
    })

    await db.actionItem.update({
      where: { id: actionA.id },
      data: {
        requiresSecureResponse: true,
        securePrompt: "Please share Squarespace credentials for staging.",
        secureFieldType: "SECRET",
        secureRetentionPolicy: "EXPIRE_AFTER_VIEW",
      },
    })

    return NextResponse.json({
      success: true,
      admin: {
        email: "demo.admin@stuchai.com",
        password: adminPassword,
      },
      client: {
        email: "client.demo@stuchai.com",
        password: clientPassword,
      },
    })
  } catch (error) {
    console.error("Demo seed failed:", error)
    return NextResponse.json({ error: "Failed to seed demo data" }, { status: 500 })
  }
}

