"use client"

import type { ReactNode } from "react"
import { useState } from "react"

import { DashboardSidebar } from "./dashboard-sidebar"
import { DashboardTopbar } from "./dashboard-topbar"
import type { DashboardShellData } from "./types"

type DashboardShellProps = {
  children: ReactNode
  data: DashboardShellData
}

export const DashboardShell = ({ children, data }: DashboardShellProps) => <DashboardShellInner data={data}>{children}</DashboardShellInner>

const DashboardShellInner = ({ children, data }: DashboardShellProps) => {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <DashboardSidebar collapsed={collapsed} data={data} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardTopbar collapsed={collapsed} data={data} onToggleSidebar={() => setCollapsed((current) => !current)} />
        <main className="min-h-0 flex-1 overflow-y-auto bg-muted/45 dark:bg-background">
          <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
