import { ArrowRightLeft } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROUTE_DASHBOARD, ROUTE_DASHBOARD_ADMIN_API_KEYS, ROUTE_DASHBOARD_SETTINGS_SECURITY, ROUTE_DASHBOARD_SETTINGS_SESSIONS } from "@/lib/const"
import { cn } from "@/lib/utils"

import { HealthRadarChart } from "./health-radar-chart"
import type { DashboardHomeData } from "./types"

type DashboardHomeContentProps = {
  data: DashboardHomeData
}

type OrganizationDashboardData = Extract<DashboardHomeData, { view: "organization-admin" }>
type PersonalDashboardData = Extract<DashboardHomeData, { view: "personal" }>

type ActionItem = {
  count: string
  href: string
  title: string
}

type DonutSegment = {
  colorClass: string
  label: string
  value: number
}

const getScore = (data: DashboardHomeData) => Math.round(data.radar.reduce((sum, item) => sum + item.value, 0) / Math.max(data.radar.length, 1))

const findMetric = (data: DashboardHomeData, label: string) => data.metrics.find((metric) => metric.label === label)?.value ?? "0"

const getHeroConfig = (data: DashboardHomeData) => {
  if (data.view === "organization-admin") {
    return {
      chartLabel: "组织治理维度雷达图",
      cta: "查看治理建议",
      description: "组织身份治理整体稳定，但成员安全覆盖和邀请流转仍有优化空间。",
      title: "组织治理健康分"
    }
  }

  return {
    chartLabel: "个人安全维度雷达图",
    cta: "提升安全性",
    description: "你的账号安全状态良好。建议补齐双因素认证和 Passkey，让恢复与登录链路更稳。",
    title: "个人安全健康分"
  }
}

const getActions = (data: DashboardHomeData): ActionItem[] => {
  if (data.view === "organization-admin") {
    return [
      { count: data.actions[0]?.count ?? "0", href: data.actions[0]?.href ?? `${ROUTE_DASHBOARD}/orgs`, title: "未开启 2FA 成员" },
      { count: data.actions[1]?.count ?? "0", href: data.actions[1]?.href ?? `${ROUTE_DASHBOARD}/orgs`, title: "过期或撤销邀请" },
      { count: data.actions[2]?.count ?? "0", href: data.actions[2]?.href ?? ROUTE_DASHBOARD_SETTINGS_SESSIONS, title: "异常会话待检查" },
      { count: data.actions[3]?.count ?? "0", href: data.actions[3]?.href ?? ROUTE_DASHBOARD_ADMIN_API_KEYS, title: "即将过期 API Key" }
    ]
  }

  return [
    { count: data.actions[0]?.count ?? "0", href: data.actions[0]?.href ?? ROUTE_DASHBOARD_SETTINGS_SECURITY, title: "开启 2FA" },
    { count: data.actions[1]?.count ?? "0", href: data.actions[1]?.href ?? ROUTE_DASHBOARD_SETTINGS_SECURITY, title: "添加 Passkey" },
    { count: data.actions[2]?.count ?? "0", href: data.actions[2]?.href ?? ROUTE_DASHBOARD, title: "处理组织邀请" },
    { count: data.actions[3]?.count ?? "0", href: data.actions[3]?.href ?? ROUTE_DASHBOARD_SETTINGS_SESSIONS, title: "检查长期会话" }
  ]
}

const getFooterSummary = (data: DashboardHomeData) => {
  if (data.view === "organization-admin") {
    return `${findMetric(data, "成员")} 名成员     ${findMetric(data, "待处理邀请")} 个邀请     ${findMetric(data, "即将过期 Key")} 个即将过期 Key`
  }

  return `${findMetric(data, "活跃设备")} 台设备     ${findMetric(data, "待处理邀请")} 个邀请`
}

const segmentColors = ["text-primary", "text-chart-2", "text-chart-3", "text-chart-4"]

const getDonutSegments = (items: { label: string; value: number }[]): DonutSegment[] => {
  const total = items.reduce((sum, item) => sum + item.value, 0)

  if (total === 0) {
    return []
  }

  return items
    .filter((item) => item.value > 0)
    .map((item, index) => ({
      colorClass: segmentColors[index % segmentColors.length] ?? "text-primary",
      label: `${item.label} ${item.value}`,
      value: Math.round((item.value / total) * 100)
    }))
}

export const DashboardHomeContent = ({ data }: DashboardHomeContentProps) => {
  const hero = getHeroConfig(data)
  const score = getScore(data)

  return (
    <div className="relative space-y-7 pb-4 text-[13px]">
      <section className="grid gap-7 xl:grid-cols-12">
        <Card className="overflow-hidden rounded-xl py-0 shadow-black/5 shadow-xl xl:col-span-8 dark:shadow-black/30">
          <CardContent className="grid min-h-[338px] gap-8 p-8 md:grid-cols-[minmax(0,1fr)_340px] md:items-center">
            <div className="flex flex-col items-start justify-center">
              <div className="mb-5 flex items-end gap-2">
                <span className="font-semibold text-6xl leading-none tracking-normal">{score}</span>
                <span className="pb-2 font-semibold text-lg text-muted-foreground">/ 100</span>
              </div>
              <p className="sr-only">{hero.title}</p>
              <p className="max-w-sm text-muted-foreground text-xs leading-5">{hero.description}</p>
              <Button asChild className="mt-6 h-10 min-w-34 px-6 text-xs">
                <Link href={data.view === "organization-admin" ? `${ROUTE_DASHBOARD}/orgs` : ROUTE_DASHBOARD_SETTINGS_SECURITY}>{hero.cta}</Link>
              </Button>
            </div>
            <div className="flex min-h-60 items-center justify-center">
              <HealthRadarChart ariaLabel={hero.chartLabel} points={data.radar} />
            </div>
          </CardContent>
        </Card>

        <ActionQueue actions={getActions(data)} title={data.view === "organization-admin" ? "治理行动队列" : "我的安全待办"} />
      </section>

      {data.view === "organization-admin" ? <OrganizationDashboardBody data={data} /> : <PersonalDashboardBody data={data} />}

      <p className="text-muted-foreground text-xs">{getFooterSummary(data)}</p>

      {data.view === "organization-admin" ? (
        <div className="fixed right-8 bottom-7 z-30 flex items-center gap-4">
          <span className="rounded-md border bg-card px-4 py-2 text-xs shadow-lg">切换视角</span>
          <Button aria-label="切换视角" className="size-14 rounded-full shadow-primary/25 shadow-xl" size="icon" title="切换视角">
            <ArrowRightLeft className="size-6" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}

const ActionQueue = ({ actions, title }: { actions: ActionItem[]; title: string }) => (
  <Card className="rounded-xl py-0 shadow-black/5 shadow-xl xl:col-span-4 dark:shadow-black/30">
    <CardHeader className="px-6 pt-7 pb-3">
      <CardTitle className="text-lg">{title}</CardTitle>
      <p className="text-muted-foreground text-xs">{title === "治理行动队列" ? "只展示组织管理员可处理事项" : "只展示与你直接相关的处理项"}</p>
    </CardHeader>
    <CardContent className="space-y-4 px-6 pb-6">
      {actions.map((action, index) => (
        <Link
          className={cn(
            "group flex h-12 items-center gap-4 rounded-lg border px-3 font-semibold text-xs transition-colors hover:bg-muted/70",
            index === 0 && "border-transparent bg-accent text-accent-foreground hover:bg-accent"
          )}
          href={action.href}
          key={action.title}
        >
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md bg-muted font-semibold text-muted-foreground",
              index === 0 && "bg-primary text-primary-foreground"
            )}
          >
            {action.count}
          </span>
          <span>{action.title}</span>
        </Link>
      ))}
    </CardContent>
  </Card>
)

const PersonalDashboardBody = ({ data }: { data: PersonalDashboardData }) => {
  const deviceCount = findMetric(data, "活跃设备")

  return (
    <>
      <section className="grid gap-7 lg:grid-cols-3">
        <DeviceFootprintCard count={deviceCount} />
        <LoginPortraitCard methods={data.loginMethods} />
        <PersonalApiKeyCard status={data.personalApiKeyStatus} />
      </section>
      <RecentEventsCard events={data.recentEvents} />
    </>
  )
}

const OrganizationDashboardBody = ({ data }: { data: OrganizationDashboardData }) => (
  <>
    <section className="grid gap-7 xl:grid-cols-12">
      <SecurityCoverageCard className="xl:col-span-8" data={data} />
      <PermissionDistributionCard className="xl:col-span-4" distribution={data.permissionDistribution} />
    </section>
    <section className="grid gap-7 xl:grid-cols-12">
      <TeamStructureCard className="xl:col-span-4" structure={data.departmentStructure} />
    </section>
  </>
)

const DeviceFootprintCard = ({ count }: { count: string }) => (
  <Card className="min-h-56 rounded-xl py-0 shadow-black/5 shadow-xl dark:shadow-black/30">
    <CardHeader className="px-6 pt-6 pb-0">
      <CardTitle className="text-lg">设备足迹</CardTitle>
      <p className="text-muted-foreground text-xs">当前活跃登录设备</p>
    </CardHeader>
    <CardContent className="flex h-36 flex-col justify-end px-6 pb-6">
      <div className="mb-4 flex size-20 items-center justify-center rounded-xl bg-accent font-semibold text-4xl text-primary">{count}</div>
      <p className="font-semibold text-lg">{count} 台活跃设备</p>
    </CardContent>
  </Card>
)

const LoginPortraitCard = ({ methods }: { methods: PersonalDashboardData["loginMethods"] }) => {
  const segments = getDonutSegments(methods)

  return (
    <Card className="min-h-56 rounded-xl py-0 shadow-black/5 shadow-xl dark:shadow-black/30">
      <CardHeader className="px-6 pt-6 pb-0">
        <CardTitle className="text-lg">登录方式画像</CardTitle>
        <p className="text-muted-foreground text-xs">账号可用登录方式</p>
      </CardHeader>
      <CardContent className="flex items-center justify-center gap-8 px-6 pb-6">
        {segments.length > 0 ? (
          <>
            <DonutChart segments={segments} />
            <ChartLegend segments={segments} />
          </>
        ) : (
          <EmptyInlineState text="暂无登录方式数据" />
        )}
      </CardContent>
    </Card>
  )
}

const PersonalApiKeyCard = ({ status }: { status: PersonalDashboardData["personalApiKeyStatus"] }) => (
  <Card className="min-h-56 rounded-xl py-0 shadow-black/5 shadow-xl dark:shadow-black/30">
    <CardHeader className="px-6 pt-6 pb-0">
      <CardTitle className="text-lg">个人 API Key 状态</CardTitle>
      <p className="text-muted-foreground text-xs">个人凭证使用与过期状态</p>
    </CardHeader>
    <CardContent className="flex items-center gap-6 px-6 pb-6">
      <div className="flex size-20 items-center justify-center rounded-xl bg-accent font-semibold text-4xl text-primary">{status.totalCount}</div>
      <ul className="space-y-3 text-xs">
        <li className="flex items-center gap-2">
          <Dot />
          <span>{status.recentUsedCount} 个 30 天内使用</span>
        </li>
        <li className="flex items-center gap-2">
          <Dot />
          <span>{status.expiringSoonCount} 个即将过期</span>
        </li>
      </ul>
    </CardContent>
  </Card>
)

const RecentEventsCard = ({ events }: { events: DashboardHomeData["recentEvents"] }) => (
  <Card className="rounded-xl py-0 shadow-black/5 shadow-xl dark:shadow-black/30">
    <CardHeader className="px-6 pt-6 pb-0">
      <CardTitle className="text-lg">最近身份事件</CardTitle>
    </CardHeader>
    <CardContent className="grid gap-5 px-6 pb-7 md:grid-cols-3">
      {events.length > 0 ? (
        events.map((event) => (
          <div className="rounded-lg bg-muted/70 p-4" key={event.id}>
            <p className="font-semibold text-xs">{event.title}</p>
            <p className="mt-4 break-words text-muted-foreground text-xs">{event.description}</p>
          </div>
        ))
      ) : (
        <EmptyInlineState text="暂无最近身份事件" />
      )}
    </CardContent>
  </Card>
)

const SecurityCoverageCard = ({ className, data }: { className?: string; data: DashboardHomeData }) => (
  <Card className={cn("rounded-xl py-0 shadow-black/5 shadow-xl dark:shadow-black/30", className)}>
    <CardHeader className="px-6 pt-6 pb-0">
      <CardTitle className="text-lg">成员安全覆盖</CardTitle>
      <p className="text-muted-foreground text-xs">邮箱验证、2FA、Passkey 采用率</p>
    </CardHeader>
    <CardContent className="space-y-7 px-6 pb-8">
      {[
        { label: "邮箱验证", value: Number(findMetric(data, "邮箱验证率")) },
        { label: "2FA", value: Number(findMetric(data, "2FA覆盖率")) },
        { label: "Passkey", value: Number(findMetric(data, "Passkey覆盖率")) }
      ].map((row) => (
        <div className="grid items-center gap-4 text-xs sm:grid-cols-[72px_1fr_36px]" key={row.label}>
          <span>{row.label}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-accent">
            <div className="h-full rounded-full bg-primary" style={{ width: `${row.value}%` }} />
          </div>
          <span className="text-right">{row.value}%</span>
        </div>
      ))}
    </CardContent>
  </Card>
)

const PermissionDistributionCard = ({ className, distribution }: { className?: string; distribution: OrganizationDashboardData["permissionDistribution"] }) => {
  const segments = getDonutSegments(distribution)
  const adminCount = distribution.filter((item) => item.label === "owner" || item.label === "admin").reduce((sum, item) => sum + item.value, 0)
  const totalCount = distribution.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className={cn("rounded-xl py-0 shadow-black/5 shadow-xl dark:shadow-black/30", className)}>
      <CardHeader className="px-6 pt-6 pb-0">
        <CardTitle className="text-lg">权限分布</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-44 flex-col items-center justify-center gap-3 px-6 pb-6 text-center">
        {segments.length > 0 ? (
          <>
            <DonutChart segments={segments} />
            <ChartLegend segments={segments} />
            <p className="text-muted-foreground text-xs">
              owner/admin {adminCount} / {totalCount}
            </p>
          </>
        ) : (
          <EmptyInlineState text="暂无权限分布数据" />
        )}
      </CardContent>
    </Card>
  )
}

const TeamStructureCard = ({ className, structure }: { className?: string; structure: OrganizationDashboardData["departmentStructure"] }) => {
  const hasDepartmentData = structure.largestDepartmentSize > 0 || structure.emptyDepartmentCount > 0 || structure.unassignedMemberCount > 0

  return (
    <Card className={cn("min-h-56 rounded-xl py-0 shadow-black/5 shadow-xl dark:shadow-black/30", className)}>
      <CardHeader className="px-6 pt-6 pb-0">
        <CardTitle className="text-lg">团队结构</CardTitle>
        <p className="text-muted-foreground text-xs">识别空部门与未分配成员</p>
      </CardHeader>
      <CardContent className="space-y-5 px-6 pb-6">
        {hasDepartmentData ? (
          <>
            <div className="flex items-end gap-6">
              <MetricBubble label="最大" value={structure.largestDepartmentSize} />
              <MetricBubble label="空" value={structure.emptyDepartmentCount} />
              <MetricBubble label="未分配" value={structure.unassignedMemberCount} />
            </div>
            <p className="text-muted-foreground text-xs">
              {structure.largestDepartmentName ? `最大部门：${structure.largestDepartmentName} · ${structure.largestDepartmentSize} 人。` : "暂无成员归属部门。"}
            </p>
          </>
        ) : (
          <EmptyInlineState text="暂无部门结构数据" />
        )}
      </CardContent>
    </Card>
  )
}

const Dot = () => <span className="size-2 rounded-full bg-primary" />

const EmptyInlineState = ({ text }: { text: string }) => <p className="text-muted-foreground text-xs">{text}</p>

const DonutChart = ({ segments }: { segments: DonutSegment[] }) => {
  const circumference = 264
  let accumulatedDash = 0

  const renderedSegments = segments.map((segment) => {
    const dash = Math.max(0, Math.min(circumference, (segment.value / 100) * circumference))
    const renderedSegment = {
      colorClass: segment.colorClass,
      dash,
      key: segment.label,
      offset: -accumulatedDash
    }
    accumulatedDash += dash

    return renderedSegment
  })

  return (
    <svg aria-hidden="true" className="size-32 shrink-0 -rotate-90" viewBox="0 0 120 120">
      <circle className="fill-none stroke-accent" cx="60" cy="60" r="42" strokeWidth="16" />
      {renderedSegments.map((segment) => (
        <circle
          className={cn("fill-none stroke-current", segment.colorClass)}
          cx="60"
          cy="60"
          key={segment.key}
          r="42"
          strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
          strokeDashoffset={segment.offset}
          strokeLinecap="butt"
          strokeWidth="16"
        />
      ))}
    </svg>
  )
}

const ChartLegend = ({ segments }: { segments: DonutSegment[] }) => (
  <ul className="space-y-3 text-xs">
    {segments.map((segment) => (
      <li className="flex items-center gap-2" key={segment.label}>
        <span className={cn("size-2 rounded-full bg-current", segment.colorClass)} />
        <span>{segment.label}</span>
      </li>
    ))}
  </ul>
)

const MetricBubble = ({ label, value }: { label: string; value: number }) => (
  <span className="flex size-18 flex-col items-center justify-center rounded-full bg-primary/15 text-primary">
    <span className="font-semibold text-lg">{value}</span>
    <span className="text-[10px]">{label}</span>
  </span>
)
