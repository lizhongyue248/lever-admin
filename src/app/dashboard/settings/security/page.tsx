import { redirect } from "next/navigation"

import { ROUTE_DASHBOARD_SETTINGS_SECURITY, ROUTE_SIGN_IN } from "@/lib/const"
import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"
import { SecurityPageContent } from "./_components/security-page-content"

const SecurityPage = async () => {
  const session = await getSession()

  if (!session?.user) {
    redirect(`${ROUTE_SIGN_IN}?redirectTo=${encodeURIComponent(ROUTE_DASHBOARD_SETTINGS_SECURITY)}`)
  }

  const data = await api.security.getOverview()

  return <SecurityPageContent data={data} />
}

export default SecurityPage
