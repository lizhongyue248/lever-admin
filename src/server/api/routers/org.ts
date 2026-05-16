import { TRPCError } from "@trpc/server"
import { and, asc, count, desc, eq, gt, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm"
import { z } from "zod"

import { env } from "@/env"
import { ORGANIZATION_ADMIN_ROLES, ORGANIZATION_ROLES, PLATFORM_ADMIN_ROLES, PLATFORM_ROLE_SUPER_ADMIN } from "@/lib/const"
import { getActiveSessionCountsByUser, getHighRiskUserIds, getSessionRisk } from "@/server/api/lib/session-risk"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { invitation, member, organization, organizationDepartment, organizationDepartmentMember, session, user } from "@/server/db/schema"
import { renderOrganizationInvitationEmail, sendEmail } from "@/server/service/email"

const defaultAppBaseUrl = "http://localhost:4000"
const roleInput = z.enum(ORGANIZATION_ROLES)
const slugInput = z.object({ slug: z.string().min(1) })
const pageInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10)
})

type OrgContext = {
  db: typeof import("@/server/db").db
  session: {
    user: {
      id: string
      role?: string | null
    }
  }
}

const isOrgAdminRole = (role: string | null | undefined) => ORGANIZATION_ADMIN_ROLES.some((item) => item === role)
const isPlatformAdminRole = (role: string | null | undefined) => PLATFORM_ADMIN_ROLES.some((item) => item === role)

const assertOrgActive = (org: Pick<typeof organization.$inferSelect, "status">) => {
  if (org.status === "disabled") {
    throw new TRPCError({ code: "FORBIDDEN", message: "该组织已停用。" })
  }
}

const countRows = async (query: Promise<{ value: number }[]>) => {
  const [row] = await query

  return row?.value ?? 0
}

const requireOrgAccess = async (ctx: OrgContext, slug: string) => {
  const [org] = await ctx.db.select().from(organization).where(eq(organization.slug, slug)).limit(1)

  if (!org) {
    throw new TRPCError({ code: "NOT_FOUND", message: "组织不存在。" })
  }

  if (isPlatformAdminRole(ctx.session.user.role)) {
    return { canManage: true, isPlatformAdmin: true, org, role: "platform_admin" as const }
  }

  const [membership] = await ctx.db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, org.id), eq(member.userId, ctx.session.user.id)))
    .limit(1)

  if (!membership) {
    throw new TRPCError({ code: "FORBIDDEN", message: "无权访问该组织。" })
  }

  assertOrgActive(org)

  return { canManage: isOrgAdminRole(membership.role), isPlatformAdmin: false, org, role: membership.role }
}

const requireOrgAdmin = async (ctx: OrgContext, slug: string) => {
  const access = await requireOrgAccess(ctx, slug)

  if (!access.canManage) {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要组织管理员权限。" })
  }

  return access
}

const requirePlatformSuperAdmin = (ctx: OrgContext) => {
  if (ctx.session.user.role !== PLATFORM_ROLE_SUPER_ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要平台超级管理员权限。" })
  }
}

const getBrowserLabel = (userAgent: string | null) => {
  const value = userAgent?.toLowerCase() ?? ""

  if (value.includes("edg/")) {
    return "Edge"
  }

  if (value.includes("firefox/")) {
    return "Firefox"
  }

  if (value.includes("chrome/") || value.includes("chromium/")) {
    return "Chrome"
  }

  if (value.includes("safari/")) {
    return "Safari"
  }

  return "浏览器"
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
    return "macOS"
  }

  return "未知设备"
}

const getEffectiveInvitationStatus = (status: string, expiresAt: Date | null) => {
  if (status === "pending" && expiresAt && expiresAt < new Date()) {
    return "expired"
  }

  return status
}

const getMonthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1)

const formatGrowthMonth = (date: Date) => `${date.getMonth() + 1}月`

const buildMemberGrowth = (members: { createdAt: Date }[], now = new Date()) => {
  const currentMonthStart = getMonthStart(now)

  return Array.from({ length: 6 }, (_, index) => {
    const monthStart = addMonths(currentMonthStart, index - 5)
    const nextMonthStart = addMonths(monthStart, 1)

    return {
      label: formatGrowthMonth(monthStart),
      value: members.filter((item) => item.createdAt < nextMonthStart).length
    }
  })
}

const getDepartmentMemberUserIds = async (ctx: OrgContext, orgId: string, departmentId: string | undefined) => {
  if (!departmentId || departmentId === orgId) {
    return ctx.db.select({ userId: member.userId }).from(member).where(eq(member.organizationId, orgId))
  }

  return ctx.db
    .select({ userId: member.userId })
    .from(organizationDepartmentMember)
    .innerJoin(member, eq(organizationDepartmentMember.memberId, member.id))
    .where(and(eq(organizationDepartmentMember.organizationId, orgId), eq(organizationDepartmentMember.departmentId, departmentId)))
}

const buildOrgRiskContext = async (ctx: OrgContext, organizationId: string) => {
  const memberRows = await ctx.db.select({ memberId: member.id, userId: member.userId }).from(member).where(eq(member.organizationId, organizationId))
  const userIds = Array.from(new Set(memberRows.map((row) => row.userId)))
  const highRiskUserIds = await getHighRiskUserIds({ database: ctx.db, organizationId, userIds })
  const activeSessionCounts = await getActiveSessionCountsByUser({ database: ctx.db, userIds })
  const riskyUserIds = new Set(userIds.filter((userId) => highRiskUserIds.has(userId) || (activeSessionCounts.get(userId) ?? 0) > 5))

  return { activeSessionCounts, highRiskUserIds, memberRows, riskyUserIds }
}

const listDepartments = async (ctx: OrgContext, slug: string) => {
  const { org } = await requireOrgAccess(ctx, slug)
  const riskContext = await buildOrgRiskContext(ctx, org.id)
  const departmentRows = await ctx.db
    .select({
      depth: organizationDepartment.depth,
      id: organizationDepartment.id,
      name: organizationDepartment.name,
      parentId: organizationDepartment.parentDepartmentId,
      sortOrder: organizationDepartment.sortOrder,
      status: organizationDepartment.status
    })
    .from(organizationDepartment)
    .where(eq(organizationDepartment.organizationId, org.id))
    .orderBy(asc(organizationDepartment.depth), asc(organizationDepartment.sortOrder), asc(organizationDepartment.name))

  const rootMemberCount = await countRows(ctx.db.select({ value: count() }).from(member).where(eq(member.organizationId, org.id)))
  const rootInvitationCount = await countRows(
    ctx.db
      .select({ value: count() })
      .from(invitation)
      .where(and(eq(invitation.organizationId, org.id), eq(invitation.status, "pending"), isNull(invitation.departmentId)))
  )
  const departmentStats = await Promise.all(
    departmentRows.map(async (department) => {
      const [memberCountRow] = await ctx.db.select({ value: count() }).from(organizationDepartmentMember).where(eq(organizationDepartmentMember.departmentId, department.id))
      const [invitationCountRow] = await ctx.db
        .select({ value: count() })
        .from(invitation)
        .where(and(eq(invitation.departmentId, department.id), eq(invitation.status, "pending")))

      return {
        departmentId: department.id,
        invitationCount: invitationCountRow?.value ?? 0,
        memberCount: memberCountRow?.value ?? 0
      }
    })
  )
  const departmentMemberRows = await ctx.db
    .select({
      departmentId: organizationDepartmentMember.departmentId,
      userId: member.userId
    })
    .from(organizationDepartmentMember)
    .innerJoin(member, eq(organizationDepartmentMember.memberId, member.id))
    .where(eq(organizationDepartmentMember.organizationId, org.id))
  const departmentRiskCountById = new Map<string, number>()

  for (const row of departmentMemberRows) {
    if (!riskContext.riskyUserIds.has(row.userId)) {
      continue
    }

    departmentRiskCountById.set(row.departmentId, (departmentRiskCountById.get(row.departmentId) ?? 0) + 1)
  }

  const statsByDepartment = new Map(departmentStats.map((item) => [item.departmentId, item]))
  const nodes = [
    {
      depth: 0,
      id: org.id,
      invitationCount: rootInvitationCount,
      memberCount: rootMemberCount,
      name: org.name,
      parentId: null,
      riskCount: riskContext.riskyUserIds.size,
      slug: org.slug,
      status: "active",
      type: "organization" as const
    },
    ...departmentRows.map((department) => {
      const stats = statsByDepartment.get(department.id)

      return {
        depth: department.depth + 1,
        id: department.id,
        invitationCount: stats?.invitationCount ?? 0,
        memberCount: stats?.memberCount ?? 0,
        name: department.name,
        parentId: department.parentId ?? org.id,
        riskCount: departmentRiskCountById.get(department.id) ?? 0,
        slug: org.slug,
        status: department.status,
        type: "department" as const
      }
    })
  ]

  return {
    nodes,
    selectedNodeId: nodes[0]?.id ?? org.id
  }
}

const listDepartmentMembers = async (
  ctx: OrgContext,
  input: z.infer<typeof slugInput> &
    z.infer<typeof pageInput> & { departmentId?: string; nodeId?: string; role?: z.infer<typeof roleInput>; search: string; securityStatus: "all" | "normal" | "risk" }
) => {
  const { org } = await requireOrgAccess(ctx, input.slug)
  const riskContext = await buildOrgRiskContext(ctx, org.id)
  const selectedId = input.departmentId ?? input.nodeId
  const offset = (input.page - 1) * input.pageSize
  const search = `%${input.search.trim()}%`
  const scopedMemberIds =
    selectedId && selectedId !== org.id
      ? ctx.db
          .select({ memberId: organizationDepartmentMember.memberId })
          .from(organizationDepartmentMember)
          .where(and(eq(organizationDepartmentMember.organizationId, org.id), eq(organizationDepartmentMember.departmentId, selectedId)))
      : undefined

  const where = and(
    eq(member.organizationId, org.id),
    scopedMemberIds ? inArray(member.id, scopedMemberIds) : undefined,
    input.role ? eq(member.role, input.role) : undefined,
    input.search.trim() ? or(ilike(user.name, search), ilike(user.email, search)) : undefined
  )
  const rows = await ctx.db
    .select({
      departmentNames: sql<string | null>`string_agg(distinct ${organizationDepartment.name}, ', ')`,
      email: user.email,
      joinedAt: member.createdAt,
      lastLoginAt: sql<Date | null>`max(${session.updatedAt})`,
      memberId: member.id,
      name: user.name,
      role: member.role,
      userId: user.id
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .leftJoin(session, eq(session.userId, user.id))
    .leftJoin(organizationDepartmentMember, eq(organizationDepartmentMember.memberId, member.id))
    .leftJoin(organizationDepartment, eq(organizationDepartmentMember.departmentId, organizationDepartment.id))
    .where(where)
    .groupBy(member.id, user.id)
    .orderBy(desc(member.createdAt))
  const filteredRows = rows
    .map((row) => ({
      ...row,
      departmentNames: row.departmentNames ?? "未分配",
      securityStatus: riskContext.riskyUserIds.has(row.userId) ? ("risk" as const) : ("normal" as const)
    }))
    .filter((row) => input.securityStatus === "all" || row.securityStatus === input.securityStatus)
  const total = filteredRows.length

  return {
    items: filteredRows.slice(offset, offset + input.pageSize),
    page: input.page,
    pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
    total
  }
}

const departmentMemberListInput = slugInput
  .extend({
    departmentId: z.string().min(1).optional(),
    nodeId: z.string().min(1).optional(),
    role: roleInput.optional(),
    search: z.string().default(""),
    securityStatus: z.enum(["all", "normal", "risk"]).default("all")
  })
  .merge(pageInput)

export const orgRouter = createTRPCRouter({
  getBySlug: protectedProcedure.input(slugInput).query(async ({ ctx, input }) => {
    const access = await requireOrgAccess(ctx, input.slug)
    const departmentCount = await countRows(ctx.db.select({ value: count() }).from(organizationDepartment).where(eq(organizationDepartment.organizationId, access.org.id)))

    return {
      canManage: access.canManage,
      departmentCount,
      isPlatformAdmin: access.isPlatformAdmin,
      organization: access.org,
      role: access.role
    }
  }),

  management: createTRPCRouter({
    getOverview: protectedProcedure.input(slugInput).query(async ({ ctx, input }) => {
      const { org } = await requireOrgAccess(ctx, input.slug)
      const memberRows = await ctx.db.select({ createdAt: member.createdAt, userId: member.userId }).from(member).where(eq(member.organizationId, org.id))
      const memberUserIds = Array.from(new Set(memberRows.map((item) => item.userId)))
      const highRiskUserIds = await getHighRiskUserIds({ database: ctx.db, organizationId: org.id, userIds: memberUserIds })
      const activeSessionCounts = await getActiveSessionCountsByUser({ database: ctx.db, userIds: memberUserIds })
      const pendingInvitationCount = await countRows(
        ctx.db
          .select({ value: sql<number>`count(*)::int` })
          .from(invitation)
          .where(and(eq(invitation.organizationId, org.id), eq(invitation.status, "pending")))
      )
      const activeSessionCount = Array.from(activeSessionCounts.values()).reduce((sum, value) => sum + value, 0)
      const departmentCount = await countRows(ctx.db.select({ value: count() }).from(organizationDepartment).where(eq(organizationDepartment.organizationId, org.id)))
      const riskyUserIds = new Set(memberUserIds.filter((userId) => highRiskUserIds.has(userId) || (activeSessionCounts.get(userId) ?? 0) > 5))
      const riskySessionCount = Array.from(riskyUserIds).reduce((sum, userId) => {
        const activeCount = activeSessionCounts.get(userId) ?? 0

        return sum + activeCount
      }, 0)

      return {
        events: [
          { id: "invitation-review", label: `${pendingInvitationCount} 个邀请等待处理`, tone: "warning" as const },
          { id: "department-review", label: `${departmentCount} 个部门纳入组织架构`, tone: "default" as const },
          { id: "session-review", label: `${activeSessionCount} 个活跃会话可复核`, tone: "default" as const },
          { id: "risk-review", label: `${riskyUserIds.size} 个成员存在登录风险`, tone: riskyUserIds.size > 0 ? ("warning" as const) : ("default" as const) }
        ],
        growth: buildMemberGrowth(memberRows),
        organization: org,
        stats: {
          activeSessionCount,
          departmentCount,
          memberCount: memberRows.length,
          pendingInvitationCount,
          riskySessionCount
        }
      }
    })
  }),

  department: createTRPCRouter({
    list: protectedProcedure.input(slugInput).query(async ({ ctx, input }) => listDepartments(ctx, input.slug)),

    create: protectedProcedure
      .input(
        slugInput.extend({
          description: z.string().max(500).optional().or(z.literal("")),
          managerUserId: z.string().min(1).optional().or(z.literal("")),
          name: z.string().min(1, "请输入部门名称。").max(80, "部门名称不能超过 80 个字符。"),
          parentDepartmentId: z.string().min(1).optional()
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { org } = await requireOrgAdmin(ctx, input.slug)
        assertOrgActive(org)
        const trimmedName = input.name.trim()
        const parentId = input.parentDepartmentId && input.parentDepartmentId !== org.id ? input.parentDepartmentId : null
        const [parentDepartment] = parentId
          ? await ctx.db
              .select()
              .from(organizationDepartment)
              .where(and(eq(organizationDepartment.id, parentId), eq(organizationDepartment.organizationId, org.id)))
              .limit(1)
          : []

        if (parentId && !parentDepartment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "上级部门不存在。" })
        }

        const [duplicate] = await ctx.db
          .select({ id: organizationDepartment.id })
          .from(organizationDepartment)
          .where(
            and(
              eq(organizationDepartment.organizationId, org.id),
              parentId ? eq(organizationDepartment.parentDepartmentId, parentId) : isNull(organizationDepartment.parentDepartmentId),
              sql`lower(${organizationDepartment.name}) = ${trimmedName.toLowerCase()}`
            )
          )
          .limit(1)

        if (duplicate) {
          throw new TRPCError({ code: "CONFLICT", message: "同级部门名称已存在。" })
        }

        if (input.managerUserId) {
          const [managerMembership] = await ctx.db
            .select({ id: member.id })
            .from(member)
            .where(and(eq(member.organizationId, org.id), eq(member.userId, input.managerUserId)))
            .limit(1)

          if (!managerMembership) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "负责人必须是当前组织成员。" })
          }
        }

        const [sortRow] = await ctx.db
          .select({ value: sql<number>`coalesce(max(${organizationDepartment.sortOrder}), -1)::int` })
          .from(organizationDepartment)
          .where(
            and(
              eq(organizationDepartment.organizationId, org.id),
              parentId ? eq(organizationDepartment.parentDepartmentId, parentId) : isNull(organizationDepartment.parentDepartmentId)
            )
          )
        const id = crypto.randomUUID()
        const depth = parentDepartment ? parentDepartment.depth + 1 : 0
        const path = parentDepartment ? `${parentDepartment.path}/${id}` : id
        const [department] = await ctx.db
          .insert(organizationDepartment)
          .values({
            depth,
            description: input.description || null,
            id,
            managerUserId: input.managerUserId || null,
            name: trimmedName,
            organizationId: org.id,
            parentDepartmentId: parentId,
            path,
            sortOrder: (sortRow?.value ?? -1) + 1,
            status: "active"
          })
          .returning()

        return { department }
      }),

    rename: protectedProcedure
      .input(
        slugInput.extend({
          departmentId: z.string().min(1),
          name: z.string().min(1, "请输入部门名称。").max(80, "部门名称不能超过 80 个字符。")
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { org } = await requireOrgAdmin(ctx, input.slug)
        const trimmedName = input.name.trim()
        const [target] = await ctx.db
          .select()
          .from(organizationDepartment)
          .where(and(eq(organizationDepartment.id, input.departmentId), eq(organizationDepartment.organizationId, org.id)))
          .limit(1)

        if (!target) {
          throw new TRPCError({ code: "NOT_FOUND", message: "部门不存在。" })
        }

        const [duplicate] = await ctx.db
          .select({ id: organizationDepartment.id })
          .from(organizationDepartment)
          .where(
            and(
              eq(organizationDepartment.organizationId, org.id),
              target.parentDepartmentId ? eq(organizationDepartment.parentDepartmentId, target.parentDepartmentId) : isNull(organizationDepartment.parentDepartmentId),
              ne(organizationDepartment.id, target.id),
              sql`lower(${organizationDepartment.name}) = ${trimmedName.toLowerCase()}`
            )
          )
          .limit(1)

        if (duplicate) {
          throw new TRPCError({ code: "CONFLICT", message: "同级部门名称已存在。" })
        }

        const [department] = await ctx.db.update(organizationDepartment).set({ name: trimmedName }).where(eq(organizationDepartment.id, target.id)).returning()

        return { department }
      }),

    delete: protectedProcedure.input(slugInput.extend({ departmentId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const { org } = await requireOrgAdmin(ctx, input.slug)
      const [target] = await ctx.db
        .select({ id: organizationDepartment.id })
        .from(organizationDepartment)
        .where(and(eq(organizationDepartment.id, input.departmentId), eq(organizationDepartment.organizationId, org.id)))
        .limit(1)

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "部门不存在。" })
      }

      const childCount = await countRows(ctx.db.select({ value: count() }).from(organizationDepartment).where(eq(organizationDepartment.parentDepartmentId, target.id)))
      const memberCount = await countRows(ctx.db.select({ value: count() }).from(organizationDepartmentMember).where(eq(organizationDepartmentMember.departmentId, target.id)))

      if (childCount > 0 || memberCount > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "该部门存在子部门或成员归属，请先处理后再删除。" })
      }

      await ctx.db.delete(organizationDepartment).where(eq(organizationDepartment.id, target.id))

      return { deleted: true }
    }),

    member: createTRPCRouter({
      assign: protectedProcedure.input(slugInput.extend({ departmentId: z.string().min(1), memberId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
        const { org } = await requireOrgAdmin(ctx, input.slug)
        const [targetMember] = await ctx.db
          .select({ id: member.id })
          .from(member)
          .where(and(eq(member.id, input.memberId), eq(member.organizationId, org.id)))
          .limit(1)

        if (!targetMember) {
          throw new TRPCError({ code: "NOT_FOUND", message: "成员不存在。" })
        }

        const [targetDepartment] = await ctx.db
          .select({ id: organizationDepartment.id })
          .from(organizationDepartment)
          .where(and(eq(organizationDepartment.id, input.departmentId), eq(organizationDepartment.organizationId, org.id)))
          .limit(1)

        if (!targetDepartment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "目标部门不存在。" })
        }

        const existingCount = await countRows(
          ctx.db
            .select({ value: count() })
            .from(organizationDepartmentMember)
            .where(and(eq(organizationDepartmentMember.organizationId, org.id), eq(organizationDepartmentMember.memberId, targetMember.id)))
        )

        if (existingCount > 0) {
          throw new TRPCError({ code: "CONFLICT", message: "该成员已分配部门。" })
        }

        const [departmentMember] = await ctx.db
          .insert(organizationDepartmentMember)
          .values({
            departmentId: targetDepartment.id,
            id: crypto.randomUUID(),
            memberId: targetMember.id,
            organizationId: org.id
          })
          .returning()

        return { departmentMember }
      }),

      list: protectedProcedure.input(departmentMemberListInput).query(async ({ ctx, input }) => listDepartmentMembers(ctx, input))
    })
  }),

  member: createTRPCRouter({
    addExistingOrCreate: protectedProcedure
      .input(
        slugInput.extend({
          departmentId: z.string().min(1).optional().or(z.literal("")),
          email: z.string().email("请输入正确的邮箱。"),
          name: z.string().max(80, "姓名不能超过 80 个字符。").optional().or(z.literal("")),
          role: roleInput.default("member")
        })
      )
      .mutation(async ({ ctx, input }) => {
        requirePlatformSuperAdmin(ctx)
        const { org } = await requireOrgAccess(ctx, input.slug)
        assertOrgActive(org)
        const normalizedEmail = input.email.trim().toLowerCase()
        const trimmedName = input.name?.trim() ?? ""
        const targetDepartmentId = input.departmentId && input.departmentId !== org.id ? input.departmentId : null

        if (targetDepartmentId) {
          const [targetDepartment] = await ctx.db
            .select({ id: organizationDepartment.id })
            .from(organizationDepartment)
            .where(and(eq(organizationDepartment.id, targetDepartmentId), eq(organizationDepartment.organizationId, org.id)))
            .limit(1)

          if (!targetDepartment) {
            throw new TRPCError({ code: "NOT_FOUND", message: "目标部门不存在。" })
          }
        }

        let [targetUser] = await ctx.db.select().from(user).where(eq(user.email, normalizedEmail)).limit(1)
        let createdUser = false

        if (!targetUser) {
          if (!trimmedName) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "创建新账号时请输入姓名。" })
          }

          const [created] = await ctx.db
            .insert(user)
            .values({
              email: normalizedEmail,
              emailVerified: false,
              id: crypto.randomUUID(),
              name: trimmedName,
              role: "user"
            })
            .returning()

          targetUser = created
          createdUser = true
        }

        if (!targetUser) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "创建用户失败。" })
        }

        const [existingMember] = await ctx.db
          .select({ id: member.id })
          .from(member)
          .where(and(eq(member.organizationId, org.id), eq(member.userId, targetUser.id)))
          .limit(1)

        if (existingMember) {
          throw new TRPCError({ code: "CONFLICT", message: "该用户已经在当前组织中。" })
        }

        const [createdMember] = await ctx.db
          .insert(member)
          .values({
            id: crypto.randomUUID(),
            organizationId: org.id,
            role: input.role,
            userId: targetUser.id
          })
          .returning()

        if (!createdMember) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "创建组织成员失败。" })
        }

        if (targetDepartmentId) {
          await ctx.db.insert(organizationDepartmentMember).values({
            departmentId: targetDepartmentId,
            id: crypto.randomUUID(),
            memberId: createdMember.id,
            organizationId: org.id
          })
        }

        return { createdUser, member: createdMember, user: targetUser }
      }),

    remove: protectedProcedure.input(slugInput.extend({ memberId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const { org } = await requireOrgAdmin(ctx, input.slug)
      const [targetMember] = await ctx.db
        .select({ id: member.id, role: member.role })
        .from(member)
        .where(and(eq(member.id, input.memberId), eq(member.organizationId, org.id)))
        .limit(1)

      if (!targetMember) {
        throw new TRPCError({ code: "NOT_FOUND", message: "成员不存在。" })
      }

      if (targetMember.role === "owner") {
        const ownerCount = await countRows(
          ctx.db
            .select({ value: count() })
            .from(member)
            .where(and(eq(member.organizationId, org.id), eq(member.role, "owner")))
        )

        if (ownerCount <= 1) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "不能移除最后一个 owner。" })
        }
      }

      await ctx.db
        .delete(organizationDepartmentMember)
        .where(and(eq(organizationDepartmentMember.organizationId, org.id), eq(organizationDepartmentMember.memberId, targetMember.id)))
      await ctx.db.delete(member).where(eq(member.id, targetMember.id))

      return { removed: true }
    })
  }),

  tree: createTRPCRouter({
    list: protectedProcedure.input(slugInput).query(async ({ ctx, input }) => listDepartments(ctx, input.slug))
  }),

  node: createTRPCRouter({
    member: createTRPCRouter({
      list: protectedProcedure.input(departmentMemberListInput).query(async ({ ctx, input }) => listDepartmentMembers(ctx, input))
    })
  }),

  invitation: createTRPCRouter({
    list: protectedProcedure
      .input(
        slugInput
          .extend({
            departmentId: z.string().min(1).optional(),
            nodeId: z.string().min(1).optional(),
            search: z.string().default(""),
            status: z.enum(["all", "pending", "accepted", "rejected", "canceled", "expired"]).default("all")
          })
          .merge(pageInput)
      )
      .query(async ({ ctx, input }) => {
        const { org } = await requireOrgAccess(ctx, input.slug)
        const selectedDepartmentId = input.departmentId ?? input.nodeId
        const search = `%${input.search.trim()}%`
        const statusFilter =
          input.status === "expired"
            ? and(eq(invitation.status, "pending"), sql`${invitation.expiresAt} < now()`)
            : input.status === "all"
              ? undefined
              : eq(invitation.status, input.status)

        const rows = await ctx.db
          .select({
            createdAt: invitation.createdAt,
            departmentId: invitation.departmentId,
            departmentName: organizationDepartment.name,
            email: invitation.email,
            expiresAt: invitation.expiresAt,
            id: invitation.id,
            inviterEmail: user.email,
            inviterName: user.name,
            role: invitation.role,
            status: invitation.status
          })
          .from(invitation)
          .innerJoin(user, eq(invitation.inviterId, user.id))
          .leftJoin(organizationDepartment, eq(invitation.departmentId, organizationDepartment.id))
          .where(
            and(
              eq(invitation.organizationId, org.id),
              selectedDepartmentId && selectedDepartmentId !== org.id ? eq(invitation.departmentId, selectedDepartmentId) : undefined,
              statusFilter,
              input.search.trim() ? or(ilike(invitation.email, search), ilike(user.name, search), ilike(user.email, search), ilike(organizationDepartment.name, search)) : undefined
            )
          )
          .orderBy(desc(invitation.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize)
        const total = await countRows(
          ctx.db
            .select({ value: sql<number>`count(*)::int` })
            .from(invitation)
            .innerJoin(user, eq(invitation.inviterId, user.id))
            .leftJoin(organizationDepartment, eq(invitation.departmentId, organizationDepartment.id))
            .where(
              and(
                eq(invitation.organizationId, org.id),
                selectedDepartmentId && selectedDepartmentId !== org.id ? eq(invitation.departmentId, selectedDepartmentId) : undefined,
                statusFilter,
                input.search.trim()
                  ? or(ilike(invitation.email, search), ilike(user.name, search), ilike(user.email, search), ilike(organizationDepartment.name, search))
                  : undefined
              )
            )
        )

        return {
          items: rows.map((row) => ({ ...row, status: getEffectiveInvitationStatus(row.status, row.expiresAt) })),
          page: input.page,
          pageCount: Math.max(1, Math.ceil(total / input.pageSize))
        }
      }),

    invite: protectedProcedure
      .input(slugInput.extend({ departmentId: z.string().min(1).optional(), email: z.string().email(), nodeId: z.string().min(1).optional(), role: roleInput }))
      .mutation(async ({ ctx, input }) => {
        const { org } = await requireOrgAdmin(ctx, input.slug)
        assertOrgActive(org)
        const departmentId = input.departmentId ?? input.nodeId
        const targetDepartmentId = departmentId && departmentId !== org.id ? departmentId : null
        let targetDepartment: { id: string; name: string } | null = null

        if (targetDepartmentId) {
          const [department] = await ctx.db
            .select({ id: organizationDepartment.id, name: organizationDepartment.name })
            .from(organizationDepartment)
            .where(and(eq(organizationDepartment.id, targetDepartmentId), eq(organizationDepartment.organizationId, org.id)))
            .limit(1)

          if (!department) {
            throw new TRPCError({ code: "NOT_FOUND", message: "目标部门不存在。" })
          }

          targetDepartment = department
        }

        const normalizedEmail = input.email.trim().toLowerCase()
        const id = crypto.randomUUID()
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48)

        const [inviter] = await ctx.db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, ctx.session.user.id)).limit(1)

        await ctx.db.transaction(async (tx) => {
          await tx
            .update(invitation)
            .set({ status: "canceled" })
            .where(and(eq(invitation.organizationId, org.id), eq(invitation.email, normalizedEmail), eq(invitation.status, "pending")))

          await tx.insert(invitation).values({
            departmentId: targetDepartmentId,
            email: normalizedEmail,
            expiresAt,
            id,
            inviterId: ctx.session.user.id,
            organizationId: org.id,
            role: input.role,
            status: "pending"
          })
        })

        const invitationUrl = new URL(`/invite/${id}`, env.BETTER_AUTH_URL ?? defaultAppBaseUrl).toString()
        const renderedEmail = renderOrganizationInvitationEmail({
          departmentName: targetDepartment?.name ?? null,
          email: normalizedEmail,
          expiresAt,
          inviterEmail: inviter?.email ?? "unknown-inviter@localhost",
          inviterName: inviter?.name ?? null,
          organizationName: org.name,
          role: input.role,
          url: invitationUrl
        })

        await sendEmail({
          ...renderedEmail,
          to: normalizedEmail
        })

        return { id, invited: true }
      })
  }),

  session: createTRPCRouter({
    list: protectedProcedure
      .input(
        slugInput
          .extend({
            departmentId: z.string().min(1).optional(),
            deviceType: z.enum(["all", "desktop", "mobile", "unknown"]).default("all"),
            nodeId: z.string().min(1).optional(),
            riskStatus: z.enum(["all", "normal", "risk"]).default("all"),
            search: z.string().default("")
          })
          .merge(pageInput)
      )
      .query(async ({ ctx, input }) => {
        const { org } = await requireOrgAccess(ctx, input.slug)
        const selectedDepartmentId = input.departmentId ?? input.nodeId
        const memberRows = await getDepartmentMemberUserIds(ctx, org.id, selectedDepartmentId)
        const memberUserIds = memberRows.map((item) => item.userId)
        const highRiskUserIds = await getHighRiskUserIds({ database: ctx.db, organizationId: org.id, userIds: memberUserIds })
        const activeSessionCounts = await getActiveSessionCountsByUser({ database: ctx.db, userIds: memberUserIds })

        if (memberUserIds.length === 0) {
          return { items: [], page: input.page, pageCount: 1, total: 0 }
        }

        const search = `%${input.search.trim()}%`
        const rows = await ctx.db
          .select({
            createdAt: session.createdAt,
            email: user.email,
            id: session.id,
            ipAddress: session.ipAddress,
            lastActiveAt: session.updatedAt,
            name: user.name,
            userAgent: session.userAgent,
            userId: user.id
          })
          .from(session)
          .innerJoin(user, eq(session.userId, user.id))
          .where(
            and(
              inArray(session.userId, memberUserIds),
              gt(session.expiresAt, new Date()),
              input.search.trim() ? or(ilike(user.name, search), ilike(user.email, search)) : undefined
            )
          )
          .orderBy(desc(session.updatedAt))
        const sessionRows = rows
          .map((row) => {
            const risk = getSessionRisk({
              activeSessionCountForUser: activeSessionCounts.get(row.userId) ?? 0,
              hasHighRiskRequest: highRiskUserIds.has(row.userId),
              sessionRow: {
                createdAt: row.createdAt,
                id: row.id,
                ipAddress: row.ipAddress,
                updatedAt: row.lastActiveAt,
                userAgent: row.userAgent,
                userId: row.userId
              }
            })

            return {
              ...row,
              browserLabel: getBrowserLabel(row.userAgent),
              deviceLabel: getDeviceLabel(row.userAgent),
              riskLevel: risk.level,
              riskReasons: risk.reasons,
              riskStatus: risk.level
            }
          })
          .filter((row) => input.riskStatus === "all" || row.riskStatus === input.riskStatus)
        const offset = (input.page - 1) * input.pageSize

        return {
          items: sessionRows.slice(offset, offset + input.pageSize),
          page: input.page,
          pageCount: Math.max(1, Math.ceil(sessionRows.length / input.pageSize)),
          total: sessionRows.length
        }
      }),

    revoke: protectedProcedure.input(slugInput.extend({ sessionId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const { org } = await requireOrgAdmin(ctx, input.slug)
      const [targetSession] = await ctx.db
        .select({ id: session.id, userId: session.userId })
        .from(session)
        .innerJoin(member, and(eq(member.userId, session.userId), eq(member.organizationId, org.id)))
        .where(eq(session.id, input.sessionId))
        .limit(1)

      if (!targetSession) {
        throw new TRPCError({ code: "NOT_FOUND", message: "会话不存在或已失效。" })
      }

      const deleted = await ctx.db
        .delete(session)
        .where(and(eq(session.id, targetSession.id), eq(session.userId, targetSession.userId)))
        .returning({ id: session.id })

      if (deleted.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "会话不存在或已失效。" })
      }

      return { revoked: true }
    })
  }),

  update: protectedProcedure
    .input(
      slugInput.extend({
        logo: z.string().url().optional().or(z.literal("")),
        name: z.string().min(1),
        targetSlug: z
          .string()
          .min(1)
          .regex(/^[a-z0-9-]+$/)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { org } = await requireOrgAdmin(ctx, input.slug)
      const [existingSlugOwner] = await ctx.db
        .select({ id: organization.id })
        .from(organization)
        .where(and(eq(organization.slug, input.targetSlug), ne(organization.id, org.id)))
        .limit(1)

      if (existingSlugOwner) {
        throw new TRPCError({ code: "CONFLICT", message: "组织 slug 已存在。" })
      }

      const [updated] = await ctx.db
        .update(organization)
        .set({
          logo: input.logo || null,
          name: input.name,
          slug: input.targetSlug
        })
        .where(eq(organization.id, org.id))
        .returning()

      return { organization: updated }
    }),

  delete: protectedProcedure.input(slugInput.extend({ confirmSlug: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const { org } = await requireOrgAdmin(ctx, input.slug)

    if (input.confirmSlug !== org.slug) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "请输入正确的组织 slug。" })
    }

    await ctx.db.delete(organization).where(eq(organization.id, org.id))

    return { deleted: true }
  })
})
