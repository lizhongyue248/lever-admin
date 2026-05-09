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
