"use client"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

type FieldType = "SHORT_TEXT" | "LONG_TEXT" | "SECRET" | undefined | null
type Role = "ADMIN" | "MANAGER" | "CLIENT"

interface SecureResponseSectionProps {
  actionId: string
  prompt?: string | null
  fieldType?: FieldType
  secureResponse?: {
    id: string
    createdAt: string | Date
    updatedAt: string | Date
  } | null
  currentUserRole: Role
  canClientSubmit: boolean
  retentionPolicy?: "UNTIL_DELETED" | "EXPIRE_AFTER_VIEW" | "EXPIRE_AFTER_HOURS" | null
  expireAfterHours?: number | null
  viewedAt?: string | Date | null
}

function formatDate(value?: string | Date | null) {
  if (!value) return ""
  const date = typeof value === "string" ? new Date(value) : value
  return date.toLocaleString()
}

function retentionDescription(
  retentionPolicy?: "UNTIL_DELETED" | "EXPIRE_AFTER_VIEW" | "EXPIRE_AFTER_HOURS" | null,
  expireAfterHours?: number | null
) {
  switch (retentionPolicy) {
    case "EXPIRE_AFTER_VIEW":
      return "Visible one time. Deleted immediately after the first admin review."
    case "EXPIRE_AFTER_HOURS":
      return `Auto-deletes ${expireAfterHours || 24} hours after submission.`
    default:
      return "Stored until an admin purges it."
  }
}

export function SecureResponseSection({
  actionId,
  prompt,
  fieldType,
  secureResponse,
  currentUserRole,
  canClientSubmit,
  retentionPolicy,
  expireAfterHours,
  viewedAt,
}: SecureResponseSectionProps) {
  if (!prompt && !secureResponse && currentUserRole !== "CLIENT") {
    return null
  }

  return (
    <div className="rounded-lg border border-dashed bg-slate-50 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-slate-900">Secure response required</p>
          <p className="text-xs text-muted-foreground">
            {prompt || "Provide the requested confidential details via this encrypted field."}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {retentionDescription(retentionPolicy, expireAfterHours)}
          </p>
        </div>
        {secureResponse ? (
          <Badge variant="secondary">Submitted</Badge>
        ) : (
          <Badge variant="outline">Awaiting response</Badge>
        )}
      </div>
      {currentUserRole === "CLIENT" ? (
        <ClientSecureForm
          actionId={actionId}
          fieldType={fieldType}
          secureResponse={secureResponse}
          canSubmit={canClientSubmit}
        />
      ) : (
        <AdminSecureViewer
          actionId={actionId}
          secureResponse={secureResponse}
          viewedAt={viewedAt}
          retentionPolicy={retentionPolicy}
        />
      )}
    </div>
  )
}

interface ClientFormProps {
  actionId: string
  fieldType?: FieldType
  secureResponse?: { id: string; updatedAt: string | Date } | null
  canSubmit: boolean
}

function ClientSecureForm({ actionId, fieldType, secureResponse, canSubmit }: ClientFormProps) {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(!secureResponse)
  const [error, setError] = useState<string | null>(null)

  if (!canSubmit) {
    return <p className="mt-3 text-xs text-muted-foreground">This field is managed by your StuchAi team.</p>
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch(`/api/action-items/${actionId}/secure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || "Unable to submit.")
      }
      setValue("")
      setShowForm(false)
      router.refresh()
    } catch (err: any) {
      setError(err?.message || "Submission failed.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {secureResponse && !showForm && (
        <div className="text-xs text-muted-foreground">
          Submitted {formatDate(secureResponse.updatedAt)}.{" "}
          <button
            className="text-primary underline"
            onClick={() => setShowForm(true)}
          >
            Update submission
          </button>
        </div>
      )}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3">
          {renderField(fieldType, value, setValue)}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" size="sm" disabled={submitting || !value}>
            {submitting ? "Submitting..." : secureResponse ? "Replace submission" : "Submit securely"}
          </Button>
        </form>
      )}
    </div>
  )
}

function renderField(
  fieldType: FieldType = "SHORT_TEXT",
  value: string,
  setValue: (next: string) => void
) {
  if (fieldType === "LONG_TEXT") {
    return (
      <Textarea
        placeholder="Enter details..."
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={4}
      />
    )
  }
  return (
    <Input
      type={fieldType === "SECRET" ? "password" : "text"}
      placeholder="Enter details..."
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  )
}

interface AdminViewerProps {
  actionId: string
  secureResponse?: { id: string; createdAt: string | Date } | null
  retentionPolicy?: "UNTIL_DELETED" | "EXPIRE_AFTER_VIEW" | "EXPIRE_AFTER_HOURS" | null
  viewedAt?: string | Date | null
}

function AdminSecureViewer({ actionId, secureResponse, retentionPolicy, viewedAt }: AdminViewerProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadSecret() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/action-items/${actionId}/secure`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || "Unable to load secure data.")
      }
      setValue(payload.value)
      setOpen(true)
    } catch (err: any) {
      setError(err?.message || "Failed to load secure data.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {secureResponse ? (
        <>
          <p className="text-xs text-muted-foreground">
            Submitted {formatDate(secureResponse.createdAt)}.
            {retentionPolicy === "EXPIRE_AFTER_VIEW" && viewedAt && (
              <span className="ml-1 text-destructive">Already viewed and purged.</span>
            )}
          </p>
          <Button size="sm" variant="outline" onClick={loadSecret} disabled={loading}>
            {loading ? "Opening..." : "View secure submission"}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Waiting for the client to provide this information.</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Secure submission</DialogTitle>
            <DialogDescription>
              Copy the value and store it in a password manager. It remains encrypted at rest.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded bg-slate-100 p-3 font-mono text-sm text-slate-900">
            {value}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

