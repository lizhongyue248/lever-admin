import { ArrowRightLeft } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { HealthRadarChart } from "./health-radar-chart"
import type { DashboardHomeData } from "./types"

type DashboardHomeContentProps = {
  data: DashboardHomeData
}

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
      { count: data.actions[0]?.count ?? "0", href: data.actions[0]?.href ?? "/dashboard/orgs", title: "未开启 2FA 成员" },
      { count: data.actions[1]?.count ?? "0", href: data.actions[1]?.href ?? "/dashboard/orgs", title: "过期或撤销邀请" },
      { count: data.actions[2]?.count ?? "0", href: data.actions[2]?.href ?? "/dashboard/settings/sessions", title: "异常会话待检查" },
      { count: data.actions[3]?.count ?? "0", href: data.actions[3]?.href ?? "/dashboard/admin/api-keys", title: "即将过期 API Key" }
    ]
  }

  return [
    { count: data.actions[0]?.count ?? "1", href: data.actions[0]?.href ?? "/dashboard/settings/security", title: "开启 2FA" },
    { count: data.actions[1]?.count ?? "2", href: data.actions[1]?.href ?? "/dashboard/settings/security", title: "添加 Passkey" },
    { count: data.actions[2]?.count ?? "0", href: data.actions[2]?.href ?? "/dashboard", title: "处理组织邀请" },
    { count: data.actions[3]?.count ?? "0", href: data.actions[3]?.href ?? "/dashboard/settings/sessions", title: "检查长期会话" }
  ]
}

const getFooterSummary = (data: DashboardHomeData) => {
  if (data.view === "organization-admin") {
    return `${findMetric(data, "成员")} 名成员     ${findMetric(data, "待处理邀请")} 个邀请     ${findMetric(data, "风险 Key")} 个风险 Key`
  }

  return `${findMetric(data, "活跃设备")} 台设备     ${findMetric(data, "待处理邀请")} 个邀请`
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
                <Link href={data.view === "organization-admin" ? "/dashboard/orgs" : "/dashboard/settings/security"}>{hero.cta}</Link>
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

const PersonalDashboardBody = ({ data }: { data: DashboardHomeData }) => {
  const deviceCount = findMetric(data, "活跃设备")
  const keyCount = findMetric(data, "个人 Key")

  return (
    <>
      <section className="grid gap-7 lg:grid-cols-3">
        <DeviceFootprintCard count={deviceCount} />
        <LoginPortraitCard />
        <PersonalApiKeyCard count={keyCount} />
      </section>
      <RecentEventsCard />
    </>
  )
}

const OrganizationDashboardBody = ({ data }: { data: DashboardHomeData }) => (
  <>
    <section className="grid gap-7 xl:grid-cols-12">
      <SecurityCoverageCard className="xl:col-span-8" data={data} />
      <PermissionDistributionCard className="xl:col-span-4" />
    </section>
    <section className="grid gap-7 xl:grid-cols-12">
      <TeamStructureCard className="xl:col-span-4" />
    </section>
  </>
)

const DeviceFootprintCard = ({ count }: { count: string }) => (
  <Card className="min-h-56 rounded-xl py-0 shadow-black/5 shadow-xl dark:shadow-black/30">
    <CardHeader className="px-6 pt-6 pb-0">
      <CardTitle className="text-lg">设备足迹</CardTitle>
      <p className="text-muted-foreground text-xs">近 30 天登录设备保持稳定</p>
    </CardHeader>
    <CardContent className="flex h-36 flex-col justify-end px-6 pb-6">
      <div className="flex items-end gap-3">
        {[42, 64, 54, 80, 46].map((height, index) => (
          <div className={cn("w-14 rounded-md bg-primary/35", index === 3 && "bg-primary")} key={height} style={{ height: `${height}px` }} />
        ))}
      </div>
      <p className="-mt-1 font-semibold text-lg">{count} 台活跃设备</p>
    </CardContent>
  </Card>
)

const LoginPortraitCard = () => (
  <Card className="min-h-56 rounded-xl py-0 shadow-black/5 shadow-xl dark:shadow-black/30">
    <CardHeader className="px-6 pt-6 pb-0">
      <CardTitle className="text-lg">登录方式画像</CardTitle>
      <p className="text-muted-foreground text-xs">密码与 OAuth 组合使用</p>
    </CardHeader>
    <CardContent className="flex items-center justify-center gap-8 px-6 pb-6">
      <DonutChart segments={personalLoginSegments} />
      <ChartLegend segments={personalLoginSegments} />
    </CardContent>
  </Card>
)

const PersonalApiKeyCard = ({ count }: { count: string }) => (
  <Card className="min-h-56 rounded-xl py-0 shadow-black/5 shadow-xl dark:shadow-black/30">
    <CardHeader className="px-6 pt-6 pb-0">
      <CardTitle className="text-lg">个人 API Key 状态</CardTitle>
      <p className="text-muted-foreground text-xs">凭证暴露面维持在低风险</p>
    </CardHeader>
    <CardContent className="flex items-center gap-6 px-6 pb-6">
      <div className="flex size-20 items-center justify-center rounded-xl bg-accent font-semibold text-4xl text-primary">{count}</div>
      <ul className="space-y-3 text-xs">
        <li className="flex items-center gap-2">
          <Dot />
          <span>1 个 30 天内使用</span>
        </li>
        <li className="flex items-center gap-2">
          <Dot />
          <span>0 个即将过期</span>
        </li>
        <li className="flex items-center gap-2">
          <Dot />
          <span>0 个高权限 Scope</span>
        </li>
      </ul>
    </CardContent>
  </Card>
)

const RecentEventsCard = () => (
  <Card className="rounded-xl py-0 shadow-black/5 shadow-xl dark:shadow-black/30">
    <CardHeader className="px-6 pt-6 pb-0">
      <CardTitle className="text-lg">最近身份事件</CardTitle>
    </CardHeader>
    <CardContent className="grid gap-5 px-6 pb-7 md:grid-cols-3">
      {[
        { description: "Chrome · 上海 · 12 分钟前", title: "登录成功" },
        { description: "客户成功 · viewer · 2 天后过期", title: "组织邀请待处理" },
        { description: "cli-prod · 3 小时前", title: "API Key 使用" }
      ].map((event) => (
        <div className="rounded-lg bg-muted/70 p-4" key={event.title}>
          <p className="font-semibold text-xs">{event.title}</p>
          <p className="mt-4 text-muted-foreground text-xs">{event.description}</p>
        </div>
      ))}
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

const PermissionDistributionCard = ({ className }: { className?: string }) => (
  <Card className={cn("rounded-xl py-0 shadow-black/5 shadow-xl dark:shadow-black/30", className)}>
    <CardHeader className="px-6 pt-6 pb-0">
      <CardTitle className="text-lg">权限分布</CardTitle>
    </CardHeader>
    <CardContent className="flex min-h-44 flex-col items-center justify-center gap-3 px-6 pb-6 text-center">
      <DonutChart segments={permissionSegments} />
      <p className="text-muted-foreground text-xs">owner/admin 占比 25%</p>
    </CardContent>
  </Card>
)

const TeamStructureCard = ({ className }: { className?: string }) => (
  <Card className={cn("min-h-56 rounded-xl py-0 shadow-black/5 shadow-xl dark:shadow-black/30", className)}>
    <CardHeader className="px-6 pt-6 pb-0">
      <CardTitle className="text-lg">团队结构</CardTitle>
      <p className="text-muted-foreground text-xs">识别空团队与超大团队</p>
    </CardHeader>
    <CardContent className="space-y-5 px-6 pb-6">
      <div className="flex items-end gap-6">
        <span className="size-18 rounded-full bg-primary" />
        <span className="size-14 rounded-full bg-primary/75" />
        <span className="size-10 rounded-full bg-primary/45" />
      </div>
      <p className="text-muted-foreground text-xs">研发团队偏大，建议拆分权限域。</p>
    </CardContent>
  </Card>
)

const Dot = () => <span className="size-2 rounded-full bg-primary" />

const personalLoginSegments: DonutSegment[] = [
  { colorClass: "text-primary", label: "密码 58%", value: 58 },
  { colorClass: "text-chart-2", label: "OAuth 31%", value: 31 },
  { colorClass: "text-chart-3", label: "Passkey 11%", value: 11 }
]

const permissionSegments: DonutSegment[] = [
  { colorClass: "text-primary", label: "owner/admin", value: 25 },
  { colorClass: "text-chart-2", label: "member", value: 55 },
  { colorClass: "text-chart-3", label: "viewer", value: 20 }
]

const DonutChart = ({ segments }: { segments: DonutSegment[] }) => {
  const first = segments[0]?.value ?? 0
  const second = segments[1]?.value ?? 0

  return (
    <svg aria-hidden="true" className="size-32 shrink-0 -rotate-90" viewBox="0 0 120 120">
      <circle className="fill-none stroke-accent" cx="60" cy="60" r="42" strokeWidth="16" />
      <circle
        className="fill-none stroke-current text-primary"
        cx="60"
        cy="60"
        r="42"
        strokeDasharray={`${first * 2.64} ${264 - first * 2.64}`}
        strokeDashoffset="0"
        strokeLinecap="butt"
        strokeWidth="16"
      />
      <circle
        className="fill-none stroke-current text-chart-2"
        cx="60"
        cy="60"
        r="42"
        strokeDasharray={`${second * 2.64} ${264 - second * 2.64}`}
        strokeDashoffset={`${-(first * 2.64)}`}
        strokeLinecap="butt"
        strokeWidth="16"
      />
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
