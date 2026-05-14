import { TRPCError } from "@trpc/server"
import { and, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm"
import { z } from "zod"

import { PLATFORM_ROLE_SUPPORT } from "@/lib/const"
import { apiKeyStatusSchema, assertCanMutatePlatformApiKey, buildApiKeyRisk, maskApiKey, usageResultSchema } from "@/server/api/lib/api-key"
import { getApiKeyUsageStats } from "@/server/api/lib/api-key-usage-stats"
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc"
import { db } from "@/server/db"
import { apiKeyUsageLog, apikey, organization, user } from "@/server/db/schema"

const secondsPerDay = 24 * 60 * 60
const deletedOwnerLabel = "已删除主体"

const getKeyDisplayStatus = ({ enabled, expiresAt }: { enabled: boolean | null; expiresAt: Date | null }) => {
  if (!enabled) {
    return "disabled" as const
  }

  if (expiresAt && expiresAt <= new Date()) {
    return "expired" as const
  }

  if (expiresAt && expiresAt <= new Date(Date.now() + 30 * secondsPerDay * 1000)) {
    return "expiring" as const
  }

  return "enabled" as const
}

type ApiKeyOwner = {
  id: string
  label: string
  type: "user" | "organization"
}

type ApiKeySafeRow = {
  configId: string
  createdAt: Date
  enabled: boolean | null
  expiresAt: Date | null
  id: string
  lastRequest: Date | null
  name: string | null
  organizationName: string | null
  prefix: string | null
  referenceId: string
  start: string | null
  updatedAt: Date
  userEmail: string | null
  userName: string | null
}

const selectAdminSafeApiKey = {
  configId: apikey.configId,
  createdAt: apikey.createdAt,
  enabled: apikey.enabled,
  expiresAt: apikey.expiresAt,
  id: apikey.id,
  lastRequest: apikey.lastRequest,
  name: apikey.name,
  organizationName: organization.name,
  prefix: apikey.prefix,
  referenceId: apikey.referenceId,
  start: apikey.start,
  updatedAt: apikey.updatedAt,
  userEmail: user.email,
  userName: user.name
}

const getOwner = (row: ApiKeySafeRow): ApiKeyOwner => {
  if (row.configId === "organization") {
    return {
      id: row.referenceId,
      label: row.organizationName ?? deletedOwnerLabel,
      type: "organization"
    }
  }

  return {
    id: row.referenceId,
    label: row.userName ?? row.userEmail ?? deletedOwnerLabel,
    type: "user"
  }
}

const getUsageSummary = async (apiKeyId: string) => {
  const since = new Date(Date.now() - secondsPerDay * 1000)
  const [summary] = await db
    .select({
      failed24h: sql<number>`count(*) filter (where ${apiKeyUsageLog.success} = false)::int`,
      total24h: sql<number>`count(*)::int`
    })
    .from(apiKeyUsageLog)
    .where(and(eq(apiKeyUsageLog.apiKeyId, apiKeyId), gte(apiKeyUsageLog.createdAt, since)))
    .catch(() => [])

  return {
    failed24h: summary?.failed24h ?? 0,
    total24h: summary?.total24h ?? 0
  }
}

const toSafeItem = async (row: ApiKeySafeRow) => {
  const usageSummary = await getUsageSummary(row.id)
  const enabled = row.enabled ?? false
  const risk = buildApiKeyRisk({
    enabled,
    expiresAt: row.expiresAt,
    failed24h: usageSummary.failed24h,
    lastRequest: row.lastRequest,
    total24h: usageSummary.total24h
  })

  return {
    configId: row.configId,
    createdAt: row.createdAt,
    enabled,
    expiresAt: row.expiresAt,
    id: row.id,
    lastRequest: row.lastRequest,
    maskedKey: maskApiKey({ prefix: row.prefix, start: row.start }),
    name: row.name ?? "未命名 API Key",
    owner: getOwner(row),
    risk,
    status: getKeyDisplayStatus({ enabled, expiresAt: row.expiresAt })
  }
}

export const adminApiKeyRouter = createTRPCRouter({
  delete: adminProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    assertCanMutatePlatformApiKey(ctx.session.user.role)

    const [target] = await ctx.db
      .select(selectAdminSafeApiKey)
      .from(apikey)
      .leftJoin(user, and(eq(apikey.configId, "user"), eq(user.id, apikey.referenceId)))
      .leftJoin(organization, and(eq(apikey.configId, "organization"), eq(organization.id, apikey.referenceId)))
      .where(eq(apikey.id, input.id))
      .limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "API Key 不存在。" })
    }

    // Platform governance is broader than Better Auth's owner/org-scoped API key endpoints;
    // this repo currently stores API keys in the primary DB, so mutate safe metadata directly.
    await ctx.db.delete(apikey).where(eq(apikey.id, input.id))

    return { success: true }
  }),

  disable: adminProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    assertCanMutatePlatformApiKey(ctx.session.user.role)

    const [target] = await ctx.db
      .select(selectAdminSafeApiKey)
      .from(apikey)
      .leftJoin(user, and(eq(apikey.configId, "user"), eq(user.id, apikey.referenceId)))
      .leftJoin(organization, and(eq(apikey.configId, "organization"), eq(organization.id, apikey.referenceId)))
      .where(eq(apikey.id, input.id))
      .limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "API Key 不存在。" })
    }

    // Platform governance is broader than Better Auth's owner/org-scoped API key endpoints;
    // this repo currently stores API keys in the primary DB, so mutate safe metadata directly.
    await ctx.db.update(apikey).set({ enabled: false, updatedAt: new Date() }).where(eq(apikey.id, input.id))

    return { success: true }
  }),

  enable: adminProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    assertCanMutatePlatformApiKey(ctx.session.user.role)

    const [target] = await ctx.db
      .select(selectAdminSafeApiKey)
      .from(apikey)
      .leftJoin(user, and(eq(apikey.configId, "user"), eq(user.id, apikey.referenceId)))
      .leftJoin(organization, and(eq(apikey.configId, "organization"), eq(organization.id, apikey.referenceId)))
      .where(eq(apikey.id, input.id))
      .limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "API Key 不存在。" })
    }

    // Platform governance is broader than Better Auth's owner/org-scoped API key endpoints;
    // this repo currently stores API keys in the primary DB, so mutate safe metadata directly.
    await ctx.db.update(apikey).set({ enabled: true, updatedAt: new Date() }).where(eq(apikey.id, input.id))

    return { success: true }
  }),

  get: adminProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ ctx, input }) => {
    const [target] = await ctx.db
      .select(selectAdminSafeApiKey)
      .from(apikey)
      .leftJoin(user, and(eq(apikey.configId, "user"), eq(user.id, apikey.referenceId)))
      .leftJoin(organization, and(eq(apikey.configId, "organization"), eq(organization.id, apikey.referenceId)))
      .where(eq(apikey.id, input.id))
      .limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "API Key 不存在。" })
    }

    const item = await toSafeItem(target)
    const usageSummary = await getUsageSummary(target.id)
    const since = new Date(Date.now() - 90 * secondsPerDay * 1000)
    const recentLogs = await ctx.db
      .select({
        createdAt: apiKeyUsageLog.createdAt,
        durationMs: apiKeyUsageLog.durationMs,
        errorCode: apiKeyUsageLog.errorCode,
        failureReason: apiKeyUsageLog.failureReason,
        id: apiKeyUsageLog.id,
        ipCountry: apiKeyUsageLog.ipCountry,
        ipHash: apiKeyUsageLog.ipHash,
        ipRegion: apiKeyUsageLog.ipRegion,
        method: apiKeyUsageLog.method,
        path: apiKeyUsageLog.path,
        requestId: apiKeyUsageLog.requestId,
        routeName: apiKeyUsageLog.routeName,
        statusCode: apiKeyUsageLog.statusCode,
        success: apiKeyUsageLog.success,
        userAgentHash: apiKeyUsageLog.userAgentHash,
        userAgentSummary: apiKeyUsageLog.userAgentSummary
      })
      .from(apiKeyUsageLog)
      .where(and(eq(apiKeyUsageLog.apiKeyId, input.id), gte(apiKeyUsageLog.createdAt, since)))
      .orderBy(desc(apiKeyUsageLog.createdAt))
      .limit(5)
      .catch(() => [])

    return {
      ...item,
      canMutate: ctx.session.user.role !== PLATFORM_ROLE_SUPPORT,
      recentLogs,
      usageSummary
    }
  }),

  getUsageStats: adminProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ ctx, input }) => {
    const [target] = await ctx.db
      .select(selectAdminSafeApiKey)
      .from(apikey)
      .leftJoin(user, and(eq(apikey.configId, "user"), eq(user.id, apikey.referenceId)))
      .leftJoin(organization, and(eq(apikey.configId, "organization"), eq(organization.id, apikey.referenceId)))
      .where(eq(apikey.id, input.id))
      .limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "API Key 不存在。" })
    }

    return await getApiKeyUsageStats({ apiKeyId: input.id })
  }),

  getOverview: adminProcedure.query(async ({ ctx }) => {
    const now = new Date()
    const recentSince = new Date(now.getTime() - secondsPerDay * 1000)
    const expiringBefore = new Date(now.getTime() + 30 * secondsPerDay * 1000)
    const rows = await ctx.db
      .select(selectAdminSafeApiKey)
      .from(apikey)
      .leftJoin(user, and(eq(apikey.configId, "user"), eq(user.id, apikey.referenceId)))
      .leftJoin(organization, and(eq(apikey.configId, "organization"), eq(organization.id, apikey.referenceId)))
      .orderBy(desc(apikey.createdAt))
    const items = await Promise.all(rows.map(toSafeItem))
    const [recentRow] = await ctx.db
      .select({ value: sql<number>`count(*)::int` })
      .from(apiKeyUsageLog)
      .where(gte(apiKeyUsageLog.createdAt, recentSince))
      .catch(() => [])

    return {
      enabled: rows.filter((row) => row.enabled === true && (!row.expiresAt || row.expiresAt > now)).length,
      expiring: rows.filter((row) => row.enabled === true && row.expiresAt && row.expiresAt >= now && row.expiresAt <= expiringBefore).length,
      recent24h: recentRow?.value ?? 0,
      risky: items.filter((item) => item.risk.level !== "low").length,
      total: rows.length
    }
  }),

  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
        search: z.string().default(""),
        status: apiKeyStatusSchema.default("all")
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const expiringBefore = new Date(now.getTime() + 30 * secondsPerDay * 1000)
      const trimmedSearch = input.search.trim()
      const searchValue = `%${trimmedSearch}%`
      const baseFilters = and(
        trimmedSearch
          ? or(
              ilike(apikey.name, searchValue),
              ilike(apikey.prefix, searchValue),
              ilike(apikey.start, searchValue),
              ilike(user.name, searchValue),
              ilike(user.email, searchValue),
              ilike(organization.name, searchValue)
            )
          : undefined,
        input.status === "enabled" ? and(eq(apikey.enabled, true), or(sql`${apikey.expiresAt} is null`, sql`${apikey.expiresAt} > ${now}`)) : undefined,
        input.status === "disabled" ? or(eq(apikey.enabled, false), isNull(apikey.enabled)) : undefined,
        input.status === "expiring" ? and(eq(apikey.enabled, true), gte(apikey.expiresAt, now), lte(apikey.expiresAt, expiringBefore)) : undefined
      )
      const query = ctx.db
        .select(selectAdminSafeApiKey)
        .from(apikey)
        .leftJoin(user, and(eq(apikey.configId, "user"), eq(user.id, apikey.referenceId)))
        .leftJoin(organization, and(eq(apikey.configId, "organization"), eq(organization.id, apikey.referenceId)))

      if (input.status === "risky") {
        const candidateRows = await query.where(baseFilters).orderBy(desc(apikey.createdAt))
        const candidateItems = await Promise.all(candidateRows.map(toSafeItem))
        const riskyItems = candidateItems.filter((item) => item.risk.level !== "low")
        const total = riskyItems.length
        const canMutate = ctx.session.user.role !== PLATFORM_ROLE_SUPPORT

        return {
          items: riskyItems.slice((input.page - 1) * input.pageSize, input.page * input.pageSize).map((item) => ({ ...item, canMutate })),
          page: input.page,
          pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
          total
        }
      }

      const [totalRow] = await ctx.db
        .select({ value: sql<number>`count(*)::int` })
        .from(apikey)
        .leftJoin(user, and(eq(apikey.configId, "user"), eq(user.id, apikey.referenceId)))
        .leftJoin(organization, and(eq(apikey.configId, "organization"), eq(organization.id, apikey.referenceId)))
        .where(baseFilters)
      const rows = await query
        .where(baseFilters)
        .orderBy(desc(apikey.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize)
      const items = await Promise.all(rows.map(toSafeItem))
      const total = totalRow?.value ?? 0
      const canMutate = ctx.session.user.role !== PLATFORM_ROLE_SUPPORT

      return {
        items: items.map((item) => ({ ...item, canMutate })),
        page: input.page,
        pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
        total
      }
    }),

  listUsageLogs: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
        result: usageResultSchema.default("all")
      })
    )
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - 90 * secondsPerDay * 1000)
      const filters = and(
        eq(apiKeyUsageLog.apiKeyId, input.id),
        gte(apiKeyUsageLog.createdAt, since),
        input.result === "success" ? eq(apiKeyUsageLog.success, true) : undefined,
        input.result === "failed" ? eq(apiKeyUsageLog.success, false) : undefined
      )
      const [totalRow] = await ctx.db
        .select({ value: sql<number>`count(*)::int` })
        .from(apiKeyUsageLog)
        .where(filters)
        .catch(() => [])
      const logs = await ctx.db
        .select({
          configId: apiKeyUsageLog.configId,
          createdAt: apiKeyUsageLog.createdAt,
          durationMs: apiKeyUsageLog.durationMs,
          errorCode: apiKeyUsageLog.errorCode,
          failureReason: apiKeyUsageLog.failureReason,
          id: apiKeyUsageLog.id,
          ipCountry: apiKeyUsageLog.ipCountry,
          ipHash: apiKeyUsageLog.ipHash,
          ipRegion: apiKeyUsageLog.ipRegion,
          keyPrefix: apiKeyUsageLog.keyPrefix,
          method: apiKeyUsageLog.method,
          path: apiKeyUsageLog.path,
          referenceId: apiKeyUsageLog.referenceId,
          requestId: apiKeyUsageLog.requestId,
          routeName: apiKeyUsageLog.routeName,
          statusCode: apiKeyUsageLog.statusCode,
          success: apiKeyUsageLog.success,
          userAgentHash: apiKeyUsageLog.userAgentHash,
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
