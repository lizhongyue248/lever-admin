import { TRPCError } from "@trpc/server"
import { and, eq, isNull } from "drizzle-orm"

import { INVITATION_STATUS_ACCEPTED, INVITATION_STATUS_EXPIRED, INVITATION_STATUS_PENDING, INVITATION_STATUS_REJECTED, ORGANIZATION_ROLES } from "@/lib/const"
import { invitation, member, organization, organizationDepartment, organizationDepartmentMember, session, user } from "@/server/db/schema"

type Db = typeof import("@/server/db").db

type InvitationContext = {
  db: Db
  session: {
    session?: {
      id: string
    }
    user: {
      email: string
      id: string
    }
  }
}

export const getEffectiveInvitationStatus = (status: string, expiresAt: Date | null) => {
  if (status === INVITATION_STATUS_PENDING && expiresAt && expiresAt < new Date()) {
    return INVITATION_STATUS_EXPIRED
  }

  return status
}

export const getInvitationForCurrentUser = async (ctx: InvitationContext, invitationId: string) => {
  const [row] = await ctx.db
    .select({
      createdAt: invitation.createdAt,
      departmentId: invitation.departmentId,
      departmentName: organizationDepartment.name,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      id: invitation.id,
      inviterEmail: user.email,
      inviterName: user.name,
      organizationId: organization.id,
      organizationLogo: organization.logo,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      role: invitation.role,
      status: invitation.status
    })
    .from(invitation)
    .innerJoin(organization, eq(invitation.organizationId, organization.id))
    .innerJoin(user, eq(invitation.inviterId, user.id))
    .leftJoin(organizationDepartment, and(eq(invitation.departmentId, organizationDepartment.id), isNull(organizationDepartment.deletedAt)))
    .where(eq(invitation.id, invitationId))
    .limit(1)

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "邀请不存在。" })
  }

  if (row.email.toLowerCase() !== ctx.session.user.email.toLowerCase()) {
    throw new TRPCError({ code: "FORBIDDEN", message: "当前账号不是该邀请的接收人。" })
  }

  return {
    ...row,
    effectiveStatus: getEffectiveInvitationStatus(row.status, row.expiresAt)
  }
}

export const acceptInvitationForCurrentUser = async (ctx: InvitationContext, invitationId: string) => {
  const target = await getInvitationForCurrentUser(ctx, invitationId)

  if (target.effectiveStatus !== INVITATION_STATUS_PENDING) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "该邀请已失效，不能接受。" })
  }

  const role = ORGANIZATION_ROLES.find((item) => item === target.role)

  if (!role) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "邀请角色无效。" })
  }

  const [existingMember] = await ctx.db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.organizationId, target.organizationId), eq(member.userId, ctx.session.user.id)))
    .limit(1)

  const memberId = existingMember?.id ?? crypto.randomUUID()

  if (!existingMember) {
    await ctx.db.insert(member).values({
      id: memberId,
      organizationId: target.organizationId,
      role,
      userId: ctx.session.user.id
    })
  }

  if (target.departmentId) {
    const [existingDepartmentMembership] = await ctx.db
      .select({ id: organizationDepartmentMember.id })
      .from(organizationDepartmentMember)
      .where(
        and(eq(organizationDepartmentMember.departmentId, target.departmentId), eq(organizationDepartmentMember.memberId, memberId), isNull(organizationDepartmentMember.deletedAt))
      )
      .limit(1)

    if (!existingDepartmentMembership) {
      await ctx.db.insert(organizationDepartmentMember).values({
        createdBy: ctx.session.user.id,
        departmentId: target.departmentId,
        id: crypto.randomUUID(),
        memberId,
        organizationId: target.organizationId,
        updatedBy: ctx.session.user.id
      })
    }
  }

  await ctx.db.update(invitation).set({ status: INVITATION_STATUS_ACCEPTED }).where(eq(invitation.id, target.id))

  if (ctx.session.session?.id) {
    await ctx.db.update(session).set({ activeOrganizationId: target.organizationId }).where(eq(session.id, ctx.session.session.id))
  }

  return {
    invitationId: target.id,
    organizationSlug: target.organizationSlug,
    status: INVITATION_STATUS_ACCEPTED
  }
}

export const rejectInvitationForCurrentUser = async (ctx: InvitationContext, invitationId: string) => {
  const target = await getInvitationForCurrentUser(ctx, invitationId)

  if (target.effectiveStatus !== INVITATION_STATUS_PENDING) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "该邀请已失效，不能拒绝。" })
  }

  await ctx.db.update(invitation).set({ status: INVITATION_STATUS_REJECTED }).where(eq(invitation.id, target.id))

  return {
    invitationId: target.id,
    organizationSlug: target.organizationSlug,
    status: INVITATION_STATUS_REJECTED
  }
}
