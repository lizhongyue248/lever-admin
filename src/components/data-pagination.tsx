"use client"

import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { DEFAULT_PAGE, PAGE_SIZE_OPTIONS } from "@/lib/const"
import { cn } from "@/lib/utils"

type DataPaginationProps = {
  className?: string
  disabled?: boolean
  itemCount: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  page: number
  pageCount: number
  pageSize?: number
  pageSizeOptions?: readonly number[]
  total: number
}

const clampPage = (value: number, pageCount: number) => Math.min(Math.max(value, 1), Math.max(pageCount, 1))

export const DataPagination = ({
  className,
  disabled = false,
  itemCount,
  onPageChange,
  onPageSizeChange,
  page,
  pageCount,
  pageSize,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  total
}: DataPaginationProps) => {
  const normalizedItemCount = Number.isFinite(itemCount) ? itemCount : 0
  const normalizedPageCount = Number.isFinite(pageCount) ? Math.max(pageCount, 1) : 1
  const normalizedPage = Number.isFinite(page) ? page : DEFAULT_PAGE
  const normalizedTotal = Number.isFinite(total) ? total : normalizedItemCount
  const [pageInput, setPageInput] = useState(normalizedPage.toString())
  const canPrevious = !disabled && normalizedPage > 1
  const canNext = !disabled && normalizedPage < normalizedPageCount

  useEffect(() => {
    setPageInput(normalizedPage.toString())
  }, [normalizedPage])

  const submitPage = () => {
    const parsedPage = Number.parseInt(pageInput, 10)

    if (Number.isNaN(parsedPage)) {
      setPageInput(normalizedPage.toString())
      return
    }

    const nextPage = clampPage(parsedPage, normalizedPageCount)
    setPageInput(nextPage.toString())
    onPageChange(nextPage)
  }

  return (
    <div className={cn("flex flex-col gap-3 text-muted-foreground text-xs sm:flex-row sm:items-center sm:justify-between", className)}>
      <span>{`显示 ${normalizedItemCount} / ${normalizedTotal}`}</span>
      <div className="flex flex-wrap items-center gap-2">
        {pageSize && onPageSizeChange ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label={`每页条数：${pageSize} 条`} className="h-9 gap-1.5 text-foreground" disabled={disabled} type="button" variant="outline">
                每页 {pageSize} 条
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {pageSizeOptions.map((option) => (
                <DropdownMenuItem key={option} onSelect={() => onPageSizeChange(option)}>
                  <span className="flex w-5 items-center">{option === pageSize ? <Check className="size-4" /> : null}</span>
                  每页 {option} 条
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <Button aria-label="首页" disabled={!canPrevious} onClick={() => onPageChange(1)} size="icon-sm" type="button" variant="outline">
          <ChevronsLeft className="size-4" />
        </Button>
        <Button aria-label="上一页" disabled={!canPrevious} onClick={() => onPageChange(normalizedPage - 1)} size="icon-sm" type="button" variant="outline">
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Input
            aria-label="当前页"
            className="h-9 w-14 text-center"
            disabled={disabled}
            inputMode="numeric"
            min={1}
            onChange={(event) => setPageInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                submitPage()
              }
            }}
            type="number"
            value={pageInput}
          />
          <span>{`/ ${normalizedPageCount}`}</span>
        </div>
        <Button aria-label="下一页" disabled={!canNext} onClick={() => onPageChange(normalizedPage + 1)} size="icon-sm" type="button" variant="outline">
          <ChevronRight className="size-4" />
        </Button>
        <Button aria-label="末页" disabled={!canNext} onClick={() => onPageChange(normalizedPageCount)} size="icon-sm" type="button" variant="outline">
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
