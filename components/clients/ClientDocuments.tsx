"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Download, Trash2 } from "lucide-react"
import { UploadClientDocumentDialog } from "./UploadClientDocumentDialog"
import { formatDate } from "@/lib/utils"

interface ClientDocument {
  id: string
  name: string
  type: string | null
  url: string | null
  googleDriveId: string | null
  mimeType: string | null
  size: number | null
  createdAt: Date
  uploader: {
    id: string
    name: string | null
    email: string
  }
}

interface ClientDocumentsProps {
  clientId: string
  canEdit: boolean
}

export function ClientDocuments({ clientId, canEdit }: ClientDocumentsProps) {
  const [documents, setDocuments] = useState<ClientDocument[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/client-documents?clientId=${clientId}`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data)
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [clientId])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return

    try {
      const response = await fetch(`/api/client-documents/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchDocuments()
      }
    } catch (error) {
      console.error("Error deleting document:", error)
      alert("Failed to delete document")
    }
  }

  if (loading) {
    return <div>Loading documents...</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Documents</CardTitle>
          {canEdit && (
            <UploadClientDocumentDialog clientId={clientId} onUpload={fetchDocuments} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents yet</p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{doc.name}</p>
                      {doc.type && (
                        <Badge variant="outline" className="text-xs">
                          {doc.type}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Uploaded by {doc.uploader.name || doc.uploader.email} • {formatDate(doc.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(doc.url!, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

