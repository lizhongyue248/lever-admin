import { and, eq, gte, isNull, sql } from "drizzle-orm"

import { API_KEY_USAGE_RECENT_DAYS, type ApiKeyOwnerType } from "@/lib/const"
import { db } from "@/server/db"
import { apiKeyUsageLog } from "@/server/db/schema"

const secondsPerDay = 24 * 60 * 60

type UsageStatsScope = {
  apiKeyId: string
  configId?: ApiKeyOwnerType
  referenceId?: string
}

export type ApiKeyUsageStats = {
  avgDurationMs24h: number | null
  failed24h: number
  failureRate24h: number
  latency: {
    avgDurationMs7d: number | null
    maxDurationMs7d: number | null
  }
  resultBreakdown: Array<{
    count: number
    label: "2xx" | "3xx" | "4xx" | "5xx" | "other"
  }>
  riskEvents: Array<{
    count: number
    label: string
  }>
  topPaths: Array<{
    count: number
    path: string
  }>
  total24h: number
  trend: Array<{
    date: string
    failed: number
    rateLimited: number
    success: number
    total: number
  }>
}

const formatBucketDate = (date: Date) => date.toISOString().slice(0, 10)

export const buildRecentTrendBuckets = (now: Date) =>
  Array.from({ length: API_KEY_USAGE_RECENT_DAYS }, (_, index) => {
    const date = new Date(now)
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCDate(date.getUTCDate() - (API_KEY_USAGE_RECENT_DAYS - 1 - index))

    return formatBucketDate(date)
  })

export const emptyApiKeyUsageStats = (now = new Date()): ApiKeyUsageStats => ({
  avgDurationMs24h: null,
  failed24h: 0,
  failureRate24h: 0,
  latency: {
    avgDurationMs7d: null,
    maxDurationMs7d: null
  },
  resultBreakdown: [],
  riskEvents: [],
  topPaths: [],
  total24h: 0,
  trend: buildRecentTrendBuckets(now).map((date) => ({
    date,
    failed: 0,
    rateLimited: 0,
    success: 0,
    total: 0
  }))
})

const toNumber = (value: number | string | null | undefined) => Number(value ?? 0)

const buildFilters = ({ apiKeyId, configId, referenceId }: UsageStatsScope, since: Date) =>
  and(
    isNull(apiKeyUsageLog.deletedAt),
    eq(apiKeyUsageLog.apiKeyId, apiKeyId),
    gte(apiKeyUsageLog.createdAt, since),
    configId ? eq(apiKeyUsageLog.configId, configId) : undefined,
    referenceId ? eq(apiKeyUsageLog.referenceId, referenceId) : undefined
  )

export const getApiKeyUsageStats = async (scope: UsageStatsScope): Promise<ApiKeyUsageStats> => {
  const now = new Date()
  const since24h = new Date(now.getTime() - secondsPerDay * 1000)
  const since7d = new Date(now.getTime() - API_KEY_USAGE_RECENT_DAYS * secondsPerDay * 1000)
  const emptyStats = emptyApiKeyUsageStats(now)

  try {
    const [summary] = await db
      .select({
        avgDurationMs24h: sql<number | null>`round(avg(${apiKeyUsageLog.durationMs}))::int`,
        failed24h: sql<number>`count(*) filter (where ${apiKeyUsageLog.success} = false)::int`,
        total24h: sql<number>`count(*)::int`
      })
      .from(apiKeyUsageLog)
      .where(buildFilters(scope, since24h))

    const trendRows = await db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${apiKeyUsageLog.createdAt}), 'YYYY-MM-DD')`,
        failed: sql<number>`count(*) filter (where ${apiKeyUsageLog.success} = false)::int`,
        rateLimited: sql<number>`count(*) filter (where ${apiKeyUsageLog.statusCode} = 429)::int`,
        success: sql<number>`count(*) filter (where ${apiKeyUsageLog.success} = true)::int`,
        total: sql<number>`count(*)::int`
      })
      .from(apiKeyUsageLog)
      .where(buildFilters(scope, since7d))
      .groupBy(sql`date_trunc('day', ${apiKeyUsageLog.createdAt})`)

    const resultLabel = sql<ApiKeyUsageStats["resultBreakdown"][number]["label"]>`
      case
        when ${apiKeyUsageLog.statusCode} between 200 and 299 then '2xx'
        when ${apiKeyUsageLog.statusCode} between 300 and 399 then '3xx'
        when ${apiKeyUsageLog.statusCode} between 400 and 499 then '4xx'
        when ${apiKeyUsageLog.statusCode} between 500 and 599 then '5xx'
        else 'other'
      end
    `
    const resultBreakdown = await db
      .select({
        count: sql<number>`count(*)::int`,
        label: resultLabel
      })
      .from(apiKeyUsageLog)
      .where(buildFilters(scope, since7d))
      .groupBy(resultLabel)

    const topPaths = await db
      .select({
        count: sql<number>`count(*)::int`,
        path: apiKeyUsageLog.path
      })
      .from(apiKeyUsageLog)
      .where(buildFilters(scope, since7d))
      .groupBy(apiKeyUsageLog.path)
      .orderBy(sql`count(*) desc`)
      .limit(5)

    const [latency] = await db
      .select({
        avgDurationMs7d: sql<number | null>`round(avg(${apiKeyUsageLog.durationMs}))::int`,
        maxDurationMs7d: sql<number | null>`max(${apiKeyUsageLog.durationMs})::int`
      })
      .from(apiKeyUsageLog)
      .where(buildFilters(scope, since7d))

    const riskLabel = sql<string>`coalesce(${apiKeyUsageLog.failureReason}, ${apiKeyUsageLog.errorCode}, 'failed_request')`
    const riskEvents = await db
      .select({
        count: sql<number>`count(*)::int`,
        label: riskLabel
      })
      .from(apiKeyUsageLog)
      .where(and(buildFilters(scope, since7d), eq(apiKeyUsageLog.success, false)))
      .groupBy(riskLabel)
      .orderBy(sql`count(*) desc`)
      .limit(5)

    const trendByDate = new Map(
      trendRows.map((row) => [
        row.date,
        {
          date: row.date,
          failed: toNumber(row.failed),
          rateLimited: toNumber(row.rateLimited),
          success: toNumber(row.success),
          total: toNumber(row.total)
        }
      ])
    )
    const total24h = toNumber(summary?.total24h)
    const failed24h = toNumber(summary?.failed24h)

    return {
      avgDurationMs24h: summary?.avgDurationMs24h ?? null,
      failed24h,
      failureRate24h: total24h === 0 ? 0 : Math.round((failed24h / total24h) * 1000) / 10,
      latency: {
        avgDurationMs7d: latency?.avgDurationMs7d ?? null,
        maxDurationMs7d: latency?.maxDurationMs7d ?? null
      },
      resultBreakdown: resultBreakdown.map((row) => ({
        count: toNumber(row.count),
        label: row.label
      })),
      riskEvents: riskEvents.map((row) => ({
        count: toNumber(row.count),
        label: row.label
      })),
      topPaths: topPaths.map((row) => ({
        count: toNumber(row.count),
        path: row.path
      })),
      total24h,
      trend: emptyStats.trend.map((bucket) => trendByDate.get(bucket.date) ?? bucket)
    }
  } catch {
    return emptyStats
  }
}
