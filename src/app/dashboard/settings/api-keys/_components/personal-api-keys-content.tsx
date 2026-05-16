"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { ChevronDown, ExternalLink, Eye, MoreHorizontal, Search, Trash2 } from "lucide-react"
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
  API_KEY_STATUS_DISABLED,
  API_KEY_STATUS_ENABLED,
  API_KEY_STATUS_EXPIRING,
  API_KEY_STATUS_RISKY,
  DEFAULT_PAGE,
  DENSE_PAGE_SIZE,
  FILTER_ALL,
  ROUTE_DASHBOARD_SETTINGS_API_KEYS
} from "@/lib/const"
import { api, type RouterInputs, type RouterOutputs } from "@/trpc/react"
import { ApiKeyDetailContent } from "./api-key-detail-content"
import { CopyCreatedApiKeyButton, CreateApiKeyDialog, type CreatedApiKeyResult, DeleteApiKeyDialog, DisableApiKeyDialog, EnableApiKeyDialog } from "./api-key-dialogs"
import { ApiKeyEmptyState, ApiKeyErrorState, ApiKeyRiskBadge, ApiKeyStatusBadge } from "./api-key-status"

type ApiKeyList = RouterOutputs["apiKey"]["listMine"]
type ApiKeyItem = ApiKeyList["items"][number]
type StatusFilter = NonNullable<RouterInputs["apiKey"]["listMine"]["status"]>
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

export const PersonalApiKeysContent = ({ initialKeys, selectedKeyId }: { initialKeys: ApiKeyList; selectedKeyId: string | null }) => {
  const router = useRouter()
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>(FILTER_ALL)
  const [sheetKeyId, setSheetKeyId] = useState<string | null>(selectedKeyId)
  const [isDesktop, setIsDesktop] = useState(false)
  const [hasViewportState, setHasViewportState] = useState(false)
  const [createdKey, setCreatedKey] = useState<CreatedApiKeyResult | null>(null)

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
      router.replace(`${ROUTE_DASHBOARD_SETTINGS_API_KEYS}/${sheetKeyId}`)
    }
  }, [hasViewportState, isDesktop, router, sheetKeyId])

  const keys = api.apiKey.listMine.useQuery(
    { page, pageSize: DENSE_PAGE_SIZE, search, status },
    {
      initialData: page === DEFAULT_PAGE && search === "" && status === FILTER_ALL ? initialKeys : undefined,
      placeholderData: (previousData) => previousData
    }
  )
  const sheetKey = api.apiKey.getMine.useQuery(
    { id: sheetKeyId ?? "" },
    {
      enabled: Boolean(sheetKeyId) && isDesktop
    }
  )
  const data = keys.data ?? initialKeys

  const openSheet = useCallback(
    (id: string) => {
      setSheetKeyId(id)
      router.replace(`${ROUTE_DASHBOARD_SETTINGS_API_KEYS}?keyId=${encodeURIComponent(id)}`, { scroll: false })
    },
    [router]
  )

  const closeSheet = () => {
    setSheetKeyId(null)
    router.replace(ROUTE_DASHBOARD_SETTINGS_API_KEYS, { scroll: false })
  }

  return (
    <div className="space-y-5 text-[13px]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl tracking-normal">API Keys</h1>
          <p className="mt-2 text-muted-foreground text-xs">创建和管理用于 CLI、服务端脚本或开放接口请求的个人凭据。</p>
        </div>
        <CreateApiKeyDialog onCreated={setCreatedKey} />
      </div>

      <Card className="rounded-lg shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="搜索 API Key"
                className="pl-9"
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(DEFAULT_PAGE)
                }}
                placeholder="搜索 API Key 名称"
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

          {createdKey ? <CreatedKeyBar createdKey={createdKey} onDismiss={() => setCreatedKey(null)} /> : null}

          {keys.error ? (
            <ApiKeyErrorState message="API Key 列表加载失败。" />
          ) : data.items.length === 0 ? (
            <ApiKeyEmptyState />
          ) : (
            <ApiKeysTable items={data.items} onOpen={openSheet} />
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
        <SheetContent className="w-[720px] max-w-[calc(100vw-18rem)] gap-0 overflow-hidden p-0 sm:max-w-none" data-testid="api-key-detail-sheet" showCloseButton={false}>
          <SheetHeader className="flex-row items-center justify-between gap-3 border-b p-4 text-left">
            <div className="min-w-0">
              <SheetTitle>API Key 详情</SheetTitle>
              <SheetDescription className="sr-only">个人 API Key 摘要、调用日志和图表统计。</SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              {sheetKeyId ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`${ROUTE_DASHBOARD_SETTINGS_API_KEYS}/${sheetKeyId}`}>
                    <ExternalLink className="size-4" />
                    完整详情页
                  </Link>
                </Button>
              ) : null}
              <Button aria-label="关闭 API Key 详情" onClick={closeSheet} size="sm" type="button" variant="ghost">
                关闭
              </Button>
            </div>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {sheetKey.error ? <ApiKeyDetailError onClose={closeSheet} /> : sheetKey.data ? <ApiKeyDetailContent apiKey={sheetKey.data} mode="sheet" /> : <ApiKeyDetailSkeleton />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

const ApiKeyDetailError = ({ onClose }: { onClose: () => void }) => (
  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5" role="alert">
    <h2 className="font-semibold text-destructive text-sm">API Key 详情加载失败</h2>
    <p className="mt-2 text-muted-foreground text-xs">请关闭详情后重试，或从列表重新打开该 API Key。</p>
    <Button className="mt-4" onClick={onClose} size="sm" type="button" variant="outline">
      关闭详情
    </Button>
  </div>
)

const CreatedKeyBar = ({ createdKey, onDismiss }: { createdKey: CreatedApiKeyResult; onDismiss: () => void }) => (
  <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between" data-testid="created-api-key-result">
    <div className="min-w-0">
      <div className="font-medium text-sm">刚创建的 API Key：{createdKey.name}</div>
      <code className="mt-1 block break-all rounded-md bg-background px-2 py-1 font-mono text-xs" data-testid="created-api-key-plaintext">
        {createdKey.key}
      </code>
      <p className="mt-1 text-muted-foreground text-xs">仅显示一次，请立即复制并保存到安全位置。</p>
    </div>
    <div className="flex shrink-0 gap-2">
      <CopyCreatedApiKeyButton value={createdKey.key} />
      <Button onClick={onDismiss} size="sm" type="button" variant="ghost">
        关闭
      </Button>
    </div>
  </div>
)

const ApiKeysTable = ({ items, onOpen }: { items: ApiKeyItem[]; onOpen: (id: string) => void }) => {
  const columns = useMemo<Array<ColumnDef<ApiKeyItem>>>(
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
      { cell: ({ row }) => formatDate(row.original.createdAt), header: "创建时间", size: 130 },
      { cell: ({ row }) => formatExpiresAt(row.original.expiresAt), header: "过期时间", size: 130 },
      { cell: ({ row }) => formatDate(row.original.lastRequest), header: "最后使用", size: 130 },
      {
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <ApiKeyStatusBadge status={row.original.status} />
            <ApiKeyRiskBadge risk={row.original.risk} />
          </div>
        ),
        header: "状态",
        size: 180
      },
      {
        cell: ({ row }) => <ApiKeyRowActions apiKey={row.original} onOpen={() => onOpen(row.original.id)} />,
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
          minWidthClassName="min-w-[920px]"
          onRowClick={(row) => onOpen(row.id)}
          rowTestId={(row) => `api-key-row-${row.id}`}
        />
      </div>
      <div className="grid gap-3 lg:hidden">
        {items.map((item) => (
          <Link className="rounded-lg border bg-card p-4 shadow-sm" data-testid={`api-key-card-${item.id}`} href={`${ROUTE_DASHBOARD_SETTINGS_API_KEYS}/${item.id}`} key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{item.name}</div>
                <div className="mt-1 font-mono text-muted-foreground text-xs">{item.maskedKey}</div>
              </div>
              <ApiKeyStatusBadge status={item.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <ApiKeyRiskBadge risk={item.risk} />
              <span className="text-muted-foreground text-xs">最后使用：{formatDate(item.lastRequest)}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}

const ApiKeyRowActions = ({ apiKey, onOpen }: { apiKey: ApiKeyItem; onOpen: () => void }) => {
  const [activeAction, setActiveAction] = useState<RowAction>(null)

  return (
    <div className="flex justify-end" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
      <Button aria-label="查看使用日志" onClick={onOpen} size="icon-sm" title="查看使用日志" type="button" variant="ghost">
        <Eye className="size-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label="更多 API Key 操作" size="icon-sm" title="更多 API Key 操作" type="button" variant="ghost">
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

      <DisableApiKeyDialog apiKey={apiKey} onOpenChange={(open) => setActiveAction(open ? "disable" : null)} open={activeAction === "disable"} trigger={null} />
      <EnableApiKeyDialog apiKey={apiKey} onOpenChange={(open) => setActiveAction(open ? "enable" : null)} open={activeAction === "enable"} trigger={null} />
      <DeleteApiKeyDialog apiKey={apiKey} onOpenChange={(open) => setActiveAction(open ? "delete" : null)} open={activeAction === "delete"} trigger={null} />
    </div>
  )
}

const ApiKeyDetailSkeleton = () => (
  <div className="space-y-4" data-testid="api-key-detail-skeleton">
    <Skeleton className="h-24 w-full rounded-lg" />
    <div className="grid grid-cols-2 gap-2">
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-9 w-full rounded-md" />
    </div>
    <Skeleton className="h-80 w-full rounded-lg" />
  </div>
)
