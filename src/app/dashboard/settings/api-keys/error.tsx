"use client"

import { DashboardErrorCard } from "@/app/dashboard/_components/dashboard-error-card"

const ApiKeysError = ({ error, reset }: { error: Error; reset: () => void }) => (
  <div className="space-y-5 text-[13px]">
    <div>
      <h1 className="font-bold text-2xl tracking-normal">API Keys</h1>
      <p className="mt-2 text-muted-foreground text-xs">创建和管理用于 CLI、服务端脚本或开放接口请求的个人凭据。</p>
    </div>
    <DashboardErrorCard description="个人 API Key 列表暂时无法加载，请稍后重试。" error={error} reset={reset} title="API Key 加载失败" />
  </div>
)

export default ApiKeysError
