import Link from "next/link"

import { Button } from "@/components/ui/button"
import { ROUTE_DASHBOARD_ADMIN_USERS } from "@/lib/const"
import { api } from "@/trpc/server"
import { AdminUserDetailContent } from "../_components/admin-user-detail-content"

const AdminUserDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const user = await api.adminUser.get({ userId: id })

  return (
    <div className="space-y-5 text-[13px]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl tracking-normal">用户详情</h1>
          <p className="mt-2 text-muted-foreground text-xs">查看单个用户完整身份、安全、组织、会话和 API Key 信息。</p>
        </div>
        <Button asChild variant="outline">
          <Link href={ROUTE_DASHBOARD_ADMIN_USERS}>返回列表</Link>
        </Button>
      </div>
      <AdminUserDetailContent mode="page" user={user} />
    </div>
  )
}

export default AdminUserDetailPage
