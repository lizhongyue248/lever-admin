import { headers } from "next/headers"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"

import { DashboardShell } from "@/app/dashboard/_components/dashboard-shell"
import { getSession } from "@/server/better-auth/server"
import { recordRequestLogSafely } from "@/server/service/request-logs"
import { api } from "@/trpc/server"

const DashboardLayout = async ({ children }: { children: ReactNode }) => {
  const session = await getSession()

  if (!session?.user) {
    const headerList = await headers()
    const currentPath = headerList.get("x-current-path") ?? "/dashboard"
    redirect(`/sign-in?redirectTo=${encodeURIComponent(currentPath)}`)
  }

  const headerList = await headers()
  recordRequestLogSafely({
    durationMs: null,
    headers: headerList,
    method: "GET",
    path: headerList.get("x-current-path") ?? "/dashboard",
    requestId: headerList.get("x-request-id"),
    routeName: "dashboard.page",
    source: "dashboard",
    statusCode: 200,
    success: true,
    user: {
      email: session.user.email,
      id: session.user.id,
      name: session.user.name,
      role: "role" in session.user && typeof session.user.role === "string" ? session.user.role : null
    }
  })

  const shellData = await api.dashboard.getShell()

  return <DashboardShell data={shellData}>{children}</DashboardShell>
}

export default DashboardLayout
