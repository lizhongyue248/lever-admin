import { REQUEST_LOG_HIGH_RISK_SLOW_MS, REQUEST_LOG_SLOW_MS, RISK_LEVEL_HIGH, RISK_LEVEL_LOW, RISK_LEVEL_MEDIUM, type RiskSeverity } from "@/lib/const"

export type RequestRiskLevel = RiskSeverity

export type RequestLogRisk = {
  level: RequestRiskLevel
  reasons: string[]
}

const highRiskRoutePattern = /(ban|delete|disable|impersonate|reset-password|revoke|settings|two-factor|2fa|api-key)/iu

export const buildRequestLogRisk = ({
  durationMs,
  path,
  routeName,
  statusCode,
  success
}: {
  durationMs: number | null
  path: string
  routeName: string | null
  statusCode: number | null
  success: boolean
}): RequestLogRisk => {
  const reasons: string[] = []
  const route = `${routeName ?? ""} ${path}`

  if (statusCode === 403) {
    reasons.push("权限不足")
  }

  if (!success && highRiskRoutePattern.test(route)) {
    reasons.push("高危路由失败")
  }

  if (durationMs !== null && durationMs >= REQUEST_LOG_HIGH_RISK_SLOW_MS) {
    reasons.push("请求耗时超过 10 秒")
  }

  if (reasons.length > 0) {
    return { level: RISK_LEVEL_HIGH, reasons }
  }

  if (!success && statusCode !== null && statusCode >= 400 && statusCode < 500) {
    reasons.push("客户端失败请求")
  }

  if (durationMs !== null && durationMs >= REQUEST_LOG_SLOW_MS) {
    reasons.push("请求耗时超过 2 秒")
  }

  if (reasons.length > 0) {
    return { level: RISK_LEVEL_MEDIUM, reasons }
  }

  return { level: RISK_LEVEL_LOW, reasons }
}
