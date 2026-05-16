import { redirect } from "next/navigation"

import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"
import { OrgInformationContent } from "../_components/org-information-content"

const OrgInformationPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  const session = await getSession()

  if (!session?.user) {
    redirect(`/sign-in?redirectTo=${encodeURIComponent(`/dashboard/orgs/${slug}/information`)}`)
  }

  const orgAccess = await api.org.getBySlug({ slug })
  const tree = await api.org.department.list({ slug })
  const selectedNodeId = tree.selectedNodeId ?? tree.nodes[0]?.id ?? null
  const members = selectedNodeId
    ? await api.org.department.member.list({ departmentId: selectedNodeId, page: 1, pageSize: 10, search: "", securityStatus: "all", slug })
    : { items: [], page: 1, pageCount: 1, total: 0 }

  return <OrgInformationContent canManage={orgAccess.canManage} initialMembers={members} isPlatformAdmin={orgAccess.isPlatformAdmin} slug={slug} tree={tree} />
}

export default OrgInformationPage
