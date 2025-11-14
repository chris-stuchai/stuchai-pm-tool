"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Ban, RotateCcw } from "lucide-react"

interface ClientStatusToggleProps {
  clientId: string
  isActive: boolean
}

export function ClientStatusToggle({ clientId, isActive }: ClientStatusToggleProps) {
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(isActive)
  const router = useRouter()

  const handleToggle = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${clientId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update status")
      }

      setActive(!active)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Failed to update client status")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={active ? "outline" : "secondary"}
      onClick={handleToggle}
      disabled={loading}
    >
      {active ? (
        <>
          <Ban className="mr-2 h-4 w-4" />
          {loading ? "Deactivating..." : "Deactivate Client"}
        </>
      ) : (
        <>
          <RotateCcw className="mr-2 h-4 w-4" />
          {loading ? "Reactivating..." : "Reactivate Client"}
        </>
      )}
    </Button>
  )
}

