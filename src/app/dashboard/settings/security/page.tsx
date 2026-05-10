import { redirect } from "next/navigation"

import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"
import { SecurityPageContent } from "./_components/security-page-content"

const SecurityPage = async () => {
  const session = await getSession()

  if (!session?.user) {
    redirect("/sign-in?redirectTo=%2Fdashboard%2Fsettings%2Fsecurity")
  }

  const data = await api.security.getOverview()

  return <SecurityPageContent data={data} />
}

export default SecurityPage
