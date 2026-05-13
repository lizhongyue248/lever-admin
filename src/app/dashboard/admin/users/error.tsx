"use client"

import { DashboardErrorCard } from "@/app/dashboard/_components/dashboard-error-card"

const AdminUsersError = ({ error, reset }: { error: Error; reset: () => void }) => (
  <DashboardErrorCard description="用户管理数据加载失败，请稍后重试。" error={error} reset={reset} title="无法加载用户管理" />
)

export default AdminUsersError
