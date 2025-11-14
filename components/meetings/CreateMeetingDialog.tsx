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
import { Checkbox } from "@/components/ui/checkbox"
import { Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const meetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().optional().nullable(),
  clientId: z.string().optional().nullable().or(z.literal("__none__")),
  projectId: z.string().optional().nullable().or(z.literal("__none__")),
  syncToCalendar: z.boolean().default(true),
})

type MeetingFormData = z.infer<typeof meetingSchema>

export function CreateMeetingDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([])
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      syncToCalendar: true,
      clientId: "__none__",
      projectId: "__none__",
    },
  })

  useEffect(() => {
    if (open) {
      Promise.all([
        fetch("/api/clients")
          .then((res) => res.json())
          .catch(() => []),
        fetch("/api/projects")
          .then((res) => res.json())
          .catch(() => []),
        fetch("/api/users")
          .then((res) => res.json())
          .catch(() => []),
      ]).then(([clientsData, projectsData, usersData]) => {
        setClients(Array.isArray(clientsData) ? clientsData : [])
        setProjects(Array.isArray(projectsData) ? projectsData : [])
        setUsers(Array.isArray(usersData) ? usersData : [])
      })
    } else {
      reset({
        title: "",
        description: "",
        startTime: "",
        endTime: "",
        location: "",
        clientId: "__none__",
        projectId: "__none__",
        syncToCalendar: true,
      })
      setSelectedAttendees([])
    }
  }, [open, reset])

  const onSubmit = async (data: MeetingFormData) => {
    setLoading(true)
    try {
      const cleanedData: any = {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location?.trim() || null,
        syncToCalendar: data.syncToCalendar,
        clientId: data.clientId && data.clientId !== "__none__" ? data.clientId : null,
        projectId: data.projectId && data.projectId !== "__none__" ? data.projectId : null,
        attendeeIds: selectedAttendees,
      }

      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to create meeting")
      }

      setOpen(false)
      reset()
      setSelectedAttendees([])
      router.refresh()
    } catch (error) {
      console.error("Error creating meeting:", error)
      alert(error instanceof Error ? error.message : "Failed to create meeting. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const toggleAttendee = (userId: string) => {
    setSelectedAttendees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Meeting
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Meeting</DialogTitle>
          <DialogDescription>
            Create a new meeting and optionally sync to Google Calendar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="Project kickoff meeting"
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
                placeholder="Meeting agenda and notes..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  {...register("startTime")}
                />
                {errors.startTime && (
                  <p className="text-sm text-destructive">{errors.startTime.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  {...register("endTime")}
                />
                {errors.endTime && (
                  <p className="text-sm text-destructive">{errors.endTime.message}</p>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                {...register("location")}
                placeholder="Google Meet link or physical address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="clientId">Client (Optional)</Label>
                <Select
                  onValueChange={(value) => {
                    const newValue = value === "__none__" ? null : value
                    setValue("clientId", newValue || "__none__", { shouldValidate: true })
                  }}
                  value={watch("clientId") || "__none__"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="projectId">Project (Optional)</Label>
                <Select
                  onValueChange={(value) => {
                    const newValue = value === "__none__" ? null : value
                    setValue("projectId", newValue || "__none__", { shouldValidate: true })
                  }}
                  value={watch("projectId") || "__none__"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Attendees</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Loading users...</p>
                ) : (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={user.id}
                          checked={selectedAttendees.includes(user.id)}
                          onCheckedChange={() => toggleAttendee(user.id)}
                        />
                        <label
                          htmlFor={user.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {user.name || user.email}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="syncToCalendar"
                checked={watch("syncToCalendar")}
                onCheckedChange={(checked) => setValue("syncToCalendar", checked as boolean)}
              />
              <label
                htmlFor="syncToCalendar"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Sync to Google Calendar
              </label>
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
              {loading ? "Creating..." : "Create Meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

