"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDate } from "@/lib/utils"
import { UserRole } from "@prisma/client"
import { CheckCircle2, XCircle } from "lucide-react"

interface User {
  id: string
  name: string | null
  email: string
  role: UserRole
  image: string | null
  createdAt: Date
  emailVerified: Date | null
  active: boolean
}

interface UserManagementTableProps {
  users: User[]
  currentUserId: string
}

/**
 * Table component for managing user roles
 */
export function UserManagementTable({ users, currentUserId }: UserManagementTableProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setLoading(userId)
    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update role")
      }

      router.refresh()
    } catch (error) {
      console.error("Error updating role:", error)
      alert(error instanceof Error ? error.message : "Failed to update role")
    } finally {
      setLoading(null)
    }
  }

  const handleStatusChange = async (userId: string, nextStatus: boolean) => {
    setLoading(userId)
    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextStatus }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update status")
      }

      router.refresh()
    } catch (error) {
      console.error("Error updating status:", error)
      alert(error instanceof Error ? error.message : "Failed to update status")
    } finally {
      setLoading(null)
    }
  }

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return "default"
      case UserRole.MANAGER:
        return "secondary"
      case UserRole.CLIENT:
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Current Role</TableHead>
            <TableHead>Verified</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Change Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image || undefined} alt={user.name || user.email} />
                    <AvatarFallback>
                      {(user.name || user.email)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    {user.name || "No name"}
                  </span>
                </div>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>
                {user.emailVerified ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-400" />
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(user.createdAt)}
              </TableCell>
              <TableCell>
                <Badge variant={user.active ? "secondary" : "destructive"}>
                  {user.active ? "Active" : "Inactive"}
                </Badge>
                {user.id !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 px-0 text-xs text-muted-foreground"
                    onClick={() => handleStatusChange(user.id, !user.active)}
                    disabled={loading === user.id}
                  >
                    {user.active ? "Deactivate" : "Activate"}
                  </Button>
                )}
              </TableCell>
              <TableCell>
                {user.id === currentUserId ? (
                  <span className="text-sm text-muted-foreground">You</span>
                ) : (
                  <Select
                    value={user.role}
                    onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                    disabled={loading === user.id}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                      <SelectItem value={UserRole.MANAGER}>Manager</SelectItem>
                      <SelectItem value={UserRole.CLIENT}>Client</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

