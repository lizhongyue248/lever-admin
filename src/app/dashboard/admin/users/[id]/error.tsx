"use client"

import { DashboardErrorCard } from "@/app/dashboard/_components/dashboard-error-card"

const AdminUserDetailError = ({ error, reset }: { error: Error; reset: () => void }) => (
  <DashboardErrorCard description="用户详情加载失败，请稍后重试。" error={error} reset={reset} title="无法加载用户详情" />
)

export default AdminUserDetailError
