import { redirect } from "next/navigation"

import { ROUTE_DASHBOARD } from "@/lib/const"
import { api } from "@/trpc/server"

const DashboardOrgsPage = async () => {
  const shell = await api.dashboard.getShell()
  const activeOrganization = shell.organizations.find((item) => item.organizationId === shell.activeOrganizationId) ?? shell.organizations[0]

  if (!activeOrganization) {
    redirect(ROUTE_DASHBOARD)
  }

  redirect(`/dashboard/orgs/${activeOrganization.organizationSlug}`)
}

export default DashboardOrgsPage
