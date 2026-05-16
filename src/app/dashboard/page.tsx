import { redirect } from "next/navigation"

import { DashboardHomeContent } from "@/app/dashboard/_components/dashboard-home-content"
import { ROUTE_DASHBOARD, ROUTE_SIGN_IN } from "@/lib/const"
import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"

const DashboardPage = async () => {
  const session = await getSession()

  if (!session?.user) {
    redirect(`${ROUTE_SIGN_IN}?redirectTo=${encodeURIComponent(ROUTE_DASHBOARD)}`)
  }

  const data = await api.dashboard.getHome()

  return <DashboardHomeContent data={data} />
}

export default DashboardPage
