import { redirect } from "next/navigation"

const OrgMembersRedirectPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  redirect(`/dashboard/orgs/${slug}/information`)
}

export default OrgMembersRedirectPage
