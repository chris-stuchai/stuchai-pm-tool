"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Ban, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

interface ClientStatusToggleProps {
  clientId: string
  isActive: boolean
  className?: string
}

export function ClientStatusToggle({ clientId, isActive, className }: ClientStatusToggleProps) {
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(isActive)
  const [confirmOpen, setConfirmOpen] = useState(false)
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
      setConfirmOpen(false)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Failed to update client status")
    } finally {
      setLoading(false)
    }
  }

  const heading = active ? "Deactivate client?" : "Reactivate client?"
  const message = active
    ? "The client will immediately lose access to their portal and related tasks. You can re-activate them at any time."
    : "This will restore the client's access to their portal and assigned tasks."

  return (
    <AlertDialog
      open={confirmOpen}
      onOpenChange={(open) => {
        if (!loading) {
          setConfirmOpen(open)
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant={active ? "outline" : "secondary"}
          onClick={() => setConfirmOpen(true)}
          disabled={loading}
          className={cn("justify-center", className)}
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
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{heading}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleToggle} disabled={loading}>
            {active ? "Yes, deactivate" : "Yes, reactivate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

