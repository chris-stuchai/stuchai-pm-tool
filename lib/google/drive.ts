import { google } from "googleapis"
import { db } from "@/lib/db"

/**
 * Get Google Drive API client for a user
 */
export async function getDriveClient(userId: string) {
  const account = await db.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
  })

  if (!account?.access_token) {
    throw new Error("No Google access token found for user")
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  )

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  })

  // Refresh token if needed
  if (account.expires_at && account.expires_at * 1000 < Date.now()) {
    if (!account.refresh_token) {
      throw new Error("No refresh token is set. Please reconnect your Google account in Settings to enable Drive access.")
    }
    
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      
      await db.account.update({
        where: { id: account.id },
        data: {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || account.refresh_token,
          expires_at: credentials.expiry_date ? Math.floor(credentials.expiry_date / 1000) : null,
        },
      })

      oauth2Client.setCredentials(credentials)
    } catch (refreshError: any) {
      // If refresh fails, provide helpful error message
      if (refreshError?.message?.includes("refresh_token") || refreshError?.message?.includes("invalid_grant")) {
        throw new Error("Google account connection expired. Please reconnect your Google account in Settings to enable Drive access.")
      }
      throw refreshError
    }
  }

  return google.drive({ version: "v3", auth: oauth2Client })
}

/**
 * List files in Google Drive
 */
export async function listDriveFiles(userId: string, folderId?: string) {
  const drive = await getDriveClient(userId)

  const response = await drive.files.list({
    q: folderId ? `'${folderId}' in parents` : undefined,
    fields: "files(id, name, mimeType, size, webViewLink, createdTime, modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: 50,
  })

  return response.data.files || []
}

/**
 * Get file metadata
 */
export async function getFileMetadata(userId: string, fileId: string) {
  const drive = await getDriveClient(userId)

  const response = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size, webViewLink, webContentLink, createdTime, modifiedTime",
  })

  return response.data
}

/**
 * Create a file link in the database
 */
export async function linkDriveFile(
  userId: string,
  projectId: string | null,
  fileId: string,
  fileName: string
) {
  const fileMetadata = await getFileMetadata(userId, fileId)

  const document = await db.document.create({
    data: {
      name: fileName,
      googleDriveId: fileId,
      url: fileMetadata.webViewLink || undefined,
      mimeType: fileMetadata.mimeType || undefined,
      size: fileMetadata.size ? parseInt(fileMetadata.size) : undefined,
      projectId: projectId || undefined,
      uploadedBy: userId,
    },
  })

  return document
}

