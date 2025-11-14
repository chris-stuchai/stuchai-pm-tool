import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { ClientList } from "@/components/clients/ClientList"
import { CreateClientDialog } from "@/components/clients/CreateClientDialog"

async function getClients() {
  const clients = await db.client.findMany({
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      projects: {
        select: {
          id: true,
          name: true,
          status: true,
          progress: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return clients
}

export default async function ClientsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const clients = await getClients()
  const canCreate = session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">Manage your client relationships</p>
        </div>
        {canCreate && <CreateClientDialog />}
      </div>

      <ClientList clients={clients} canEdit={canCreate} />
    </div>
  )
}

