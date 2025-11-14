"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pencil, Check, X } from "lucide-react"

interface EditableProfileProps {
  name: string | null
  email: string
  role: string
}

/**
 * Editable profile section for settings page
 */
export function EditableProfile({ name, email, role }: EditableProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newName, setNewName] = useState(name || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSave = async () => {
    if (!newName.trim()) {
      setError("Name cannot be empty")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update profile")
      }

      setIsEditing(false)
      router.refresh()
    } catch (err) {
      console.error("Error updating profile:", err)
      setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setNewName(name || "")
    setError("")
    setIsEditing(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Label htmlFor="name" className="text-sm font-medium">
            Name
          </Label>
          {isEditing ? (
            <div className="mt-1">
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter your name"
                disabled={loading}
                className="max-w-sm"
              />
              {error && <p className="text-sm text-destructive mt-1">{error}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">{name || "Not set"}</p>
          )}
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={loading}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={loading}
              >
                <Check className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium">Email</p>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium">Role</p>
          <p className="text-sm text-muted-foreground capitalize">{role?.toLowerCase()}</p>
        </div>
      </div>
    </div>
  )
}

