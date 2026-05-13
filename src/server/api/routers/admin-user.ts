import { TRPCError } from "@trpc/server"
import { and, desc, eq, ilike, or, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { z } from "zod"

import { PLATFORM_ADMIN_ROLES, PLATFORM_ROLE_ADMIN, PLATFORM_ROLE_SUPER_ADMIN, PLATFORM_ROLE_SUPPORT, PLATFORM_ROLE_USER } from "@/lib/const"
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc"
import { auth } from "@/server/better-auth"
import { apikey, member, organization, session, user } from "@/server/db/schema"

const platformRoleSchema = z.enum([PLATFORM_ROLE_USER, PLATFORM_ROLE_SUPPORT, PLATFORM_ROLE_ADMIN, PLATFORM_ROLE_SUPER_ADMIN])
const roleFilterSchema = platformRoleSchema.or(z.literal("all"))
const userStatusSchema = z.enum(["all", "active", "banned"])

const assertCanManageTarget = ({
  actorRole,
  actorUserId,
  targetRole,
  targetUserId
}: {
  actorRole: string | null | undefined
  actorUserId: string
  targetRole: string | null | undefined
  targetUserId: string
}) => {
  if (actorUserId === targetUserId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "不能对当前登录管理员执行该操作。" })
  }

  if (actorRole === PLATFORM_ROLE_SUPPORT && (targetRole === PLATFORM_ROLE_ADMIN || targetRole === PLATFORM_ROLE_SUPER_ADMIN)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "support 不可操作 admin 或 super_admin。" })
  }

  if (targetRole === PLATFORM_ROLE_SUPER_ADMIN && actorRole !== PLATFORM_ROLE_SUPER_ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要超级管理员权限。" })
  }
}

export const adminUserRouter = createTRPCRouter({
  ban: adminProcedure.input(z.object({ banReason: z.string().min(1), userId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const [target] = await ctx.db.select({ id: user.id, role: user.role }).from(user).where(eq(user.id, input.userId)).limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在。" })
    }

    assertCanManageTarget({ actorRole: ctx.session.user.role, actorUserId: ctx.session.user.id, targetRole: target.role, targetUserId: target.id })

    const headerList = await headers()
    await auth.api.banUser({ body: { banReason: input.banReason, userId: input.userId }, headers: headerList })
    await auth.api.revokeUserSessions({ body: { userId: input.userId }, headers: headerList })

    return { banned: true }
  }),

  create: adminProcedure
    .input(z.object({ email: z.string().email(), name: z.string().min(1), password: z.string().min(8), role: platformRoleSchema.default(PLATFORM_ROLE_USER) }))
    .mutation(async ({ input }) => {
      const headerList = await headers()
      return await auth.api.createUser({
        body: { email: input.email, name: input.name, password: input.password, role: input.role },
        headers: headerList
      })
    }),

  get: adminProcedure.input(z.object({ userId: z.string().min(1) })).query(async ({ ctx, input }) => {
    const [target] = await ctx.db
      .select({
        banReason: user.banReason,
        banned: user.banned,
        createdAt: user.createdAt,
        email: user.email,
        emailVerified: user.emailVerified,
        id: user.id,
        image: user.image,
        name: user.name,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        updatedAt: user.updatedAt
      })
      .from(user)
      .where(eq(user.id, input.userId))
      .limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在。" })
    }

    const organizations = await ctx.db
      .select({
        id: organization.id,
        name: organization.name,
        role: member.role,
        slug: organization.slug
      })
      .from(member)
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .where(eq(member.userId, input.userId))
      .orderBy(desc(member.createdAt))

    const apiKeys = await ctx.db
      .select({
        createdAt: apikey.createdAt,
        enabled: apikey.enabled,
        id: apikey.id,
        name: apikey.name,
        prefix: apikey.prefix,
        start: apikey.start
      })
      .from(apikey)
      .where(eq(apikey.referenceId, input.userId))
      .orderBy(desc(apikey.createdAt))

    return {
      ...target,
      apiKeys,
      organizations,
      role: target.role ?? PLATFORM_ROLE_USER,
      status: target.banned ? "banned" : "active"
    }
  }),

  impersonate: adminProcedure.input(z.object({ userId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const [target] = await ctx.db.select({ id: user.id, role: user.role }).from(user).where(eq(user.id, input.userId)).limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在。" })
    }

    if (PLATFORM_ADMIN_ROLES.some((role) => role === target.role) && ctx.session.user.role !== PLATFORM_ROLE_SUPER_ADMIN) {
      throw new TRPCError({ code: "FORBIDDEN", message: "默认禁止模拟登录 admin 或 super_admin。" })
    }

    const headerList = await headers()
    return await auth.api.impersonateUser({ body: { userId: input.userId }, headers: headerList })
  }),

  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
        role: roleFilterSchema.default("all"),
        search: z.string().default(""),
        status: userStatusSchema.default("all")
      })
    )
    .query(async ({ ctx, input }) => {
      const trimmedSearch = input.search.trim()
      const searchValue = `%${trimmedSearch}%`
      const filters = and(
        trimmedSearch ? or(ilike(user.name, searchValue), ilike(user.email, searchValue)) : undefined,
        input.role === "all" ? undefined : eq(user.role, input.role),
        input.status === "all" ? undefined : eq(user.banned, input.status === "banned")
      )

      const [totalRow] = await ctx.db.select({ value: sql<number>`count(*)::int` }).from(user).where(filters)
      const rows = await ctx.db
        .select({
          banned: user.banned,
          createdAt: user.createdAt,
          email: user.email,
          emailVerified: user.emailVerified,
          id: user.id,
          image: user.image,
          name: user.name,
          role: user.role,
          sessionCount: sql<number>`(
            select count(*)::int
            from "system_session" active_session
            where active_session."user_id" = ${user.id}
              and active_session."expires_at" > now()
          )`
        })
        .from(user)
        .where(filters)
        .orderBy(desc(user.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize)

      const total = totalRow?.value ?? 0

      return {
        items: rows.map((row) => ({ ...row, role: row.role ?? PLATFORM_ROLE_USER, status: row.banned ? "banned" : "active" })),
        page: input.page,
        pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
        total
      }
    }),

  listSessions: adminProcedure.input(z.object({ userId: z.string().min(1) })).query(async ({ ctx, input }) => {
    return await ctx.db
      .select({
        activeOrganizationId: session.activeOrganizationId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        id: session.id,
        impersonatedBy: session.impersonatedBy,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent
      })
      .from(session)
      .where(eq(session.userId, input.userId))
      .orderBy(desc(session.createdAt))
  }),

  remove: adminProcedure.input(z.object({ confirmEmail: z.string().email(), userId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const [target] = await ctx.db.select({ email: user.email, id: user.id, role: user.role }).from(user).where(eq(user.id, input.userId)).limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在。" })
    }

    assertCanManageTarget({ actorRole: ctx.session.user.role, actorUserId: ctx.session.user.id, targetRole: target.role, targetUserId: target.id })

    if (target.email !== input.confirmEmail) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "请输入正确的用户邮箱。" })
    }

    const headerList = await headers()
    return await auth.api.removeUser({ body: { userId: input.userId }, headers: headerList })
  }),

  revokeAllSessions: adminProcedure.input(z.object({ userId: z.string().min(1) })).mutation(async ({ input }) => {
    const headerList = await headers()
    return await auth.api.revokeUserSessions({ body: { userId: input.userId }, headers: headerList })
  }),

  revokeSession: adminProcedure.input(z.object({ sessionId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const [targetSession] = await ctx.db.select({ token: session.token }).from(session).where(eq(session.id, input.sessionId)).limit(1)

    if (!targetSession) {
      throw new TRPCError({ code: "NOT_FOUND", message: "会话不存在。" })
    }

    const headerList = await headers()
    return await auth.api.revokeUserSession({ body: { sessionToken: targetSession.token }, headers: headerList })
  }),

  setPassword: adminProcedure.input(z.object({ newPassword: z.string().min(8), userId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const [target] = await ctx.db.select({ id: user.id, role: user.role }).from(user).where(eq(user.id, input.userId)).limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在。" })
    }

    assertCanManageTarget({ actorRole: ctx.session.user.role, actorUserId: ctx.session.user.id, targetRole: target.role, targetUserId: target.id })

    const headerList = await headers()
    return await auth.api.setUserPassword({ body: { newPassword: input.newPassword, userId: input.userId }, headers: headerList })
  }),

  setRole: adminProcedure.input(z.object({ role: platformRoleSchema, userId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const [target] = await ctx.db.select({ id: user.id, role: user.role }).from(user).where(eq(user.id, input.userId)).limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在。" })
    }

    assertCanManageTarget({ actorRole: ctx.session.user.role, actorUserId: ctx.session.user.id, targetRole: target.role, targetUserId: target.id })

    if (input.role === PLATFORM_ROLE_SUPER_ADMIN && ctx.session.user.role !== PLATFORM_ROLE_SUPER_ADMIN) {
      throw new TRPCError({ code: "FORBIDDEN", message: "只有 super_admin 可以设置 super_admin。" })
    }

    const headerList = await headers()
    return await auth.api.setRole({ body: { role: input.role, userId: input.userId }, headers: headerList })
  }),

  unban: adminProcedure.input(z.object({ userId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const [target] = await ctx.db.select({ id: user.id, role: user.role }).from(user).where(eq(user.id, input.userId)).limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在。" })
    }

    assertCanManageTarget({ actorRole: ctx.session.user.role, actorUserId: ctx.session.user.id, targetRole: target.role, targetUserId: target.id })

    const headerList = await headers()
    await auth.api.unbanUser({ body: { userId: input.userId }, headers: headerList })

    return { banned: false }
  }),

  update: adminProcedure.input(z.object({ name: z.string().min(1), userId: z.string().min(1) })).mutation(async ({ input }) => {
    const headerList = await headers()
    return await auth.api.adminUpdateUser({
      body: { data: { name: input.name }, userId: input.userId },
      headers: headerList
    })
  })
})
