"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { MonitorSmartphone } from "lucide-react"
import { useState } from "react"

import { DataPagination } from "@/components/data-pagination"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, FILTER_ALL, SESSION_RISK_RISK } from "@/lib/const"
import { api, type RouterOutputs } from "@/trpc/react"
import { formatRelativeTime } from "../_lib/org-format"

type AuthData = RouterOutputs["org"]["session"]["list"]
type SessionItem = AuthData["items"][number]

const RiskBadge = ({ session }: { session: SessionItem }) => (
  <Badge variant={session.riskStatus === SESSION_RISK_RISK ? "destructive" : "secondary"}>
    {session.riskStatus === SESSION_RISK_RISK ? (session.riskReasons[0] ?? "风险会话") : "正常"}
  </Badge>
)

export const OrgAuthContent = ({ initialData, slug }: { initialData: AuthData; slug: string }) => {
  const [page, setPage] = useState(DEFAULT_PAGE)
  const sessions = api.org.session.list.useQuery(
    { deviceType: FILTER_ALL, page, pageSize: DEFAULT_PAGE_SIZE, riskStatus: FILTER_ALL, search: "", slug },
    { initialData: page === DEFAULT_PAGE ? initialData : undefined, placeholderData: (previousData) => previousData }
  )
  const columns: Array<ColumnDef<AuthData["items"][number]>> = [
    {
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-muted-foreground text-xs">{row.original.email}</div>
        </div>
      ),
      header: "成员",
      size: 220
    },
    {
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <MonitorSmartphone className="size-4 text-muted-foreground" />
          <span>{`${row.original.deviceLabel} · ${row.original.browserLabel}`}</span>
        </div>
      ),
      header: "设备",
      size: 220
    },
    { cell: ({ row }) => row.original.ipAddress ?? "未知位置", header: "位置", size: 160 },
    { cell: ({ row }) => formatRelativeTime(row.original.lastActiveAt), header: "最后活跃", size: 140 },
    { cell: ({ row }) => <RiskBadge session={row.original} />, header: "风险", size: 140 }
  ]
  const sessionData = sessions.data ?? initialData

  return (
    <Card className="rounded-lg shadow-sm">
      <CardContent className="p-5">
        <div className="hidden md:block">
          <DataTable columns={columns} data={sessionData.items} getRowId={(row) => row.id} maxHeightClassName="max-h-[620px]" minWidthClassName="min-w-[840px]" />
        </div>
        <div className="space-y-3 md:hidden">
          {sessionData.items.map((item) => (
            <div className="rounded-lg border p-4" key={item.id}>
              <div className="font-medium">{item.name}</div>
              <div className="text-muted-foreground text-xs">{item.email}</div>
              <div className="mt-3 grid gap-2 text-xs">
                <span>
                  设备：{item.deviceLabel} · {item.browserLabel}
                </span>
                <span>位置：{item.ipAddress ?? "未知位置"}</span>
                <span>最后活跃：{formatRelativeTime(item.lastActiveAt)}</span>
                <span className="flex items-center gap-1">
                  风险：
                  <RiskBadge session={item} />
                </span>
              </div>
            </div>
          ))}
        </div>
        {sessionData.items.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">暂无成员登录记录。</div> : null}
        <DataPagination
          className="mt-4"
          disabled={sessions.isFetching}
          itemCount={sessionData.items.length}
          onPageChange={setPage}
          page={sessionData.page}
          pageCount={sessionData.pageCount}
          pageSize={DEFAULT_PAGE_SIZE}
          total={sessionData.total}
        />
      </CardContent>
    </Card>
  )
}
