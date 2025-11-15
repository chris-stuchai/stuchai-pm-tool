import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, AlertCircle, Mail, Calendar, HardDrive } from "lucide-react"
import { NotificationPreferences } from "@/components/settings/NotificationPreferences"
import { UserRole } from "@prisma/client"
import { ReconnectGoogleButton } from "@/components/settings/ReconnectGoogleButton"
import { EditableProfile } from "@/components/settings/EditableProfile"

async function getGoogleAccountStatus(userId: string) {
  const account = await db.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
    select: {
      id: true,
      scope: true,
      expires_at: true,
    },
  })

  if (!account) {
    return {
      connected: false,
      hasGmail: false,
      hasCalendar: false,
      hasDrive: false,
      expiresAt: null,
    }
  }

  const scope = account.scope || ""
  const hasGmail = scope.includes("gmail.send") || scope.includes("gmail")
  const hasCalendar = scope.includes("calendar") || scope.includes("calendar.events")
  const hasDrive = scope.includes("drive")

  return {
    connected: true,
    hasGmail,
    hasCalendar,
    hasDrive,
    expiresAt: account.expires_at,
  }
}

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const [googleStatus, userRecord] = await Promise.all([
    getGoogleAccountStatus(session.user.id),
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        notifyOnClientMessage: true,
      },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and integrations</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Manage your profile details</CardDescription>
          </CardHeader>
          <CardContent>
            <EditableProfile
              name={session.user.name ?? null}
              email={session.user.email!}
              role={session.user.role}
            />
          </CardContent>
        </Card>

        {(session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER) && (
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationPreferences
                notifyOnClientMessage={userRecord?.notifyOnClientMessage ?? true}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Google Integration</CardTitle>
            <CardDescription>
              Connect your Google account to enable Gmail, Calendar, and Drive features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!googleStatus.connected ? (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-sm font-medium">Not Connected</p>
                    <p className="text-xs text-muted-foreground">
                      Connect your Google account to enable email reminders and calendar sync
                    </p>
                  </div>
                </div>
                <ReconnectGoogleButton />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">Google Account Connected</p>
                      <p className="text-xs text-muted-foreground">
                        Your Google account is linked and ready to use
                      </p>
                    </div>
                  </div>
                  <ReconnectGoogleButton />
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Gmail</span>
                    </div>
                    {googleStatus.hasGmail ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Enabled
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Google Calendar</span>
                    </div>
                    {googleStatus.hasCalendar ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Enabled
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Google Drive</span>
                    </div>
                    {googleStatus.hasDrive ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Enabled
                      </Badge>
                    )}
                  </div>
                </div>

                {(!googleStatus.hasGmail || !googleStatus.hasCalendar) && (
                  <div className="mt-4 p-4 border border-amber-200 rounded-lg bg-amber-50">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900">
                          Missing Permissions
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          {!googleStatus.hasGmail && "Gmail permission is required to send email reminders. "}
                          {!googleStatus.hasCalendar && "Calendar permission is required to sync meetings. "}
                          Click &quot;Reconnect Google Account&quot; to grant the missing permissions.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

