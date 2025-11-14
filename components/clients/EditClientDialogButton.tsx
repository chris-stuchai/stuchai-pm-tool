"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import { EditClientDialog } from "./EditClientDialog"

interface Client {
  id: string
  name: string
  email: string
  company: string | null
  phone: string | null
  notes: string | null
}

interface EditClientDialogButtonProps {
  client: Client
}

export function EditClientDialogButton({ client }: EditClientDialogButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Edit className="mr-2 h-4 w-4" />
        Edit Client
      </Button>
      <EditClientDialog client={client} open={open} onOpenChange={setOpen} />
    </>
  )
}

