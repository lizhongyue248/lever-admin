"use client"

import { AlertTriangle, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, ExternalLink, FileText, ShieldAlert, Timer } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { api, type RouterOutputs } from "@/trpc/react"

import { type ResultFilter, type RiskFilter, riskLabels, type SourceFilter, type TimeRangeFilter } from "./request-log-labels"
import { RequestLogToolbar } from "./request-log-toolbar"
import { RequestLogsTable } from "./request-logs-table"

type RequestLogList = RouterOutputs["adminRequestLog"]["list"]
type RequestLogDetail = RouterOutputs["adminRequestLog"]["get"]
type RequestLogOverview = RouterOutputs["adminRequestLog"]["getOverview"]

const pageSizeOptions = [10, 20, 50] as const
type PageSize = (typeof pageSizeOptions)[number]

const formatDuration = (value: number | null) => (value === null ? "-" : `${value}ms`)

const riskVariant = (risk: string) => {
  if (risk === "high") {
    return "destructive" as const
  }

  if (risk === "medium") {
    return "outline" as const
  }

  return "secondary" as const
}

const downloadCsv = ({ content, filename }: { content: string; filename: string }) => {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export const RequestLogsContent = ({
  initialLogs,
  initialOverview,
  initialSelectedLog,
  selectedLogId
}: {
  initialLogs: RequestLogList
  initialOverview: RequestLogOverview
  initialSelectedLog: RequestLogDetail | null
  selectedLogId: string | null
}) => {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(10)
  const [search, setSearch] = useState("")
  const [result, setResult] = useState<ResultFilter>("all")
  const [risk, setRisk] = useState<RiskFilter>("all")
  const [source, setSource] = useState<SourceFilter>("all")
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>("24h")
  const [autoRefreshMs, setAutoRefreshMs] = useState<number | null>(null)
  const [sheetLogId, setSheetLogId] = useState<string | null>(selectedLogId)
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)")
    const updateDesktopState = () => setIsDesktop(mediaQuery.matches)
    updateDesktopState()
    mediaQuery.addEventListener("change", updateDesktopState)

    return () => mediaQuery.removeEventListener("change", updateDesktopState)
  }, [])

  const listInput = { method: "all" as const, page, pageSize, result, risk, search, source, statusCode: null, timeRange }
  const logs = api.adminRequestLog.list.useQuery(listInput, {
    initialData: page === 1 && pageSize === 10 && search === "" && result === "all" && risk === "all" && source === "all" && timeRange === "24h" ? initialLogs : undefined,
    placeholderData: (previousData) => previousData
  })
  const overview = api.adminRequestLog.getOverview.useQuery(undefined, {
    initialData: initialOverview,
    placeholderData: (previousData) => previousData
  })
  const detail = api.adminRequestLog.get.useQuery(
    { id: sheetLogId ?? "" },
    {
      enabled: Boolean(sheetLogId),
      initialData: sheetLogId && initialSelectedLog?.id === sheetLogId ? initialSelectedLog : undefined
    }
  )
  const exportCsv = api.adminRequestLog.exportCsv.useMutation({
    onError: (error) => toast.error(error.message),
    onSuccess: (data) => {
      downloadCsv(data)
      toast.success("请求日志 CSV 已导出。")
    }
  })
  const data = logs.data ?? initialLogs
  const overviewData = overview.data ?? initialOverview
  const isRefreshing = logs.isRefetching || overview.isRefetching || (Boolean(sheetLogId) && detail.isRefetching)
  const refreshRequestLogs = useCallback(() => {
    void logs.refetch()
    void overview.refetch()

    if (sheetLogId) {
      void detail.refetch()
    }
  }, [detail.refetch, logs.refetch, overview.refetch, sheetLogId])

  useEffect(() => {
    if (!autoRefreshMs) {
      return
    }

    const intervalId = window.setInterval(() => {
      refreshRequestLogs()
    }, autoRefreshMs)

    return () => window.clearInterval(intervalId)
  }, [autoRefreshMs, refreshRequestLogs])

  const resetPage = () => setPage(1)
  const openSheet = (id: string) => {
    setSheetLogId(id)
    router.replace(`/dashboard/admin/request-logs?logId=${encodeURIComponent(id)}`, { scroll: false })
  }
  const closeSheet = () => {
    setSheetLogId(null)
    router.replace("/dashboard/admin/request-logs", { scroll: false })
  }

  return (
    <div className="space-y-5 text-[13px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-normal">系统请求日志</h1>
          <p className="mt-2 text-muted-foreground text-xs">审计用户请求、完整 IP、User-Agent 与脱敏请求体快照。</p>
        </div>
        <Button disabled={exportCsv.isPending} onClick={() => exportCsv.mutate({ method: "all", result, risk, search, source, statusCode: null, timeRange })} type="button">
          <Download className="size-4" />
          导出 CSV
        </Button>
      </div>

      <StatsRow overview={overviewData} />

      <Card className="rounded-lg shadow-sm">
        <CardContent className="space-y-4 p-4">
          <RequestLogToolbar
            autoRefreshMs={autoRefreshMs}
            isRefreshing={isRefreshing}
            onAutoRefreshChange={setAutoRefreshMs}
            onRefresh={refreshRequestLogs}
            onResultChange={setResult}
            onRiskChange={setRisk}
            onSearchChange={setSearch}
            onSourceChange={setSource}
            onTimeRangeChange={setTimeRange}
            resetPage={resetPage}
            result={result}
            risk={risk}
            search={search}
            source={source}
            timeRange={timeRange}
          />

          {logs.error ? <ErrorState /> : data.items.length === 0 ? <EmptyState /> : <RequestLogsTable isDesktop={isDesktop} items={data.items} onOpen={openSheet} />}

          <Pagination data={data} isFetching={logs.isFetching} pageSize={pageSize} setPage={setPage} setPageSize={setPageSize} />
        </CardContent>
      </Card>

      <Sheet onOpenChange={(open) => !open && closeSheet()} open={Boolean(sheetLogId)}>
        <SheetContent className="w-[720px] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-none lg:max-w-[calc(100vw-18rem)]" showCloseButton={false}>
          <SheetHeader className="flex-row items-center justify-between gap-3 border-b p-4 text-left">
            <div className="min-w-0">
              <SheetTitle>请求详情</SheetTitle>
              <SheetDescription className="truncate">{detail.data?.requestId ?? "加载请求日志详情"}</SheetDescription>
            </div>
            <Button onClick={closeSheet} size="sm" type="button" variant="ghost">
              关闭
            </Button>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {detail.error ? <DetailError /> : detail.data ? <RequestLogDetailPanel log={detail.data} /> : <DetailSkeleton />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

const StatsRow = ({ overview }: { overview: RequestLogOverview }) => (
  <div className="grid gap-3 md:grid-cols-4">
    <StatCard icon={FileText} label="24h 请求数" value={overview.total24h.toString()} />
    <StatCard icon={AlertTriangle} label="失败请求" value={overview.failed24h.toString()} />
    <StatCard icon={Timer} label="慢请求" value={overview.slow24h.toString()} />
    <StatCard icon={ShieldAlert} label="高风险" value={overview.highRisk24h.toString()} />
  </div>
)

const StatCard = ({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) => (
  <div className="rounded-lg border bg-card p-4 shadow-sm">
    <div className="flex items-center gap-2 text-muted-foreground text-xs">
      <Icon className="size-4" />
      {label}
    </div>
    <div className="mt-2 font-bold text-2xl">{value}</div>
  </div>
)

const RequestLogDetailPanel = ({ log }: { log: RequestLogDetail }) => {
  const copyRequestId = async () => {
    await navigator.clipboard.writeText(log.requestId)
    toast.success("requestId 已复制。")
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold">{`${log.statusCode ?? "-"} ${log.success ? "Success" : "Failed"}`}</div>
            <div className="mt-1 text-muted-foreground text-xs">{log.riskReasons.join(" · ") || "暂无风险原因"}</div>
          </div>
          <Badge variant={riskVariant(log.riskLevel)}>{riskLabels[log.riskLevel as RiskFilter] ?? log.riskLevel}</Badge>
        </div>
      </div>
      <DetailSection
        rows={[
          ["方法 / 路径", `${log.method} ${log.path}`],
          ["来源", `${log.source}${log.routeName ? ` · ${log.routeName}` : ""}`],
          ["耗时", formatDuration(log.durationMs)]
        ]}
        title="请求基础信息"
      />
      <DetailSection
        rows={[
          ["操作者", `${log.userName ?? "Unknown"} · ${log.userEmail ?? "未登录请求"}`],
          ["组织", log.organizationName ?? "-"],
          ["会话", log.sessionId ?? "-"]
        ]}
        title="操作者与上下文"
      />
      <DetailSection
        rows={[
          ["完整 IP", `${log.ipAddress ?? "-"} ${log.ipRegion ?? ""}`],
          ["完整 User-Agent", log.userAgentRaw ?? "-"]
        ]}
        title="网络与设备"
      />
      <div className="rounded-lg border bg-slate-950 p-4 text-slate-100">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm">脱敏请求体快照</h3>
          <Badge>{log.requestBodyStatus}</Badge>
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6">{log.requestBodySummary ?? "未采集请求体"}</pre>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={copyRequestId} size="sm" type="button" variant="outline">
          <Copy className="size-4" />
          复制 requestId
        </Button>
        {log.userId ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/admin/users/${log.userId}`}>
              <ExternalLink className="size-4" />
              查看用户
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}

const DetailSection = ({ rows, title }: { rows: Array<[string, string]>; title: string }) => (
  <section className="rounded-lg border p-4">
    <h3 className="font-semibold text-sm">{title}</h3>
    <div className="mt-3 space-y-2">
      {rows.map(([label, value]) => (
        <div className="grid gap-1 text-xs sm:grid-cols-[120px_minmax(0,1fr)]" key={label}>
          <span className="text-muted-foreground">{label}</span>
          <span className="min-w-0 break-words font-medium">{value}</span>
        </div>
      ))}
    </div>
  </section>
)

const Pagination = ({
  data,
  isFetching,
  pageSize,
  setPage,
  setPageSize
}: {
  data: RequestLogList
  isFetching: boolean
  pageSize: PageSize
  setPage: (update: (current: number) => number) => void
  setPageSize: (pageSize: PageSize) => void
}) => (
  <div className="flex items-center justify-between text-muted-foreground">
    <span>
      显示 {data.items.length} / {data.total}
    </span>
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label={`每页条数：${pageSize} 条`} className="text-foreground" disabled={isFetching} type="button" variant="outline">
            每页 {pageSize} 条
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          {pageSizeOptions.map((option) => (
            <DropdownMenuItem
              key={option}
              onSelect={() => {
                setPageSize(option)
                setPage(() => 1)
              }}
            >
              <span className="flex w-5 items-center">{option === pageSize ? <Check className="size-4" /> : null}</span>
              每页 {option} 条
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        aria-label="上一页"
        disabled={isFetching || data.page <= 1}
        onClick={() => setPage((current) => Math.max(1, current - 1))}
        size="icon-sm"
        type="button"
        variant="outline"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span>
        {data.page} / {data.pageCount}
      </span>
      <Button
        aria-label="下一页"
        disabled={isFetching || data.page >= data.pageCount}
        onClick={() => setPage((current) => Math.min(data.pageCount, current + 1))}
        size="icon-sm"
        type="button"
        variant="outline"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  </div>
)

const EmptyState = () => (
  <div className="rounded-lg border border-dashed p-8 text-center">
    <h2 className="font-semibold text-sm">暂无请求日志</h2>
    <p className="mt-2 text-muted-foreground text-xs">有用户访问 Dashboard、tRPC 或认证接口后，请求日志会显示在这里。</p>
  </div>
)

const ErrorState = () => (
  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm" role="alert">
    请求日志列表加载失败。
  </div>
)

const DetailError = () => (
  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm" role="alert">
    请求日志详情加载失败。
  </div>
)

const DetailSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-24 rounded-lg" />
    <Skeleton className="h-40 rounded-lg" />
    <Skeleton className="h-40 rounded-lg" />
  </div>
)
