import { redirect } from "next/navigation"

import { DashboardHomeContent } from "@/app/dashboard/_components/dashboard-home-content"
import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"

const DashboardPage = async () => {
  const session = await getSession()

  if (!session?.user) {
    redirect("/sign-in?redirectTo=%2Fdashboard")
  }

  const data = await api.dashboard.getHome()

  return <DashboardHomeContent data={data} />
}

export default DashboardPage
