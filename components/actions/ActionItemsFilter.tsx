"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ActionItemList } from "./ActionItemList"
import { AdminActionBoard } from "./AdminActionBoard"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ActionItem {
  id: string
  title: string
  description: string | null
  status: string
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  dueDate: string | Date | null
  assignee: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
  project: {
    id: string
    name: string
    client: {
      id?: string
      name: string
    }
  } | null
  visibleToClient?: boolean
  clientCanComplete?: boolean
  clientCompleted?: boolean
  showOnTimeline?: boolean
  timelineLabel?: string | null
  requiresSecureResponse?: boolean
  securePrompt?: string | null
  secureFieldType?: "SHORT_TEXT" | "LONG_TEXT" | "SECRET" | null
  secureResponse?: {
    id: string
    submittedBy?: string | null
    createdAt: string | Date
    updatedAt: string | Date
  } | null
  attachments?: Array<{
    id: string
    name: string
    url: string
    mimeType?: string | null
    size?: number | null
  }>
}

type Role = "ADMIN" | "MANAGER" | "CLIENT"

interface ActionItemsFilterProps {
  initialItems: ActionItem[]
  canEdit: boolean
  currentUserRole: Role
  currentUserId: string
}

export function ActionItemsFilter({
  initialItems,
  canEdit,
  currentUserRole,
  currentUserId,
}: ActionItemsFilterProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [projectFilter, setProjectFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredItems = useMemo(() => {
    let filtered = [...initialItems]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.project?.name.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter)
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter(
        (item) => (item.priority || "MEDIUM") === priorityFilter
      )
    }

    // Project filter
    if (projectFilter !== "all") {
      if (projectFilter === "none") {
        filtered = filtered.filter((item) => !item.project)
      } else {
        filtered = filtered.filter((item) => item.project?.id === projectFilter)
      }
    }

    return filtered
  }, [initialItems, statusFilter, priorityFilter, projectFilter, searchQuery])

  const projects = useMemo(() => {
    const projectMap = new Map()
    initialItems.forEach((item) => {
      if (item.project) {
        projectMap.set(item.project.id, item.project)
      }
    })
    return Array.from(projectMap.values())
  }, [initialItems])

  const isClientView = currentUserRole === "CLIENT"

  const myTasks = useMemo(() => {
    if (!isClientView) return filteredItems
    return filteredItems.filter(
      (item) =>
        item.assignee?.id === currentUserId ||
        (item.visibleToClient && item.clientCanComplete)
    )
  }, [filteredItems, isClientView, currentUserId])

  const teamTasks = useMemo(() => {
    if (!isClientView) return []
    const myTaskIds = new Set(myTasks.map((task) => task.id))
    return filteredItems.filter((item) => !myTaskIds.has(item.id))
  }, [filteredItems, isClientView, myTasks])

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search action items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  <SelectItem value="none">Global (No Project)</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isClientView ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">My Tasks • Need My Attention</h2>
                <p className="text-sm text-muted-foreground">
                  Tasks assigned to you or items your team asked you to complete.
                </p>
              </div>
              <ActionItemList
                actionItems={myTasks}
                canEdit={false}
                currentUserRole={currentUserRole}
                currentUserId={currentUserId}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">What Your StuchAI Team Is Working On</h2>
                <p className="text-sm text-muted-foreground">
                  Transparent view of internal tasks so you know what&apos;s in progress.
                </p>
              </div>
              <ActionItemList
                actionItems={teamTasks}
                canEdit={false}
                currentUserRole={currentUserRole}
                currentUserId={currentUserId}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <AdminActionBoard
          items={filteredItems}
          canEdit={canEdit}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  )
}

