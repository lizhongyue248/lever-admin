import { and, eq, gt, gte, inArray, isNull, sql } from "drizzle-orm"

import { RISK_LEVEL_HIGH, SESSION_RISK_MAX_ACTIVE_SESSIONS_PER_USER, SESSION_RISK_NORMAL, SESSION_RISK_RISK, SESSION_RISK_WINDOW_DAYS, type SessionRiskLevel } from "@/lib/const"
import type { db } from "@/server/db"
import { requestLog, session } from "@/server/db/schema"

export type RiskLevel = SessionRiskLevel

export type SessionRisk = {
  level: RiskLevel
  reasons: string[]
}

export type SessionRiskInput = {
  createdAt: Date
  id: string
  ipAddress: string | null
  updatedAt: Date | null
  userAgent: string | null
  userId: string
}

const getRiskWindowStart = (now = new Date()) => new Date(now.getTime() - SESSION_RISK_WINDOW_DAYS * 24 * 60 * 60 * 1000)

export const getSessionRisk = ({
  activeSessionCountForUser,
  hasHighRiskRequest,
  now = new Date(),
  sessionRow
}: {
  activeSessionCountForUser: number
  hasHighRiskRequest: boolean
  now?: Date
  sessionRow: SessionRiskInput
}): SessionRisk => {
  const reasons: string[] = []
  const lastActiveAt = sessionRow.updatedAt ?? sessionRow.createdAt
  const riskWindowStart = getRiskWindowStart(now)

  if (activeSessionCountForUser > SESSION_RISK_MAX_ACTIVE_SESSIONS_PER_USER) {
    reasons.push("活跃会话数量超过阈值")
  }

  if (!sessionRow.ipAddress || !sessionRow.userAgent) {
    reasons.push("会话缺少 IP 或 User-Agent")
  }

  if (sessionRow.createdAt < riskWindowStart && lastActiveAt < riskWindowStart) {
    reasons.push("长期未活跃会话")
  }

  if (hasHighRiskRequest) {
    reasons.push("最近存在高风险请求")
  }

  return {
    level: reasons.length > 0 ? SESSION_RISK_RISK : SESSION_RISK_NORMAL,
    reasons
  }
}

export const getHighRiskUserIds = async ({ database, organizationId, userIds }: { database: typeof db; organizationId?: string; userIds: string[] }) => {
  if (userIds.length === 0) {
    return new Set<string>()
  }

  const rows = await database
    .select({ userId: requestLog.userId })
    .from(requestLog)
    .where(
      and(
        inArray(requestLog.userId, userIds),
        organizationId ? eq(requestLog.organizationId, organizationId) : undefined,
        eq(requestLog.riskLevel, RISK_LEVEL_HIGH),
        gte(requestLog.createdAt, getRiskWindowStart()),
        isNull(requestLog.deletedAt)
      )
    )

  return new Set(rows.flatMap((row) => (row.userId ? [row.userId] : [])))
}

export const getActiveSessionCountsByUser = async ({ database, userIds }: { database: typeof db; userIds: string[] }) => {
  if (userIds.length === 0) {
    return new Map<string, number>()
  }

  const rows = await database
    .select({
      count: sql<number>`count(*)::int`,
      userId: session.userId
    })
    .from(session)
    .where(and(inArray(session.userId, userIds), gt(session.expiresAt, new Date())))
    .groupBy(session.userId)

  return new Map(rows.map((row) => [row.userId, row.count]))
}
