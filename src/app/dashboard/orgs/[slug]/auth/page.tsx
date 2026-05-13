import { redirect } from "next/navigation"

import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"
import { OrgAuthContent } from "../_components/org-auth-content"

const OrgAuthPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  const session = await getSession()

  if (!session?.user) {
    redirect(`/sign-in?redirectTo=${encodeURIComponent(`/dashboard/orgs/${slug}/auth`)}`)
  }

  const sessions = await api.org.session.list({ deviceType: "all", page: 1, pageSize: 10, riskStatus: "all", search: "", slug })

  return <OrgAuthContent initialData={sessions} slug={slug} />
}

export default OrgAuthPage
