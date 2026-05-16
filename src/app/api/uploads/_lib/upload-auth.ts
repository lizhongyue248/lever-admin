import "server-only"

import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"

import { ORGANIZATION_ADMIN_ROLES, ORGANIZATION_STATUS_DISABLED, PLATFORM_ADMIN_ROLES, UPLOAD_MAX_IMAGE_BYTES, UPLOAD_MAX_MULTIPART_BYTES } from "@/lib/const"
import { auth } from "@/server/better-auth"
import { db } from "@/server/db"
import { member, organization } from "@/server/db/schema"

type UploadSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

const hasPlatformRole = (
  user: UploadSession["user"]
): user is UploadSession["user"] & {
  role: string | null | undefined
} => "role" in user

const isPlatformAdminRole = (role: string | null | undefined) => PLATFORM_ADMIN_ROLES.some((item) => item === role)
const isOrganizationAdminRole = (role: string | null | undefined) => ORGANIZATION_ADMIN_ROLES.some((item) => item === role)

export const assertUploadRequestSize = (request: Request) => {
  const contentLength = request.headers.get("content-length")

  if (!contentLength) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "缺少上传大小信息。" })
  }

  const size = Number(contentLength)

  if (!Number.isFinite(size) || size <= 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "上传大小信息无效。" })
  }

  if (size > UPLOAD_MAX_MULTIPART_BYTES) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "图片大小不能超过 2 MB。" })
  }
}

export const assertUploadFileSize = (file: File) => {
  if (file.size > UPLOAD_MAX_IMAGE_BYTES) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "图片大小不能超过 2 MB。" })
  }
}

export const getUploadSession = async (request: Request) => {
  const session = await auth.api.getSession({
    headers: request.headers,
    query: {
      disableCookieCache: true
    }
  })

  if (!session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录。" })
  }

  return { ...session, user: session.user }
}

export const assertCanUploadOrgLogo = async ({ request, session: existingSession, slug }: { request: Request; session?: UploadSession; slug: string }) => {
  const session = existingSession ?? (await getUploadSession(request))
  const role = hasPlatformRole(session.user) ? session.user.role : undefined

  if (isPlatformAdminRole(role)) {
    return session
  }

  const [membership] = await db
    .select({ organizationStatus: organization.status, role: member.role })
    .from(organization)
    .innerJoin(member, and(eq(member.organizationId, organization.id), eq(member.userId, session.user.id)))
    .where(eq(organization.slug, slug))
    .limit(1)

  if (!membership || !isOrganizationAdminRole(membership.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "没有上传组织 Logo 的权限。" })
  }

  if (membership.organizationStatus === ORGANIZATION_STATUS_DISABLED) {
    throw new TRPCError({ code: "FORBIDDEN", message: "该组织已停用。" })
  }

  return session
}

export const toErrorResponse = (error: TRPCError | Error) => {
  if (error instanceof TRPCError) {
    const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400

    return Response.json({ message: error.message }, { status })
  }

  return Response.json({ message: "上传失败，请稍后重试。" }, { status: 400 })
}
