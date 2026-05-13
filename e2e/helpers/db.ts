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
    await sql`update "system_user" set "email_verified" = true where "email" = ${email}`
  } finally {
    await sql.end()
  }
}

export const setUserRole = async (email: string, role: string) => {
  const sql = createE2eSql()

  try {
    await sql`update "system_user" set "role" = ${role} where "email" = ${email}`
  } finally {
    await sql.end()
  }
}

export const createUserRecord = async ({ email, name, role = "user" }: { email: string; name: string; role?: string }) => {
  const sql = createE2eSql()
  const id = `user-${randomUUID()}`

  try {
    await sql`
      insert into "system_user" ("id", "name", "email", "email_verified", "role", "created_at", "updated_at")
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

export const seedOrganizationWithDepartments = async ({ departmentName, rootName, rootSlug }: { departmentName: string; rootName: string; rootSlug: string }) => {
  const sql = createE2eSql()
  const rootId = `org-${rootSlug}`
  const departmentId = `dept-${rootSlug}`

  try {
    await sql`
      insert into "system_organization" ("id", "name", "slug", "created_at", "updated_at")
      values (${rootId}, ${rootName}, ${rootSlug}, now(), now())
      on conflict ("id") do update set "name" = excluded."name", "slug" = excluded."slug", "updated_at" = now()
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
      from "system_user"
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
      from "system_user"
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
      insert into "system_verification" ("id", "identifier", "value", "expires_at", "created_at", "updated_at")
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
      from "system_user"
      where "email" = ${email}
      limit 1
    `
    const userId = rows[0]?.id

    if (!userId) {
      throw new Error(`Cannot add missing user to organization: ${email}`)
    }

    await sql`
      insert into "system_member" ("id", "organization_id", "user_id", "role", "created_at")
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
      from "system_member" member
      inner join "system_user" app_user on app_user."id" = member."user_id"
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
      inner join "system_member" member on member."id" = department_member."member_id"
      inner join "system_user" app_user on app_user."id" = member."user_id"
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
      from "system_invitation"
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
