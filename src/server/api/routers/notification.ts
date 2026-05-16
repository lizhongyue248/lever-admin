import { TRPCError } from "@trpc/server"
import { and, asc, eq, gt, isNull, sql } from "drizzle-orm"
import { z } from "zod"

import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  FILTER_ALL,
  INVITATION_STATUS_PENDING,
  NOTIFICATION_MAX_PAGE_SIZE,
  NOTIFICATION_TYPE_FILTERS,
  NOTIFICATION_TYPE_INVITATION
} from "@/lib/const"
import { acceptInvitationForCurrentUser, getEffectiveInvitationStatus, getInvitationForCurrentUser, rejectInvitationForCurrentUser } from "@/server/api/lib/invitations"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { invitation, organization, organizationDepartment, user } from "@/server/db/schema"

const notificationTypeInput = z.enum(NOTIFICATION_TYPE_FILTERS).default(FILTER_ALL)

type InvitationNotificationRow = {
  createdAt: Date
  departmentName: string | null
  email: string
  expiresAt: Date | null
  id: string
  inviterEmail: string
  inviterName: string
  organizationName: string
  organizationSlug: string
  role: string
  status: string
}

const toInvitationNotification = (row: InvitationNotificationRow) => ({
  actions: ["accept", "reject", "detail"] as const,
  createdAt: row.createdAt,
  description: `${row.departmentName ? `${row.departmentName} · ` : ""}${row.role} · ${row.inviterName || row.inviterEmail}`,
  detailHref: `/invite/${row.id}`,
  id: `invitation:${row.id}`,
  invitation: {
    departmentName: row.departmentName,
    email: row.email,
    expiresAt: row.expiresAt,
    id: row.id,
    inviterEmail: row.inviterEmail,
    inviterName: row.inviterName,
    organizationName: row.organizationName,
    organizationSlug: row.organizationSlug,
    role: row.role,
    status: getEffectiveInvitationStatus(row.status, row.expiresAt)
  },
  source: {
    invitationId: row.id,
    kind: "organizationInvitation" as const
  },
  status: INVITATION_STATUS_PENDING,
  title: `${row.organizationName} 邀请你加入`,
  type: NOTIFICATION_TYPE_INVITATION,
  unread: true
})

export const notificationRouter = createTRPCRouter({
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ value: sql<number>`count(*)::int` })
      .from(invitation)
      .where(and(eq(invitation.email, ctx.session.user.email.toLowerCase()), eq(invitation.status, INVITATION_STATUS_PENDING), gt(invitation.expiresAt, new Date())))

    return {
      pendingCount: row?.value ?? 0,
      unreadCount: row?.value ?? 0
    }
  }),

  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(DEFAULT_PAGE),
        pageSize: z.number().int().min(1).max(NOTIFICATION_MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
        type: notificationTypeInput
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.pageSize
      const where = and(eq(invitation.email, ctx.session.user.email.toLowerCase()), eq(invitation.status, INVITATION_STATUS_PENDING), gt(invitation.expiresAt, new Date()))
      const shouldListInvitations = input.type === FILTER_ALL || input.type === NOTIFICATION_TYPE_INVITATION
      const invitationRows = shouldListInvitations
        ? await ctx.db
            .select({
              createdAt: invitation.createdAt,
              departmentName: organizationDepartment.name,
              email: invitation.email,
              expiresAt: invitation.expiresAt,
              id: invitation.id,
              inviterEmail: user.email,
              inviterName: user.name,
              organizationName: organization.name,
              organizationSlug: organization.slug,
              role: invitation.role,
              status: invitation.status
            })
            .from(invitation)
            .innerJoin(organization, eq(invitation.organizationId, organization.id))
            .innerJoin(user, eq(invitation.inviterId, user.id))
            .leftJoin(organizationDepartment, and(eq(invitation.departmentId, organizationDepartment.id), isNull(organizationDepartment.deletedAt)))
            .where(where)
            .orderBy(asc(invitation.expiresAt))
            .limit(input.pageSize)
            .offset(offset)
        : []
      const [totalRow] = shouldListInvitations ? await ctx.db.select({ value: sql<number>`count(*)::int` }).from(invitation).where(where) : [{ value: 0 }]
      const items = invitationRows.map(toInvitationNotification)
      const total = totalRow?.value ?? 0

      return {
        items,
        page: input.page,
        pageCount: Math.max(1, Math.ceil(total / input.pageSize))
      }
    }),

  markAllRead: protectedProcedure.mutation(() => {
    throw new TRPCError({ code: "BAD_REQUEST", message: "当前通知来源不支持标记已读。" })
  }),
  markRead: protectedProcedure.input(z.object({ id: z.string().min(1) })).mutation(() => {
    throw new TRPCError({ code: "BAD_REQUEST", message: "当前通知来源不支持标记已读。" })
  }),

  invitation: createTRPCRouter({
    accept: protectedProcedure.input(z.object({ invitationId: z.string().min(1) })).mutation(async ({ ctx, input }) => acceptInvitationForCurrentUser(ctx, input.invitationId)),
    getMine: protectedProcedure.input(z.object({ invitationId: z.string().min(1) })).query(async ({ ctx, input }) => getInvitationForCurrentUser(ctx, input.invitationId)),
    reject: protectedProcedure.input(z.object({ invitationId: z.string().min(1) })).mutation(async ({ ctx, input }) => rejectInvitationForCurrentUser(ctx, input.invitationId))
  })
})
