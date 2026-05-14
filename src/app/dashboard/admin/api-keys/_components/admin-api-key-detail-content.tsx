"use client"

import {
  Activity,
  BarChart3,
  Building2,
  CalendarClock,
  Fingerprint,
  Gauge,
  KeyRound,
  LinkIcon,
  type LucideIcon,
  MoreHorizontal,
  ShieldAlert,
  ShieldCheck,
  UserRound
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api, type RouterOutputs } from "@/trpc/react"
import { DeleteAdminApiKeyDialog, DisableAdminApiKeyDialog, EnableAdminApiKeyDialog } from "./admin-api-key-dialogs"

type AdminApiKeyDetail = RouterOutputs["adminApiKey"]["get"]
type AdminApiKeyUsageStats = RouterOutputs["adminApiKey"]["getUsageStats"]
type AdminApiKeyAction = "delete" | "disable" | "enable" | null
type AdminApiKeyStatus = AdminApiKeyDetail["status"]
type AdminApiKeyRisk = AdminApiKeyDetail["risk"]
type LogItem = AdminApiKeyDetail["recentLogs"][number]

const statusConfig: Record<AdminApiKeyStatus, { label: string; variant: "default" | "destructive" | "outline" | "secondary"; icon: LucideIcon }> = {
  disabled: { icon: ShieldAlert, label: "已禁用", variant: "outline" },
  enabled: { icon: ShieldCheck, label: "启用中", variant: "secondary" },
  expired: { icon: ShieldAlert, label: "已过期", variant: "destructive" },
  expiring: { icon: CalendarClock, label: "即将过期", variant: "outline" }
}

const riskConfig: Record<AdminApiKeyRisk["level"], { label: string; variant: "default" | "destructive" | "outline" | "secondary"; icon: LucideIcon }> = {
  high: { icon: ShieldAlert, label: "高风险", variant: "destructive" },
  low: { icon: ShieldCheck, label: "低风险", variant: "secondary" },
  medium: { icon: ShieldAlert, label: "中风险", variant: "outline" }
}

const formatDateTime = (date: Date | null) => {
  if (!date) {
    return "从未"
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date)
}

const formatDuration = (value: number | null) => (value === null ? "-" : `${value}ms`)
const formatPercent = (value: number) => `${value.toFixed(1)}%`
const ownerTypeLabel = (type: AdminApiKeyDetail["owner"]["type"]) => (type === "organization" ? "组织" : "用户")
const ownerHref = (owner: AdminApiKeyDetail["owner"]) => (owner.type === "user" ? `/dashboard/admin/users/${owner.id}` : "/dashboard/admin/orgs")

export const AdminApiKeyStatusBadge = ({ status }: { status: AdminApiKeyStatus }) => {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  )
}

export const AdminApiKeyRiskBadge = ({ risk }: { risk: AdminApiKeyRisk }) => {
  const config = riskConfig[risk.level]
  const Icon = config.icon

  return (
    <Badge variant={config.variant}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  )
}

const AdminCompactSummary = ({ apiKey }: { apiKey: AdminApiKeyDetail }) => {
  const OwnerIcon = apiKey.owner.type === "organization" ? Building2 : UserRound

  return (
    <Card className="rounded-lg shadow-sm" data-testid="admin-api-key-compact-summary">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex min-w-0 items-center gap-2">
              <KeyRound className="size-4 text-muted-foreground" />
              <h2 className="truncate font-semibold text-base">{apiKey.name}</h2>
            </div>
            <div className="truncate font-mono text-muted-foreground text-xs">{apiKey.maskedKey}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminApiKeyStatusBadge status={apiKey.status} />
            <AdminApiKeyRiskBadge risk={apiKey.risk} />
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          <SummaryItem icon={OwnerIcon} label="主体" value={apiKey.owner.label} />
          <SummaryItem label="类型" value={ownerTypeLabel(apiKey.owner.type)} />
          <SummaryItem label="最后使用" value={formatDateTime(apiKey.lastRequest)} />
          <SummaryItem label="风险" value={apiKey.risk.reasons[0] ?? "暂无风险信号"} />
        </div>
      </CardContent>
    </Card>
  )
}

const AdminUsageStats = ({ stats }: { stats: AdminApiKeyUsageStats }) => (
  <div className="space-y-4" data-testid="admin-api-key-usage-stats">
    <div className="grid gap-3 md:grid-cols-4">
      <Stat icon={Gauge} label="24 小时调用" value={stats.total24h.toString()} />
      <Stat icon={ShieldCheck} label="失败率" value={formatPercent(stats.failureRate24h)} />
      <Stat icon={Activity} label="平均耗时" value={formatDuration(stats.avgDurationMs24h)} />
      <Stat icon={BarChart3} label="风险事件" value={`${stats.riskEvents.length} 类`} />
    </div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">7 天调用趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={stats.trend} />
        </CardContent>
      </Card>
      <RiskEventsCard items={stats.riskEvents} />
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <TopPathCard items={stats.topPaths} />
      <ResultBreakdownCard items={stats.resultBreakdown} />
    </div>
  </div>
)

export const AdminApiKeyDetailContent = ({ apiKey, mode, onDeleted }: { apiKey: AdminApiKeyDetail; mode: "page" | "sheet"; onDeleted?: () => void }) => {
  const router = useRouter()
  const [activeAction, setActiveAction] = useState<AdminApiKeyAction>(null)
  const [activeTab, setActiveTab] = useState("logs")
  const usageLogs = api.adminApiKey.listUsageLogs.useQuery(
    { id: apiKey.id, page: 1, pageSize: 20, result: "all" },
    {
      enabled: mode === "page",
      placeholderData: (previousData) => previousData
    }
  )
  const stats = api.adminApiKey.getUsageStats.useQuery(
    { id: apiKey.id },
    {
      enabled: activeTab === "stats",
      placeholderData: (previousData) => previousData
    }
  )
  const logItems = mode === "page" ? (usageLogs.data?.items ?? apiKey.recentLogs) : apiKey.recentLogs.slice(0, 5)
  const refreshPage = () => {
    if (mode === "page") {
      router.refresh()
    }
  }
  const handleDeleteSuccess = () => {
    if (mode === "page") {
      router.push("/dashboard/admin/api-keys")
      router.refresh()
      return
    }

    onDeleted?.()
  }

  return (
    <div className="space-y-4">
      <AdminCompactSummary apiKey={apiKey} />

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={ownerHref(apiKey.owner)}>
            <LinkIcon className="size-4" />
            查看所属主体
          </Link>
        </Button>
        {apiKey.canMutate === false ? (
          <span className="self-center px-1 text-muted-foreground text-xs">当前角色仅可查看。</span>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" type="button" variant="outline">
                <MoreHorizontal className="size-4" />
                操作
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {apiKey.enabled ? (
                <DropdownMenuItem onSelect={() => setActiveAction("disable")} variant="destructive">
                  禁用
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setActiveAction("enable")}>启用</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setActiveAction("delete")} variant="destructive">
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="logs">调用日志</TabsTrigger>
          <TabsTrigger value="stats">图表统计</TabsTrigger>
        </TabsList>
        <TabsContent className="mt-4" value="logs">
          <Card className="rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Fingerprint className="size-4" />
                调用日志
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usageLogs.isLoading && mode === "page" ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : logItems.length === 0 ? (
                <EmptyPanel text="暂无调用日志。" />
              ) : (
                <UsageLogTable items={logItems} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent className="mt-4" value="stats">
          {activeTab === "stats" ? stats.data ? <AdminUsageStats stats={stats.data} /> : <EmptyPanel text="正在加载统计数据。" /> : null}
        </TabsContent>
      </Tabs>

      <DisableAdminApiKeyDialog
        apiKey={apiKey}
        onOpenChange={(open) => setActiveAction(open ? "disable" : null)}
        onSuccess={refreshPage}
        open={activeAction === "disable"}
        trigger={null}
      />
      <EnableAdminApiKeyDialog
        apiKey={apiKey}
        onOpenChange={(open) => setActiveAction(open ? "enable" : null)}
        onSuccess={refreshPage}
        open={activeAction === "enable"}
        trigger={null}
      />
      <DeleteAdminApiKeyDialog
        apiKey={apiKey}
        onOpenChange={(open) => setActiveAction(open ? "delete" : null)}
        onSuccess={handleDeleteSuccess}
        open={activeAction === "delete"}
        trigger={null}
      />
    </div>
  )
}

const EmptyPanel = ({ text }: { text: string }) => <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">{text}</div>

const SummaryItem = ({ icon: Icon, label, value }: { icon?: LucideIcon; label: string; value: string }) => (
  <div className="min-w-0">
    <div className="flex items-center gap-1 text-muted-foreground text-xs">
      {Icon ? <Icon className="size-3" /> : null}
      {label}
    </div>
    <div className="mt-1 truncate font-medium">{value}</div>
  </div>
)

const Stat = ({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) => (
  <div className="rounded-lg border bg-background p-3">
    <div className="flex items-center gap-2 text-muted-foreground text-xs">
      <Icon className="size-4" />
      {label}
    </div>
    <div className="mt-2 font-semibold text-base">{value}</div>
  </div>
)

const TrendChart = ({ data }: { data: AdminApiKeyUsageStats["trend"] }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const updateWidth = () => setWidth(Math.max(280, Math.floor(container.getBoundingClientRect().width)))
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  return (
    <div className="h-64 min-w-0" ref={containerRef}>
      {width > 0 ? (
        <BarChart data={data} height={240} width={width}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickLine={false} />
          <YAxis allowDecimals={false} tickLine={false} />
          <Tooltip />
          <Bar dataKey="success" fill="#22c55e" name="成功" radius={[4, 4, 0, 0]} stackId="calls" />
          <Bar dataKey="failed" fill="#f59e0b" name="失败" radius={[4, 4, 0, 0]} stackId="calls" />
          <Bar dataKey="rateLimited" fill="#ef4444" name="限流" radius={[4, 4, 0, 0]} stackId="calls" />
        </BarChart>
      ) : null}
    </div>
  )
}

const RiskEventsCard = ({ items }: { items: AdminApiKeyUsageStats["riskEvents"] }) => (
  <Card className="rounded-lg shadow-sm">
    <CardHeader>
      <CardTitle className="text-base">风险事件</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {items.length === 0 ? (
        <EmptyPanel text="暂无风险事件。" />
      ) : (
        items.map((item) => (
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3" key={item.label}>
            <span className="truncate font-medium text-sm">{item.label}</span>
            <Badge variant="outline">{item.count} 次</Badge>
          </div>
        ))
      )}
    </CardContent>
  </Card>
)

const TopPathCard = ({ items }: { items: AdminApiKeyUsageStats["topPaths"] }) => (
  <Card className="rounded-lg shadow-sm">
    <CardHeader>
      <CardTitle className="text-base">Top 路径</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {items.length === 0 ? (
        <EmptyPanel text="暂无路径统计。" />
      ) : (
        items.map((item) => (
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3" key={item.path}>
            <span className="truncate font-medium text-sm">{item.path}</span>
            <Badge variant="secondary">{item.count} 次</Badge>
          </div>
        ))
      )}
    </CardContent>
  </Card>
)

const ResultBreakdownCard = ({ items }: { items: AdminApiKeyUsageStats["resultBreakdown"] }) => {
  const total = items.reduce((sum, item) => sum + item.count, 0)

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">结果分布</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? <EmptyPanel text="暂无统计数据。" /> : items.map((item) => <DistributionBar count={item.count} key={item.label} label={item.label} total={total} />)}
      </CardContent>
    </Card>
  )
}

const DistributionBar = ({ count, label, total }: { count: number; label: string; total: number }) => {
  const percent = total === 0 ? 0 : Math.round((count / total) * 100)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{count} 次</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

const UsageLogTable = ({ items }: { items: LogItem[] }) => (
  <div className="overflow-hidden rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead>时间</TableHead>
          <TableHead>请求</TableHead>
          <TableHead>结果</TableHead>
          <TableHead>IP</TableHead>
          <TableHead>User-Agent</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((log) => (
          <TableRow key={log.id}>
            <TableCell>{formatDateTime(log.createdAt)}</TableCell>
            <TableCell>
              <div className="font-medium">{log.method ?? "GET"}</div>
              <div className="max-w-[220px] truncate text-muted-foreground text-xs">{log.routeName ?? log.path ?? "-"}</div>
            </TableCell>
            <TableCell>
              <div>{log.success ? "成功" : "失败"}</div>
              <div className="text-muted-foreground text-xs">{log.statusCode ?? log.errorCode ?? log.failureReason ?? "-"}</div>
            </TableCell>
            <TableCell>{log.ipRegion ?? log.ipCountry ?? "隐藏"}</TableCell>
            <TableCell className="max-w-[200px] truncate">{log.userAgentSummary ?? "隐藏"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
)
