import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")

    const where: any = {}
    if (clientId) {
      where.clientId = clientId
    } else if (session.user.role === UserRole.CLIENT) {
      const client = await db.client.findFirst({
        where: { email: session.user.email?.toLowerCase() ?? "" },
        select: { id: true },
      })
      if (!client) {
        return NextResponse.json([], { status: 200 })
      }
      where.clientId = client.id
    } else if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const contracts = await db.contract.findMany({
      where,
      include: {
        invoices: {
          orderBy: { dueDate: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(contracts)
  } catch (error) {
    console.error("Contracts fetch failed:", error)
    return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MANAGER)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { clientId, name, amount, currency, startDate, endDate, recurrence, paymentMethod, notes } = body
    if (!clientId || !name || !amount || !startDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const contract = await db.contract.create({
      data: {
        clientId,
        name,
        amount,
        currency: currency || "USD",
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        recurrence: recurrence || null,
        paymentMethod: paymentMethod || "Chase",
        notes: notes || null,
      },
      include: {
        invoices: true,
      },
    })

    return NextResponse.json(contract, { status: 201 })
  } catch (error) {
    console.error("Contract creation failed:", error)
    return NextResponse.json({ error: "Failed to create contract" }, { status: 500 })
  }
}

