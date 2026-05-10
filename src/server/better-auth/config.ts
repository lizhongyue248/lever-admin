import { apiKey } from "@better-auth/api-key"
import { passkey } from "@better-auth/passkey"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { admin, organization, twoFactor } from "better-auth/plugins"
import { adminAc, userAc } from "better-auth/plugins/admin/access"
import { sql } from "drizzle-orm"

import { env } from "@/env"
import { db } from "@/server/db"
import { user as userTable } from "@/server/db/schema"

const defaultAuthBaseUrl = "http://localhost:4000"
const authBaseUrl = env.BETTER_AUTH_URL ?? defaultAuthBaseUrl
const developmentTrustedOrigins =
  env.NODE_ENV === "production"
    ? []
    : [defaultAuthBaseUrl, "http://127.0.0.1:4000", "http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"]
const trustedOrigins = Array.from(new Set([authBaseUrl, ...developmentTrustedOrigins]))
const duplicateSignUpEmailMessage = "该邮箱已注册，请直接登录。"

const findUserIdByEmail = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase()

  const [existingUser] = await db.select({ id: userTable.id }).from(userTable).where(sql`lower(${userTable.email}) = ${normalizedEmail}`).limit(1)

  return existingUser?.id ?? null
}

export const auth = betterAuth({
  appName: "Lever Admin",
  baseURL: authBaseUrl,
  database: drizzleAdapter(db, {
    provider: "pg"
  }),
  trustedOrigins,
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60
    }
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      // Development placeholder: replace with a real email provider before production.
      console.info("[auth:reset-password]", { to: user.email, url })
    }
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Development placeholder: replace with a real email provider before production.
      console.info("[auth:verify-email]", { to: user.email, url })
    }
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") {
        return
      }

      const email = typeof ctx.body?.email === "string" ? ctx.body.email : ""

      if (!email) {
        return
      }

      const existingUserId = await findUserIdByEmail(email)

      if (existingUserId) {
        throw new APIError("BAD_REQUEST", {
          message: duplicateSignUpEmailMessage
        })
      }
    })
  },
  socialProviders: {
    github: {
      clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
      redirectURI: `${authBaseUrl}/api/auth/callback/github`
    }
    // Enable after Google OAuth env vars are configured.
    // google: {
    //   clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID,
    //   clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
    //   redirectURI: `${authBaseUrl}/api/auth/callback/google`
    // }
  },
  plugins: [
    admin({
      adminRoles: ["admin", "super_admin"],
      defaultRole: "user",
      roles: {
        admin: adminAc,
        support: userAc,
        super_admin: adminAc,
        user: userAc
      }
    }),
    organization({
      requireEmailVerificationOnInvitation: true,
      teams: {
        enabled: true
      },
      sendInvitationEmail: async ({ email, invitation, organization }) => {
        console.info("[auth:organization-invitation]", {
          invitationId: invitation.id,
          organization: organization.name,
          to: email
        })
      }
    }),
    twoFactor({
      allowPasswordless: true,
      issuer: "Lever Admin"
    }),
    passkey({
      origin: authBaseUrl,
      rpID: new URL(authBaseUrl).hostname,
      rpName: "Lever Admin"
    }),
    apiKey([
      {
        configId: "user",
        references: "user"
      },
      {
        configId: "organization",
        references: "organization"
      }
    ])
  ]
})

export type Session = typeof auth.$Infer.Session
