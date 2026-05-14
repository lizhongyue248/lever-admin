"use client"

import { DashboardErrorCard } from "@/app/dashboard/_components/dashboard-error-card"

const AdminApiKeysError = ({ error, reset }: { error: Error; reset: () => void }) => (
  <div className="space-y-5 text-[13px]">
    <div>
      <h1 className="font-bold text-2xl tracking-normal">平台 API Keys</h1>
      <p className="mt-2 text-muted-foreground text-xs">集中审计和治理平台内用户与组织 API Key。</p>
    </div>
    <DashboardErrorCard description="平台 API Key 列表暂时无法加载，请稍后重试。" error={error} reset={reset} title="平台 API Key 加载失败" />
  </div>
)

export default AdminApiKeysError
