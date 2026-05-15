"use client"

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import type { ReactNode } from "react"

import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type DataTableProps<TData> = {
  columns: Array<ColumnDef<TData>>
  data: TData[]
  empty?: ReactNode
  getRowId?: (row: TData) => string
  headerTestId?: string
  maxHeightClassName?: string
  minWidthClassName?: string
  onRowClick?: (row: TData) => void
  rowTestId?: (row: TData) => string
  scrollTestId?: string
  viewportTestId?: string
}

const isInteractiveElement = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest("a,button,input,select,textarea,[role='button'],[role='menuitem']"))

export const DataTable = <TData,>({
  columns,
  data,
  empty,
  getRowId,
  headerTestId = "data-table-header",
  maxHeightClassName = "max-h-[560px]",
  minWidthClassName = "min-w-[960px]",
  onRowClick,
  rowTestId,
  scrollTestId = "data-table-scroll",
  viewportTestId = "data-table-viewport"
}: DataTableProps<TData>) => {
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getRowId
  })

  if (data.length === 0 && empty) {
    return <>{empty}</>
  }

  return (
    <div className="rounded-lg border" data-testid={viewportTestId}>
      <div className={cn(maxHeightClassName, "overflow-auto [scrollbar-gutter:stable]")} data-testid={scrollTestId}>
        <table className={cn("w-full caption-bottom text-sm", minWidthClassName)}>
          <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80" data-testid={headerTestId}>
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
              <TableRow
                className={cn(onRowClick && "cursor-pointer")}
                data-testid={rowTestId?.(row.original)}
                key={row.id}
                onClick={
                  onRowClick
                    ? (event) => {
                        if (isInteractiveElement(event.target)) {
                          return
                        }

                        onRowClick(row.original)
                      }
                    : undefined
                }
              >
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
