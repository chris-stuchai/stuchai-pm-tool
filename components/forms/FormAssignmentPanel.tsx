"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"

interface ClientOption {
  id: string
  name: string
  company: string | null
}

interface ProjectOption {
  id: string
  name: string
  clientId: string
}

interface TemplateOption {
  id: string
  name: string
}

interface FormAssignmentPanelProps {
  clients: ClientOption[]
  projects: ProjectOption[]
  templates: TemplateOption[]
}

export function FormAssignmentPanel({ clients, projects, templates }: FormAssignmentPanelProps) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "")
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "")
  const [projectId, setProjectId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const filteredClients = clients.filter((client) =>
    `${client.name} ${client.company ?? ""}`.toLowerCase().includes(search.toLowerCase())
  )

  const handleAssign = () => {
    if (!templateId || !clientId) {
      setError("Select both a template and a client.")
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        const response = await fetch("/api/forms/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId,
            clientId,
            projectId: projectId || undefined,
          }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || "Failed to assign form")
        }

        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to assign form.")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Forms</CardTitle>
        <CardDescription>Send questionnaires or checklists to clients.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Template</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger>
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Client</Label>
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={clientId} onValueChange={(value) => setClientId(value)}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {filteredClients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                  {client.company ? ` — ${client.company}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Project (optional)</Label>
          <Select
            value={projectId || ""}
            onValueChange={(value) => setProjectId(value || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Link to a project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No project</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={handleAssign} disabled={pending || templates.length === 0 || clients.length === 0}>
          {pending ? "Assigning..." : "Assign Form"}
        </Button>
      </CardContent>
    </Card>
  )
}

