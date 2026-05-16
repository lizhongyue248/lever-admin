import { redirect } from "next/navigation"

import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, FILTER_ALL, ROUTE_SIGN_IN } from "@/lib/const"
import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"
import { OrgAuthContent } from "../_components/org-auth-content"

const OrgAuthPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  const session = await getSession()

  if (!session?.user) {
    redirect(`${ROUTE_SIGN_IN}?redirectTo=${encodeURIComponent(`/dashboard/orgs/${slug}/auth`)}`)
  }

  const sessions = await api.org.session.list({ deviceType: FILTER_ALL, page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE, riskStatus: FILTER_ALL, search: "", slug })

  return <OrgAuthContent initialData={sessions} slug={slug} />
}

export default OrgAuthPage
