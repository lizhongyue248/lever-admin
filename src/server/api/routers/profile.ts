import { TRPCError } from "@trpc/server"
import { and, eq, gt, sql } from "drizzle-orm"
import { z } from "zod"

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { member, session, user } from "@/server/db/schema"

export const profileUpdateSchema = z.object({
  image: z
    .string()
    .trim()
    .max(2048, "头像 URL 不能超过 2048 个字符。")
    .refine((value) => value === "" || z.url().safeParse(value).success, "头像 URL 必须是有效链接。")
    .transform((value) => (value === "" ? null : value)),
  name: z.string().trim().min(2, "名称至少 2 个字符。").max(32, "名称不能超过 32 个字符。")
})

const countRows = async (query: Promise<{ value: number }[]>) => {
  const [row] = await query

  return row?.value ?? 0
}

const getCompleteness = (profileUser: Pick<typeof user.$inferSelect, "emailVerified" | "image" | "name">) => {
  const score = (profileUser.name.trim().length >= 2 ? 35 : 0) + (profileUser.emailVerified ? 35 : 0) + (profileUser.image ? 30 : 0)

  return Math.min(100, Math.max(0, score))
}

export const profileRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id
    const [profileUser] = await ctx.db
      .select({
        createdAt: user.createdAt,
        email: user.email,
        emailVerified: user.emailVerified,
        id: user.id,
        image: user.image,
        name: user.name,
        updatedAt: user.updatedAt
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    if (!profileUser) {
      throw new TRPCError({ code: "NOT_FOUND", message: "未找到当前用户。" })
    }

    const organizationCount = await countRows(ctx.db.select({ value: sql<number>`count(*)::int` }).from(member).where(eq(member.userId, userId)))
    const activeSessionCount = await countRows(
      ctx.db
        .select({ value: sql<number>`count(*)::int` })
        .from(session)
        .where(and(eq(session.userId, userId), gt(session.expiresAt, new Date())))
    )

    return {
      stats: {
        activeSessionCount,
        completeness: getCompleteness(profileUser),
        organizationCount
      },
      user: profileUser
    }
  }),

  update: protectedProcedure.input(profileUpdateSchema).mutation(async ({ ctx, input }) => {
    const [updatedUser] = await ctx.db
      .update(user)
      .set({
        image: input.image,
        name: input.name,
        updatedAt: new Date()
      })
      .where(eq(user.id, ctx.session.user.id))
      .returning({
        createdAt: user.createdAt,
        email: user.email,
        emailVerified: user.emailVerified,
        id: user.id,
        image: user.image,
        name: user.name,
        updatedAt: user.updatedAt
      })

    if (!updatedUser) {
      throw new TRPCError({ code: "NOT_FOUND", message: "未找到当前用户。" })
    }

    return updatedUser
  })
})
