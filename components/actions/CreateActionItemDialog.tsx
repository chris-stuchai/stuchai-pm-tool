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
import { Checkbox } from "@/components/ui/checkbox"

const actionItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  projectId: z.string().optional().nullable().or(z.literal("__none__")),
  assignedTo: z.string().optional().nullable().or(z.literal("__unassigned__")),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  visibleToClient: z.boolean().optional().default(false),
  clientCanComplete: z.boolean().optional().default(false),
  showOnTimeline: z.boolean().optional().default(false),
  timelineLabel: z.string().max(120, "Timeline note must be under 120 characters").optional().nullable(),
  requiresSecureResponse: z.boolean().optional().default(false),
  securePrompt: z.string().max(500, "Prompt must be shorter than 500 characters.").optional().nullable(),
  secureFieldType: z.enum(["SHORT_TEXT", "LONG_TEXT", "SECRET"]).optional(),
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
      projectId: projectId || "__none__",
      assignedTo: "__unassigned__",
      priority: "MEDIUM",
      visibleToClient: false,
      clientCanComplete: false,
      showOnTimeline: false,
      timelineLabel: "",
      requiresSecureResponse: false,
      securePrompt: "",
      secureFieldType: "SHORT_TEXT",
    },
  })
  const visibleToClient = watch("visibleToClient")
  const showOnTimeline = watch("showOnTimeline")
  const requiresSecureResponse = watch("requiresSecureResponse")
  const secureFieldType = watch("secureFieldType") || "SHORT_TEXT"

  useEffect(() => {
    if (open) {
      Promise.all([
        fetch("/api/projects")
          .then((res) => {
            if (!res.ok) throw new Error("Failed to fetch projects")
            return res.json()
          })
          .catch((error) => {
            console.error("Error fetching projects:", error)
            return []
          }),
        fetch("/api/users")
          .then((res) => {
            if (!res.ok) throw new Error("Failed to fetch users")
            return res.json()
          })
          .catch((error) => {
            console.error("Error fetching users:", error)
            return []
          }),
      ]).then(([projectsData, usersData]) => {
        setProjects(Array.isArray(projectsData) ? projectsData : [])
        setUsers(Array.isArray(usersData) ? usersData : [])
      }).catch((error) => {
        console.error("Error loading form data:", error)
        setProjects([])
        setUsers([])
      })
    } else {
      reset({
        title: "",
        description: "",
        projectId: projectId || "__none__",
        assignedTo: "__unassigned__",
        dueDate: "",
        priority: "MEDIUM",
        visibleToClient: false,
        clientCanComplete: false,
        showOnTimeline: false,
        timelineLabel: "",
        requiresSecureResponse: false,
        securePrompt: "",
        secureFieldType: "SHORT_TEXT",
      })
    }
  }, [open, reset, projectId])

  const onSubmit = async (data: ActionItemFormData) => {
    setLoading(true)
    try {
      // Clean up the data - convert empty strings to null
      const cleanedData: any = {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        priority: data.priority || "MEDIUM",
      }

      // Handle projectId - use prop if provided, otherwise use form value
      if (projectId) {
        cleanedData.projectId = projectId
      } else if (data.projectId && typeof data.projectId === "string" && data.projectId !== "__none__" && data.projectId.trim() !== "") {
        cleanedData.projectId = data.projectId
      } else {
        cleanedData.projectId = null
      }

      // Handle assignedTo - convert special value to null
      if (data.assignedTo && data.assignedTo !== "__unassigned__" && typeof data.assignedTo === "string" && data.assignedTo.trim() !== "") {
        cleanedData.assignedTo = data.assignedTo
      } else {
        cleanedData.assignedTo = null
      }

      // Handle dueDate
      if (data.dueDate && data.dueDate.trim() !== "") {
        cleanedData.dueDate = data.dueDate
      } else {
        cleanedData.dueDate = null
      }

      cleanedData.visibleToClient = Boolean(data.visibleToClient)
      cleanedData.clientCanComplete = Boolean(data.clientCanComplete)
      cleanedData.showOnTimeline = Boolean(data.showOnTimeline)
      cleanedData.timelineLabel = data.timelineLabel?.trim() || null
      cleanedData.requiresSecureResponse = Boolean(data.requiresSecureResponse)
      if (cleanedData.requiresSecureResponse) {
        cleanedData.securePrompt = data.securePrompt?.trim() || null
        cleanedData.secureFieldType = data.secureFieldType || "SHORT_TEXT"
      } else {
        cleanedData.securePrompt = null
        cleanedData.secureFieldType = "SHORT_TEXT"
      }

      console.log("Submitting action item:", cleanedData)

      const response = await fetch("/api/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
      })

      const responseData = await response.json().catch(() => ({}))

      if (!response.ok) {
        console.error("API Error:", responseData)
        throw new Error(responseData.error || `Failed to create action item: ${response.status}`)
      }

      console.log("Action item created successfully:", responseData)
      setOpen(false)
      reset({
        title: "",
        description: "",
        projectId: projectId || "__none__",
        assignedTo: "__unassigned__",
        dueDate: "",
        priority: "MEDIUM",
        visibleToClient: false,
        clientCanComplete: false,
        showOnTimeline: false,
        timelineLabel: "",
        requiresSecureResponse: false,
        securePrompt: "",
        secureFieldType: "SHORT_TEXT",
      })
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
                  onValueChange={(value) => {
                    const newValue = value === "__none__" ? null : value
                    setValue("projectId", newValue, { shouldValidate: true })
                  }}
                  value={watch("projectId") || "__none__"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project (or leave blank for global)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (Global)</SelectItem>
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
                onValueChange={(value) => {
                  const newValue = value === "__unassigned__" ? null : value
                  setValue("assignedTo", newValue, { shouldValidate: true })
                }}
                value={watch("assignedTo") || "__unassigned__"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
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
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  onValueChange={(value) => setValue("priority", value as "LOW" | "MEDIUM" | "HIGH" | "URGENT", { shouldValidate: true })}
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
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Display in client portal</p>
                  <p className="text-xs text-muted-foreground">
                    Share this task with the client for transparency.
                  </p>
                </div>
                <Checkbox
                  checked={visibleToClient}
                  onCheckedChange={(checked) =>
                    setValue("visibleToClient", Boolean(checked), { shouldValidate: true })
                  }
                />
              </div>
              {visibleToClient && (
                <div className="flex items-start justify-between gap-4 border-t pt-3">
                  <div>
                    <p className="text-sm font-medium">Allow client completion</p>
                    <p className="text-xs text-muted-foreground">
                      Clients can mark this done and upload supporting files.
                    </p>
                  </div>
                  <Checkbox
                    checked={watch("clientCanComplete")}
                    onCheckedChange={(checked) =>
                      setValue("clientCanComplete", Boolean(checked), { shouldValidate: true })
                    }
                  />
                </div>
              )}
            </div>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Highlight on project timeline</p>
                  <p className="text-xs text-muted-foreground">
                    Surface this task alongside milestones for better visibility.
                  </p>
                </div>
                <Checkbox
                  checked={showOnTimeline}
                  onCheckedChange={(checked) =>
                    setValue("showOnTimeline", Boolean(checked), { shouldValidate: true })
                  }
                />
              </div>
              {showOnTimeline && (
                <div className="space-y-2 border-t pt-3">
                  <Label htmlFor="timeline-label">Timeline note (optional)</Label>
                  <Input
                    id="timeline-label"
                    placeholder="e.g., Client launch readiness"
                    {...register("timelineLabel")}
                    maxLength={120}
                  />
                  <p className="text-xs text-muted-foreground">
                    Defaults to the action title if left blank.
                  </p>
                </div>
              )}
            </div>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Request secure response</p>
                  <p className="text-xs text-muted-foreground">
                    Ask the client to provide passwords, API keys, or other sensitive info via an
                    encrypted field.
                  </p>
                </div>
                <Checkbox
                  checked={requiresSecureResponse}
                  onCheckedChange={(checked) =>
                    setValue("requiresSecureResponse", Boolean(checked), { shouldValidate: true })
                  }
                />
              </div>
              {requiresSecureResponse && (
                <div className="space-y-3 border-t pt-3">
                  <div className="space-y-2">
                    <Label htmlFor="secure-prompt">Client instructions</Label>
                    <Textarea
                      id="secure-prompt"
                      rows={3}
                      placeholder="Provide your Squarespace username and password…"
                      {...register("securePrompt")}
                    />
                    {errors.securePrompt && (
                      <p className="text-xs text-destructive">{errors.securePrompt.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Expected response type</Label>
                    <Select
                      value={secureFieldType}
                      onValueChange={(value) =>
                        setValue("secureFieldType", value as "SHORT_TEXT" | "LONG_TEXT" | "SECRET", {
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SHORT_TEXT">Short text</SelectItem>
                        <SelectItem value="LONG_TEXT">Paragraph</SelectItem>
                        <SelectItem value="SECRET">Password / hidden</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
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

