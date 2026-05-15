import type { RouterInputs } from "@/trpc/react"

type ListInput = RouterInputs["adminRequestLog"]["list"]

export type ResultFilter = NonNullable<ListInput["result"]>
export type RiskFilter = NonNullable<ListInput["risk"]>
export type SourceFilter = NonNullable<ListInput["source"]>
export type TimeRangeFilter = NonNullable<ListInput["timeRange"]>

export const resultLabels: Record<ResultFilter, string> = {
  all: "全部结果",
  failed: "失败",
  success: "成功"
}

export const riskLabels: Record<RiskFilter, string> = {
  all: "全部风险",
  high: "高风险",
  low: "低风险",
  medium: "中风险"
}

export const sourceLabels: Record<SourceFilter, string> = {
  all: "全部来源",
  api_key: "API Key",
  auth: "Auth",
  dashboard: "Dashboard",
  route_handler: "Route",
  system: "系统",
  trpc: "tRPC"
}

export const timeRangeLabels: Record<TimeRangeFilter, string> = {
  "1h": "最近 1 小时",
  "24h": "最近 24 小时",
  "7d": "最近 7 天",
  "30d": "最近 30 天",
  all: "全部时间"
}
