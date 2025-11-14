import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { ErrorBoundary } from "@/components/ErrorBoundary"

export default async function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <SessionProvider session={session}>
      <ErrorBoundary>
        <DashboardLayout>{children}</DashboardLayout>
      </ErrorBoundary>
    </SessionProvider>
  )
}

