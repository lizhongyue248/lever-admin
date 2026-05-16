"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Activity, BarChart3, Fingerprint, Gauge, KeyRound, type LucideIcon, MoreHorizontal, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"

import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ROUTE_DASHBOARD_SETTINGS_API_KEYS } from "@/lib/const"
import { api, type RouterOutputs } from "@/trpc/react"
import { DeleteApiKeyDialog, DisableApiKeyDialog, EnableApiKeyDialog } from "./api-key-dialogs"
import { ApiKeyRiskBadge, ApiKeyStatusBadge } from "./api-key-status"

type ApiKeyDetail = RouterOutputs["apiKey"]["getMine"]
type ApiKeyUsageStats = RouterOutputs["apiKey"]["getMyUsageStats"]
type ApiKeyAction = "delete" | "disable" | "enable" | null
type LogItem = ApiKeyDetail["recentLogs"][number]

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

const CompactSummary = ({ apiKey, onAction }: { apiKey: ApiKeyDetail; onAction: (action: Exclude<ApiKeyAction, null>) => void }) => (
  <Card className="rounded-lg shadow-sm" data-testid="api-key-compact-summary">
    <CardContent className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" />
            <h2 className="truncate font-semibold text-base">{apiKey.name}</h2>
          </div>
          <div className="truncate font-mono text-muted-foreground text-xs">{apiKey.maskedKey}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ApiKeyStatusBadge status={apiKey.status} />
          <ApiKeyRiskBadge risk={apiKey.risk} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="更多 API Key 操作" size="icon-sm" type="button" variant="outline">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {apiKey.enabled ? (
                <DropdownMenuItem onSelect={() => onAction("disable")} variant="destructive">
                  禁用
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => onAction("enable")}>启用</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onAction("delete")} variant="destructive">
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
        <SummaryItem label="创建时间" value={formatDateTime(apiKey.createdAt)} />
        <SummaryItem label="过期时间" value={apiKey.expiresAt ? formatDateTime(apiKey.expiresAt) : "不过期"} />
        <SummaryItem label="最后使用" value={formatDateTime(apiKey.lastRequest)} />
        <SummaryItem label="风险" value={apiKey.risk.reasons[0] ?? "暂无风险信号"} />
      </div>
    </CardContent>
  </Card>
)

const PersonalUsageStats = ({ stats }: { stats: ApiKeyUsageStats }) => (
  <div className="space-y-4" data-testid="api-key-usage-stats">
    <div className="grid gap-3 md:grid-cols-4">
      <Stat icon={Gauge} label="24 小时调用" value={stats.total24h.toString()} />
      <Stat icon={ShieldCheck} label="失败率" value={formatPercent(stats.failureRate24h)} />
      <Stat icon={Activity} label="平均耗时" value={formatDuration(stats.avgDurationMs24h)} />
      <Stat icon={BarChart3} label="7 天峰值" value={formatDuration(stats.latency.maxDurationMs7d)} />
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
      <ResultBreakdownCard items={stats.resultBreakdown} />
    </div>
    <TopPathCard items={stats.topPaths} />
  </div>
)

export const ApiKeyDetailContent = ({ apiKey, mode }: { apiKey: ApiKeyDetail; mode: "page" | "sheet" }) => {
  const router = useRouter()
  const [activeAction, setActiveAction] = useState<ApiKeyAction>(null)
  const [activeTab, setActiveTab] = useState("logs")
  const stats = api.apiKey.getMyUsageStats.useQuery(
    { id: apiKey.id },
    {
      enabled: activeTab === "stats",
      placeholderData: (previousData) => previousData
    }
  )
  const logItems = mode === "page" ? apiKey.recentLogs : apiKey.recentLogs.slice(0, 5)
  const refreshPage = () => {
    if (mode === "page") {
      router.refresh()
    }
  }
  const handleDeleteSuccess = () => {
    if (mode === "page") {
      router.push(ROUTE_DASHBOARD_SETTINGS_API_KEYS)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <CompactSummary apiKey={apiKey} onAction={setActiveAction} />

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
            <CardContent>{logItems.length === 0 ? <EmptyPanel text="暂无调用日志。" /> : <UsageLogTable items={logItems} />}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent className="mt-4" value="stats">
          {activeTab === "stats" ? stats.data ? <PersonalUsageStats stats={stats.data} /> : <EmptyPanel text="正在加载统计数据。" /> : null}
        </TabsContent>
      </Tabs>

      <DisableApiKeyDialog
        apiKey={apiKey}
        onOpenChange={(open) => setActiveAction(open ? "disable" : null)}
        onSuccess={refreshPage}
        open={activeAction === "disable"}
        trigger={null}
      />
      <EnableApiKeyDialog
        apiKey={apiKey}
        onOpenChange={(open) => setActiveAction(open ? "enable" : null)}
        onSuccess={refreshPage}
        open={activeAction === "enable"}
        trigger={null}
      />
      <DeleteApiKeyDialog
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

const SummaryItem = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0">
    <div className="text-muted-foreground text-xs">{label}</div>
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

const TrendChart = ({ data }: { data: ApiKeyUsageStats["trend"] }) => {
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

const TopPathCard = ({ items }: { items: ApiKeyUsageStats["topPaths"] }) => (
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

const ResultBreakdownCard = ({ items }: { items: ApiKeyUsageStats["resultBreakdown"] }) => {
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

const UsageLogTable = ({ items }: { items: LogItem[] }) => {
  const columns: Array<ColumnDef<LogItem>> = [
    { cell: ({ row }) => formatDateTime(row.original.createdAt), header: "时间", size: 150 },
    {
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.method ?? "GET"}</div>
          <div className="max-w-[220px] truncate text-muted-foreground text-xs">{row.original.routeName ?? row.original.path ?? "-"}</div>
        </div>
      ),
      header: "请求",
      size: 260
    },
    {
      cell: ({ row }) => (
        <div>
          <div>{row.original.success ? "成功" : "失败"}</div>
          <div className="text-muted-foreground text-xs">{row.original.statusCode ?? row.original.errorCode ?? row.original.failureReason ?? "-"}</div>
        </div>
      ),
      header: "结果",
      size: 130
    },
    { cell: ({ row }) => row.original.ipCountry ?? "隐藏", header: "IP", size: 140 },
    { cell: ({ row }) => <span className="block max-w-[200px] truncate">{row.original.userAgentSummary ?? "隐藏"}</span>, header: "User-Agent", size: 220 }
  ]

  return <DataTable columns={columns} data={items} getRowId={(row) => row.id} maxHeightClassName="max-h-[420px]" minWidthClassName="min-w-[900px]" />
}
