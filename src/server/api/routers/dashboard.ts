import { TRPCError } from "@trpc/server"
import { and, desc, eq, gt, gte, inArray, lte, sql } from "drizzle-orm"
import { z } from "zod"

import { ORGANIZATION_ADMIN_ROLES, PLATFORM_ROLE_USER } from "@/lib/const"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import {
  account,
  apiKeyUsageLog,
  apikey,
  invitation,
  member,
  organization,
  organizationDepartment,
  organizationDepartmentMember,
  passkey,
  requestLog,
  session,
  team,
  twoFactor,
  user
} from "@/server/db/schema"

type DashboardRecentEvent = {
  createdAt: Date
  description: string
  id: string
  title: string
}

const credentialProviderIds = new Set(["credential", "email", "email-password"])

const countRows = async (query: Promise<{ value: number }[]>) => {
  const [row] = await query

  return row?.value ?? 0
}

const isOrganizationAdminRole = (role: string | null | undefined) => ORGANIZATION_ADMIN_ROLES.some((adminRole) => adminRole === role)

const getActiveSessionOrganizationId = (activeSession: typeof session.$inferSelect) => activeSession.activeOrganizationId ?? null
const getPlatformRole = (role: string | null | undefined) => role ?? PLATFORM_ROLE_USER
const getRecentWindowStart = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
const getExpiringSoonEnd = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
const toReturnedEvents = (events: DashboardRecentEvent[]) =>
  events
    .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
    .slice(0, 3)
    .map(({ description, id, title }) => ({ description, id, title }))

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
        name: ctx.session.user.name,
        role: getPlatformRole("role" in ctx.session.user && typeof ctx.session.user.role === "string" ? ctx.session.user.role : null)
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
      const memberUserRows = await ctx.db.select({ id: member.id, role: member.role, userId: member.userId }).from(member).where(eq(member.organizationId, organizationId))
      const memberUserIds = memberUserRows.map((row) => row.userId)
      const hasMembers = memberUserIds.length > 0
      const now = new Date()
      const expiringSoonEnd = getExpiringSoonEnd()
      const recentWindowStart = getRecentWindowStart()

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
      const activeSessionCount = hasMembers
        ? await countRows(
            ctx.db
              .select({ value: sql<number>`count(*)::int` })
              .from(session)
              .where(and(inArray(session.userId, memberUserIds), gt(session.expiresAt, now)))
          )
        : 0
      const pendingInvitationCount = await countRows(
        ctx.db
          .select({ value: sql<number>`count(*)::int` })
          .from(invitation)
          .where(and(eq(invitation.organizationId, organizationId), eq(invitation.status, "pending")))
      )
      const teamCount = await countRows(ctx.db.select({ value: sql<number>`count(*)::int` }).from(team).where(eq(team.organizationId, organizationId)))
      const departmentRows = await ctx.db
        .select({ id: organizationDepartment.id, name: organizationDepartment.name })
        .from(organizationDepartment)
        .where(eq(organizationDepartment.organizationId, organizationId))
      const departmentMemberRows = await ctx.db
        .select({ departmentId: organizationDepartmentMember.departmentId, memberId: organizationDepartmentMember.memberId })
        .from(organizationDepartmentMember)
        .where(eq(organizationDepartmentMember.organizationId, organizationId))
      const departmentMemberCounts = new Map<string, number>()
      const assignedMemberIds = new Set<string>()

      for (const row of departmentMemberRows) {
        assignedMemberIds.add(row.memberId)
        departmentMemberCounts.set(row.departmentId, (departmentMemberCounts.get(row.departmentId) ?? 0) + 1)
      }

      const largestDepartment = departmentRows.reduce(
        (largest, department) => {
          const size = departmentMemberCounts.get(department.id) ?? 0

          if (size > largest.size) {
            return { name: department.name, size }
          }

          return largest
        },
        { name: "", size: 0 }
      )
      const unassignedMemberCount = memberUserRows.filter((row) => !assignedMemberIds.has(row.id)).length
      const departmentScore = memberCount === 0 ? 100 : departmentRows.length === 0 ? 20 : Math.max(20, 100 - Math.round((unassignedMemberCount / memberCount) * 100))
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
      const expiringApiKeyCount = await countRows(
        ctx.db
          .select({ value: sql<number>`count(*)::int` })
          .from(apikey)
          .where(
            and(
              eq(apikey.configId, "organization"),
              eq(apikey.referenceId, organizationId),
              eq(apikey.enabled, true),
              gt(apikey.expiresAt, now),
              lte(apikey.expiresAt, expiringSoonEnd)
            )
          )
      )
      const roleRows = await ctx.db
        .select({ role: member.role, value: sql<number>`count(*)::int` })
        .from(member)
        .where(eq(member.organizationId, organizationId))
        .groupBy(member.role)
      const permissionDistribution = roleRows.filter((row) => row.value > 0).map((row) => ({ label: row.role, value: row.value }))
      const requestEvents = await ctx.db
        .select({ createdAt: requestLog.createdAt, id: requestLog.id, method: requestLog.method, path: requestLog.path, success: requestLog.success })
        .from(requestLog)
        .where(and(eq(requestLog.organizationId, organizationId), gte(requestLog.createdAt, recentWindowStart)))
        .orderBy(desc(requestLog.createdAt))
        .limit(3)
      const apiKeyEvents = await ctx.db
        .select({ createdAt: apiKeyUsageLog.createdAt, id: apiKeyUsageLog.id, method: apiKeyUsageLog.method, path: apiKeyUsageLog.path, success: apiKeyUsageLog.success })
        .from(apiKeyUsageLog)
        .where(and(eq(apiKeyUsageLog.configId, "organization"), eq(apiKeyUsageLog.referenceId, organizationId), gte(apiKeyUsageLog.createdAt, recentWindowStart)))
        .orderBy(desc(apiKeyUsageLog.createdAt))
        .limit(3)
      const invitationEvents = await ctx.db
        .select({ createdAt: invitation.createdAt, id: invitation.id, role: invitation.role, status: invitation.status })
        .from(invitation)
        .where(and(eq(invitation.organizationId, organizationId), gte(invitation.createdAt, recentWindowStart)))
        .orderBy(desc(invitation.createdAt))
        .limit(3)
      const recentEvents = toReturnedEvents([
        ...apiKeyEvents.map((event) => ({
          createdAt: event.createdAt,
          description: `${event.method} ${event.path}`,
          id: event.id,
          title: event.success ? "API Key 使用" : "API Key 失败"
        })),
        ...invitationEvents.map((event) => ({
          createdAt: event.createdAt,
          description: `${event.role} · ${event.status}`,
          id: event.id,
          title: "组织邀请"
        })),
        ...requestEvents.map((event) => ({
          createdAt: event.createdAt,
          description: `${event.method} ${event.path}`,
          id: event.id,
          title: event.success ? "请求成功" : "请求失败"
        }))
      ])

      const radar = [
        { label: "成员", value: memberCount ? Math.round((twoFactorEnabledMembers / memberCount) * 100) : 0 },
        { label: "邀请", value: pendingInvitationCount === 0 ? 100 : Math.max(20, 100 - pendingInvitationCount * 15) },
        { label: "团队", value: departmentScore },
        { label: "会话", value: activeSessionCount <= Math.max(memberCount, 1) * 3 ? 100 : 40 },
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
          { description: `${expiringApiKeyCount} 个组织密钥将在 30 天内过期`, href: "/dashboard/admin/api-keys", title: "即将过期 API Key" }
        ].map((action) => ({ ...action, count: action.description.match(/^\d+/)?.[0] ?? "0" })),
        departmentStructure: {
          emptyDepartmentCount: departmentRows.filter((department) => (departmentMemberCounts.get(department.id) ?? 0) === 0).length,
          largestDepartmentName: largestDepartment.name,
          largestDepartmentSize: largestDepartment.size,
          unassignedMemberCount
        },
        metrics: [
          { label: "成员", value: memberCount.toString() },
          { label: "团队", value: teamCount.toString() },
          { label: "待处理邀请", value: pendingInvitationCount.toString() },
          { label: "即将过期 Key", value: expiringApiKeyCount.toString() },
          { label: "邮箱验证率", value: memberCount ? Math.round((verifiedMembers / memberCount) * 100).toString() : "0" },
          { label: "2FA覆盖率", value: memberCount ? Math.round((twoFactorEnabledMembers / memberCount) * 100).toString() : "0" },
          { label: "Passkey覆盖率", value: memberCount ? Math.round((passkeyEnabledMembers / memberCount) * 100).toString() : "0" }
        ],
        permissionDistribution,
        radar,
        recentEvents,
        view: "organization-admin" as const
      }
    }

    const now = new Date()
    const expiringSoonEnd = getExpiringSoonEnd()
    const recentWindowStart = getRecentWindowStart()
    const accountRows = await ctx.db.select({ password: account.password, providerId: account.providerId }).from(account).where(eq(account.userId, sessionUserId))
    const hasPassword = accountRows.some((row) => Boolean(row.password) || credentialProviderIds.has(row.providerId))
    const linkedAccountCount = accountRows.filter((row) => !credentialProviderIds.has(row.providerId)).length
    const activeSessionCount = await countRows(
      ctx.db
        .select({ value: sql<number>`count(*)::int` })
        .from(session)
        .where(and(eq(session.userId, sessionUserId), gt(session.expiresAt, now)))
    )
    const passkeyCount = await countRows(ctx.db.select({ value: sql<number>`count(*)::int` }).from(passkey).where(eq(passkey.userId, sessionUserId)))
    const twoFactorCount = await countRows(ctx.db.select({ value: sql<number>`count(*)::int` }).from(twoFactor).where(eq(twoFactor.userId, sessionUserId)))
    const personalApiKeyCount = await countRows(
      ctx.db
        .select({ value: sql<number>`count(*)::int` })
        .from(apikey)
        .where(and(eq(apikey.configId, "user"), eq(apikey.referenceId, sessionUserId)))
    )
    const personalApiKeyRecentUsedCount = await countRows(
      ctx.db
        .select({ value: sql<number>`count(distinct ${apiKeyUsageLog.apiKeyId})::int` })
        .from(apiKeyUsageLog)
        .where(and(eq(apiKeyUsageLog.configId, "user"), eq(apiKeyUsageLog.referenceId, sessionUserId), gte(apiKeyUsageLog.createdAt, recentWindowStart)))
    )
    const personalApiKeyExpiringSoonCount = await countRows(
      ctx.db
        .select({ value: sql<number>`count(*)::int` })
        .from(apikey)
        .where(and(eq(apikey.configId, "user"), eq(apikey.referenceId, sessionUserId), eq(apikey.enabled, true), gt(apikey.expiresAt, now), lte(apikey.expiresAt, expiringSoonEnd)))
    )
    const pendingInvitationCount = await countRows(
      ctx.db
        .select({ value: sql<number>`count(*)::int` })
        .from(invitation)
        .where(and(eq(invitation.email, ctx.session.user.email.toLowerCase()), eq(invitation.status, "pending")))
    )
    const requestEvents = await ctx.db
      .select({
        createdAt: requestLog.createdAt,
        id: requestLog.id,
        method: requestLog.method,
        path: requestLog.path,
        success: requestLog.success,
        userAgentSummary: requestLog.userAgentSummary
      })
      .from(requestLog)
      .where(and(eq(requestLog.userId, sessionUserId), gte(requestLog.createdAt, recentWindowStart)))
      .orderBy(desc(requestLog.createdAt))
      .limit(3)
    const invitationEvents = await ctx.db
      .select({ createdAt: invitation.createdAt, expiresAt: invitation.expiresAt, id: invitation.id, role: invitation.role, status: invitation.status })
      .from(invitation)
      .where(and(eq(invitation.email, ctx.session.user.email.toLowerCase()), gte(invitation.createdAt, recentWindowStart)))
      .orderBy(desc(invitation.createdAt))
      .limit(3)
    const apiKeyEvents = await ctx.db
      .select({
        createdAt: apiKeyUsageLog.createdAt,
        id: apiKeyUsageLog.id,
        method: apiKeyUsageLog.method,
        path: apiKeyUsageLog.path,
        success: apiKeyUsageLog.success,
        userAgentSummary: apiKeyUsageLog.userAgentSummary
      })
      .from(apiKeyUsageLog)
      .where(and(eq(apiKeyUsageLog.configId, "user"), eq(apiKeyUsageLog.referenceId, sessionUserId), gte(apiKeyUsageLog.createdAt, recentWindowStart)))
      .orderBy(desc(apiKeyUsageLog.createdAt))
      .limit(3)
    const recentEvents = toReturnedEvents([
      ...apiKeyEvents.map((event) => ({
        createdAt: event.createdAt,
        description: `${event.method} ${event.path}`,
        id: event.id,
        title: event.success ? "API Key 使用" : "API Key 失败"
      })),
      ...invitationEvents.map((event) => ({
        createdAt: event.createdAt,
        description: `${event.role} · ${event.status}${event.expiresAt ? ` · ${event.expiresAt.toLocaleDateString("zh-CN")} 前处理` : ""}`,
        id: event.id,
        title: "组织邀请"
      })),
      ...requestEvents.map((event) => ({
        createdAt: event.createdAt,
        description: `${event.method} ${event.path}`,
        id: event.id,
        title: event.success ? "请求成功" : "请求失败"
      }))
    ])

    const radar = [
      { label: "邮箱", value: ctx.session.user.emailVerified ? 100 : 20 },
      { label: "2FA", value: twoFactorCount > 0 ? 100 : 0 },
      { label: "Passkey", value: passkeyCount > 0 ? 100 : 0 },
      { label: "会话", value: activeSessionCount <= 3 ? 100 : Math.max(20, 100 - activeSessionCount * 10) },
      { label: "OAuth", value: linkedAccountCount > 0 ? 100 : 0 }
    ]

    return {
      actions: [
        { description: twoFactorCount > 0 ? "已启用 2FA，建议保管恢复码" : "开启 2FA 可显著降低账号接管风险", href: "/dashboard/settings/security", title: "开启 2FA" },
        { description: passkeyCount > 0 ? "已添加 Passkey，可继续添加备用设备" : "添加 Passkey 提升无密码登录体验", href: "/dashboard/settings/security", title: "添加 Passkey" },
        { description: `${pendingInvitationCount} 个组织邀请等待处理`, href: "/dashboard", title: "处理组织邀请" },
        { description: `${activeSessionCount} 个活跃会话可供检查`, href: "/dashboard/settings/sessions", title: "检查长期会话" }
      ].map((action, index) => ({
        ...action,
        count: index === 0 ? (twoFactorCount > 0 ? "0" : "1") : index === 1 ? (passkeyCount > 0 ? "0" : "1") : (action.description.match(/^\d+/)?.[0] ?? "0")
      })),
      metrics: [
        { label: "所属组织", value: memberships.length.toString() },
        { label: "活跃设备", value: activeSessionCount.toString() },
        { label: "Passkey", value: passkeyCount.toString() },
        { label: "个人 Key", value: personalApiKeyCount.toString() },
        { label: "待处理邀请", value: pendingInvitationCount.toString() }
      ],
      loginMethods: [
        { label: "邮箱密码", value: hasPassword ? 1 : 0 },
        { label: "OAuth", value: linkedAccountCount },
        { label: "Passkey", value: passkeyCount }
      ],
      personalApiKeyStatus: {
        expiringSoonCount: personalApiKeyExpiringSoonCount,
        recentUsedCount: personalApiKeyRecentUsedCount,
        totalCount: personalApiKeyCount
      },
      radar,
      recentEvents,
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
