import { redirect } from "next/navigation"

import { ROUTE_DASHBOARD_SETTINGS_SESSIONS, ROUTE_SIGN_IN } from "@/lib/const"
import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"
import { SessionsPageContent } from "./_components/sessions-page-content"

const SessionsPage = async () => {
  const session = await getSession()

  if (!session?.user) {
    redirect(`${ROUTE_SIGN_IN}?redirectTo=${encodeURIComponent(ROUTE_DASHBOARD_SETTINGS_SESSIONS)}`)
  }

  const data = await api.session.listMine()

  return <SessionsPageContent data={data} />
}

export default SessionsPage
