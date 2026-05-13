import { redirect } from "next/navigation"

import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"
import { OrgInviteContent } from "../_components/org-invite-content"

const OrgInvitePage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  const session = await getSession()

  if (!session?.user) {
    redirect(`/sign-in?redirectTo=${encodeURIComponent(`/dashboard/orgs/${slug}/invite`)}`)
  }

  const invitations = await api.org.invitation.list({ page: 1, pageSize: 10, search: "", slug, status: "all" })

  return <OrgInviteContent initialData={invitations} slug={slug} />
}

export default OrgInvitePage
