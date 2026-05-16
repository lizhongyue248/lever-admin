import { DEFAULT_PAGE, DENSE_PAGE_SIZE, FILTER_ALL } from "@/lib/const"
import { api } from "@/trpc/server"
import { AdminUsersContent } from "./_components/admin-users-content"

const AdminUsersPage = async ({ searchParams }: { searchParams: Promise<{ userId?: string }> }) => {
  const params = await searchParams
  const [users, selectedUser] = await Promise.all([
    api.adminUser.list({ page: DEFAULT_PAGE, pageSize: DENSE_PAGE_SIZE, role: FILTER_ALL, search: "", status: FILTER_ALL }),
    params.userId ? api.adminUser.get({ userId: params.userId }) : Promise.resolve(null)
  ])

  return <AdminUsersContent initialSelectedUser={selectedUser} initialUsers={users} selectedUserId={params.userId ?? null} />
}

export default AdminUsersPage
