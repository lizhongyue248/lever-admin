import "server-only"

import { TRPCError } from "@trpc/server"
import { and, eq, inArray, isNull } from "drizzle-orm"
import { z } from "zod"

import { env } from "@/env"
import {
  EMAIL_PROVIDER_CONSOLE,
  EMAIL_PROVIDER_RESEND,
  EMAIL_PROVIDER_SMTP,
  EMAIL_PROVIDERS,
  EMAIL_SETTING_KEY_FROM,
  EMAIL_SETTING_KEY_PROVIDER,
  EMAIL_SETTING_KEY_RESEND_API_KEY,
  EMAIL_SETTING_KEY_SMTP_HOST,
  EMAIL_SETTING_KEY_SMTP_PASSWORD,
  EMAIL_SETTING_KEY_SMTP_PORT,
  EMAIL_SETTING_KEY_SMTP_SECURE,
  EMAIL_SETTING_KEY_SMTP_USER,
  EMAIL_SETTING_KEYS,
  EMAIL_SETTING_SENSITIVE_KEYS
} from "@/lib/const"
import type { db as appDb } from "@/server/db"
import { platformSetting } from "@/server/db/schema"
import { decryptSecret, encryptSecret } from "./secret-codec"

export const emailProviderSchema = z.enum(EMAIL_PROVIDERS)

export const updateEmailSettingsSchema = z.object({
  clearResendApiKey: z.boolean().default(false),
  clearSmtpPassword: z.boolean().default(false),
  from: z.string().trim().min(1, "发件人不能为空。"),
  provider: emailProviderSchema,
  resendApiKey: z.string().trim().optional(),
  smtpHost: z.string().trim().optional(),
  smtpPassword: z.string().trim().optional(),
  smtpPort: z.coerce.number().int().positive("SMTP Port 必须为正整数。").default(587),
  smtpSecure: z.boolean().default(false),
  smtpUser: z.string().trim().optional()
})

export const testEmailSchema = z.object({
  to: z.string().trim().email("请输入有效的测试收件人邮箱。")
})

export type UpdateEmailSettingsInput = z.infer<typeof updateEmailSettingsSchema>
export type TestEmailInput = z.infer<typeof testEmailSchema>

const keys = {
  from: EMAIL_SETTING_KEY_FROM,
  provider: EMAIL_SETTING_KEY_PROVIDER,
  resendApiKey: EMAIL_SETTING_KEY_RESEND_API_KEY,
  smtpHost: EMAIL_SETTING_KEY_SMTP_HOST,
  smtpPassword: EMAIL_SETTING_KEY_SMTP_PASSWORD,
  smtpPort: EMAIL_SETTING_KEY_SMTP_PORT,
  smtpSecure: EMAIL_SETTING_KEY_SMTP_SECURE,
  smtpUser: EMAIL_SETTING_KEY_SMTP_USER
} as const

const sensitiveKeys = new Set<string>(EMAIL_SETTING_SENSITIVE_KEYS)
const allowedKeys = EMAIL_SETTING_KEYS

type PlatformSettingsDb = typeof appDb
type PlatformSettingsTransaction = Parameters<Parameters<PlatformSettingsDb["transaction"]>[0]>[0]
type PlatformSettingsWriteDb = PlatformSettingsDb | PlatformSettingsTransaction
type EmailSettingsSource = "database" | "env"

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === "true") {
    return true
  }

  if (value === "false") {
    return false
  }

  return fallback
}

const getRows = async (db: PlatformSettingsDb) => {
  const rows = await db
    .select()
    .from(platformSetting)
    .where(and(inArray(platformSetting.key, allowedKeys), isNull(platformSetting.deletedAt)))
  const values = new Map(rows.map((row) => [row.key, row.value]))

  return {
    rows,
    values
  }
}

const getSecretValue = (values: Map<string, string>, key: string, envValue: string | undefined) => {
  const value = values.get(key)

  if (value) {
    return decryptSecret(value)
  }

  return envValue
}

const getSmtpPortValue = (value: string | undefined): number => {
  if (!value) {
    return env.SMTP_PORT
  }

  const port = Number(value)

  if (Number.isInteger(port) && port > 0) {
    return port
  }

  return env.SMTP_PORT
}

export const getEmailSettings = async (db: PlatformSettingsDb) => {
  const { rows, values } = await getRows(db)
  const provider = emailProviderSchema.catch(env.EMAIL_PROVIDER).parse(values.get(keys.provider) ?? env.EMAIL_PROVIDER)

  return {
    from: values.get(keys.from) ?? env.EMAIL_FROM,
    provider,
    resendApiKeyConfigured: Boolean(values.get(keys.resendApiKey) ?? env.RESEND_API_KEY),
    source: (rows.length > 0 ? "database" : "env") satisfies EmailSettingsSource,
    smtpHost: values.get(keys.smtpHost) ?? env.SMTP_HOST ?? "",
    smtpPasswordConfigured: Boolean(values.get(keys.smtpPassword) ?? env.SMTP_PASSWORD),
    smtpPort: getSmtpPortValue(values.get(keys.smtpPort)),
    smtpSecure: toBoolean(values.get(keys.smtpSecure), env.SMTP_SECURE),
    smtpUser: values.get(keys.smtpUser) ?? env.SMTP_USER ?? ""
  }
}

export const getEffectiveEmailProviderConfig = async (db: PlatformSettingsDb) => {
  const { values } = await getRows(db)
  const provider = emailProviderSchema.catch(env.EMAIL_PROVIDER).parse(values.get(keys.provider) ?? env.EMAIL_PROVIDER)

  return {
    from: values.get(keys.from) ?? env.EMAIL_FROM,
    provider,
    resendApiKey: getSecretValue(values, keys.resendApiKey, env.RESEND_API_KEY),
    smtp: {
      host: values.get(keys.smtpHost) ?? env.SMTP_HOST,
      password: getSecretValue(values, keys.smtpPassword, env.SMTP_PASSWORD),
      port: getSmtpPortValue(values.get(keys.smtpPort)),
      secure: toBoolean(values.get(keys.smtpSecure), env.SMTP_SECURE),
      user: values.get(keys.smtpUser) ?? env.SMTP_USER
    }
  }
}

const assertEmailConfigComplete = (input: UpdateEmailSettingsInput, existing: Awaited<ReturnType<typeof getEmailSettings>>) => {
  if (env.NODE_ENV === "production" && input.provider === EMAIL_PROVIDER_CONSOLE) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "生产环境不能启用 Console 邮件服务。" })
  }

  if (input.provider === EMAIL_PROVIDER_RESEND && !input.resendApiKey && (!existing.resendApiKeyConfigured || input.clearResendApiKey)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Resend 模式需要配置 API Key。" })
  }

  if (input.provider === EMAIL_PROVIDER_SMTP) {
    if (!input.smtpHost || !input.smtpUser) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "SMTP 模式需要配置 Host 和用户名。" })
    }

    if (!input.smtpPassword && (!existing.smtpPasswordConfigured || input.clearSmtpPassword)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "SMTP 模式需要配置密码。" })
    }
  }
}

const serializeSettingValue = (key: string, value: string) => (sensitiveKeys.has(key) ? encryptSecret(value) : value)

const upsertSetting = async (db: PlatformSettingsWriteDb, key: string, value: string, updatedBy: string) => {
  await db
    .insert(platformSetting)
    .values({
      createdBy: updatedBy,
      deletedAt: null,
      deletedBy: null,
      key,
      updatedBy,
      value: serializeSettingValue(key, value)
    })
    .onConflictDoUpdate({
      set: {
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date(),
        updatedBy,
        value: serializeSettingValue(key, value)
      },
      target: platformSetting.key
    })
}

const deleteSetting = async (db: PlatformSettingsWriteDb, key: string, updatedBy: string) => {
  await db
    .update(platformSetting)
    .set({
      deletedAt: new Date(),
      deletedBy: updatedBy,
      updatedAt: new Date(),
      updatedBy
    })
    .where(eq(platformSetting.key, key))
}

export const updateEmailSettings = async (db: PlatformSettingsDb, input: UpdateEmailSettingsInput, updatedBy: string) => {
  const existing = await getEmailSettings(db)
  assertEmailConfigComplete(input, existing)

  await db.transaction(async (tx) => {
    await upsertSetting(tx, keys.provider, input.provider, updatedBy)
    await upsertSetting(tx, keys.from, input.from, updatedBy)
    await upsertSetting(tx, keys.smtpPort, String(input.smtpPort), updatedBy)
    await upsertSetting(tx, keys.smtpSecure, String(input.smtpSecure), updatedBy)

    if (input.provider === EMAIL_PROVIDER_RESEND && input.resendApiKey) {
      await upsertSetting(tx, keys.resendApiKey, input.resendApiKey, updatedBy)
    }

    if (input.provider === EMAIL_PROVIDER_SMTP) {
      await upsertSetting(tx, keys.smtpHost, input.smtpHost ?? "", updatedBy)
      await upsertSetting(tx, keys.smtpUser, input.smtpUser ?? "", updatedBy)
      if (input.smtpPassword) {
        await upsertSetting(tx, keys.smtpPassword, input.smtpPassword, updatedBy)
      }
    }

    if (input.clearResendApiKey && !input.resendApiKey) {
      await deleteSetting(tx, keys.resendApiKey, updatedBy)
    }

    if (input.clearSmtpPassword && !input.smtpPassword) {
      await deleteSetting(tx, keys.smtpPassword, updatedBy)
    }
  })

  return getEmailSettings(db)
}
