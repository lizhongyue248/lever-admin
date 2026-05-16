import { TRPCError } from "@trpc/server"
import { and, desc, eq, ilike, or, sql } from "drizzle-orm"
import { z } from "zod"

import { PLATFORM_ROLE_SUPER_ADMIN } from "@/lib/const"
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc"
import { invitation, member, organization, organizationDepartment } from "@/server/db/schema"
import { recordRequestLogSafely } from "@/server/service/request-logs"

export const adminOrgRouter = createTRPCRouter({
  create: adminProcedure
    .input(
      z.object({
        logo: z.string().url().optional().or(z.literal("")),
        name: z.string().min(1),
        slug: z
          .string()
          .min(1)
          .regex(/^[a-z0-9-]+$/)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db.select({ id: organization.id }).from(organization).where(eq(organization.slug, input.slug)).limit(1)

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "组织 slug 已存在。" })
      }

      const id = crypto.randomUUID()
      await ctx.db.insert(organization).values({ id, logo: input.logo || null, name: input.name, slug: input.slug })

      return { id, slug: input.slug }
    }),

  delete: adminProcedure.input(z.object({ confirmSlug: z.string().min(1), organizationId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const [target] = await ctx.db.select({ slug: organization.slug }).from(organization).where(eq(organization.id, input.organizationId)).limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "组织不存在。" })
    }

    if (ctx.session.user.role !== PLATFORM_ROLE_SUPER_ADMIN) {
      throw new TRPCError({ code: "FORBIDDEN", message: "需要超级管理员权限。" })
    }

    if (target.slug !== input.confirmSlug) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "请输入正确的组织 slug。" })
    }

    await ctx.db.delete(organization).where(eq(organization.id, input.organizationId))

    return { deleted: true }
  }),

  getOverview: adminProcedure.query(async ({ ctx }) => {
    const [orgCount] = await ctx.db.select({ value: sql<number>`count(*)::int` }).from(organization)
    const [departmentCount] = await ctx.db.select({ value: sql<number>`count(*)::int` }).from(organizationDepartment)
    const [memberCount] = await ctx.db.select({ value: sql<number>`count(*)::int` }).from(member)
    const [pendingInvitationCount] = await ctx.db.select({ value: sql<number>`count(*)::int` }).from(invitation).where(eq(invitation.status, "pending"))
    const [riskySessionCount] = await ctx.db
      .select({
        value: sql<number>`coalesce((
        select sum(user_sessions."session_count")::int
        from (
          select count(active_session."id")::int as "session_count"
          from "system_session" active_session
          where active_session."expires_at" > now()
            and exists (
              select 1
              from "system_member" active_member
              where active_member."user_id" = active_session."user_id"
            )
          group by active_session."user_id"
          having count(active_session."id") > 5
        ) user_sessions
      ), 0)::int`
      })
      .from(organization)
      .limit(1)

    return {
      departmentCount: departmentCount?.value ?? 0,
      memberCount: memberCount?.value ?? 0,
      organizationCount: orgCount?.value ?? 0,
      pendingInvitationCount: pendingInvitationCount?.value ?? 0,
      riskySessionCount: riskySessionCount?.value ?? 0
    }
  }),

  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(12),
        search: z.string().default(""),
        status: z.enum(["all", "active", "disabled"]).default("all")
      })
    )
    .query(async ({ ctx, input }) => {
      const search = `%${input.search.trim()}%`
      const filters = and(
        input.search.trim() ? or(ilike(organization.name, search), ilike(organization.slug, search)) : undefined,
        input.status === "all" ? undefined : eq(organization.status, input.status)
      )
      const [totalRow] = await ctx.db.select({ value: sql<number>`count(*)::int` }).from(organization).where(filters)
      const rows = await ctx.db
        .select({
          activeSessionCount: sql<number>`(
            select count(distinct active_session."id")::int
            from "system_session" active_session
            inner join "system_member" active_member on active_member."user_id" = active_session."user_id"
            where active_member."organization_id" = ${organization.id}
              and active_session."expires_at" > now()
          )`,
          createdAt: organization.createdAt,
          departmentCount: sql<number>`(
            select count(*)::int
            from "system_organization_department" department
            where department."organization_id" = ${organization.id}
          )`,
          id: organization.id,
          logo: organization.logo,
          memberCount: sql<number>`count(distinct ${member.id})::int`,
          name: organization.name,
          pendingInvitationCount: sql<number>`(
            select count(*)::int
            from "system_invitation" pending_invitation
            where pending_invitation."organization_id" = ${organization.id}
              and pending_invitation."status" = 'pending'
          )`,
          riskCount: sql<number>`(
            select count(distinct risky_users."user_id")::int
            from (
              select risk_member."user_id"
              from "system_member" risk_member
              inner join "system_request_log" risk_log
                on risk_log."user_id" = risk_member."user_id"
               and risk_log."organization_id" = ${organization.id}
               and risk_log."risk_level" = 'high'
               and risk_log."created_at" >= now() - interval '30 days'
              where risk_member."organization_id" = ${organization.id}
              union
              select active_member."user_id"
              from "system_member" active_member
              inner join "system_session" active_session on active_session."user_id" = active_member."user_id"
              where active_member."organization_id" = ${organization.id}
                and active_session."expires_at" > now()
              group by active_member."user_id"
              having count(active_session."id") > 5
            ) risky_users
          )`,
          slug: organization.slug,
          status: organization.status
        })
        .from(organization)
        .leftJoin(member, eq(member.organizationId, organization.id))
        .where(filters)
        .groupBy(organization.id)
        .orderBy(desc(organization.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize)
      const total = totalRow?.value ?? 0

      return {
        items: rows,
        page: input.page,
        pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
        total
      }
    }),

  updateStatus: adminProcedure.input(z.object({ organizationId: z.string().min(1), status: z.enum(["active", "disabled"]) })).mutation(async ({ ctx, input }) => {
    const [target] = await ctx.db
      .select({ id: organization.id, name: organization.name, status: organization.status })
      .from(organization)
      .where(eq(organization.id, input.organizationId))
      .limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "组织不存在。" })
    }

    const [updated] = await ctx.db
      .update(organization)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(organization.id, target.id))
      .returning({ id: organization.id, status: organization.status })

    if (!updated) {
      throw new TRPCError({ code: "NOT_FOUND", message: "组织不存在。" })
    }

    recordRequestLogSafely({
      metadata: {
        newStatus: updated.status,
        previousStatus: target.status
      },
      method: "PATCH",
      organizationId: updated.id,
      organizationName: target.name,
      path: "/api/trpc/adminOrg.updateStatus",
      routeName: "adminOrg.updateStatus",
      source: "trpc",
      statusCode: 200,
      success: true,
      user: {
        email: ctx.session.user.email,
        id: ctx.session.user.id,
        name: ctx.session.user.name,
        role: ctx.session.user.role
      }
    })

    return { organizationId: updated.id, status: updated.status }
  })
})
