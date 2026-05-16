import {
  FILTER_ALL,
  REQUEST_LOG_RESULT_FAILED,
  REQUEST_LOG_RESULT_SUCCESS,
  REQUEST_LOG_SOURCE_API_KEY,
  REQUEST_LOG_SOURCE_AUTH,
  REQUEST_LOG_SOURCE_DASHBOARD,
  REQUEST_LOG_SOURCE_ROUTE_HANDLER,
  REQUEST_LOG_SOURCE_SYSTEM,
  REQUEST_LOG_SOURCE_TRPC,
  REQUEST_LOG_TIME_RANGE_1H,
  REQUEST_LOG_TIME_RANGE_7D,
  REQUEST_LOG_TIME_RANGE_24H,
  REQUEST_LOG_TIME_RANGE_30D,
  type RequestLogResultFilter,
  type RequestLogRiskFilter,
  type RequestLogSourceFilter,
  type RequestLogTimeRangeFilter,
  RISK_LEVEL_HIGH,
  RISK_LEVEL_LOW,
  RISK_LEVEL_MEDIUM
} from "@/lib/const"

export type ResultFilter = RequestLogResultFilter
export type RiskFilter = RequestLogRiskFilter
export type SourceFilter = RequestLogSourceFilter
export type TimeRangeFilter = RequestLogTimeRangeFilter

export const resultLabels: Record<ResultFilter, string> = {
  [FILTER_ALL]: "全部结果",
  [REQUEST_LOG_RESULT_FAILED]: "失败",
  [REQUEST_LOG_RESULT_SUCCESS]: "成功"
}

export const riskLabels: Record<RiskFilter, string> = {
  [FILTER_ALL]: "全部风险",
  [RISK_LEVEL_HIGH]: "高风险",
  [RISK_LEVEL_LOW]: "低风险",
  [RISK_LEVEL_MEDIUM]: "中风险"
}

export const sourceLabels: Record<SourceFilter, string> = {
  [FILTER_ALL]: "全部来源",
  [REQUEST_LOG_SOURCE_API_KEY]: "API Key",
  [REQUEST_LOG_SOURCE_AUTH]: "Auth",
  [REQUEST_LOG_SOURCE_DASHBOARD]: "Dashboard",
  [REQUEST_LOG_SOURCE_ROUTE_HANDLER]: "Route",
  [REQUEST_LOG_SOURCE_SYSTEM]: "系统",
  [REQUEST_LOG_SOURCE_TRPC]: "tRPC"
}

export const timeRangeLabels: Record<TimeRangeFilter, string> = {
  [REQUEST_LOG_TIME_RANGE_1H]: "最近 1 小时",
  [REQUEST_LOG_TIME_RANGE_24H]: "最近 24 小时",
  [REQUEST_LOG_TIME_RANGE_7D]: "最近 7 天",
  [REQUEST_LOG_TIME_RANGE_30D]: "最近 30 天",
  [FILTER_ALL]: "全部时间"
}
