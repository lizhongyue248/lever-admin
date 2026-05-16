import { TRPCError } from "@trpc/server"
import { and, desc, eq, gt, ne } from "drizzle-orm"
import { z } from "zod"

import { getActiveSessionCountsByUser, getHighRiskUserIds, getSessionRisk } from "@/server/api/lib/session-risk"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { session } from "@/server/db/schema"

const getBrowser = (userAgent: string | null) => {
  const value = userAgent?.toLowerCase() ?? ""

  if (value.includes("edg/")) {
    return { browser: "edge" as const, browserLabel: "Edge" }
  }

  if (value.includes("firefox/")) {
    return { browser: "firefox" as const, browserLabel: "Firefox" }
  }

  if (value.includes("chrome/") || value.includes("chromium/")) {
    return { browser: "chrome" as const, browserLabel: "Chrome" }
  }

  if (value.includes("safari/")) {
    return { browser: "safari" as const, browserLabel: "Safari" }
  }

  return { browser: "unknown" as const, browserLabel: "浏览器" }
}

const getDeviceLabel = (userAgent: string | null) => {
  const value = userAgent?.toLowerCase() ?? ""

  if (value.includes("iphone")) {
    return "iPhone"
  }

  if (value.includes("ipad")) {
    return "iPad"
  }

  if (value.includes("android")) {
    return "Android"
  }

  if (value.includes("windows")) {
    return "Windows"
  }

  if (value.includes("mac os") || value.includes("macintosh")) {
    return "Mac"
  }

  return "未知设备"
}

const formatRelativeActivity = (date: Date) => {
  const diffMs = Math.max(0, Date.now() - date.getTime())
  const diffMinutes = Math.floor(diffMs / 60_000)

  if (diffMinutes < 1) {
    return "刚刚"
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours} 小时前`
  }

  return `${Math.floor(diffHours / 24)} 天前`
}

const formatOnlineDuration = (createdAt: Date) => {
  const diffMs = Math.max(0, Date.now() - createdAt.getTime())
  const diffHours = Math.floor(diffMs / 3_600_000)

  if (diffHours < 1) {
    return "不足 1 小时"
  }

  if (diffHours < 24) {
    return `${diffHours} 小时`
  }

  return `${Math.floor(diffHours / 24)} 天`
}

export const sessionRouter = createTRPCRouter({
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id
    const currentSessionId = ctx.session.session.id

    const rows = await ctx.db
      .select({
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        id: session.id,
        ipAddress: session.ipAddress,
        updatedAt: session.updatedAt,
        userAgent: session.userAgent,
        userId: session.userId
      })
      .from(session)
      .where(and(eq(session.userId, userId), gt(session.expiresAt, new Date())))
      .orderBy(desc(session.createdAt))

    const activeSessionCounts = await getActiveSessionCountsByUser({ database: ctx.db, userIds: [userId] })
    const highRiskUserIds = await getHighRiskUserIds({ database: ctx.db, userIds: [userId] })

    const sortedRows = rows.sort((left, right) => {
      if (left.id === currentSessionId) {
        return -1
      }

      if (right.id === currentSessionId) {
        return 1
      }

      return right.createdAt.getTime() - left.createdAt.getTime()
    })

    const sessions = sortedRows.map((row) => {
      const browser = getBrowser(row.userAgent)
      const lastActiveAt = row.updatedAt ?? row.createdAt
      const risk = getSessionRisk({
        activeSessionCountForUser: activeSessionCounts.get(row.userId) ?? rows.length,
        hasHighRiskRequest: highRiskUserIds.has(row.userId),
        sessionRow: row
      })

      return {
        ...browser,
        createdAt: row.createdAt,
        deviceLabel: getDeviceLabel(row.userAgent),
        expiresAt: row.expiresAt,
        id: row.id,
        ipAddress: row.ipAddress,
        isCurrent: row.id === currentSessionId,
        lastActiveAt,
        lastActiveLabel: formatRelativeActivity(lastActiveAt),
        riskLevel: risk.level,
        riskReasons: risk.reasons,
        userAgent: row.userAgent
      }
    })

    const longestSession = sessions.reduce<Date | null>((oldest, item) => {
      if (!oldest || item.createdAt < oldest) {
        return item.createdAt
      }

      return oldest
    }, null)
    const latestActivity = sessions.reduce<Date | null>((latest, item) => {
      if (!latest || item.lastActiveAt > latest) {
        return item.lastActiveAt
      }

      return latest
    }, null)
    const currentCount = sessions.some((item) => item.isCurrent) ? 1 : 0

    return {
      health: {
        activeCount: sessions.length,
        currentCount,
        highRiskCount: sessions.filter((item) => item.riskLevel === "risk").length,
        latestActivityLabel: latestActivity ? formatRelativeActivity(latestActivity) : "暂无",
        longestOnlineLabel: longestSession ? formatOnlineDuration(longestSession) : "暂无",
        revocableCount: sessions.filter((item) => !item.isCurrent).length
      },
      sessions
    }
  }),

  revoke: protectedProcedure.input(z.object({ sessionId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    if (input.sessionId === ctx.session.session.id) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "当前会话请通过退出登录结束。" })
    }

    const deletedRows = await ctx.db
      .delete(session)
      .where(and(eq(session.id, input.sessionId), eq(session.userId, ctx.session.user.id), gt(session.expiresAt, new Date())))
      .returning({ id: session.id })

    if (deletedRows.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "未找到可撤销的会话。" })
    }

    return { revoked: true }
  }),

  revokeOthers: protectedProcedure.mutation(async ({ ctx }) => {
    const deletedRows = await ctx.db
      .delete(session)
      .where(and(eq(session.userId, ctx.session.user.id), ne(session.id, ctx.session.session.id), gt(session.expiresAt, new Date())))
      .returning({ id: session.id })

    return { revokedCount: deletedRows.length }
  })
})
