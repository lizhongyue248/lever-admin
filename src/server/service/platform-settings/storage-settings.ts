import "server-only"

import path from "node:path"

import { TRPCError } from "@trpc/server"
import { eq, inArray } from "drizzle-orm"
import { z } from "zod"

import {
  DEFAULT_LOCAL_UPLOAD_PATH,
  STORAGE_PROVIDER_LOCAL,
  STORAGE_PROVIDER_S3,
  STORAGE_PROVIDERS,
  STORAGE_SETTING_KEY_LOCAL_PATH,
  STORAGE_SETTING_KEY_PROVIDER,
  STORAGE_SETTING_KEY_PUBLIC_BASE_URL,
  STORAGE_SETTING_KEY_S3_ACCESS_KEY_ID,
  STORAGE_SETTING_KEY_S3_BUCKET,
  STORAGE_SETTING_KEY_S3_ENDPOINT,
  STORAGE_SETTING_KEY_S3_FORCE_PATH_STYLE,
  STORAGE_SETTING_KEY_S3_REGION,
  STORAGE_SETTING_KEY_S3_SECRET_ACCESS_KEY,
  STORAGE_SETTING_KEYS,
  STORAGE_SETTING_SENSITIVE_KEYS
} from "@/lib/const"
import type { db as appDb } from "@/server/db"
import { platformSetting } from "@/server/db/schema"
import { decryptSecret, encryptSecret } from "./secret-codec"

export const storageProviderSchema = z.enum(STORAGE_PROVIDERS)

const optionalTrimmedStringSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
const optionalHttpUrlSchema = optionalTrimmedStringSchema.refine(
  (value) => {
    if (!value) {
      return true
    }

    const parsed = z.url().safeParse(value)

    if (!parsed.success) {
      return false
    }

    const protocol = new URL(value).protocol

    return protocol === "http:" || protocol === "https:"
  },
  { message: "请输入有效的 HTTP(S) URL。" }
)

export const updateStorageSettingsSchema = z.object({
  clearS3AccessKeyId: z.boolean().default(false),
  clearS3SecretAccessKey: z.boolean().default(false),
  localPath: optionalTrimmedStringSchema,
  provider: storageProviderSchema,
  publicBaseUrl: optionalHttpUrlSchema,
  s3AccessKeyId: optionalTrimmedStringSchema,
  s3Bucket: optionalTrimmedStringSchema,
  s3Endpoint: optionalHttpUrlSchema,
  s3ForcePathStyle: z.boolean().default(false),
  s3Region: optionalTrimmedStringSchema,
  s3SecretAccessKey: optionalTrimmedStringSchema
})

export const testStorageUploadSchema = z.object({})

export type UpdateStorageSettingsInput = z.infer<typeof updateStorageSettingsSchema>

const keys = {
  localPath: STORAGE_SETTING_KEY_LOCAL_PATH,
  provider: STORAGE_SETTING_KEY_PROVIDER,
  publicBaseUrl: STORAGE_SETTING_KEY_PUBLIC_BASE_URL,
  s3AccessKeyId: STORAGE_SETTING_KEY_S3_ACCESS_KEY_ID,
  s3Bucket: STORAGE_SETTING_KEY_S3_BUCKET,
  s3Endpoint: STORAGE_SETTING_KEY_S3_ENDPOINT,
  s3ForcePathStyle: STORAGE_SETTING_KEY_S3_FORCE_PATH_STYLE,
  s3Region: STORAGE_SETTING_KEY_S3_REGION,
  s3SecretAccessKey: STORAGE_SETTING_KEY_S3_SECRET_ACCESS_KEY
} as const

const sensitiveKeys = new Set<string>(STORAGE_SETTING_SENSITIVE_KEYS)
const allowedKeys = STORAGE_SETTING_KEYS

type PlatformSettingsDb = typeof appDb
type PlatformSettingsTransaction = Parameters<Parameters<PlatformSettingsDb["transaction"]>[0]>[0]
type PlatformSettingsWriteDb = PlatformSettingsDb | PlatformSettingsTransaction
type StorageSettingsSource = "database" | "default"

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
  const rows = await db.select().from(platformSetting).where(inArray(platformSetting.key, allowedKeys))
  const values = new Map(rows.map((row) => [row.key, row.value]))

  return {
    rows,
    values
  }
}

const getSecretValue = (values: Map<string, string>, key: string) => {
  const value = values.get(key)

  if (!value) {
    return undefined
  }

  return decryptSecret(value)
}

const assertSafeLocalPath = (localPath: string) => {
  const resolved = path.resolve(process.cwd(), localPath)
  const relative = path.relative(process.cwd(), resolved)

  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "本地上传路径必须位于项目工作目录内。" })
  }
}

export const getStorageSettings = async (db: PlatformSettingsDb) => {
  const { rows, values } = await getRows(db)
  const provider = storageProviderSchema.catch(STORAGE_PROVIDER_LOCAL).parse(values.get(keys.provider) ?? STORAGE_PROVIDER_LOCAL)

  return {
    localPath: values.get(keys.localPath) ?? DEFAULT_LOCAL_UPLOAD_PATH,
    provider,
    publicBaseUrl: values.get(keys.publicBaseUrl) ?? "",
    s3AccessKeyIdConfigured: Boolean(values.get(keys.s3AccessKeyId)),
    s3Bucket: values.get(keys.s3Bucket) ?? "",
    s3Endpoint: values.get(keys.s3Endpoint) ?? "",
    s3ForcePathStyle: toBoolean(values.get(keys.s3ForcePathStyle), false),
    s3Region: values.get(keys.s3Region) ?? "",
    s3SecretAccessKeyConfigured: Boolean(values.get(keys.s3SecretAccessKey)),
    source: (rows.length > 0 ? "database" : "default") satisfies StorageSettingsSource
  }
}

export const getEffectiveStorageProviderConfig = async (db: PlatformSettingsDb) => {
  const { values } = await getRows(db)
  const provider = storageProviderSchema.catch(STORAGE_PROVIDER_LOCAL).parse(values.get(keys.provider) ?? STORAGE_PROVIDER_LOCAL)

  return {
    local: {
      path: values.get(keys.localPath) ?? DEFAULT_LOCAL_UPLOAD_PATH
    },
    provider,
    publicBaseUrl: values.get(keys.publicBaseUrl) ?? "",
    s3: {
      accessKeyId: getSecretValue(values, keys.s3AccessKeyId),
      bucket: values.get(keys.s3Bucket) ?? "",
      endpoint: values.get(keys.s3Endpoint) ?? "",
      forcePathStyle: toBoolean(values.get(keys.s3ForcePathStyle), false),
      region: values.get(keys.s3Region) ?? "",
      secretAccessKey: getSecretValue(values, keys.s3SecretAccessKey)
    }
  }
}

const assertStorageConfigComplete = (input: UpdateStorageSettingsInput, existing: Awaited<ReturnType<typeof getStorageSettings>>) => {
  if (input.provider === STORAGE_PROVIDER_LOCAL) {
    if (!input.localPath) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "本地存储需要配置上传目录。" })
    }

    assertSafeLocalPath(input.localPath)
  }

  if (input.provider === STORAGE_PROVIDER_S3) {
    if (!input.s3Bucket) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "S3 存储需要配置 Bucket。" })
    }

    if (!input.s3Endpoint && !input.s3Region) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "S3 存储需要配置 Region 或 Endpoint。" })
    }

    if (!input.s3AccessKeyId && (!existing.s3AccessKeyIdConfigured || input.clearS3AccessKeyId)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "S3 存储需要配置 Access Key ID。" })
    }

    if (!input.s3SecretAccessKey && (!existing.s3SecretAccessKeyConfigured || input.clearS3SecretAccessKey)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "S3 存储需要配置 Secret Access Key。" })
    }
  }
}

const serializeSettingValue = (key: string, value: string) => (sensitiveKeys.has(key) ? encryptSecret(value) : value)

const upsertSetting = async (db: PlatformSettingsWriteDb, key: string, value: string, updatedBy: string) => {
  await db
    .insert(platformSetting)
    .values({
      key,
      updatedBy,
      value: serializeSettingValue(key, value)
    })
    .onConflictDoUpdate({
      set: {
        updatedAt: new Date(),
        updatedBy,
        value: serializeSettingValue(key, value)
      },
      target: platformSetting.key
    })
}

const deleteSetting = async (db: PlatformSettingsWriteDb, key: string) => {
  await db.delete(platformSetting).where(eq(platformSetting.key, key))
}

export const updateStorageSettings = async (db: PlatformSettingsDb, input: UpdateStorageSettingsInput, updatedBy: string) => {
  const existing = await getStorageSettings(db)
  assertStorageConfigComplete(input, existing)

  await db.transaction(async (tx) => {
    await upsertSetting(tx, keys.provider, input.provider, updatedBy)
    await upsertSetting(tx, keys.localPath, input.localPath ?? DEFAULT_LOCAL_UPLOAD_PATH, updatedBy)
    await upsertSetting(tx, keys.publicBaseUrl, input.publicBaseUrl ?? "", updatedBy)

    if (input.provider === STORAGE_PROVIDER_S3) {
      await upsertSetting(tx, keys.s3Endpoint, input.s3Endpoint ?? "", updatedBy)
      await upsertSetting(tx, keys.s3Region, input.s3Region ?? "", updatedBy)
      await upsertSetting(tx, keys.s3Bucket, input.s3Bucket ?? "", updatedBy)
      await upsertSetting(tx, keys.s3ForcePathStyle, String(input.s3ForcePathStyle), updatedBy)
    }

    if (input.s3AccessKeyId) {
      await upsertSetting(tx, keys.s3AccessKeyId, input.s3AccessKeyId, updatedBy)
    }

    if (input.s3SecretAccessKey) {
      await upsertSetting(tx, keys.s3SecretAccessKey, input.s3SecretAccessKey, updatedBy)
    }

    if (input.clearS3AccessKeyId && !input.s3AccessKeyId) {
      await deleteSetting(tx, keys.s3AccessKeyId)
    }

    if (input.clearS3SecretAccessKey && !input.s3SecretAccessKey) {
      await deleteSetting(tx, keys.s3SecretAccessKey)
    }
  })

  return getStorageSettings(db)
}
