"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { usePathname } from "next/navigation"

export function ReconnectGoogleButton() {
  const pathname = usePathname()
  const isSettingsPage = pathname?.includes("settings")
  const [loading, setLoading] = useState(false)

  const handleReconnect = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/google/reconnect", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to reset Google connection")
      }

      await signIn("google", {
        callbackUrl: "/dashboard/settings",
        prompt: "consent",
      })
    } catch (error) {
      console.error(error)
      alert("Could not reconnect Google. Please try again.")
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleReconnect} variant="outline" size="sm" disabled={loading}>
      <RefreshCw className="mr-2 h-4 w-4" />
      {loading ? "Reconnecting..." : isSettingsPage ? "Reconnect" : "Connect"} Google Account
    </Button>
  )
}

