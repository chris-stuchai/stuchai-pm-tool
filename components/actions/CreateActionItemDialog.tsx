"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const actionItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  projectId: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  dueDate: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
})

type ActionItemFormData = z.infer<typeof actionItemSchema>

interface CreateActionItemDialogProps {
  projectId?: string
}

export function CreateActionItemDialog({ projectId }: CreateActionItemDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ActionItemFormData>({
    resolver: zodResolver(actionItemSchema),
    defaultValues: {
      projectId: projectId || null,
    },
  })

  useEffect(() => {
    if (open) {
      Promise.all([
        fetch("/api/projects").then((res) => res.json()),
        fetch("/api/users").then((res) => res.json()).catch(() => []),
      ]).then(([projectsData, usersData]) => {
        setProjects(projectsData)
        setUsers(usersData)
      }).catch(console.error)
    }
  }, [open])

  const onSubmit = async (data: ActionItemFormData) => {
    setLoading(true)
    try {
      // Clean up the data - convert empty strings to null
      const cleanedData = {
        title: data.title,
        description: data.description || null,
        projectId: data.projectId && data.projectId.trim() !== "" ? data.projectId : null,
        assignedTo: data.assignedTo && data.assignedTo.trim() !== "" ? data.assignedTo : null,
        dueDate: data.dueDate && data.dueDate.trim() !== "" ? data.dueDate : null,
        priority: data.priority || "MEDIUM",
      }

      const response = await fetch("/api/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to create action item")
      }

      setOpen(false)
      reset()
      router.refresh()
    } catch (error) {
      console.error("Error creating action item:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to create action item. Please try again."
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Action Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Action Item</DialogTitle>
          <DialogDescription>
            Add a new task or action item to track.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="Complete project proposal"
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Task details..."
                rows={3}
              />
            </div>
            {!projectId && (
              <div className="grid gap-2">
                <Label htmlFor="projectId">Project (Optional)</Label>
                <Select
                  onValueChange={(value) => setValue("projectId", value === "" ? null : value)}
                  value={watch("projectId") || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project (or leave blank for global)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Global)</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="assignedTo">Assign To (Optional)</Label>
              <Select
                onValueChange={(value) => setValue("assignedTo", value === "" ? null : value)}
                value={watch("assignedTo") || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  onValueChange={(value) => setValue("priority", value as any)}
                  value={watch("priority") || "MEDIUM"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  {...register("dueDate")}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Action Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

