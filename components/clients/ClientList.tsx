"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { Edit, Mail, Building2 } from "lucide-react"
import { EditClientDialog } from "./EditClientDialog"
import { ClientStatusToggle } from "./ClientStatusToggle"
import { useState } from "react"

interface Client {
  id: string
  name: string
  email: string
  company: string | null
  phone: string | null
  notes: string | null
  createdAt: Date
  active: boolean
  projects: Array<{
    id: string
    name: string
    status: string
    progress: number
  }>
}

interface ClientListProps {
  clients: Client[]
  canEdit: boolean
}

export function ClientList({ clients, canEdit }: ClientListProps) {
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No clients yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Create your first client to get started
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {clients.map((client) => (
          <Card key={client.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                    <Badge variant={client.active ? "secondary" : "destructive"}>
                      {client.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Mail className="h-3 w-3" />
                    {client.email}
                  </CardDescription>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <ClientStatusToggle clientId={client.id} isActive={client.active} />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingClient(client)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {client.company && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{client.company}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Projects</span>
                  <Badge variant="secondary">{client.projects.length}</Badge>
                </div>
                <div className="pt-2 border-t">
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/dashboard/clients/${client.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {editingClient && (
        <EditClientDialog
          client={editingClient}
          open={!!editingClient}
          onOpenChange={(open) => !open && setEditingClient(null)}
        />
      )}
    </>
  )
}

