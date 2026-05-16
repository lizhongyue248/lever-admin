import { randomUUID } from "node:crypto"
import postgres from "postgres"

export const createE2eSql = () => {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for E2E DB helpers")
  }

  return postgres(databaseUrl, { max: 1 })
}

export const markEmailVerified = async (email: string) => {
  const sql = createE2eSql()

  try {
    await sql`update "auth_user" set "email_verified" = true where "email" = ${email}`
  } finally {
    await sql.end()
  }
}

export const setUserRole = async (email: string, role: string) => {
  const sql = createE2eSql()

  try {
    await sql`update "auth_user" set "role" = ${role} where "email" = ${email}`
  } finally {
    await sql.end()
  }
}

export const createUserRecord = async ({ email, name, role = "user" }: { email: string; name: string; role?: string }) => {
  const sql = createE2eSql()
  const id = `user-${randomUUID()}`

  try {
    await sql`
      insert into "auth_user" ("id", "name", "email", "email_verified", "role", "created_at", "updated_at")
      values (${id}, ${name}, ${email}, true, ${role}, now(), now())
      on conflict ("email") do update set
        "name" = excluded."name",
        "email_verified" = true,
        "role" = excluded."role",
        "updated_at" = now()
    `

    return { email, id, name }
  } finally {
    await sql.end()
  }
}

export const createAdminUserFixture = async ({ banned = false, email, name, role = "user" }: { banned?: boolean; email: string; name: string; role?: string }) => {
  const sql = createE2eSql()
  const id = `user-${email.replace(/[^a-z0-9]/giu, "-")}`

  try {
    await sql`
      insert into "auth_user" ("id", "name", "email", "email_verified", "role", "banned", "created_at", "updated_at")
      values (${id}, ${name}, ${email}, true, ${role}, ${banned}, now(), now())
      on conflict ("email") do update set
        "name" = excluded."name",
        "email_verified" = true,
        "role" = excluded."role",
        "banned" = excluded."banned",
        "updated_at" = now()
    `

    return { email, id, name, role }
  } finally {
    await sql.end()
  }
}

export const createUserSessionFixture = async ({ email, userAgent = "E2E Chrome" }: { email: string; userAgent?: string }) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ id: string }[]>`
      select "id"
      from "auth_user"
      where "email" = ${email}
      limit 1
    `
    const userId = rows[0]?.id

    if (!userId) {
      throw new Error(`Cannot create session for missing user: ${email}`)
    }

    const id = `session-${randomUUID()}`
    const token = `session-${randomUUID()}`
    await sql`
      insert into "auth_session" ("id", "token", "user_id", "expires_at", "ip_address", "user_agent", "created_at", "updated_at")
      values (${id}, ${token}, ${userId}, now() + interval '7 days', '127.0.0.1', ${userAgent}, now(), now())
    `

    return { id, token, userId }
  } finally {
    await sql.end()
  }
}

export const getSessionById = async (sessionId: string) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ id: string; user_id: string }[]>`
      select "id", "user_id"
      from "auth_session"
      where "id" = ${sessionId}
      limit 1
    `

    return rows[0] ?? null
  } finally {
    await sql.end()
  }
}

export const createApiKeyFixture = async ({
  configId = "user",
  enabled = true,
  expiresAt,
  name,
  referenceId
}: {
  configId?: "user" | "organization"
  enabled?: boolean
  expiresAt?: Date
  name: string
  referenceId: string
}) => {
  const sql = createE2eSql()
  const id = `api-key-${randomUUID()}`
  const prefix = "lev_live_test"

  try {
    await sql`
      insert into "auth_apikey" ("id", "config_id", "name", "start", "reference_id", "prefix", "key", "enabled", "expires_at", "permissions", "created_at", "updated_at")
      values (${id}, ${configId}, ${name}, ${prefix}, ${referenceId}, ${prefix}, ${`hash-${id}`}, ${enabled}, ${expiresAt ?? null}, ${JSON.stringify({})}, now(), now())
    `

    return { id, name }
  } finally {
    await sql.end()
  }
}

export const getApiKeyById = async (id: string) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ enabled: boolean | null; id: string; name: string | null }[]>`
      select "id", "name", "enabled"
      from "auth_apikey"
      where "id" = ${id}
      limit 1
    `

    return rows[0] ?? null
  } finally {
    await sql.end()
  }
}

export const countApiKeysById = async (id: string) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ count: string }[]>`
      select count(*)::text as count
      from "auth_apikey"
      where "id" = ${id}
    `

    return Number(rows[0]?.count ?? 0)
  } finally {
    await sql.end()
  }
}

export const createApiKeyUsageLogFixture = async ({
  apiKeyId,
  configId = "user",
  createdAt = new Date(),
  failureReason,
  ipCountry = "CN",
  method = "GET",
  path = "/v1/me",
  referenceId,
  statusCode = 200,
  success = true,
  userAgentSummary = "E2E client"
}: {
  apiKeyId: string
  configId?: "user" | "organization"
  createdAt?: Date
  failureReason?: string
  ipCountry?: string
  method?: string
  path?: string
  referenceId: string
  statusCode?: number
  success?: boolean
  userAgentSummary?: string
}) => {
  const sql = createE2eSql()
  const id = `api-key-log-${randomUUID()}`

  try {
    await sql`
      insert into "system_api_key_usage_log" ("id", "api_key_id", "config_id", "reference_id", "key_prefix", "method", "path", "status_code", "success", "failure_reason", "request_id", "ip_hash", "ip_country", "user_agent_hash", "user_agent_summary", "duration_ms", "created_at")
      values (${id}, ${apiKeyId}, ${configId}, ${referenceId}, 'lev_live_test', ${method}, ${path}, ${statusCode}, ${success}, ${failureReason ?? null}, ${`req-${randomUUID()}`}, 'ip-hash-e2e', ${ipCountry}, 'ua-hash-e2e', ${userAgentSummary}, 42, ${createdAt})
    `

    return { id }
  } finally {
    await sql.end()
  }
}

export const createRequestLogFixture = async ({
  createdAt = new Date(),
  durationMs = 148,
  ipAddress = "203.0.113.42",
  method = "POST",
  organizationId,
  organizationName,
  path = "/api/trpc/admin.user.ban",
  requestBodyStatus = "redacted",
  requestBodySummary = JSON.stringify(
    {
      password: "[REDACTED]",
      reason: "policy_violation",
      token: "[REDACTED]",
      userId: "usr_93k"
    },
    null,
    2
  ),
  requestId = `req-${randomUUID()}`,
  riskLevel = "high",
  riskReasons = JSON.stringify(["高危路由失败", "角色不足"]),
  routeName = "admin.user.ban",
  source = "trpc",
  statusCode = 403,
  success = false,
  userAgentRaw = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
  userAgentSummary = "Chrome / Windows",
  userEmail,
  userId,
  userName = "Verified E2E",
  userRole = "admin"
}: {
  createdAt?: Date
  durationMs?: number
  ipAddress?: string
  method?: string
  organizationId?: string
  organizationName?: string
  path?: string
  requestBodyStatus?: string
  requestBodySummary?: string
  requestId?: string
  riskLevel?: string
  riskReasons?: string
  routeName?: string
  source?: string
  statusCode?: number
  success?: boolean
  userAgentRaw?: string
  userAgentSummary?: string
  userEmail: string
  userId: string
  userName?: string
  userRole?: string
}) => {
  const sql = createE2eSql()
  const id = `request-log-${randomUUID()}`

  try {
    await sql`
      insert into "system_request_log" (
        "id",
        "request_id",
        "source",
        "method",
        "path",
        "route_name",
        "status_code",
        "success",
        "failure_reason",
        "duration_ms",
        "user_id",
        "user_email",
        "user_name",
        "user_role",
        "organization_id",
        "organization_name",
        "request_body_summary",
        "request_body_status",
        "ip_hash",
        "ip_address",
        "ip_country",
        "ip_region",
        "user_agent_hash",
        "user_agent_raw",
        "user_agent_summary",
        "risk_level",
        "risk_reasons",
        "created_at"
      )
      values (
        ${id},
        ${requestId},
        ${source},
        ${method},
        ${path},
        ${routeName},
        ${statusCode},
        ${success},
        ${success ? null : "forbidden"},
        ${durationMs},
        ${userId},
        ${userEmail},
        ${userName},
        ${userRole},
        ${organizationId ?? null},
        ${organizationName ?? null},
        ${requestBodySummary},
        ${requestBodyStatus},
        'ip-hash-e2e',
        ${ipAddress},
        'US',
        'California',
        'ua-hash-e2e',
        ${userAgentRaw},
        ${userAgentSummary},
        ${riskLevel},
        ${riskReasons},
        ${createdAt}
      )
    `

    return { id, requestId }
  } finally {
    await sql.end()
  }
}

export const getRequestLogsByRouteName = async (routeName: string) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<
      {
        metadata: string | null
        method: string
        organization_id: string | null
        path: string
        route_name: string | null
        status_code: number | null
        success: boolean
        user_email: string | null
      }[]
    >`
      select "method", "path", "route_name", "status_code", "success", "organization_id", "user_email", "metadata"
      from "system_request_log"
      where "route_name" = ${routeName}
      order by "created_at" desc
    `

    return rows
  } finally {
    await sql.end()
  }
}

export const countRequestLogsByRouteName = async (routeName: string) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ count: string }[]>`
      select count(*)::text as count
      from "system_request_log"
      where "route_name" = ${routeName}
        and "deleted_at" is null
    `

    return Number(rows[0]?.count ?? 0)
  } finally {
    await sql.end()
  }
}

export const assignOrganizationMemberToDepartmentByEmail = async ({ departmentId, email, organizationId }: { departmentId: string; email: string; organizationId: string }) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ member_id: string }[]>`
      select member."id" as member_id
      from "auth_member" member
      inner join "auth_user" app_user on app_user."id" = member."user_id"
      where app_user."email" = ${email}
        and member."organization_id" = ${organizationId}
      limit 1
    `
    const memberId = rows[0]?.member_id

    if (!memberId) {
      throw new Error(`Cannot assign missing organization member to department: ${email}`)
    }

    await sql`
      insert into "system_organization_department_member" ("id", "organization_id", "department_id", "member_id", "created_at", "updated_at")
      values (${`department-member-${departmentId}-${memberId}`}, ${organizationId}, ${departmentId}, ${memberId}, now(), now())
      on conflict ("id") do update set
        "deleted_at" = null,
        "deleted_by" = null,
        "updated_at" = now()
    `
  } finally {
    await sql.end()
  }
}

export const seedOrganizationWithDepartments = async ({ departmentName, rootName, rootSlug }: { departmentName: string; rootName: string; rootSlug: string }) => {
  const sql = createE2eSql()
  const rootId = `org-${rootSlug}`
  const departmentId = `dept-${rootSlug}`

  try {
    await sql`
      insert into "auth_organization" ("id", "name", "slug", "status", "created_at", "updated_at")
      values (${rootId}, ${rootName}, ${rootSlug}, 'active', now(), now())
      on conflict ("id") do update set
        "name" = excluded."name",
        "slug" = excluded."slug",
        "status" = excluded."status",
        "updated_at" = now()
    `
    await sql`
      insert into "system_organization_department" ("id", "organization_id", "parent_department_id", "name", "path", "depth", "sort_order", "status", "description", "created_at", "updated_at")
      values (${departmentId}, ${rootId}, null, ${departmentName}, ${departmentId}, 0, 0, 'active', 'E2E seeded department', now(), now())
      on conflict ("id") do update set
        "name" = excluded."name",
        "path" = excluded."path",
        "depth" = excluded."depth",
        "status" = 'active',
        "description" = excluded."description",
        "updated_at" = now()
    `

    return { departmentId, rootId }
  } finally {
    await sql.end()
  }
}

export const getUserByEmail = async (email: string) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ email: string; email_verified: boolean; id: string; name: string }[]>`
      select "id", "name", "email", "email_verified"
      from "auth_user"
      where "email" = ${email}
      limit 1
    `

    return rows[0] ?? null
  } finally {
    await sql.end()
  }
}

export const getUserAdminStateByEmail = async (email: string) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ banned: boolean | null; email: string; role: string | null }[]>`
      select "email", "role", "banned"
      from "auth_user"
      where "email" = ${email}
      limit 1
    `

    return rows[0] ?? null
  } finally {
    await sql.end()
  }
}

export const countUsersByEmail = async (email: string) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ count: string }[]>`
      select count(*)::text as count
      from "auth_user"
      where "email" = ${email}
    `

    return Number(rows[0]?.count ?? 0)
  } finally {
    await sql.end()
  }
}

export const createResetPasswordToken = async (email: string, token: string, expiresAt = new Date(Date.now() + 60 * 60 * 1000)) => {
  const sql = createE2eSql()

  try {
    const user = await getUserByEmail(email)

    if (!user) {
      throw new Error(`Cannot create reset token for missing user: ${email}`)
    }

    await sql`
      insert into "auth_verification" ("id", "identifier", "value", "expires_at", "created_at", "updated_at")
      values (${`reset-${token}`}, ${`reset-password:${token}`}, ${user.id}, ${expiresAt}, now(), now())
    `
  } finally {
    await sql.end()
  }
}

export const addOrganizationMemberByEmail = async ({
  createdAt,
  email,
  organizationId,
  role = "owner"
}: {
  createdAt?: Date
  email: string
  organizationId: string
  role?: string
}) => {
  const sql = createE2eSql()
  const joinedAt = createdAt ?? new Date()

  try {
    const rows = await sql<{ id: string }[]>`
      select "id"
      from "auth_user"
      where "email" = ${email}
      limit 1
    `
    const userId = rows[0]?.id

    if (!userId) {
      throw new Error(`Cannot add missing user to organization: ${email}`)
    }

    await sql`
      insert into "auth_member" ("id", "organization_id", "user_id", "role", "created_at")
      values (${`member-${organizationId}-${userId}`}, ${organizationId}, ${userId}, ${role}, ${joinedAt})
      on conflict ("organization_id", "user_id") do update set "role" = excluded."role", "created_at" = excluded."created_at"
    `
  } finally {
    await sql.end()
  }
}

export const getMemberByEmailAndOrganization = async ({ email, organizationId }: { email: string; organizationId: string }) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ id: string; role: string }[]>`
      select member."id", member."role"
      from "auth_member" member
      inner join "auth_user" app_user on app_user."id" = member."user_id"
      where app_user."email" = ${email}
        and member."organization_id" = ${organizationId}
      limit 1
    `

    return rows[0] ?? null
  } finally {
    await sql.end()
  }
}

export const getDepartmentByName = async ({ name, organizationId }: { name: string; organizationId: string }) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ id: string; name: string }[]>`
      select "id", "name"
      from "system_organization_department"
      where "organization_id" = ${organizationId}
        and "name" = ${name}
        and "deleted_at" is null
      limit 1
    `

    return rows[0] ?? null
  } finally {
    await sql.end()
  }
}

export const getDepartmentMembershipByEmail = async ({ email, organizationId }: { email: string; organizationId: string }) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ department_name: string; member_id: string }[]>`
      select department."name" as department_name, member."id" as member_id
      from "system_organization_department_member" department_member
      inner join "auth_member" member on member."id" = department_member."member_id"
      inner join "auth_user" app_user on app_user."id" = member."user_id"
      inner join "system_organization_department" department on department."id" = department_member."department_id"
      where app_user."email" = ${email}
        and member."organization_id" = ${organizationId}
      limit 1
    `

    return rows[0] ?? null
  } finally {
    await sql.end()
  }
}

export const getInvitationStatusByEmail = async ({ email, organizationId }: { email: string; organizationId: string }) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ status: string }[]>`
      select "status"
      from "auth_invitation"
      where "email" = ${email}
        and "organization_id" = ${organizationId}
      order by "created_at" desc
      limit 1
    `

    return rows[0]?.status ?? null
  } finally {
    await sql.end()
  }
}

export const getInvitationByEmail = async ({ email, organizationId }: { email: string; organizationId: string }) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ id: string; status: string }[]>`
      select "id", "status"
      from "auth_invitation"
      where "email" = ${email}
        and "organization_id" = ${organizationId}
      order by "created_at" desc
      limit 1
    `

    return rows[0] ?? null
  } finally {
    await sql.end()
  }
}

export const upsertPlatformSetting = async ({ key, value }: { key: string; value: string }) => {
  const sql = createE2eSql()

  try {
    await sql`
      insert into "system_platform_setting" ("key", "value", "created_at", "updated_at")
      values (${key}, ${value}, now(), now())
      on conflict ("key") do update set "value" = excluded."value", "updated_at" = now()
    `
  } finally {
    await sql.end()
  }
}

export const getPlatformSettingValue = async (key: string) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ value: string }[]>`
      select "value" from "system_platform_setting" where "key" = ${key} limit 1
    `

    return rows[0]?.value ?? null
  } finally {
    await sql.end()
  }
}

export const deletePlatformSettings = async () => {
  const sql = createE2eSql()
  const keys = [
    "email.provider",
    "email.from",
    "email.resend.apiKey",
    "email.smtp.host",
    "email.smtp.port",
    "email.smtp.user",
    "email.smtp.password",
    "email.smtp.secure",
    "storage.provider",
    "storage.local.path",
    "storage.publicBaseUrl",
    "storage.s3.endpoint",
    "storage.s3.region",
    "storage.s3.bucket",
    "storage.s3.accessKeyId",
    "storage.s3.secretAccessKey",
    "storage.s3.forcePathStyle"
  ]

  try {
    await sql`delete from "system_platform_setting" where "key" in ${sql(keys)}`
  } finally {
    await sql.end()
  }
}
