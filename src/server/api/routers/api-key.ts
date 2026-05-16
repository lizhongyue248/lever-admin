import { TRPCError } from "@trpc/server"
import { and, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { z } from "zod"

import {
  API_KEY_EXPIRING_SOON_DAYS,
  API_KEY_OWNER_USER,
  API_KEY_STALE_REQUEST_DAYS,
  API_KEY_STATUS_DISABLED,
  API_KEY_STATUS_ENABLED,
  API_KEY_STATUS_EXPIRED,
  API_KEY_STATUS_EXPIRING,
  API_KEY_STATUS_RISKY,
  DEFAULT_PAGE,
  DENSE_PAGE_SIZE,
  FILTER_ALL,
  MAX_PAGE_SIZE,
  REQUEST_LOG_RESULT_FAILED,
  REQUEST_LOG_RESULT_SUCCESS,
  RISK_LEVEL_LOW
} from "@/lib/const"
import { apiKeyStatusSchema, assertPersonalKey, buildApiKeyRisk, maskApiKey, usageResultSchema } from "@/server/api/lib/api-key"
import { getApiKeyUsageStats } from "@/server/api/lib/api-key-usage-stats"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { auth } from "@/server/better-auth"
import { db } from "@/server/db"
import { apiKeyUsageLog, apikey } from "@/server/db/schema"

const secondsPerDay = 24 * 60 * 60
const getKeyDisplayStatus = ({ enabled, expiresAt }: { enabled: boolean | null; expiresAt: Date | null }) => {
  if (!enabled) {
    return API_KEY_STATUS_DISABLED
  }

  if (expiresAt && expiresAt <= new Date()) {
    return API_KEY_STATUS_EXPIRED
  }

  if (expiresAt && expiresAt <= new Date(Date.now() + API_KEY_EXPIRING_SOON_DAYS * secondsPerDay * 1000)) {
    return API_KEY_STATUS_EXPIRING
  }

  return API_KEY_STATUS_ENABLED
}

const getUsageSummary = async ({ apiKeyId, referenceId }: { apiKeyId: string; referenceId: string }) => {
  const since = new Date(Date.now() - secondsPerDay * 1000)
  const [summary] = await db
    .select({
      failed24h: sql<number>`count(*) filter (where ${apiKeyUsageLog.success} = false)::int`,
      total24h: sql<number>`count(*)::int`
    })
    .from(apiKeyUsageLog)
    .where(
      and(
        isNull(apiKeyUsageLog.deletedAt),
        eq(apiKeyUsageLog.apiKeyId, apiKeyId),
        eq(apiKeyUsageLog.configId, API_KEY_OWNER_USER),
        eq(apiKeyUsageLog.referenceId, referenceId),
        gte(apiKeyUsageLog.createdAt, since)
      )
    )
    .catch(() => [])

  return {
    failed24h: summary?.failed24h ?? 0,
    total24h: summary?.total24h ?? 0
  }
}

type ApiKeySafeRow = {
  configId: string
  createdAt: Date
  enabled: boolean | null
  expiresAt: Date | null
  id: string
  lastRequest: Date | null
  name: string | null
  prefix: string | null
  referenceId: string
  start: string | null
  updatedAt: Date
}

const selectSafeApiKey = {
  configId: apikey.configId,
  createdAt: apikey.createdAt,
  enabled: apikey.enabled,
  expiresAt: apikey.expiresAt,
  id: apikey.id,
  lastRequest: apikey.lastRequest,
  name: apikey.name,
  prefix: apikey.prefix,
  referenceId: apikey.referenceId,
  start: apikey.start,
  updatedAt: apikey.updatedAt
}

const toSafeItem = async (row: ApiKeySafeRow) => {
  const usageSummary = await getUsageSummary({ apiKeyId: row.id, referenceId: row.referenceId })
  return toSafeItemWithUsageSummary(row, usageSummary)
}

const toSafeItemWithUsageSummary = (row: ApiKeySafeRow, usageSummary: { failed24h: number; total24h: number }) => {
  const enabled = row.enabled ?? false
  const risk = buildApiKeyRisk({
    enabled,
    expiresAt: row.expiresAt,
    failed24h: usageSummary.failed24h,
    lastRequest: row.lastRequest,
    total24h: usageSummary.total24h
  })

  return {
    createdAt: row.createdAt,
    enabled,
    expiresAt: row.expiresAt,
    id: row.id,
    lastRequest: row.lastRequest,
    maskedKey: maskApiKey({ prefix: row.prefix, start: row.start }),
    name: row.name ?? "未命名 API Key",
    risk,
    status: getKeyDisplayStatus({ enabled, expiresAt: row.expiresAt })
  }
}

export const apiKeyRouter = createTRPCRouter({
  createMine: protectedProcedure
    .input(
      z.object({
        expiresInDays: z.number().int().min(1).max(365).optional(),
        name: z.string().min(1).max(80),
        note: z.string().max(200).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const created = await auth.api.createApiKey({
        body: {
          configId: API_KEY_OWNER_USER,
          ...(input.expiresInDays ? { expiresIn: input.expiresInDays * secondsPerDay } : {}),
          metadata: {
            note: input.note
          },
          name: input.name,
          prefix: "lev_live",
          userId: ctx.session.user.id
        }
      })
      const item = toSafeItemWithUsageSummary(
        {
          configId: created.configId,
          createdAt: created.createdAt,
          enabled: created.enabled,
          expiresAt: created.expiresAt,
          id: created.id,
          lastRequest: created.lastRequest,
          name: created.name,
          prefix: created.prefix,
          referenceId: created.referenceId,
          start: created.start,
          updatedAt: created.updatedAt
        },
        { failed24h: 0, total24h: 0 }
      )

      return {
        item,
        key: created.key
      }
    }),

  deleteMine: protectedProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const [target] = await ctx.db.select(selectSafeApiKey).from(apikey).where(eq(apikey.id, input.id)).limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "API Key 不存在。" })
    }

    assertPersonalKey(target, ctx.session.user.id)

    const headerList = await headers()
    await auth.api.deleteApiKey({ body: { configId: API_KEY_OWNER_USER, keyId: input.id }, headers: headerList })

    return { success: true }
  }),

  disableMine: protectedProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const [target] = await ctx.db.select(selectSafeApiKey).from(apikey).where(eq(apikey.id, input.id)).limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "API Key 不存在。" })
    }

    assertPersonalKey(target, ctx.session.user.id)

    await auth.api.updateApiKey({ body: { configId: API_KEY_OWNER_USER, enabled: false, keyId: input.id, userId: ctx.session.user.id } })

    return { success: true }
  }),

  enableMine: protectedProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const [target] = await ctx.db.select(selectSafeApiKey).from(apikey).where(eq(apikey.id, input.id)).limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "API Key 不存在。" })
    }

    assertPersonalKey(target, ctx.session.user.id)

    await auth.api.updateApiKey({ body: { configId: API_KEY_OWNER_USER, enabled: true, keyId: input.id, userId: ctx.session.user.id } })

    return { success: true }
  }),

  getMine: protectedProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ ctx, input }) => {
    const [target] = await ctx.db.select(selectSafeApiKey).from(apikey).where(eq(apikey.id, input.id)).limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "API Key 不存在。" })
    }

    assertPersonalKey(target, ctx.session.user.id)

    const item = await toSafeItem(target)
    const usageSummary = await getUsageSummary({ apiKeyId: target.id, referenceId: ctx.session.user.id })
    const recentLogs = await ctx.db
      .select({
        createdAt: apiKeyUsageLog.createdAt,
        durationMs: apiKeyUsageLog.durationMs,
        errorCode: apiKeyUsageLog.errorCode,
        failureReason: apiKeyUsageLog.failureReason,
        id: apiKeyUsageLog.id,
        ipCountry: apiKeyUsageLog.ipCountry,
        method: apiKeyUsageLog.method,
        path: apiKeyUsageLog.path,
        routeName: apiKeyUsageLog.routeName,
        statusCode: apiKeyUsageLog.statusCode,
        success: apiKeyUsageLog.success,
        userAgentSummary: apiKeyUsageLog.userAgentSummary
      })
      .from(apiKeyUsageLog)
      .where(
        and(
          isNull(apiKeyUsageLog.deletedAt),
          eq(apiKeyUsageLog.apiKeyId, input.id),
          eq(apiKeyUsageLog.configId, API_KEY_OWNER_USER),
          eq(apiKeyUsageLog.referenceId, ctx.session.user.id)
        )
      )
      .orderBy(desc(apiKeyUsageLog.createdAt))
      .limit(5)
      .catch(() => [])

    return {
      ...item,
      recentLogs,
      usageSummary
    }
  }),

  getMyUsageStats: protectedProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ ctx, input }) => {
    const [target] = await ctx.db.select(selectSafeApiKey).from(apikey).where(eq(apikey.id, input.id)).limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "API Key 不存在。" })
    }

    assertPersonalKey(target, ctx.session.user.id)

    return await getApiKeyUsageStats({
      apiKeyId: input.id,
      configId: API_KEY_OWNER_USER,
      referenceId: ctx.session.user.id
    })
  }),

  listMine: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(DEFAULT_PAGE),
        pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DENSE_PAGE_SIZE),
        search: z.string().default(""),
        status: apiKeyStatusSchema.default(FILTER_ALL)
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const expiringBefore = new Date(now.getTime() + API_KEY_EXPIRING_SOON_DAYS * secondsPerDay * 1000)
      const trimmedSearch = input.search.trim()
      const searchValue = `%${trimmedSearch}%`
      const baseFilters = and(
        eq(apikey.configId, API_KEY_OWNER_USER),
        eq(apikey.referenceId, ctx.session.user.id),
        trimmedSearch ? or(ilike(apikey.name, searchValue), ilike(apikey.prefix, searchValue), ilike(apikey.start, searchValue)) : undefined,
        input.status === API_KEY_STATUS_ENABLED ? and(eq(apikey.enabled, true), or(sql`${apikey.expiresAt} is null`, sql`${apikey.expiresAt} > ${now}`)) : undefined,
        input.status === API_KEY_STATUS_DISABLED ? eq(apikey.enabled, false) : undefined,
        input.status === API_KEY_STATUS_EXPIRING ? and(eq(apikey.enabled, true), gte(apikey.expiresAt, now), lte(apikey.expiresAt, expiringBefore)) : undefined
      )

      if (input.status === API_KEY_STATUS_RISKY) {
        const candidateRows = await ctx.db.select(selectSafeApiKey).from(apikey).where(baseFilters).orderBy(desc(apikey.createdAt))
        const candidateItems = await Promise.all(candidateRows.map(toSafeItem))
        const riskyItems = candidateItems.filter((item) => item.risk.level !== RISK_LEVEL_LOW)
        const total = riskyItems.length

        return {
          items: riskyItems.slice((input.page - 1) * input.pageSize, input.page * input.pageSize),
          page: input.page,
          pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
          total
        }
      }

      const [totalRow] = await ctx.db.select({ value: sql<number>`count(*)::int` }).from(apikey).where(baseFilters)
      const rows = await ctx.db
        .select(selectSafeApiKey)
        .from(apikey)
        .where(baseFilters)
        .orderBy(desc(apikey.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize)
      const items = await Promise.all(rows.map(toSafeItem))
      const total = totalRow?.value ?? 0

      return {
        items,
        page: input.page,
        pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
        total
      }
    }),

  listMyUsageLogs: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        page: z.number().int().min(1).default(DEFAULT_PAGE),
        pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DENSE_PAGE_SIZE),
        result: usageResultSchema.default(FILTER_ALL)
      })
    )
    .query(async ({ ctx, input }) => {
      const [target] = await ctx.db.select(selectSafeApiKey).from(apikey).where(eq(apikey.id, input.id)).limit(1)

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "API Key 不存在。" })
      }

      assertPersonalKey(target, ctx.session.user.id)

      const since = new Date(Date.now() - API_KEY_STALE_REQUEST_DAYS * secondsPerDay * 1000)
      const filters = and(
        isNull(apiKeyUsageLog.deletedAt),
        eq(apiKeyUsageLog.apiKeyId, input.id),
        eq(apiKeyUsageLog.configId, API_KEY_OWNER_USER),
        eq(apiKeyUsageLog.referenceId, ctx.session.user.id),
        gte(apiKeyUsageLog.createdAt, since),
        input.result === REQUEST_LOG_RESULT_SUCCESS ? eq(apiKeyUsageLog.success, true) : undefined,
        input.result === REQUEST_LOG_RESULT_FAILED ? eq(apiKeyUsageLog.success, false) : undefined
      )
      const [totalRow] = await ctx.db
        .select({ value: sql<number>`count(*)::int` })
        .from(apiKeyUsageLog)
        .where(filters)
        .catch(() => [])
      const logs = await ctx.db
        .select({
          createdAt: apiKeyUsageLog.createdAt,
          durationMs: apiKeyUsageLog.durationMs,
          errorCode: apiKeyUsageLog.errorCode,
          failureReason: apiKeyUsageLog.failureReason,
          id: apiKeyUsageLog.id,
          ipCountry: apiKeyUsageLog.ipCountry,
          ipRegion: apiKeyUsageLog.ipRegion,
          method: apiKeyUsageLog.method,
          path: apiKeyUsageLog.path,
          requestId: apiKeyUsageLog.requestId,
          routeName: apiKeyUsageLog.routeName,
          statusCode: apiKeyUsageLog.statusCode,
          success: apiKeyUsageLog.success,
          userAgentSummary: apiKeyUsageLog.userAgentSummary
        })
        .from(apiKeyUsageLog)
        .where(filters)
        .orderBy(desc(apiKeyUsageLog.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize)
        .catch(() => [])
      const total = totalRow?.value ?? 0

      return {
        items: logs,
        page: input.page,
        pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
        total
      }
    })
})
