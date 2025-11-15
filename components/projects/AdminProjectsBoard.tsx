"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { ChevronDown, ChevronRight } from "lucide-react"

export interface AdminProjectSummary {
  id: string
  name: string
  status: string
  progress: number
  openTasks: number
  overdueTasks: number
  dueDate?: string | null
  owner?: string | null
  health: {
    label: string
    tone: "success" | "warning" | "destructive" | "info"
  }
}

export interface AdminProjectGroup {
  clientId: string
  clientName: string
  clientEmail?: string | null
  stats: {
    totalProjects: number
    activeProjects: number
    openTasks: number
    overdueProjects: number
  }
  projects: AdminProjectSummary[]
}

interface AdminProjectsBoardProps {
  groups: AdminProjectGroup[]
}

const toneStyles: Record<
  AdminProjectSummary["health"]["tone"],
  string
> = {
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  destructive: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
}

export function AdminProjectsBoard({ groups }: AdminProjectsBoardProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    groups.slice(0, 3).reduce((acc, group) => {
      acc[group.clientId] = true
      return acc
    }, {} as Record<string, boolean>)
  )

  const toggleGroup = (clientId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [clientId]: !prev[clientId],
    }))
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          No projects yet. Use “Create Project” to get started.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isOpen = openGroups[group.clientId]
        return (
          <Card key={group.clientId} className="border border-slate-200">
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleGroup(group.clientId)}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <CardTitle className="text-lg">
                      {group.clientName}
                    </CardTitle>
                    <CardDescription>
                      {group.stats.activeProjects} active •{" "}
                      {group.stats.openTasks} open tasks •{" "}
                      {group.stats.overdueProjects} at risk
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">
                  {group.stats.totalProjects} project
                  {group.stats.totalProjects === 1 ? "" : "s"}
                </Badge>
              </div>
            </CardHeader>
            {isOpen && (
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Project</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 pr-4 font-medium">Health</th>
                      <th className="pb-2 pr-4 font-medium text-right">
                        Progress
                      </th>
                      <th className="pb-2 pr-4 font-medium text-right">
                        Open Tasks
                      </th>
                      <th className="pb-2 pr-4 font-medium">Due</th>
                      <th className="pb-2 font-medium">Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {group.projects.map((project) => (
                      <tr key={project.id} className="align-top">
                        <td className="py-3 pr-4">
                          <div className="font-medium text-gray-900">
                            {project.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID: {project.id.slice(0, 8)}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline">{project.status}</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${toneStyles[project.health.tone]}`}
                          >
                            {project.health.label}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right font-medium">
                          {project.progress}%
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {project.openTasks}
                          {project.overdueTasks > 0 && (
                            <span className="ml-1 text-xs text-red-600">
                              (+{project.overdueTasks} overdue)
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {project.dueDate
                            ? formatDate(project.dueDate)
                            : "—"}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center justify-between gap-2">
                            <span>{project.owner || "—"}</span>
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Link href={`/dashboard/projects/${project.id}`}>
                                Open
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}

