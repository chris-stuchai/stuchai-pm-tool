"use client"

import { useState, useTransition } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface NotificationPreferencesProps {
  notifyOnClientMessage: boolean
}

export function NotificationPreferences({
  notifyOnClientMessage,
}: NotificationPreferencesProps) {
  const [enabled, setEnabled] = useState(notifyOnClientMessage)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleToggle = (nextValue: boolean) => {
    setEnabled(nextValue)
    setError(null)

    startTransition(async () => {
      try {
        const response = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notifyOnClientMessage: nextValue }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || "Failed to update preferences")
        }
      } catch (err) {
        console.error("Failed to update notification preference", err)
        setEnabled(!nextValue)
        setError(
          err instanceof Error
            ? err.message
            : "Failed to update notification preference."
        )
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-base font-medium">Client message alerts</Label>
          <p className="text-sm text-muted-foreground">
            Receive an email when a client sends a new message.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={pending}
        />
      </div>
    </div>
  )
}

