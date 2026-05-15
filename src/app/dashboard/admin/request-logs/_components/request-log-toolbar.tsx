"use client"

import { Check, ChevronDown, RefreshCw, Search, TimerReset } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

import { type ResultFilter, type RiskFilter, resultLabels, riskLabels, type SourceFilter, sourceLabels, type TimeRangeFilter, timeRangeLabels } from "./request-log-labels"

const autoRefreshOptions: Array<{ label: string; value: number | null }> = [
  { label: "关闭", value: null },
  { label: "每 10 秒", value: 10_000 },
  { label: "每 30 秒", value: 30_000 },
  { label: "每 1 分钟", value: 60_000 },
  { label: "每 5 分钟", value: 300_000 }
]

const getAutoRefreshLabel = (value: number | null) => autoRefreshOptions.find((option) => option.value === value)?.label ?? "关闭"

export const RequestLogToolbar = ({
  autoRefreshMs,
  isRefreshing,
  onAutoRefreshChange,
  onRefresh,
  onResultChange,
  onRiskChange,
  onSearchChange,
  onSourceChange,
  onTimeRangeChange,
  resetPage,
  result,
  risk,
  search,
  source,
  timeRange
}: {
  autoRefreshMs: number | null
  isRefreshing: boolean
  onAutoRefreshChange: (value: number | null) => void
  onRefresh: () => void
  onResultChange: (value: ResultFilter) => void
  onRiskChange: (value: RiskFilter) => void
  onSearchChange: (value: string) => void
  onSourceChange: (value: SourceFilter) => void
  onTimeRangeChange: (value: TimeRangeFilter) => void
  resetPage: () => void
  result: ResultFilter
  risk: RiskFilter
  search: string
  source: SourceFilter
  timeRange: TimeRangeFilter
}) => {
  const autoRefreshLabel = getAutoRefreshLabel(autoRefreshMs)

  return (
    <div className="grid gap-2 lg:grid-cols-[minmax(260px,1fr)_repeat(4,150px)]">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_40px_40px] gap-2">
        <div className="relative min-w-0">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="搜索请求日志"
            className="pl-9"
            onChange={(event) => {
              onSearchChange(event.target.value)
              resetPage()
            }}
            placeholder="搜索用户、路径、requestId、完整 IP 或 User-Agent"
            value={search}
          />
        </div>
        <Button aria-label="刷新请求日志" disabled={isRefreshing} onClick={onRefresh} size="icon" title="刷新请求日志" type="button" variant="outline">
          <RefreshCw className={isRefreshing ? "size-4 animate-spin" : "size-4"} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label={`定时刷新：${autoRefreshLabel}`} size="icon" title={`定时刷新：${autoRefreshLabel}`} type="button" variant="outline">
              <TimerReset className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {autoRefreshOptions.map((option) => (
              <DropdownMenuItem key={option.label} onSelect={() => onAutoRefreshChange(option.value)}>
                <span className="flex w-5 items-center">{option.value === autoRefreshMs ? <Check className="size-4" /> : null}</span>
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <FilterMenu label={timeRangeLabels[timeRange]} onSelect={onTimeRangeChange} options={timeRangeLabels} resetPage={resetPage} />
      <FilterMenu label={resultLabels[result]} onSelect={onResultChange} options={resultLabels} resetPage={resetPage} />
      <FilterMenu label={riskLabels[risk]} onSelect={onRiskChange} options={riskLabels} resetPage={resetPage} />
      <FilterMenu label={sourceLabels[source]} onSelect={onSourceChange} options={sourceLabels} resetPage={resetPage} />
    </div>
  )
}

const FilterMenu = <TValue extends string>({
  label,
  onSelect,
  options,
  resetPage
}: {
  label: string
  onSelect: (value: TValue) => void
  options: Record<TValue, string>
  resetPage: () => void
}) => {
  const entries = Object.entries(options) as Array<[TValue, string]>

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="w-full justify-between" type="button" variant="outline">
          {label}
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {entries.map(([value, text]) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => {
              onSelect(value)
              resetPage()
            }}
          >
            {text}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
