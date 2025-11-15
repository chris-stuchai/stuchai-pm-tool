"use client"

import { useMemo, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { ClientMessages } from "@/components/clients/ClientMessages"

interface ClientSummary {
  id: string
  name: string
  email: string
}

interface AdminMessagesPanelProps {
  clients: ClientSummary[]
  currentUserId: string
}

export function AdminMessagesPanel({ clients, currentUserId }: AdminMessagesPanelProps) {
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? "")

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId),
    [clients, selectedClientId]
  )

  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No active clients available yet. Create a client to start messaging.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Select a client to view the conversation</p>
        </div>
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="md:w-80">
            <SelectValue placeholder="Choose a client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name} • {client.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedClient ? (
        <ClientMessages
          clientId={selectedClient.id}
          currentUserId={currentUserId}
          isClientActive
        />
      ) : null}
    </div>
  )
}

