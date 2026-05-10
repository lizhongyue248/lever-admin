import { headers } from "next/headers"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"

import { DashboardShell } from "@/app/dashboard/_components/dashboard-shell"
import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"

const DashboardLayout = async ({ children }: { children: ReactNode }) => {
  const session = await getSession()

  if (!session?.user) {
    const headerList = await headers()
    const currentPath = headerList.get("x-current-path") ?? "/dashboard"
    redirect(`/sign-in?redirectTo=${encodeURIComponent(currentPath)}`)
  }

  const shellData = await api.dashboard.getShell()

  return <DashboardShell data={shellData}>{children}</DashboardShell>
}

export default DashboardLayout
