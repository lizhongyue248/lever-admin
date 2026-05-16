import { ADMIN_ORG_DEFAULT_PAGE_SIZE, DEFAULT_PAGE, FILTER_ALL } from "@/lib/const"
import { api } from "@/trpc/server"
import { AdminOrgsContent } from "./_components/admin-orgs-content"

const AdminOrgsPage = async () => {
  const [overview, organizations] = await Promise.all([
    api.adminOrg.getOverview(),
    api.adminOrg.list({ page: DEFAULT_PAGE, pageSize: ADMIN_ORG_DEFAULT_PAGE_SIZE, search: "", status: FILTER_ALL })
  ])

  return <AdminOrgsContent initialOrganizations={organizations} overview={overview} />
}

export default AdminOrgsPage
