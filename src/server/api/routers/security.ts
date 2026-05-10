import { TRPCError } from "@trpc/server"
import { and, desc, eq, sql } from "drizzle-orm"

import { env } from "@/env"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { account, passkey, session, twoFactor, user } from "@/server/db/schema"

const credentialProviderIds = new Set(["credential", "email", "email-password"])

const countRows = async (query: Promise<{ value: number }[]>) => {
  const [row] = await query

  return row?.value ?? 0
}

const getDimensionValue = (enabled: boolean) => (enabled ? 100 : 35)

const getStatusValue = (enabled: boolean) => (enabled ? ("active" as const) : ("available" as const))

export const securityRouter = createTRPCRouter({
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id

    const [currentUser] = await ctx.db
      .select({
        email: user.email,
        emailVerified: user.emailVerified,
        id: user.id,
        twoFactorEnabled: user.twoFactorEnabled
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    if (!currentUser) {
      throw new TRPCError({ code: "NOT_FOUND", message: "未找到当前用户。" })
    }

    const accountRows = await ctx.db
      .select({
        accountId: account.accountId,
        createdAt: account.createdAt,
        hasPassword: sql<boolean>`${account.password} is not null`,
        id: account.id,
        providerId: account.providerId,
        updatedAt: account.updatedAt
      })
      .from(account)
      .where(eq(account.userId, userId))
      .orderBy(desc(account.createdAt))

    const passkeyRows = await ctx.db
      .select({
        backedUp: passkey.backedUp,
        createdAt: passkey.createdAt,
        deviceType: passkey.deviceType,
        id: passkey.id,
        name: passkey.name
      })
      .from(passkey)
      .where(eq(passkey.userId, userId))
      .orderBy(desc(passkey.createdAt))

    const [twoFactorRow] = await ctx.db
      .select({
        verified: twoFactor.verified
      })
      .from(twoFactor)
      .where(eq(twoFactor.userId, userId))
      .limit(1)

    const activeSessionCount = await countRows(ctx.db.select({ value: sql<number>`count(*)::int` }).from(session).where(eq(session.userId, userId)))

    const [currentSession] = await ctx.db
      .select({
        createdAt: session.createdAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent
      })
      .from(session)
      .where(and(eq(session.userId, userId), eq(session.id, ctx.session.session.id)))
      .limit(1)

    const passwordAccount = accountRows.find((row) => row.hasPassword || credentialProviderIds.has(row.providerId))
    const githubAccount = accountRows.find((row) => row.providerId === "github") ?? null
    const hasPassword = Boolean(passwordAccount)
    const hasPasskey = passkeyRows.length > 0
    const hasGithub = Boolean(githubAccount)
    const hasTwoFactor = Boolean(currentUser.twoFactorEnabled && twoFactorRow?.verified)
    const loginMethodCount = [hasPassword, hasPasskey, hasGithub].filter(Boolean).length
    const canUnlinkGithub = hasGithub && loginMethodCount > 1

    const dimensions = [
      {
        key: "password" as const,
        label: "密码强度",
        source: "system_account.password/provider_id",
        value: getDimensionValue(hasPassword)
      },
      {
        key: "twoFactor" as const,
        label: "双因素",
        source: "system_user.two_factor_enabled + system_two_factor.verified",
        value: getDimensionValue(hasTwoFactor)
      },
      {
        key: "passkey" as const,
        label: "Passkey",
        source: "system_passkey",
        value: getDimensionValue(hasPasskey)
      },
      {
        key: "oauth" as const,
        label: "第三方账号",
        source: "system_account.provider_id",
        value: getDimensionValue(hasGithub)
      },
      {
        key: "session" as const,
        label: "会话风险",
        source: "system_session count",
        value: activeSessionCount <= 3 ? 100 : 65
      }
    ]
    const total = Math.round(dimensions.reduce((sum, item) => sum + item.value, 0) / dimensions.length)

    return {
      oauthProviders: {
        github: {
          accountId: githubAccount?.accountId ?? null,
          canUnlink: canUnlinkGithub,
          configured: Boolean(env.BETTER_AUTH_GITHUB_CLIENT_ID && env.BETTER_AUTH_GITHUB_CLIENT_SECRET),
          connectedAt: githubAccount?.createdAt ?? null,
          linked: hasGithub
        },
        google: {
          accountId: null,
          canUnlink: false,
          configured: false,
          connectedAt: null,
          linked: false
        }
      },
      passkeys: passkeyRows.map((row) => ({
        backedUp: row.backedUp,
        createdAt: row.createdAt,
        deviceType: row.deviceType,
        id: row.id,
        name: row.name ?? "未命名 Passkey"
      })),
      password: {
        hasPassword,
        updatedAt: passwordAccount?.updatedAt ?? null
      },
      recentLoginMethods: [
        {
          description: hasPassword ? "当前账号可使用邮箱密码登录。" : "当前账号未检测到密码凭证。",
          label: "邮箱密码",
          status: getStatusValue(hasPassword)
        },
        {
          description: hasPasskey ? "已添加可用于无密码登录的 Passkey。" : "添加 Passkey 后可减少密码暴露风险。",
          label: "Passkey",
          status: getStatusValue(hasPasskey)
        },
        {
          description: hasGithub ? "GitHub 已作为第三方登录方式绑定。" : "GitHub 可作为备用登录方式。",
          label: "GitHub",
          status: getStatusValue(hasGithub)
        },
        {
          description: "Google provider 暂未在 Better Auth 配置中启用。",
          label: "Google",
          status: "unconfigured" as const
        }
      ],
      score: {
        dimensions,
        total
      },
      sessions: {
        activeCount: activeSessionCount,
        current: currentSession ?? null
      },
      twoFactor: {
        enabled: hasTwoFactor,
        verified: Boolean(twoFactorRow?.verified)
      },
      user: currentUser
    }
  })
})
