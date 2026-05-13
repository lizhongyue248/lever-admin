"use client"

import { DashboardErrorCard } from "@/app/dashboard/_components/dashboard-error-card"

const DashboardError = ({ error, reset }: { error: Error; reset: () => void }) => <DashboardErrorCard error={error} reset={reset} title="页面加载失败" />

export default DashboardError
