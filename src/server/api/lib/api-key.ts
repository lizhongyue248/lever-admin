import { TRPCError } from "@trpc/server"
import { z } from "zod"

import { PLATFORM_ROLE_SUPPORT } from "@/lib/const"

export const apiKeyStatusSchema = z.enum(["all", "enabled", "disabled", "expiring", "risky"])
export const usageResultSchema = z.enum(["all", "success", "failed"])

export type ApiKeyRiskLevel = "low" | "medium" | "high"
export type ApiKeyOwnerType = "user" | "organization"
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
const expiringSoonDays = 30
const maskedApiKeyVisibleLength = 12
const staleRequestDays = 90

const getDaysUntil = (date: Date, now = new Date()) => {
  return (date.getTime() - now.getTime()) / millisecondsPerDay
}

export const isExpiringSoon = (expiresAt: Date | null, now = new Date()) => {
  if (!expiresAt) {
    return false
  }

  const daysUntilExpiry = getDaysUntil(expiresAt, now)

  return daysUntilExpiry >= 0 && daysUntilExpiry <= expiringSoonDays
}

export const getApiKeyStatus = ({ enabled, expiresAt }: { enabled: boolean; expiresAt: Date | null }) => {
  if (!enabled) {
    return "disabled" as const
  }

  if (isExpiringSoon(expiresAt)) {
    return "expiring" as const
  }

  return "enabled" as const
}

export const maskApiKey = ({ prefix, start }: ApiKeyMaskInput) => {
  const visiblePart = [prefix, start, "key"].map((value) => value?.trim()).find((value) => value)

  return `${visiblePart?.slice(0, maskedApiKeyVisibleLength)}••••••••`
}

export const assertCanMutatePlatformApiKey = (role: string | null | undefined) => {
  if (role === PLATFORM_ROLE_SUPPORT) {
    throw new TRPCError({ code: "FORBIDDEN", message: "support 只能只读查看 API Key。" })
  }
}

export const assertPersonalKey = (key: { configId: string; referenceId: string }, userId: string) => {
  if (key.configId !== "user" || key.referenceId !== userId) {
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
    } else if (daysUntilExpiry <= expiringSoonDays) {
      reasons.push("30 天内到期")
    }
  }

  if (!lastRequest || getDaysUntil(lastRequest, now) < -staleRequestDays) {
    reasons.push("长期未使用")
  }

  const hasFailureRateReason = failureRate >= 0.1

  if (hasFailureRateReason) {
    reasons.push("近 24 小时失败率异常")
  }

  if (hasFailureRateReason) {
    return { level: "high", reasons }
  }

  if (reasons.length > 0) {
    return { level: "medium", reasons }
  }

  return { level: "low", reasons }
}
