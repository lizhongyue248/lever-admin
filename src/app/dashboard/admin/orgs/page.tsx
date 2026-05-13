import { api } from "@/trpc/server"
import { AdminOrgsContent } from "./_components/admin-orgs-content"

const AdminOrgsPage = async () => {
  const [overview, organizations] = await Promise.all([api.adminOrg.getOverview(), api.adminOrg.list({ page: 1, pageSize: 12, search: "", status: "all" })])

  return <AdminOrgsContent initialOrganizations={organizations} overview={overview} />
}

export default AdminOrgsPage
