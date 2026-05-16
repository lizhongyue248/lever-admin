import { redirect } from "next/navigation"

import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, FILTER_ALL, ROUTE_SIGN_IN } from "@/lib/const"
import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"
import { OrgInviteContent } from "../_components/org-invite-content"

const OrgInvitePage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  const session = await getSession()

  if (!session?.user) {
    redirect(`${ROUTE_SIGN_IN}?redirectTo=${encodeURIComponent(`/dashboard/orgs/${slug}/invite`)}`)
  }

  const invitations = await api.org.invitation.list({ page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE, search: "", slug, status: FILTER_ALL })

  return <OrgInviteContent initialData={invitations} slug={slug} />
}

export default OrgInvitePage
