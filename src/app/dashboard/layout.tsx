import { redirect } from "next/navigation"
import type { ReactNode } from "react"

import { DashboardShell } from "@/app/dashboard/_components/dashboard-shell"
import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"

const DashboardLayout = async ({ children }: { children: ReactNode }) => {
  const session = await getSession()

  if (!session?.user) {
    redirect("/sign-in?redirectTo=%2Fdashboard")
  }

  const shellData = await api.dashboard.getShell()

  return <DashboardShell data={shellData}>{children}</DashboardShell>
}

export default DashboardLayout
