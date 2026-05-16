import Link from "next/link"

import { Button } from "@/components/ui/button"
import { ROUTE_DASHBOARD_SETTINGS_API_KEYS } from "@/lib/const"
import { api } from "@/trpc/server"
import { ApiKeyDetailContent } from "../_components/api-key-detail-content"

const ApiKeyDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const apiKey = await api.apiKey.getMine({ id })

  return (
    <div className="space-y-5 text-[13px]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl tracking-normal">API Key 详情</h1>
          <p className="mt-2 text-muted-foreground text-xs">查看个人开发者凭据状态、风险、调用摘要和最近使用日志。</p>
        </div>
        <Button asChild variant="outline">
          <Link href={ROUTE_DASHBOARD_SETTINGS_API_KEYS}>返回列表</Link>
        </Button>
      </div>
      <ApiKeyDetailContent apiKey={apiKey} mode="page" />
    </div>
  )
}

export default ApiKeyDetailPage
