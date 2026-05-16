"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Activity, AlertTriangle, ChevronDown, ExternalLink, Eye, KeyRound, MoreHorizontal, Search, ShieldCheck, Timer, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

import { DataPagination } from "@/components/data-pagination"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  API_KEY_OWNER_ORGANIZATION,
  API_KEY_STATUS_DISABLED,
  API_KEY_STATUS_ENABLED,
  API_KEY_STATUS_EXPIRING,
  API_KEY_STATUS_RISKY,
  DEFAULT_PAGE,
  DENSE_PAGE_SIZE,
  FILTER_ALL,
  ROUTE_DASHBOARD_ADMIN_API_KEYS
} from "@/lib/const"
import { api, type RouterInputs, type RouterOutputs } from "@/trpc/react"
import { AdminApiKeyDetailContent, AdminApiKeyRiskBadge, AdminApiKeyStatusBadge } from "./admin-api-key-detail-content"
import { DeleteAdminApiKeyDialog, DisableAdminApiKeyDialog, EnableAdminApiKeyDialog } from "./admin-api-key-dialogs"

type AdminApiKeyList = RouterOutputs["adminApiKey"]["list"]
type AdminApiKeyItem = AdminApiKeyList["items"][number]
type AdminApiKeyDetail = RouterOutputs["adminApiKey"]["get"]
type AdminApiKeyOverview = RouterOutputs["adminApiKey"]["getOverview"]
type StatusFilter = NonNullable<RouterInputs["adminApiKey"]["list"]["status"]>
type RowAction = "delete" | "disable" | "enable" | null

const statusLabels: Record<StatusFilter, string> = {
  [FILTER_ALL]: "全部状态",
  [API_KEY_STATUS_DISABLED]: "已禁用",
  [API_KEY_STATUS_ENABLED]: "启用中",
  [API_KEY_STATUS_EXPIRING]: "即将过期",
  [API_KEY_STATUS_RISKY]: "有风险"
}

const formatDate = (date: Date | null) => {
  if (!date) {
    return "从未"
  }

  return new Intl.DateTimeFormat("zh-CN").format(date)
}

const formatExpiresAt = (date: Date | null) => (date ? formatDate(date) : "不过期")
const ownerTypeLabel = (type: AdminApiKeyItem["owner"]["type"]) => (type === API_KEY_OWNER_ORGANIZATION ? "组织" : "用户")

export const AdminApiKeysContent = ({
  initialKeys,
  initialOverview,
  initialSelectedKey,
  selectedKeyId
}: {
  initialKeys: AdminApiKeyList
  initialOverview: AdminApiKeyOverview
  initialSelectedKey: AdminApiKeyDetail | null
  selectedKeyId: string | null
}) => {
  const router = useRouter()
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>(FILTER_ALL)
  const [sheetKeyId, setSheetKeyId] = useState<string | null>(selectedKeyId)
  const [isDesktop, setIsDesktop] = useState(false)
  const [hasViewportState, setHasViewportState] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)")
    const updateDesktopState = () => {
      setIsDesktop(mediaQuery.matches)
      setHasViewportState(true)
    }

    updateDesktopState()
    mediaQuery.addEventListener("change", updateDesktopState)

    return () => mediaQuery.removeEventListener("change", updateDesktopState)
  }, [])

  useEffect(() => {
    if (hasViewportState && sheetKeyId && !isDesktop) {
      router.replace(`${ROUTE_DASHBOARD_ADMIN_API_KEYS}/${sheetKeyId}`)
    }
  }, [hasViewportState, isDesktop, router, sheetKeyId])

  const keys = api.adminApiKey.list.useQuery(
    { page, pageSize: DENSE_PAGE_SIZE, search, status },
    {
      initialData: page === DEFAULT_PAGE && search === "" && status === FILTER_ALL ? initialKeys : undefined,
      placeholderData: (previousData) => previousData
    }
  )
  const overview = api.adminApiKey.getOverview.useQuery(undefined, {
    initialData: initialOverview,
    placeholderData: (previousData) => previousData
  })
  const sheetKey = api.adminApiKey.get.useQuery(
    { id: sheetKeyId ?? "" },
    {
      enabled: Boolean(sheetKeyId) && isDesktop,
      initialData: sheetKeyId && initialSelectedKey?.id === sheetKeyId ? initialSelectedKey : undefined
    }
  )
  const data = keys.data ?? initialKeys
  const overviewData = overview.data ?? initialOverview

  const openSheet = useCallback(
    (id: string) => {
      setSheetKeyId(id)
      router.replace(`${ROUTE_DASHBOARD_ADMIN_API_KEYS}?keyId=${encodeURIComponent(id)}`, { scroll: false })
    },
    [router]
  )

  const closeSheet = () => {
    setSheetKeyId(null)
    router.replace(ROUTE_DASHBOARD_ADMIN_API_KEYS, { scroll: false })
  }

  return (
    <div className="space-y-5 text-[13px]">
      <div>
        <h1 className="font-bold text-2xl tracking-normal">平台 API Keys</h1>
        <p className="mt-2 text-muted-foreground text-xs">集中审计和治理平台内用户与组织 API Key。</p>
      </div>

      <StatsRow overview={overviewData} />

      <Card className="rounded-lg shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="搜索平台 API Key"
                className="pl-9"
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(DEFAULT_PAGE)
                }}
                placeholder="搜索平台 API Key、所属用户或组织"
                value={search}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full justify-between lg:w-36" type="button" variant="outline">
                  {statusLabels[status]}
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {(Object.keys(statusLabels) as StatusFilter[]).map((item) => (
                  <DropdownMenuItem
                    key={item}
                    onSelect={() => {
                      setStatus(item)
                      setPage(DEFAULT_PAGE)
                    }}
                  >
                    {statusLabels[item]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {keys.error ? (
            <AdminApiKeyErrorState message="平台 API Key 列表加载失败。" />
          ) : data.items.length === 0 ? (
            <AdminApiKeyEmptyState />
          ) : (
            <AdminApiKeysTable items={data.items} onOpen={openSheet} />
          )}

          <DataPagination
            disabled={keys.isFetching}
            itemCount={data.items.length}
            onPageChange={setPage}
            page={data.page}
            pageCount={data.pageCount}
            pageSize={DENSE_PAGE_SIZE}
            total={data.total}
          />
        </CardContent>
      </Card>

      <Sheet
        onOpenChange={(open) => {
          if (!open) {
            closeSheet()
          }
        }}
        open={Boolean(sheetKeyId) && isDesktop}
      >
        <SheetContent className="w-[720px] max-w-[calc(100vw-18rem)] gap-0 overflow-hidden p-0 sm:max-w-none" data-testid="admin-api-key-detail-sheet" showCloseButton={false}>
          <SheetHeader className="flex-row items-center justify-between gap-3 border-b p-4 text-left">
            <div className="min-w-0">
              <SheetTitle>平台 API Key 详情</SheetTitle>
              <SheetDescription className="sr-only">平台 API Key 摘要、所属主体、调用日志和图表统计。</SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              {sheetKeyId ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`${ROUTE_DASHBOARD_ADMIN_API_KEYS}/${sheetKeyId}`}>
                    <ExternalLink className="size-4" />
                    完整详情页
                  </Link>
                </Button>
              ) : null}
              <Button aria-label="关闭平台 API Key 详情" onClick={closeSheet} size="sm" type="button" variant="ghost">
                关闭
              </Button>
            </div>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {sheetKey.error ? (
              <AdminApiKeyDetailError onClose={closeSheet} />
            ) : sheetKey.data ? (
              <AdminApiKeyDetailContent apiKey={sheetKey.data} mode="sheet" onDeleted={closeSheet} />
            ) : (
              <AdminApiKeyDetailSkeleton />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

const StatsRow = ({ overview }: { overview: AdminApiKeyOverview }) => (
  <div className="grid gap-3 md:grid-cols-5">
    <StatCard icon={KeyRound} label="总数" value={overview.total.toString()} />
    <StatCard icon={ShieldCheck} label="启用中" value={overview.enabled.toString()} />
    <StatCard icon={AlertTriangle} label="有风险" value={overview.risky.toString()} />
    <StatCard icon={Timer} label="即将过期" value={overview.expiring.toString()} />
    <StatCard icon={Activity} label="24 小时调用" value={overview.recent24h.toString()} />
  </div>
)

const StatCard = ({ icon: Icon, label, value }: { icon: typeof KeyRound; label: string; value: string }) => (
  <div className="rounded-lg border bg-card p-4 shadow-sm">
    <div className="flex items-center gap-2 text-muted-foreground text-xs">
      <Icon className="size-4" />
      {label}
    </div>
    <div className="mt-2 font-bold text-2xl">{value}</div>
  </div>
)

const AdminApiKeysTable = ({ items, onOpen }: { items: AdminApiKeyItem[]; onOpen: (id: string) => void }) => {
  const columns = useMemo<Array<ColumnDef<AdminApiKeyItem>>>(
    () => [
      {
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-muted-foreground text-xs">{row.original.maskedKey}</div>
          </div>
        ),
        header: "名称",
        size: 240
      },
      {
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.owner.label}</div>
            <div className="text-muted-foreground text-xs">{ownerTypeLabel(row.original.owner.type)}</div>
          </div>
        ),
        header: "所属主体",
        size: 180
      },
      { cell: ({ row }) => formatExpiresAt(row.original.expiresAt), header: "过期时间", size: 130 },
      { cell: ({ row }) => formatDate(row.original.lastRequest), header: "最后使用", size: 130 },
      {
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <AdminApiKeyStatusBadge status={row.original.status} />
            <AdminApiKeyRiskBadge risk={row.original.risk} />
          </div>
        ),
        header: "状态",
        size: 180
      },
      {
        cell: ({ row }) => <AdminApiKeyRowActions apiKey={row.original} onOpen={() => onOpen(row.original.id)} />,
        header: "操作",
        size: 110
      }
    ],
    [onOpen]
  )

  return (
    <>
      <div className="hidden lg:block">
        <DataTable
          columns={columns}
          data={items}
          getRowId={(row) => row.id}
          minWidthClassName="min-w-[970px]"
          onRowClick={(row) => onOpen(row.id)}
          rowTestId={(row) => `admin-api-key-row-${row.id}`}
        />
      </div>
      <div className="grid gap-3 lg:hidden">
        {items.map((item) => (
          <Link
            className="rounded-lg border bg-card p-4 shadow-sm"
            data-testid={`admin-api-key-card-${item.id}`}
            href={`${ROUTE_DASHBOARD_ADMIN_API_KEYS}/${item.id}`}
            key={item.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{item.name}</div>
                <div className="mt-1 font-mono text-muted-foreground text-xs">{item.maskedKey}</div>
              </div>
              <AdminApiKeyStatusBadge status={item.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <AdminApiKeyRiskBadge risk={item.risk} />
              <span className="text-muted-foreground text-xs">
                {ownerTypeLabel(item.owner.type)}：{item.owner.label}
              </span>
              <span className="text-muted-foreground text-xs">最后使用：{formatDate(item.lastRequest)}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}

const AdminApiKeyRowActions = ({ apiKey, onOpen }: { apiKey: AdminApiKeyItem; onOpen: () => void }) => {
  const [activeAction, setActiveAction] = useState<RowAction>(null)
  const canMutate = apiKey.canMutate !== false

  return (
    <div className="flex justify-end" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
      <Button aria-label="查看平台 API Key 详情" onClick={onOpen} size="icon-sm" title="查看平台 API Key 详情" type="button" variant="ghost">
        <Eye className="size-4" />
      </Button>
      {canMutate ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label="更多平台 API Key 操作" size="icon-sm" title="更多平台 API Key 操作" type="button" variant="ghost">
              <MoreHorizontal className="size-4" />
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
              <Trash2 className="size-4" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="self-center px-2 text-muted-foreground text-xs">仅查看</span>
      )}

      <DisableAdminApiKeyDialog apiKey={apiKey} onOpenChange={(open) => setActiveAction(open ? "disable" : null)} open={activeAction === "disable"} trigger={null} />
      <EnableAdminApiKeyDialog apiKey={apiKey} onOpenChange={(open) => setActiveAction(open ? "enable" : null)} open={activeAction === "enable"} trigger={null} />
      <DeleteAdminApiKeyDialog apiKey={apiKey} onOpenChange={(open) => setActiveAction(open ? "delete" : null)} open={activeAction === "delete"} trigger={null} />
    </div>
  )
}

const AdminApiKeyDetailError = ({ onClose }: { onClose: () => void }) => (
  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5" role="alert">
    <h2 className="font-semibold text-destructive text-sm">平台 API Key 详情加载失败</h2>
    <p className="mt-2 text-muted-foreground text-xs">请关闭详情后重试，或从列表重新打开该 API Key。</p>
    <Button className="mt-4" onClick={onClose} size="sm" type="button" variant="outline">
      关闭详情
    </Button>
  </div>
)

const AdminApiKeyDetailSkeleton = () => (
  <div className="space-y-4" data-testid="admin-api-key-detail-skeleton">
    <Skeleton className="h-24 w-full rounded-lg" />
    <div className="grid grid-cols-2 gap-2">
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-9 w-full rounded-md" />
    </div>
    <Skeleton className="h-80 w-full rounded-lg" />
  </div>
)

const AdminApiKeyEmptyState = () => (
  <div className="rounded-lg border border-dashed p-8 text-center">
    <h2 className="font-semibold text-sm">暂无平台 API Key</h2>
    <p className="mt-2 text-muted-foreground text-xs">用户或组织创建 API Key 后，会显示在这里用于平台审计和治理。</p>
  </div>
)

const AdminApiKeyErrorState = ({ message }: { message: string }) => (
  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm" role="alert">
    {message}
  </div>
)
