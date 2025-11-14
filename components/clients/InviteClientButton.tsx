"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Copy } from "lucide-react"

interface InviteClientButtonProps {
  clientId: string
  clientName: string
  clientEmail: string
}

/**
 * Button to invite a client to the portal
 */
export function InviteClientButton({ clientId, clientName, clientEmail }: InviteClientButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [invitationUrl, setInvitationUrl] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  const handleInvite = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/clients/${clientId}/invite`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation")
      }

      setInvitationUrl(data.invitationUrl)
      setShowDialog(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(invitationUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Button
        onClick={handleInvite}
        disabled={loading}
        variant="outline"
      >
        <Mail className="mr-2 h-4 w-4" />
        {loading ? "Sending..." : "Invite to Portal"}
      </Button>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
            <DialogTitle className="text-center">Invitation Created!</DialogTitle>
            <DialogDescription className="text-center">
              An invitation has been created for {clientName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Note:</strong> Email delivery is pending Gmail API setup. 
                For now, copy the invitation link below and send it to {clientEmail} manually.
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="text-xs text-gray-600 mb-2">Invitation Link:</p>
              <div className="flex gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border text-xs overflow-x-auto">
                  {invitationUrl}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>What happens next:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Send this link to {clientEmail}</li>
                <li>They&apos;ll create their account using the link</li>
                <li>They&apos;ll automatically be linked to their client profile</li>
                <li>They can then access their projects, documents, and messages</li>
              </ol>
            </div>

            <Button
              onClick={() => setShowDialog(false)}
              className="w-full"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

