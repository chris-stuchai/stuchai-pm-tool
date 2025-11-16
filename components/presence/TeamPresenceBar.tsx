"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface PresenceUser {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  isOnline: boolean
  lastSeenAt: string | null
}

function getInitials(name?: string | null, email?: string) {
  if (name?.trim()) {
    return name
      .split(" ")
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("")
  }
  return email?.charAt(0).toUpperCase() || "U"
}

export function TeamPresenceBar() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<PresenceUser[]>([])

  useEffect(() => {
    let cancelled = false

    async function loadPresence() {
      try {
        const response = await fetch("/api/presence")
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled) {
          setUsers(data)
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Presence fetch failed", error)
        }
      }
    }

    loadPresence()
    const interval = setInterval(loadPresence, 30_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const internalUsers = users.filter((user) => user.role !== "CLIENT")
  const isClientView = session?.user?.role === "CLIENT"

  if (isClientView) {
    const supportOnline = internalUsers.some((user) => user.isOnline)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span
          className={cn(
            "inline-block h-2.5 w-2.5 rounded-full",
            supportOnline ? "bg-emerald-500" : "bg-gray-300"
          )}
        />
        StuchAi support {supportOnline ? "is online" : "will respond shortly"}
      </div>
    )
  }

  const displayUsers = internalUsers.length > 0 ? internalUsers : users

  if (displayUsers.length === 0) {
    return null
  }

  const maxVisible = 4
  const visible = displayUsers.slice(0, maxVisible)
  const overflow = displayUsers.length - visible.length

  return (
    <div className="flex items-center gap-2">
      {visible.map((user) => (
        <div key={user.id} className="relative">
          <Avatar className="h-9 w-9 border border-white shadow-sm">
            <AvatarImage src={user.image || undefined} alt={user.name || user.email} />
            <AvatarFallback>{getInitials(user.name, user.email)}</AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white",
              user.isOnline ? "bg-emerald-400" : "bg-gray-300"
            )}
          />
        </div>
      ))}
      {overflow > 0 && (
        <div className="text-xs font-medium text-muted-foreground">+{overflow}</div>
      )}
    </div>
  )
}

