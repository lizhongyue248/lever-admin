"use client"

import { DashboardErrorCard } from "@/app/dashboard/_components/dashboard-error-card"

const AdminApiKeyDetailError = ({ error, reset }: { error: Error; reset: () => void }) => (
  <div className="space-y-5 text-[13px]">
    <div>
      <h1 className="font-bold text-2xl tracking-normal">平台 API Key 详情</h1>
      <p className="mt-2 text-muted-foreground text-xs">查看平台内 API Key 的状态、风险和使用日志。</p>
    </div>
    <DashboardErrorCard description="平台 API Key 详情暂时无法加载，请确认凭据仍存在并稍后重试。" error={error} reset={reset} title="平台 API Key 详情加载失败" />
  </div>
)

export default AdminApiKeyDetailError
