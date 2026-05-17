import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

const emailProviderConsole = "console"
const emailProviderResend = "resend"
const emailProviderSmtp = "smtp"
/** @type {["console", "resend", "smtp"]} */
const emailProviders = [emailProviderConsole, emailProviderResend, emailProviderSmtp]

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    BETTER_AUTH_SECRET: process.env.NODE_ENV === "production" ? z.string() : z.string().optional(),
    BETTER_AUTH_URL: z.string().url().optional(),
    BETTER_AUTH_GITHUB_CLIENT_ID: z.string().optional(),
    BETTER_AUTH_GITHUB_CLIENT_SECRET: z.string().optional(),
    BETTER_AUTH_GOOGLE_CLIENT_ID: z.string().optional(),
    BETTER_AUTH_GOOGLE_CLIENT_SECRET: z.string().optional(),
    BETTER_AUTH_WECHAT_CLIENT_ID: z.string().optional(),
    BETTER_AUTH_WECHAT_CLIENT_SECRET: z.string().optional(),
    DATABASE_URL: z.string().url(),
    EMAIL_FROM: z.string().default("Lever Admin <no-reply@example.com>"),
    EMAIL_PROVIDER: z.enum(emailProviders).default(emailProviderConsole),
    GOOGLE_RECAPTCHA_MIN_SCORE: z.coerce.number().min(0).max(1).optional(),
    GOOGLE_RECAPTCHA_SECRET_KEY: z.string().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    RESEND_API_KEY: process.env.EMAIL_PROVIDER === emailProviderResend ? z.string().min(1) : z.string().optional(),
    SMTP_HOST: process.env.EMAIL_PROVIDER === emailProviderSmtp ? z.string().min(1) : z.string().optional(),
    SMTP_PASSWORD: process.env.EMAIL_PROVIDER === emailProviderSmtp ? z.string().min(1) : z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: z.preprocess((value) => {
      if (value === undefined) {
        return false
      }

      if (value === "true") {
        return true
      }

      if (value === "false") {
        return false
      }

      return value
    }, z.boolean()),
    SMTP_USER: process.env.EMAIL_PROVIDER === emailProviderSmtp ? z.string().min(1) : z.string().optional()
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_GOOGLE_RECAPTCHA_SCRIPT_HOST: z.enum(["www.google.com", "www.recaptcha.net"]).optional(),
    NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY: z.string().optional()
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    BETTER_AUTH_GITHUB_CLIENT_ID: process.env.BETTER_AUTH_GITHUB_CLIENT_ID,
    BETTER_AUTH_GITHUB_CLIENT_SECRET: process.env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
    BETTER_AUTH_GOOGLE_CLIENT_ID: process.env.BETTER_AUTH_GOOGLE_CLIENT_ID,
    BETTER_AUTH_GOOGLE_CLIENT_SECRET: process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
    BETTER_AUTH_WECHAT_CLIENT_ID: process.env.BETTER_AUTH_WECHAT_CLIENT_ID,
    BETTER_AUTH_WECHAT_CLIENT_SECRET: process.env.BETTER_AUTH_WECHAT_CLIENT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    GOOGLE_RECAPTCHA_MIN_SCORE: process.env.GOOGLE_RECAPTCHA_MIN_SCORE,
    GOOGLE_RECAPTCHA_SECRET_KEY: process.env.GOOGLE_RECAPTCHA_SECRET_KEY,
    NEXT_PUBLIC_GOOGLE_RECAPTCHA_SCRIPT_HOST: process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SCRIPT_HOST,
    NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY,
    NODE_ENV: process.env.NODE_ENV,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true
})
