import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PersonalTasksList } from "@/components/personal-tasks/PersonalTasksList"

export default async function PersonalTasksPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Personal Tasks</h1>
        <p className="text-gray-600 mt-1">Manage your personal to-do list</p>
      </div>

      <PersonalTasksList userId={session.user.id} />
    </div>
  )
}

