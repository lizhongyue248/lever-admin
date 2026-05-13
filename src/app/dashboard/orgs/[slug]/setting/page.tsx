import { redirect } from "next/navigation"

import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"
import { OrgSettingContent } from "../_components/org-setting-content"

const OrgSettingPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  const session = await getSession()

  if (!session?.user) {
    redirect(`/sign-in?redirectTo=${encodeURIComponent(`/dashboard/orgs/${slug}/setting`)}`)
  }

  const data = await api.org.getBySlug({ slug })

  return <OrgSettingContent data={data} slug={slug} />
}

export default OrgSettingPage
