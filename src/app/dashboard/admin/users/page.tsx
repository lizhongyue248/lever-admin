import { api } from "@/trpc/server"
import { AdminUsersContent } from "./_components/admin-users-content"

const AdminUsersPage = async ({ searchParams }: { searchParams: Promise<{ userId?: string }> }) => {
  const params = await searchParams
  const [users, selectedUser] = await Promise.all([
    api.adminUser.list({ page: 1, pageSize: 20, role: "all", search: "", status: "all" }),
    params.userId ? api.adminUser.get({ userId: params.userId }) : Promise.resolve(null)
  ])

  return <AdminUsersContent initialSelectedUser={selectedUser} initialUsers={users} selectedUserId={params.userId ?? null} />
}

export default AdminUsersPage
