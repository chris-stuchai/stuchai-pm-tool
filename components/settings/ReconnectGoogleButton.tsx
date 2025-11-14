"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { usePathname } from "next/navigation"

export function ReconnectGoogleButton() {
  const pathname = usePathname()
  const isSettingsPage = pathname?.includes("settings")

  const handleReconnect = () => {
    // Sign in with Google, which will update the scopes
    signIn("google", {
      callbackUrl: "/dashboard/settings",
    })
  }

  return (
    <Button onClick={handleReconnect} variant="outline" size="sm">
      <RefreshCw className="mr-2 h-4 w-4" />
      {isSettingsPage ? "Reconnect" : "Connect"} Google Account
    </Button>
  )
}

