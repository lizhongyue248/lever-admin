"use client"

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { RouterOutputs } from "@/trpc/react"

import { type SourceFilter, sourceLabels } from "./request-log-labels"

type RequestLogList = RouterOutputs["adminRequestLog"]["list"]
type RequestLogItem = RequestLogList["items"][number]

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    year: "numeric"
  }).format(date)

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

const riskText = (risk: string) => {
  if (risk === "high") {
    return "高"
  }

  if (risk === "medium") {
    return "中"
  }

  return "低"
}

export const RequestLogsTable = ({ isDesktop, items, onOpen }: { isDesktop: boolean; items: RequestLogItem[]; onOpen: (id: string) => void }) => {
  const columns = useMemo<Array<ColumnDef<RequestLogItem>>>(
    () => [
      {
        cell: ({ row }) => <span>{formatDateTime(row.original.createdAt)}</span>,
        header: "时间",
        size: 148
      },
      {
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.userName ?? "Unknown"}</div>
            <div className="text-muted-foreground text-xs">{row.original.userEmail ?? "未登录请求"}</div>
          </div>
        ),
        header: "操作者",
        size: 170
      },
      {
        cell: ({ row }) => sourceLabels[row.original.source as SourceFilter] ?? row.original.source,
        header: "来源",
        size: 110
      },
      {
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{`${row.original.method} ${row.original.routeName ?? row.original.path}`}</div>
            <div className="max-w-[280px] truncate text-muted-foreground text-xs">{row.original.path}</div>
          </div>
        ),
        header: "方法 / 路径",
        size: 320
      },
      {
        cell: ({ row }) => <Badge variant={row.original.success ? "secondary" : "destructive"}>{row.original.statusCode ?? (row.original.success ? "成功" : "失败")}</Badge>,
        header: "结果",
        size: 96
      },
      {
        cell: ({ row }) => formatDuration(row.original.durationMs),
        header: "耗时",
        size: 88
      },
      {
        cell: ({ row }) => <Badge variant={riskVariant(row.original.riskLevel)}>{riskText(row.original.riskLevel)}</Badge>,
        header: "风险",
        size: 82
      },
      {
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.ipAddress ?? "-"}</div>
            <div className="text-muted-foreground text-xs">{row.original.userAgentSummary ?? "-"}</div>
          </div>
        ),
        header: "完整 IP",
        size: 176
      }
    ],
    []
  )
  const table = useReactTable({
    columns,
    data: items,
    getCoreRowModel: getCoreRowModel()
  })

  if (!isDesktop) {
    return (
      <div className="grid max-h-[600px] gap-3 overflow-y-auto pr-1" data-testid="request-log-list-scroll">
        {items.map((item) => (
          <RequestLogCard item={item} key={item.id} onOpen={onOpen} />
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-lg border" data-testid="request-log-table-viewport">
      <div className="max-h-[600px] overflow-auto [scrollbar-gutter:stable]" data-testid="request-log-list-scroll">
        <table className="w-full min-w-[1190px] caption-bottom text-sm">
          <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80" data-testid="request-log-table-header">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead className="whitespace-nowrap" key={header.id} style={{ minWidth: header.getSize(), width: header.getSize() }}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow className="cursor-pointer" data-testid={`request-log-row-${row.original.id}`} key={row.id} onClick={() => onOpen(row.original.id)}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} style={{ minWidth: cell.column.getSize(), width: cell.column.getSize() }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
    </div>
  )
}

const RequestLogCard = ({ item, onOpen }: { item: RequestLogItem; onOpen: (id: string) => void }) => (
  <button className="rounded-lg border bg-card p-4 text-left shadow-sm" data-testid={`request-log-card-${item.id}`} onClick={() => onOpen(item.id)} type="button">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate font-semibold">{`${item.method} ${item.routeName ?? item.path}`}</div>
        <div className="mt-1 truncate text-primary text-xs">{item.path}</div>
      </div>
      <Badge variant={riskVariant(item.riskLevel)}>{riskText(item.riskLevel)}</Badge>
    </div>
    <div className="mt-3 space-y-1 text-muted-foreground text-xs">
      <p>{`${item.ipAddress ?? "-"} · ${item.userAgentSummary ?? "-"}`}</p>
      <p>{`${item.userName ?? "Unknown"} · ${formatDateTime(item.createdAt)} · ${item.statusCode ?? "-"}`}</p>
    </div>
  </button>
)
