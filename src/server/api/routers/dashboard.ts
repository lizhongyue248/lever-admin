import { TRPCError } from "@trpc/server"
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm"
import { z } from "zod"

import { ORGANIZATION_ADMIN_ROLES } from "@/lib/const"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { account, apikey, invitation, member, organization, passkey, session, team, twoFactor, user } from "@/server/db/schema"

const countRows = async (query: Promise<{ value: number }[]>) => {
  const [row] = await query

  return row?.value ?? 0
}

const isOrganizationAdminRole = (role: string | null | undefined) => ORGANIZATION_ADMIN_ROLES.some((adminRole) => adminRole === role)

const getActiveSessionOrganizationId = (activeSession: typeof session.$inferSelect) => activeSession.activeOrganizationId ?? null

export const dashboardRouter = createTRPCRouter({
  getShell: protectedProcedure.query(async ({ ctx }) => {
    const sessionUserId = ctx.session.user.id
    const [activeSession] = await ctx.db.select().from(session).where(eq(session.id, ctx.session.session.id)).limit(1)

    const memberships = await ctx.db
      .select({
        organizationId: organization.id,
        organizationLogo: organization.logo,
        organizationName: organization.name,
        organizationSlug: organization.slug,
        role: member.role
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(eq(member.userId, sessionUserId))
      .orderBy(desc(member.createdAt))

    const activeOrganizationId = activeSession ? getActiveSessionOrganizationId(activeSession) : null
    const activeOrganization = memberships.find((membership) => membership.organizationId === activeOrganizationId) ?? memberships[0] ?? null
    const [pendingNotificationCount] = await ctx.db
      .select({ value: sql<number>`count(*)::int` })
      .from(invitation)
      .where(and(eq(invitation.email, ctx.session.user.email.toLowerCase()), eq(invitation.status, "pending"), gt(invitation.expiresAt, new Date())))

    return {
      activeOrganizationId: activeOrganization?.organizationId ?? null,
      notifications: {
        pendingCount: pendingNotificationCount?.value ?? 0,
        unreadCount: pendingNotificationCount?.value ?? 0
      },
      organizations: memberships,
      user: {
        email: ctx.session.user.email,
        emailVerified: ctx.session.user.emailVerified,
        id: ctx.session.user.id,
        image: ctx.session.user.image,
        name: ctx.session.user.name
      }
    }
  }),

  getHome: protectedProcedure.query(async ({ ctx }) => {
    const sessionUserId = ctx.session.user.id
    const [activeSession] = await ctx.db.select().from(session).where(eq(session.id, ctx.session.session.id)).limit(1)

    const memberships = await ctx.db
      .select({
        organizationId: organization.id,
        organizationName: organization.name,
        organizationSlug: organization.slug,
        role: member.role
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(eq(member.userId, sessionUserId))
      .orderBy(desc(member.createdAt))

    const activeOrganizationId = activeSession ? getActiveSessionOrganizationId(activeSession) : null
    const activeMembership = memberships.find((membership) => membership.organizationId === activeOrganizationId) ?? memberships[0] ?? null
    const canViewOrganization = isOrganizationAdminRole(activeMembership?.role)

    if (canViewOrganization && activeMembership) {
      const organizationId = activeMembership.organizationId
      const memberUserRows = await ctx.db.select({ userId: member.userId }).from(member).where(eq(member.organizationId, organizationId))
      const memberUserIds = memberUserRows.map((row) => row.userId)
      const hasMembers = memberUserIds.length > 0

      const memberCount = memberUserIds.length
      const verifiedMembers = hasMembers
        ? await countRows(
            ctx.db
              .select({ value: sql<number>`count(*)::int` })
              .from(user)
              .where(and(inArray(user.id, memberUserIds), eq(user.emailVerified, true)))
          )
        : 0
      const twoFactorEnabledMembers = hasMembers
        ? await countRows(
            ctx.db
              .select({ value: sql<number>`count(*)::int` })
              .from(user)
              .where(and(inArray(user.id, memberUserIds), eq(user.twoFactorEnabled, true)))
          )
        : 0
      const passkeyEnabledMembers = hasMembers
        ? await countRows(
            ctx.db
              .select({ value: sql<number>`count(distinct ${passkey.userId})::int` })
              .from(passkey)
              .where(inArray(passkey.userId, memberUserIds))
          )
        : 0
      const activeSessionCount = hasMembers ? await countRows(ctx.db.select({ value: sql<number>`count(*)::int` }).from(session).where(inArray(session.userId, memberUserIds))) : 0
      const pendingInvitationCount = await countRows(
        ctx.db
          .select({ value: sql<number>`count(*)::int` })
          .from(invitation)
          .where(and(eq(invitation.organizationId, organizationId), eq(invitation.status, "pending")))
      )
      const teamCount = await countRows(ctx.db.select({ value: sql<number>`count(*)::int` }).from(team).where(eq(team.organizationId, organizationId)))
      const apiKeyCount = await countRows(
        ctx.db
          .select({ value: sql<number>`count(*)::int` })
          .from(apikey)
          .where(and(eq(apikey.configId, "organization"), eq(apikey.referenceId, organizationId)))
      )
      const enabledApiKeyCount = await countRows(
        ctx.db
          .select({ value: sql<number>`count(*)::int` })
          .from(apikey)
          .where(and(eq(apikey.configId, "organization"), eq(apikey.referenceId, organizationId), eq(apikey.enabled, true)))
      )

      const radar = [
        { label: "成员", value: memberCount ? Math.round((twoFactorEnabledMembers / memberCount) * 100) : 0 },
        { label: "邀请", value: pendingInvitationCount === 0 ? 100 : Math.max(20, 100 - pendingInvitationCount * 15) },
        { label: "团队", value: teamCount > 0 ? 82 : 0 },
        { label: "会话", value: activeSessionCount <= Math.max(memberCount, 1) * 3 ? 78 : 42 },
        { label: "Key", value: apiKeyCount === 0 ? 100 : Math.round((enabledApiKeyCount / apiKeyCount) * 100) }
      ]

      return {
        activeOrganization: activeMembership,
        actions: [
          {
            description: `${memberCount - twoFactorEnabledMembers} 位成员尚未开启 2FA`,
            href: `/dashboard/orgs/${activeMembership.organizationSlug}/information`,
            title: "未开启 2FA 成员"
          },
          { description: `${pendingInvitationCount} 个组织邀请等待处理`, href: `/dashboard/orgs/${activeMembership.organizationSlug}/invite`, title: "过期或撤销邀请" },
          { description: `${activeSessionCount} 个成员会话可供检查`, href: `/dashboard/orgs/${activeMembership.organizationSlug}/auth`, title: "异常会话待检查" },
          { description: `${apiKeyCount - enabledApiKeyCount} 个组织密钥需要复核`, href: "/dashboard/admin/api-keys", title: "即将过期 API Key" }
        ].map((action) => ({ ...action, count: action.description.match(/^\d+/)?.[0] ?? "0" })),
        metrics: [
          { label: "成员", value: memberCount.toString() },
          { label: "团队", value: teamCount.toString() },
          { label: "待处理邀请", value: pendingInvitationCount.toString() },
          { label: "风险 Key", value: (apiKeyCount - enabledApiKeyCount).toString() },
          { label: "邮箱验证率", value: memberCount ? Math.round((verifiedMembers / memberCount) * 100).toString() : "0" },
          { label: "2FA覆盖率", value: memberCount ? Math.round((twoFactorEnabledMembers / memberCount) * 100).toString() : "0" },
          { label: "Passkey覆盖率", value: memberCount ? Math.round((passkeyEnabledMembers / memberCount) * 100).toString() : "0" }
        ],
        radar,
        view: "organization-admin" as const
      }
    }

    const linkedAccountCount = await countRows(ctx.db.select({ value: sql<number>`count(*)::int` }).from(account).where(eq(account.userId, sessionUserId)))
    const activeSessionCount = await countRows(ctx.db.select({ value: sql<number>`count(*)::int` }).from(session).where(eq(session.userId, sessionUserId)))
    const passkeyCount = await countRows(ctx.db.select({ value: sql<number>`count(*)::int` }).from(passkey).where(eq(passkey.userId, sessionUserId)))
    const twoFactorCount = await countRows(ctx.db.select({ value: sql<number>`count(*)::int` }).from(twoFactor).where(eq(twoFactor.userId, sessionUserId)))
    const personalApiKeyCount = await countRows(
      ctx.db
        .select({ value: sql<number>`count(*)::int` })
        .from(apikey)
        .where(and(eq(apikey.configId, "user"), eq(apikey.referenceId, sessionUserId)))
    )
    const pendingInvitationCount = await countRows(
      ctx.db
        .select({ value: sql<number>`count(*)::int` })
        .from(invitation)
        .where(and(eq(invitation.email, ctx.session.user.email), eq(invitation.status, "pending")))
    )

    const radar = [
      { label: "邮箱", value: ctx.session.user.emailVerified ? 100 : 20 },
      { label: "2FA", value: twoFactorCount > 0 ? 100 : 0 },
      { label: "Passkey", value: passkeyCount > 0 ? 100 : 0 },
      { label: "会话", value: activeSessionCount <= 3 ? 86 : Math.max(20, 100 - activeSessionCount * 10) },
      { label: "OAuth", value: linkedAccountCount > 0 ? 80 : 0 }
    ]

    return {
      actions: [
        { description: twoFactorCount > 0 ? "已启用 2FA，建议保管恢复码" : "开启 2FA 可显著降低账号接管风险", href: "/dashboard/settings/security", title: "开启 2FA" },
        { description: passkeyCount > 0 ? "已添加 Passkey，可继续添加备用设备" : "添加 Passkey 提升无密码登录体验", href: "/dashboard/settings/security", title: "添加 Passkey" },
        { description: `${pendingInvitationCount} 个组织邀请等待处理`, href: "/dashboard", title: "处理组织邀请" },
        { description: `${activeSessionCount} 个活跃会话可供检查`, href: "/dashboard/settings/sessions", title: "检查长期会话" }
      ].map((action, index) => ({ ...action, count: index < 2 ? (index + 1).toString() : (action.description.match(/^\d+/)?.[0] ?? (index + 1).toString()) })),
      metrics: [
        { label: "所属组织", value: memberships.length.toString() },
        { label: "活跃设备", value: activeSessionCount.toString() },
        { label: "Passkey", value: passkeyCount.toString() },
        { label: "个人 Key", value: personalApiKeyCount.toString() },
        { label: "待处理邀请", value: pendingInvitationCount.toString() }
      ],
      radar,
      view: "personal" as const
    }
  }),

  setActiveOrganization: protectedProcedure.input(z.object({ organizationId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const [membership] = await ctx.db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(and(eq(member.userId, ctx.session.user.id), eq(member.organizationId, input.organizationId)))
      .limit(1)

    if (!membership) {
      throw new TRPCError({ code: "FORBIDDEN", message: "当前用户不属于该组织。" })
    }

    await ctx.db.update(session).set({ activeOrganizationId: input.organizationId }).where(eq(session.id, ctx.session.session.id))

    return { organizationId: input.organizationId }
  })
})
