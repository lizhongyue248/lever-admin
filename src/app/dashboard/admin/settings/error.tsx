"use client"

import { DashboardErrorCard } from "@/app/dashboard/_components/dashboard-error-card"

const AdminPlatformSettingsError = ({ error, reset }: { error: Error; reset: () => void }) => (
  <DashboardErrorCard description="平台设置加载失败，请确认当前账号拥有超级管理员权限。" error={error} reset={reset} title="无法加载平台设置" />
)

export default AdminPlatformSettingsError
