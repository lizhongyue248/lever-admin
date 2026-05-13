import { redirect } from "next/navigation"

import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"
import { OrgOverviewContent } from "./_components/org-overview-content"

const OrgOverviewPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  const session = await getSession()

  if (!session?.user) {
    redirect(`/sign-in?redirectTo=${encodeURIComponent(`/dashboard/orgs/${slug}`)}`)
  }

  const data = await api.org.management.getOverview({ slug })

  return <OrgOverviewContent data={data} slug={slug} />
}

export default OrgOverviewPage
