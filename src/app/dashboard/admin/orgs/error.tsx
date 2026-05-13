"use client"

import { DashboardErrorCard } from "@/app/dashboard/_components/dashboard-error-card"

const AdminOrgsError = ({ error, reset }: { error: Error; reset: () => void }) => (
  <DashboardErrorCard description="请确认当前账号具备平台管理员权限，或联系超级管理员处理。" error={error} reset={reset} title="平台组织加载失败" />
)

export default AdminOrgsError
