import { apiKey } from "@better-auth/api-key"
import { passkey } from "@better-auth/passkey"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { admin, captcha, organization, twoFactor } from "better-auth/plugins"
import { adminAc, userAc } from "better-auth/plugins/admin/access"
import { sql } from "drizzle-orm"

import { env } from "@/env"
import {
  API_KEY_OWNER_ORGANIZATION,
  API_KEY_OWNER_USER,
  PLATFORM_ADMIN_ROLES,
  PLATFORM_ROLE_ADMIN,
  PLATFORM_ROLE_SUPER_ADMIN,
  PLATFORM_ROLE_SUPPORT,
  PLATFORM_ROLE_USER
} from "@/lib/const"
import { getBetterAuthSocialProviders } from "@/server/api/lib/oauth-providers"
import { db } from "@/server/db"
import * as schema from "@/server/db/schema"
import { user as userTable } from "@/server/db/schema"
import { renderOrganizationInvitationEmail, renderResetPasswordEmail, renderVerifyEmail, sendEmail } from "@/server/service/email"

const defaultAuthBaseUrl = "http://localhost:4000"
const authBaseUrl = env.BETTER_AUTH_URL ?? defaultAuthBaseUrl
const developmentTrustedOrigins =
  env.NODE_ENV === "production"
    ? []
    : [defaultAuthBaseUrl, "http://127.0.0.1:4000", "http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"]
const trustedOrigins = Array.from(new Set([authBaseUrl, ...developmentTrustedOrigins]))
const duplicateSignUpEmailMessage = "该邮箱已注册，请直接登录。"
const captchaMinScore = env.GOOGLE_RECAPTCHA_MIN_SCORE ?? 0.5
const captchaPlugins =
  env.NODE_ENV === "test" || !env.GOOGLE_RECAPTCHA_SECRET_KEY
    ? []
    : [
        captcha({
          provider: "google-recaptcha",
          secretKey: env.GOOGLE_RECAPTCHA_SECRET_KEY,
          minScore: captchaMinScore
        })
      ]
const socialProviders = getBetterAuthSocialProviders(authBaseUrl)

const findUserIdByEmail = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase()

  const [existingUser] = await db.select({ id: userTable.id }).from(userTable).where(sql`lower(${userTable.email}) = ${normalizedEmail}`).limit(1)

  return existingUser?.id ?? null
}

export const auth = betterAuth({
  appName: "Lever Admin",
  baseURL: authBaseUrl,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
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
      const email = renderResetPasswordEmail({
        email: user.email,
        name: user.name,
        url
      })

      await sendEmail({
        ...email,
        to: user.email
      })
    }
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url }) => {
      const email = renderVerifyEmail({
        email: user.email,
        name: user.name,
        url
      })

      await sendEmail({
        ...email,
        to: user.email
      })
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
  socialProviders,
  plugins: [
    ...captchaPlugins,
    admin({
      adminRoles: [...PLATFORM_ADMIN_ROLES],
      defaultRole: PLATFORM_ROLE_USER,
      roles: {
        [PLATFORM_ROLE_ADMIN]: adminAc,
        [PLATFORM_ROLE_SUPPORT]: userAc,
        [PLATFORM_ROLE_SUPER_ADMIN]: adminAc,
        [PLATFORM_ROLE_USER]: userAc
      }
    }),
    organization({
      requireEmailVerificationOnInvitation: true,
      sendInvitationEmail: async ({ email, invitation, inviter, organization, role }) => {
        const renderedEmail = renderOrganizationInvitationEmail({
          email,
          expiresAt: invitation.expiresAt ?? null,
          inviterEmail: inviter.user.email,
          inviterName: inviter.user.name,
          organizationName: organization.name,
          role,
          url: `${authBaseUrl}/invite/${invitation.id}`
        })

        await sendEmail({
          ...renderedEmail,
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
        configId: API_KEY_OWNER_USER,
        enableMetadata: true,
        references: "user"
      },
      {
        configId: API_KEY_OWNER_ORGANIZATION,
        enableMetadata: true,
        references: "organization"
      }
    ])
  ]
})

export type Session = typeof auth.$Infer.Session
