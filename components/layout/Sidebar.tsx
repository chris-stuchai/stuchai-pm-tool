"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  CheckSquare, 
  Bell,
  Settings,
  LogOut,
  ListTodo
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { name: "Action Items", href: "/dashboard/actions", icon: CheckSquare },
  { name: "My Tasks", href: "/dashboard/personal-tasks", icon: ListTodo },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <div className="flex items-center gap-3">
          {/* Logo - Blue circle with white S */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
            <span className="text-xl font-bold text-white">S</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">StuchAI</h1>
            <p className="text-[10px] text-gray-500 leading-tight">Simplifying tech for all.</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
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

