"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

const editSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  projectId: z.string().optional().nullable().or(z.literal("__none__")),
  assignedTo: z.string().optional().nullable().or(z.literal("__unassigned__")),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  visibleToClient: z.boolean().optional().default(false),
  clientCanComplete: z.boolean().optional().default(false),
})

type EditFormValues = z.infer<typeof editSchema>

interface EditActionItemDialogProps {
  trigger: React.ReactNode
  action: {
    id: string
    title: string
    description?: string | null
    priority?: string | null
    dueDate?: Date | string | null
    project?: { id: string | null; name: string | null } | null
    assignee?: { id: string; name: string | null; email: string } | null
    visibleToClient?: boolean
    clientCanComplete?: boolean
  }
}

export function EditActionItemDialog({ trigger, action }: EditActionItemDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: action.title,
      description: action.description || "",
      projectId: action.project?.id || "__none__",
      assignedTo: action.assignee?.id || "__unassigned__",
      dueDate: action.dueDate
        ? new Date(action.dueDate).toISOString().substring(0, 10)
        : "",
      priority: (action.priority as EditFormValues["priority"]) || "MEDIUM",
      visibleToClient: Boolean(action.visibleToClient),
      clientCanComplete: Boolean(action.clientCanComplete),
    },
  })

  useEffect(() => {
    if (!open) return

    Promise.all([
      fetch("/api/projects")
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
      fetch("/api/users")
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
    ]).then(([projectsData, usersData]) => {
      setProjects(Array.isArray(projectsData) ? projectsData : [])
      setUsers(Array.isArray(usersData) ? usersData : [])
    })
  }, [open])

  const onSubmit = async (values: EditFormValues) => {
    setLoading(true)
    try {
      const payload: any = {
        title: values.title.trim(),
        description: values.description?.trim() || null,
        priority: values.priority || "MEDIUM",
        visibleToClient: Boolean(values.visibleToClient),
        clientCanComplete: Boolean(values.clientCanComplete),
      }

      payload.projectId =
        values.projectId && values.projectId !== "__none__" ? values.projectId : null

      payload.assignedTo =
        values.assignedTo && values.assignedTo !== "__unassigned__" ? values.assignedTo : null

      payload.dueDate = values.dueDate && values.dueDate.trim() ? values.dueDate : null

      const response = await fetch(`/api/action-items/${action.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to update action item")
      }

      setOpen(false)
      router.refresh()
    } catch (error: any) {
      alert(error.message || "Failed to update action item")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) {
      reset({
        title: action.title,
        description: action.description || "",
        projectId: action.project?.id || "__none__",
        assignedTo: action.assignee?.id || "__unassigned__",
        dueDate: action.dueDate
          ? new Date(action.dueDate).toISOString().substring(0, 10)
          : "",
        priority: (action.priority as EditFormValues["priority"]) || "MEDIUM",
        visibleToClient: Boolean(action.visibleToClient),
        clientCanComplete: Boolean(action.clientCanComplete),
      })
    }
  }, [open, action, reset])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit Action Item</DialogTitle>
          <DialogDescription>Update task details or client visibility.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input id="edit-title" {...register("title")} />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea id="edit-description" rows={3} {...register("description")} />
          </div>

          <div className="space-y-2">
            <Label>Project (optional)</Label>
            <Select
              value={watch("projectId") || "__none__"}
              onValueChange={(value) =>
                setValue("projectId", value === "__none__" ? "__none__" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None (global)</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assigned To</Label>
            <Select
              value={watch("assignedTo") || "__unassigned__"}
              onValueChange={(value) =>
                setValue("assignedTo", value === "__unassigned__" ? "__unassigned__" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassigned__">Unassigned</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

 	        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={watch("priority") || "MEDIUM"}
                onValueChange={(value) =>
                  setValue("priority", value as EditFormValues["priority"])
                }
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
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" {...register("dueDate")} />
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Display in client portal</p>
                <p className="text-xs text-muted-foreground">
                  Share this task with the client for transparency.
                </p>
              </div>
              <Checkbox
                checked={watch("visibleToClient")}
                onCheckedChange={(checked) =>
                  setValue("visibleToClient", Boolean(checked))
                }
              />
            </div>
            {watch("visibleToClient") && (
              <div className="flex items-start justify-between gap-4 border-t pt-3">
                <div>
                  <p className="text-sm font-medium">Allow client completion</p>
                  <p className="text-xs text-muted-foreground">
                    Clients can mark this done and upload proof.
                  </p>
                </div>
                <Checkbox
                  checked={watch("clientCanComplete")}
                  onCheckedChange={(checked) =>
                    setValue("clientCanComplete", Boolean(checked))
                  }
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

