import { TRPCError } from "@trpc/server"
import { and, desc, eq, gte, ilike, isNull, or, sql } from "drizzle-orm"
import { z } from "zod"

import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  DENSE_PAGE_SIZE,
  FILTER_ALL,
  MAX_PAGE_SIZE,
  PLATFORM_ROLE_SUPER_ADMIN,
  REQUEST_LOG_DEFAULT_TIME_RANGE,
  REQUEST_LOG_EXPORT_LIMIT,
  REQUEST_LOG_EXPORT_QUERY_LIMIT,
  REQUEST_LOG_METHOD_FILTERS,
  REQUEST_LOG_RESULT_FAILED,
  REQUEST_LOG_RESULT_FILTERS,
  REQUEST_LOG_RESULT_SUCCESS,
  REQUEST_LOG_RISK_FILTERS,
  REQUEST_LOG_SLOW_MS,
  REQUEST_LOG_SOURCE_FILTERS,
  REQUEST_LOG_TIME_RANGE_1H,
  REQUEST_LOG_TIME_RANGE_7D,
  REQUEST_LOG_TIME_RANGE_24H,
  REQUEST_LOG_TIME_RANGE_30D,
  REQUEST_LOG_TIME_RANGE_FILTERS,
  RISK_LEVEL_HIGH
} from "@/lib/const"
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc"
import { requestLog } from "@/server/db/schema"

const secondsPerHour = 60 * 60
const secondsPerDay = 24 * secondsPerHour

const requestLogSourceSchema = z.enum(REQUEST_LOG_SOURCE_FILTERS)
const requestLogMethodSchema = z.enum(REQUEST_LOG_METHOD_FILTERS)
const requestLogResultSchema = z.enum(REQUEST_LOG_RESULT_FILTERS)
const requestLogRiskSchema = z.enum(REQUEST_LOG_RISK_FILTERS)
const requestLogTimeRangeSchema = z.enum(REQUEST_LOG_TIME_RANGE_FILTERS)

const requestLogListInputSchema = z.object({
  method: requestLogMethodSchema.default(FILTER_ALL),
  page: z.number().int().min(1).default(DEFAULT_PAGE),
  pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  result: requestLogResultSchema.default(FILTER_ALL),
  risk: requestLogRiskSchema.default(FILTER_ALL),
  search: z.string().default(""),
  source: requestLogSourceSchema.default(FILTER_ALL),
  statusCode: z.number().int().min(100).max(599).nullable().default(null),
  timeRange: requestLogTimeRangeSchema.default(REQUEST_LOG_DEFAULT_TIME_RANGE)
})

type RequestLogListInput = z.infer<typeof requestLogListInputSchema>

const getSinceDate = (timeRange: RequestLogListInput["timeRange"]) => {
  const now = Date.now()

  if (timeRange === REQUEST_LOG_TIME_RANGE_1H) {
    return new Date(now - secondsPerHour * 1000)
  }

  if (timeRange === REQUEST_LOG_TIME_RANGE_24H) {
    return new Date(now - secondsPerDay * 1000)
  }

  if (timeRange === REQUEST_LOG_TIME_RANGE_7D) {
    return new Date(now - 7 * secondsPerDay * 1000)
  }

  if (timeRange === REQUEST_LOG_TIME_RANGE_30D) {
    return new Date(now - 30 * secondsPerDay * 1000)
  }

  return null
}

const buildListFilters = (input: RequestLogListInput) => {
  const trimmedSearch = input.search.trim()
  const searchValue = `%${trimmedSearch}%`
  const since = getSinceDate(input.timeRange)

  return and(
    isNull(requestLog.deletedAt),
    since ? gte(requestLog.createdAt, since) : undefined,
    input.result === REQUEST_LOG_RESULT_SUCCESS ? eq(requestLog.success, true) : undefined,
    input.result === REQUEST_LOG_RESULT_FAILED ? eq(requestLog.success, false) : undefined,
    input.risk !== FILTER_ALL ? eq(requestLog.riskLevel, input.risk) : undefined,
    input.source !== FILTER_ALL ? eq(requestLog.source, input.source) : undefined,
    input.method !== FILTER_ALL ? eq(requestLog.method, input.method) : undefined,
    input.statusCode ? eq(requestLog.statusCode, input.statusCode) : undefined,
    trimmedSearch
      ? or(
          ilike(requestLog.requestId, searchValue),
          ilike(requestLog.path, searchValue),
          ilike(requestLog.routeName, searchValue),
          ilike(requestLog.userEmail, searchValue),
          ilike(requestLog.userName, searchValue),
          ilike(requestLog.ipAddress, searchValue),
          ilike(requestLog.userAgentRaw, searchValue),
          ilike(requestLog.userAgentSummary, searchValue)
        )
      : undefined
  )
}

const parseRiskReasons = (value: string | null) => {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as string[]

    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []
  } catch {
    return []
  }
}

const escapeCsvValue = (value: Date | boolean | number | string | null) => {
  if (value === null) {
    return ""
  }

  const text = value instanceof Date ? value.toISOString() : String(value)

  return `"${text.replaceAll('"', '""')}"`
}

const buildCsv = (
  rows: Array<{
    createdAt: Date
    durationMs: number | null
    failureReason: string | null
    ipAddress: string | null
    method: string
    path: string
    requestId: string
    riskLevel: string
    routeName: string | null
    source: string
    statusCode: number | null
    success: boolean
    userAgentRaw: string | null
    userEmail: string | null
    userName: string | null
  }>
) => {
  const header = [
    "createdAt",
    "requestId",
    "source",
    "method",
    "path",
    "routeName",
    "success",
    "statusCode",
    "durationMs",
    "riskLevel",
    "failureReason",
    "userName",
    "userEmail",
    "ipAddress",
    "userAgentRaw"
  ]
  const lines = rows.map((row) =>
    [
      row.createdAt,
      row.requestId,
      row.source,
      row.method,
      row.path,
      row.routeName,
      row.success,
      row.statusCode,
      row.durationMs,
      row.riskLevel,
      row.failureReason,
      row.userName,
      row.userEmail,
      row.ipAddress,
      row.userAgentRaw
    ]
      .map(escapeCsvValue)
      .join(",")
  )

  return [header.join(","), ...lines].join("\n")
}

const selectListColumns = {
  createdAt: requestLog.createdAt,
  durationMs: requestLog.durationMs,
  failureReason: requestLog.failureReason,
  id: requestLog.id,
  ipAddress: requestLog.ipAddress,
  ipCountry: requestLog.ipCountry,
  ipRegion: requestLog.ipRegion,
  method: requestLog.method,
  path: requestLog.path,
  requestId: requestLog.requestId,
  riskLevel: requestLog.riskLevel,
  riskReasons: requestLog.riskReasons,
  routeName: requestLog.routeName,
  source: requestLog.source,
  statusCode: requestLog.statusCode,
  success: requestLog.success,
  userAgentSummary: requestLog.userAgentSummary,
  userEmail: requestLog.userEmail,
  userId: requestLog.userId,
  userName: requestLog.userName
}

export const adminRequestLogRouter = createTRPCRouter({
  exportCsv: adminProcedure.input(requestLogListInputSchema.omit({ page: true, pageSize: true })).mutation(async ({ ctx, input }) => {
    if (ctx.session.user.role !== PLATFORM_ROLE_SUPER_ADMIN) {
      throw new TRPCError({ code: "FORBIDDEN", message: "需要超级管理员权限。" })
    }

    const rows = await ctx.db
      .select({
        createdAt: requestLog.createdAt,
        durationMs: requestLog.durationMs,
        failureReason: requestLog.failureReason,
        ipAddress: requestLog.ipAddress,
        method: requestLog.method,
        path: requestLog.path,
        requestId: requestLog.requestId,
        riskLevel: requestLog.riskLevel,
        routeName: requestLog.routeName,
        source: requestLog.source,
        statusCode: requestLog.statusCode,
        success: requestLog.success,
        userAgentRaw: requestLog.userAgentRaw,
        userEmail: requestLog.userEmail,
        userName: requestLog.userName
      })
      .from(requestLog)
      .where(buildListFilters({ ...input, page: DEFAULT_PAGE, pageSize: DENSE_PAGE_SIZE }))
      .orderBy(desc(requestLog.createdAt))
      .limit(REQUEST_LOG_EXPORT_QUERY_LIMIT)

    if (rows.length > REQUEST_LOG_EXPORT_LIMIT) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `导出结果超过 ${REQUEST_LOG_EXPORT_LIMIT.toLocaleString()} 行，请缩小筛选范围。` })
    }

    return {
      content: buildCsv(rows),
      filename: `request-logs-${new Date().toISOString().slice(0, 10)}.csv`
    }
  }),

  get: adminProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .select()
      .from(requestLog)
      .where(and(eq(requestLog.id, input.id), isNull(requestLog.deletedAt)))
      .limit(1)

    if (!row) {
      throw new TRPCError({ code: "NOT_FOUND", message: "请求日志不存在。" })
    }

    return {
      ...row,
      riskReasons: parseRiskReasons(row.riskReasons)
    }
  }),

  getOverview: adminProcedure.query(async ({ ctx }) => {
    const since = new Date(Date.now() - secondsPerDay * 1000)
    const [summary] = await ctx.db
      .select({
        failed24h: sql<number>`count(*) filter (where ${requestLog.success} = false)::int`,
        highRisk24h: sql<number>`count(*) filter (where ${requestLog.riskLevel} = ${RISK_LEVEL_HIGH})::int`,
        slow24h: sql<number>`count(*) filter (where ${requestLog.durationMs} >= ${REQUEST_LOG_SLOW_MS})::int`,
        total24h: sql<number>`count(*)::int`
      })
      .from(requestLog)
      .where(and(gte(requestLog.createdAt, since), isNull(requestLog.deletedAt)))
      .catch(() => [])

    return {
      failed24h: summary?.failed24h ?? 0,
      highRisk24h: summary?.highRisk24h ?? 0,
      slow24h: summary?.slow24h ?? 0,
      total24h: summary?.total24h ?? 0
    }
  }),

  list: adminProcedure.input(requestLogListInputSchema).query(async ({ ctx, input }) => {
    const filters = buildListFilters(input)
    const [totalRow] = await ctx.db.select({ value: sql<number>`count(*)::int` }).from(requestLog).where(filters)
    const rows = await ctx.db
      .select(selectListColumns)
      .from(requestLog)
      .where(filters)
      .orderBy(desc(requestLog.createdAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize)

    const total = totalRow?.value ?? 0

    return {
      items: rows.map((row) => ({
        ...row,
        riskReasons: parseRiskReasons(row.riskReasons)
      })),
      page: input.page,
      pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
      total
    }
  })
})
