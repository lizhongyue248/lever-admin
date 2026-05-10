import { redirect } from "next/navigation"

import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"
import { SessionsPageContent } from "./_components/sessions-page-content"

const SessionsPage = async () => {
  const session = await getSession()

  if (!session?.user) {
    redirect("/sign-in?redirectTo=%2Fdashboard%2Fsettings%2Fsessions")
  }

  const data = await api.session.listMine()

  return <SessionsPageContent data={data} />
}

export default SessionsPage
