"use client"

import { DashboardErrorCard } from "@/app/dashboard/_components/dashboard-error-card"

const ApiKeyDetailError = ({ error, reset }: { error: Error; reset: () => void }) => (
  <div className="space-y-5 text-[13px]">
    <div>
      <h1 className="font-bold text-2xl tracking-normal">API Key 详情</h1>
      <p className="mt-2 text-muted-foreground text-xs">查看个人开发者凭据状态、风险和使用日志。</p>
    </div>
    <DashboardErrorCard description="API Key 详情暂时无法加载，请确认凭据仍存在并稍后重试。" error={error} reset={reset} title="API Key 详情加载失败" />
  </div>
)

export default ApiKeyDetailError
