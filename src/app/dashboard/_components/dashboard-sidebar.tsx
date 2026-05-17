"use client"

import { Building2, KeyRound, LayoutDashboard, type LucideIcon, ScrollText, Settings, ShieldCheck, SlidersHorizontal, UsersRound } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { BrandLogo } from "@/components/brand-logo"
import {
  ORGANIZATION_ADMIN_ROLES,
  PLATFORM_ROLE_ADMIN,
  PLATFORM_ROLE_SUPER_ADMIN,
  ROUTE_DASHBOARD,
  ROUTE_DASHBOARD_ADMIN_API_KEYS,
  ROUTE_DASHBOARD_ADMIN_ORGS,
  ROUTE_DASHBOARD_ADMIN_REQUEST_LOGS,
  ROUTE_DASHBOARD_ADMIN_SETTINGS,
  ROUTE_DASHBOARD_ADMIN_USERS,
  ROUTE_DASHBOARD_SETTINGS_API_KEYS,
  ROUTE_DASHBOARD_SETTINGS_PROFILE,
  ROUTE_DASHBOARD_SETTINGS_SECURITY,
  ROUTE_DASHBOARD_SETTINGS_SESSIONS
} from "@/lib/const"
import { cn } from "@/lib/utils"
import { DashboardUserMenu } from "./dashboard-user-menu"
import type { DashboardShellData } from "./types"

type DashboardSidebarProps = {
  collapsed?: boolean
  data: DashboardShellData
  mobile?: boolean
}

type NavItem = {
  href: string
  icon: LucideIcon
  label: string
}

const canManageOrganization = (role: string | null | undefined) => ORGANIZATION_ADMIN_ROLES.some((adminRole) => adminRole === role)

const getNavGroups = (data: DashboardShellData): { items: NavItem[]; label: string }[] => {
  const activeOrganization = data.organizations.find((item) => item.organizationId === data.activeOrganizationId) ?? data.organizations[0] ?? null
  const canShowCurrentOrganization = canManageOrganization(activeOrganization?.role)
  const platformRole = data.user.role
  const isPlatformAdmin = platformRole === PLATFORM_ROLE_ADMIN || platformRole === PLATFORM_ROLE_SUPER_ADMIN
  const isPlatformSuperAdmin = platformRole === PLATFORM_ROLE_SUPER_ADMIN
  const adminItems: NavItem[] = isPlatformAdmin
    ? [
        { href: ROUTE_DASHBOARD_ADMIN_USERS, icon: UsersRound, label: "用户管理" },
        { href: ROUTE_DASHBOARD_ADMIN_ORGS, icon: Building2, label: "平台组织" },
        { href: ROUTE_DASHBOARD_ADMIN_API_KEYS, icon: KeyRound, label: "平台 API Key" },
        isPlatformSuperAdmin ? { href: ROUTE_DASHBOARD_ADMIN_REQUEST_LOGS, icon: ScrollText, label: "请求日志" } : null,
        isPlatformSuperAdmin ? { href: ROUTE_DASHBOARD_ADMIN_SETTINGS, icon: SlidersHorizontal, label: "平台设置" } : null
      ].filter((item): item is NavItem => item !== null)
    : []

  return [
    {
      items: [{ href: ROUTE_DASHBOARD, icon: LayoutDashboard, label: "工作台" }],
      label: "概览"
    },
    {
      items: [
        { href: ROUTE_DASHBOARD_SETTINGS_PROFILE, icon: Settings, label: "个人资料" },
        { href: ROUTE_DASHBOARD_SETTINGS_SECURITY, icon: ShieldCheck, label: "安全设置" },
        { href: ROUTE_DASHBOARD_SETTINGS_SESSIONS, icon: UsersRound, label: "我的会话" },
        { href: ROUTE_DASHBOARD_SETTINGS_API_KEYS, icon: KeyRound, label: "API Keys" },
        activeOrganization && canShowCurrentOrganization ? { href: `/dashboard/orgs/${activeOrganization.organizationSlug}`, icon: Building2, label: "当前组织" } : null
      ].filter((item): item is NavItem => item !== null),
      label: "账号设置"
    },
    {
      items: adminItems,
      label: "管理"
    }
  ].filter((group) => group.items.length > 0)
}

export const DashboardSidebar = ({ collapsed = false, data, mobile = false }: DashboardSidebarProps) => {
  const pathname = usePathname()
  const navGroups = getNavGroups(data)

  return (
    <aside
      className={cn(
        "flex h-dvh min-h-0 shrink-0 flex-col border-sidebar-border border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        mobile ? "w-full border-r-0" : "hidden lg:flex",
        !mobile && (collapsed ? "w-18" : "w-72")
      )}
      data-collapsed={collapsed && !mobile ? "true" : undefined}
      data-testid={mobile ? "dashboard-mobile-sidebar" : "dashboard-sidebar"}
    >
      <div className={cn("flex h-16 shrink-0 items-center gap-3 border-sidebar-border border-b px-4", collapsed && !mobile && "justify-center px-2")}>
        <BrandLogo className="size-9" />
        <div className={cn("min-w-0", collapsed && !mobile && "hidden")}>
          <p className="truncate font-semibold text-sm">Lever Admin</p>
          <p className="text-muted-foreground text-xs">身份与权限中枢</p>
        </div>
      </div>

      <nav aria-label={mobile ? "移动端主导航" : "主导航"} className={cn("min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4", collapsed && !mobile && "px-2")}>
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className={cn("px-2 pb-2 font-medium text-[11px] text-muted-foreground", collapsed && !mobile && "sr-only")}>{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== ROUTE_DASHBOARD && pathname.startsWith(`${item.href}/`))

                return (
                  <Link
                    className={cn(
                      "relative flex h-9 items-center gap-2.5 rounded-md px-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      collapsed && !mobile && "justify-center px-0",
                      isActive && "bg-primary/10 font-medium text-primary before:absolute before:left-0 before:h-5 before:w-1 before:rounded-full before:bg-primary"
                    )}
                    href={item.href}
                    key={item.href}
                    title={collapsed && !mobile ? item.label : undefined}
                  >
                    <Icon className="size-4" />
                    <span className={cn("min-w-0 flex-1 truncate", collapsed && !mobile && "hidden")} data-testid={`dashboard-sidebar-label-${item.label}`}>
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("mt-auto shrink-0 border-sidebar-border border-t p-3", collapsed && !mobile && "px-2")}>
        <DashboardUserMenu compact={collapsed && !mobile} data={data} />
      </div>
    </aside>
  )
}
