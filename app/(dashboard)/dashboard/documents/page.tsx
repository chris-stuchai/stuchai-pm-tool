import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import { FileText, Download, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

async function getClientDocuments(userId: string) {
  // Get documents for projects where user has assigned action items
  const documents = await db.clientDocument.findMany({
    where: {
      client: {
        projects: {
          some: {
            actionItems: {
              some: {
                assignedTo: userId,
              },
            },
          },
        },
      },
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      uploader: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return documents
}

export default async function DocumentsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  // Only clients can access this page
  if (session.user.role !== UserRole.CLIENT) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600 mt-1">This page is only available for clients.</p>
        </div>
      </div>
    )
  }

  const documents = await getClientDocuments(session.user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-600 mt-1">Documents and contracts shared with you</p>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">No documents yet</p>
            <p className="text-sm text-muted-foreground">
              Documents shared with you will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{doc.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {doc.type && (
                        <span className="capitalize">{doc.type}</span>
                      )}
                      {doc.type && " • "}
                      Shared by {doc.uploader.name || doc.uploader.email} • {formatDate(doc.createdAt)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {doc.url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open
                      </a>
                    </Button>
                  )}
                  {doc.googleDriveId && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`https://drive.google.com/file/d/${doc.googleDriveId}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        View in Drive
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

