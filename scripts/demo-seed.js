/* eslint-disable no-console */
const bcrypt = require("bcryptjs")
const { PrismaClient, Priority, UserRole } = require("@prisma/client")

const db = new PrismaClient()

async function seedDemoData() {
  console.log("Seeding StuchAI demo workspace...")

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

  await db.user.upsert({
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

  let demoClient = await db.client.findFirst({
    where: { email: "client.demo@stuchai.com" },
  })

  if (demoClient) {
    demoClient = await db.client.update({
      where: { id: demoClient.id },
      data: {
        name: "Demo Holdings",
        company: "Demo Holdings LLC",
        createdBy: demoAdmin.id,
      },
    })
  } else {
    demoClient = await db.client.create({
      data: {
        email: "client.demo@stuchai.com",
        name: "Demo Holdings",
        company: "Demo Holdings LLC",
        createdBy: demoAdmin.id,
      },
    })
  }

  const existingProject = await db.project.findFirst({
    where: { clientId: demoClient.id, name: "Website Refresh" },
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
    where: { projectId: project.id },
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

  console.log("Demo admin:", "demo.admin@stuchai.com")
  console.log("Demo client:", "client.demo@stuchai.com")
}

seedDemoData()
  .then(() => console.log("Demo data ready."))
  .catch((error) => {
    console.error("Failed to seed demo data:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })

