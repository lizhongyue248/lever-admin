import { TRPCError } from "@trpc/server"
import { z } from "zod"

import {
  API_KEY_EXPIRING_SOON_DAYS,
  API_KEY_FAILURE_RATE_RISK_THRESHOLD,
  API_KEY_OWNER_USER,
  API_KEY_STALE_REQUEST_DAYS,
  API_KEY_STATUS_DISABLED,
  API_KEY_STATUS_ENABLED,
  API_KEY_STATUS_EXPIRING,
  API_KEY_STATUS_FILTERS,
  type ApiKeyOwnerType,
  FILTER_ALL,
  MASKED_API_KEY_VISIBLE_LENGTH,
  PLATFORM_ROLE_SUPPORT,
  REQUEST_LOG_RESULT_FAILED,
  REQUEST_LOG_RESULT_SUCCESS,
  RISK_LEVEL_HIGH,
  RISK_LEVEL_LOW,
  RISK_LEVEL_MEDIUM,
  type RiskSeverity
} from "@/lib/const"

export const apiKeyStatusSchema = z.enum(API_KEY_STATUS_FILTERS)
export const usageResultSchema = z.enum([FILTER_ALL, REQUEST_LOG_RESULT_SUCCESS, REQUEST_LOG_RESULT_FAILED])

export type ApiKeyRiskLevel = RiskSeverity
export type { ApiKeyOwnerType }
export type ApiKeyStatus = z.infer<typeof apiKeyStatusSchema>

type ApiKeyMaskInput = {
  prefix: string | null
  start: string | null
}

type ApiKeyRiskInput = {
  enabled: boolean | null
  expiresAt: Date | null
  failed24h: number
  lastRequest: Date | null
  total24h: number
}

type ApiKeyRisk = {
  level: ApiKeyRiskLevel
  reasons: string[]
}

const millisecondsPerDay = 24 * 60 * 60 * 1000

const getDaysUntil = (date: Date, now = new Date()) => {
  return (date.getTime() - now.getTime()) / millisecondsPerDay
}

export const isExpiringSoon = (expiresAt: Date | null, now = new Date()) => {
  if (!expiresAt) {
    return false
  }

  const daysUntilExpiry = getDaysUntil(expiresAt, now)

  return daysUntilExpiry >= 0 && daysUntilExpiry <= API_KEY_EXPIRING_SOON_DAYS
}

export const getApiKeyStatus = ({ enabled, expiresAt }: { enabled: boolean; expiresAt: Date | null }) => {
  if (!enabled) {
    return API_KEY_STATUS_DISABLED
  }

  if (isExpiringSoon(expiresAt)) {
    return API_KEY_STATUS_EXPIRING
  }

  return API_KEY_STATUS_ENABLED
}

export const maskApiKey = ({ prefix, start }: ApiKeyMaskInput) => {
  const visiblePart = [prefix, start, "key"].map((value) => value?.trim()).find((value) => value)

  return `${visiblePart?.slice(0, MASKED_API_KEY_VISIBLE_LENGTH)}••••••••`
}

export const assertCanMutatePlatformApiKey = (role: string | null | undefined) => {
  if (role === PLATFORM_ROLE_SUPPORT) {
    throw new TRPCError({ code: "FORBIDDEN", message: "support 只能只读查看 API Key。" })
  }
}

export const assertPersonalKey = (key: { configId: string; referenceId: string }, userId: string) => {
  if (key.configId !== API_KEY_OWNER_USER || key.referenceId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "API Key 不存在。" })
  }
}

export const buildApiKeyRisk = ({ expiresAt, failed24h, lastRequest, total24h }: ApiKeyRiskInput): ApiKeyRisk => {
  const now = new Date()
  const reasons: string[] = []
  const failureRate = total24h > 0 ? failed24h / total24h : 0

  if (expiresAt) {
    const daysUntilExpiry = getDaysUntil(expiresAt, now)

    if (daysUntilExpiry < 0) {
      reasons.push("已过期")
    } else if (daysUntilExpiry <= API_KEY_EXPIRING_SOON_DAYS) {
      reasons.push(`${API_KEY_EXPIRING_SOON_DAYS} 天内到期`)
    }
  }

  if (!lastRequest || getDaysUntil(lastRequest, now) < -API_KEY_STALE_REQUEST_DAYS) {
    reasons.push("长期未使用")
  }

  const hasFailureRateReason = failureRate >= API_KEY_FAILURE_RATE_RISK_THRESHOLD

  if (hasFailureRateReason) {
    reasons.push("近 24 小时失败率异常")
  }

  if (hasFailureRateReason) {
    return { level: RISK_LEVEL_HIGH, reasons }
  }

  if (reasons.length > 0) {
    return { level: RISK_LEVEL_MEDIUM, reasons }
  }

  return { level: RISK_LEVEL_LOW, reasons }
}
