"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, CheckCircle2, Circle, Clock, Trash2 } from "lucide-react"
import { CreatePersonalTaskDialog } from "./CreatePersonalTaskDialog"
import { formatDate } from "@/lib/utils"

interface PersonalTask {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: Date | null
  completedAt: Date | null
  createdAt: Date
}

interface PersonalTasksListProps {
  userId: string
}

export function PersonalTasksList({ userId }: PersonalTasksListProps) {
  const [tasks, setTasks] = useState<PersonalTask[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/personal-tasks")
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const handleToggleStatus = async (task: PersonalTask) => {
    const newStatus = task.status === "COMPLETED" ? "PENDING" : "COMPLETED"
    
    try {
      const response = await fetch(`/api/personal-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchTasks()
      }
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return

    try {
      const response = await fetch(`/api/personal-tasks/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchTasks()
      }
    } catch (error) {
      console.error("Error deleting task:", error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "destructive"
      case "HIGH":
        return "default"
      case "MEDIUM":
        return "secondary"
      default:
        return "outline"
    }
  }

  const pendingTasks = tasks.filter((t) => t.status !== "COMPLETED")
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED")

  if (loading) {
    return <div>Loading tasks...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {pendingTasks.length} active • {completedTasks.length} completed
          </p>
        </div>
        <CreatePersonalTaskDialog onTaskCreated={fetchTasks} />
      </div>

      <div className="space-y-4">
        {pendingTasks.length === 0 && completedTasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No tasks yet. Create your first task!</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {pendingTasks.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Active Tasks</h2>
                {pendingTasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="mt-0.5"
                          onClick={() => handleToggleStatus(task)}
                        >
                          <Circle className="h-5 w-5" />
                        </Button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{task.title}</h3>
                            <Badge variant={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {task.dueDate && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Due {formatDate(task.dueDate)}
                              </div>
                            )}
                            <span>Created {formatDate(task.createdAt)}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(task.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {completedTasks.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-muted-foreground">Completed</h2>
                {completedTasks.map((task) => (
                  <Card key={task.id} className="opacity-60">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="mt-0.5"
                          onClick={() => handleToggleStatus(task)}
                        >
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </Button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium line-through">{task.title}</h3>
                            <Badge variant="outline">{task.priority}</Badge>
                          </div>
                          {task.completedAt && (
                            <p className="text-xs text-muted-foreground">
                              Completed {formatDate(task.completedAt)}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(task.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

