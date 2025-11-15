"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  CheckSquare, 
  Bell,
  Settings,
  LogOut,
  ListTodo,
  Calendar,
  MessageSquare,
  FileText,
  UserCog,
  ClipboardList
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"
import { UserRole } from "@prisma/client"
import { Logo } from "./Logo"

const adminNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { name: "Action Items", href: "/dashboard/actions", icon: CheckSquare },
  { name: "Forms", href: "/dashboard/forms", icon: ClipboardList },
  { name: "Meetings", href: "/dashboard/meetings", icon: Calendar },
  { name: "My Tasks", href: "/dashboard/personal-tasks", icon: ListTodo },
  { name: "User Management", href: "/dashboard/users", icon: UserCog },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
]

const clientNavigation = [
  { name: "My Portal", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Projects", href: "/dashboard/projects", icon: FolderKanban },
  { name: "My Tasks", href: "/dashboard/actions", icon: CheckSquare },
  { name: "Meetings", href: "/dashboard/meetings", icon: Calendar },
  { name: "Forms", href: "/dashboard/forms", icon: ClipboardList },
  { name: "Documents", href: "/dashboard/documents", icon: FileText },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isClient = session?.user?.role === UserRole.CLIENT
  const navigation = isClient ? clientNavigation : adminNavigation

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isDashboardRoot = item.href === "/dashboard"
          const isActive =
            pathname === item.href ||
            (!isDashboardRoot && pathname?.startsWith(`${item.href}/`))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive ? "text-primary-foreground" : "text-gray-400 group-hover:text-gray-500"
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}

