import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserRole } from "@prisma/client"
import { UserManagementTable } from "@/components/users/UserManagementTable"

/**
 * Fetch all users for admin management
 */
async function getUsers() {
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
      emailVerified: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return users
}

/**
 * User management page - Admin only
 */
export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Only admins can access this page
  if (session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard")
  }

  const users = await getUsers()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">
          Manage user accounts and permissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            View and manage user roles. You can promote users to Admin or Manager, or set them as Client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserManagementTable users={users} currentUserId={session.user.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Add Your CEO as Admin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Step 1:</strong> Have your CEO sign in with their Google account or email/password</p>
          <p><strong>Step 2:</strong> Once they appear in the list above, change their role to &quot;Admin&quot;</p>
          <p><strong>Step 3:</strong> They&apos;ll immediately have full admin access to see everything you see</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Invite Clients</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Step 1:</strong> Go to the Clients page and create a new client</p>
          <p><strong>Step 2:</strong> Click &quot;Invite to Portal&quot; on the client detail page</p>
          <p><strong>Step 3:</strong> They&apos;ll receive an email with instructions to set up their account</p>
          <p><strong>Step 4:</strong> Once registered, they&apos;ll automatically be linked to their client profile</p>
        </CardContent>
      </Card>
    </div>
  )
}

