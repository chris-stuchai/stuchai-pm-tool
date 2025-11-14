"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Copy } from "lucide-react"
import { UserRole } from "@prisma/client"

const roleOptions = [
  { label: "Manager", value: UserRole.MANAGER },
  { label: "Admin", value: UserRole.ADMIN },
]

export function InviteEmployeeCard() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<UserRole>(UserRole.MANAGER)
  const [loading, setLoading] = useState(false)
  const [invitationUrl, setInvitationUrl] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setInvitationUrl("")
    setCopied(false)

    if (!email.trim()) {
      setError("Email is required")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/user-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          role,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to create invitation")
      }

      setInvitationUrl(data.invitationUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invitation")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!invitationUrl) return
    navigator.clipboard.writeText(invitationUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Send a secure invite link to employees or co-founders. They&apos;ll create their own password
        and receive the role you assign below.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="employee-name">Name (optional)</Label>
            <Input
              id="employee-name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employee-role">Role</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as UserRole)}
              disabled={loading}
            >
              <SelectTrigger id="employee-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="employee-email">Work Email *</Label>
          <Input
            id="employee-email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={loading} className="w-full md:w-auto">
          {loading ? "Sending invite..." : "Generate Invite Link"}
        </Button>
      </form>

      {invitationUrl && (
        <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Invitation created
          </div>
          <p className="text-sm text-gray-600">
            Share this link with {email}. They&apos;ll create their password and join with the{" "}
            {roleOptions.find((option) => option.value === role)?.label.toLowerCase()} role.
          </p>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <code className="flex-1 rounded border bg-white px-3 py-2 text-xs text-gray-700 overflow-x-auto">
              {invitationUrl}
            </code>
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              className="md:w-auto"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" /> Copy link
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

