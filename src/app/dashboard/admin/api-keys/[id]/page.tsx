import Link from "next/link"

import { Button } from "@/components/ui/button"
import { ROUTE_DASHBOARD_ADMIN_API_KEYS } from "@/lib/const"
import { api } from "@/trpc/server"
import { AdminApiKeyDetailContent } from "../_components/admin-api-key-detail-content"

const AdminApiKeyDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const apiKey = await api.adminApiKey.get({ id })

  return (
    <div className="space-y-5 text-[13px]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl tracking-normal">平台 API Key 详情</h1>
          <p className="mt-2 text-muted-foreground text-xs">查看平台内 API Key 的所属主体、风险、调用摘要和最近使用日志。</p>
        </div>
        <Button asChild variant="outline">
          <Link href={ROUTE_DASHBOARD_ADMIN_API_KEYS}>返回列表</Link>
        </Button>
      </div>
      <AdminApiKeyDetailContent apiKey={apiKey} mode="page" />
    </div>
  )
}

export default AdminApiKeyDetailPage
