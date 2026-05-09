import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { sql } from "drizzle-orm"
// Enable these plugins after the matching Drizzle schema and migrations are ready.
// import { magicLink, admin, organization, twoFactor } from "better-auth/plugins"
// import { apiKey } from "@better-auth/api-key"
// import { passkey } from "@better-auth/passkey"

import { env } from "@/env"
import { db } from "@/server/db"
import { user as userTable } from "@/server/db/schema"

const authBaseUrl = env.BETTER_AUTH_URL ?? "http://localhost:3000"
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
  }
  // Enable these plugins after plugin tables are added to Drizzle schema.
  // plugins: [
  //   admin({
  //     defaultRole: "user",
  //     adminRoles: ["admin", "super_admin"]
  //   }),
  //   organization({
  //     teams: {
  //       enabled: true
  //     },
  //     sendInvitationEmail: async ({ email, invitation, organization }) => {
  //       console.info("[auth:organization-invitation]", {
  //         to: email,
  //         organization: organization.name,
  //         invitationId: invitation.id
  //       })
  //     }
  //   }),
  //   twoFactor({
  //     issuer: "Lever Admin",
  //     allowPasswordless: true
  //   }),
  //   magicLink({
  //     sendMagicLink: async ({ email, url }) => {
  //       console.info("[auth:magic-link]", { to: email, url })
  //     }
  //   }),
  //   passkey({
  //     rpName: "Lever Admin",
  //     rpID: new URL(authBaseUrl).hostname,
  //     origin: authBaseUrl
  //   }),
  //   apiKey({
  //     enableSessionForAPIKeys: true
  //   })
  // ]
})

export type Session = typeof auth.$Infer.Session
