# Platform Storage Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add platform-level file storage settings with Local and S3-compatible providers, upload testing, and first-use integration for profile avatars and organization logos.

**Architecture:** Reuse the existing `system_platform_setting` controlled key/value table and secret encryption pattern from email settings. Add a server-only storage service with provider adapters, expose storage settings through `adminPlatformSetting`, and use protected Next Route Handlers for multipart file uploads because tRPC procedures currently handle JSON payloads. Profile and organization pages keep their existing update mutations; upload handlers return the URL that those forms save into `system_user.image` and `system_organization.logo`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, tRPC 11, Drizzle ORM, Better Auth, Zod, shadcn/ui, Playwright, `@aws-sdk/client-s3`.

---

## File Structure

- Modify: `package.json`, `pnpm-lock.yaml`
  - Add `@aws-sdk/client-s3` for S3-compatible object operations.
- Modify: `src/lib/const.ts`
  - Add storage provider constants, platform setting keys, upload limits, allowed image MIME types, and route constants.
- Create: `src/server/service/platform-settings/storage-settings.ts`
  - Read, validate, persist, and resolve storage settings using `system_platform_setting`.
- Modify: `src/server/service/platform-settings/index.ts`
  - Re-export storage settings helpers.
- Create: `src/server/service/storage/types.ts`
  - Shared storage provider config, object input, result, and upload purpose types.
- Create: `src/server/service/storage/providers/local.ts`
  - Local filesystem provider with safe path resolution, write, delete, and URL generation.
- Create: `src/server/service/storage/providers/s3.ts`
  - S3-compatible provider using `@aws-sdk/client-s3`.
- Create: `src/server/service/storage/storage-service.ts`
  - Provider selection, file validation, object key construction, upload test, and public API.
- Create: `src/server/service/storage/index.ts`
  - Re-export storage service APIs.
- Modify: `src/server/api/routers/admin-platform-setting.ts`
  - Add storage settings query, update mutation, and upload test mutation.
- Modify: `src/app/dashboard/admin/settings/page.tsx`
  - Fetch initial storage settings with email settings.
- Modify: `src/app/dashboard/admin/settings/_components/platform-settings-content.tsx`
  - Render both email and storage cards.
- Create: `src/app/dashboard/admin/settings/_components/storage-settings-card.tsx`
  - Storage provider form, sensitive field handling, save, and upload test UI.
- Create: `src/app/api/uploads/_lib/upload-auth.ts`
  - Shared session and permission helpers for upload route handlers.
- Create: `src/app/api/uploads/avatar/route.ts`
  - Authenticated current-user avatar upload.
- Create: `src/app/api/uploads/org-logo/route.ts`
  - Organization logo upload with owner/admin/platform-admin authorization.
- Modify: `src/app/dashboard/settings/profile/_components/profile-form.tsx`
  - Add avatar file upload control and save returned URL to existing image field.
- Modify: `src/app/dashboard/orgs/[slug]/_components/org-setting-content.tsx`
  - Add organization logo file upload control and save returned URL to existing logo field.
- Modify: `e2e/helpers/db.ts`
  - Add helpers for storage setting cleanup and user/org image assertions if missing.
- Modify: `e2e/specs/18-dashboard-admin-platform-settings.spec.ts`
  - Add storage configuration and local upload test coverage.
- Modify: `e2e/specs/07-dashboard-settings-profile.spec.ts`
  - Add avatar upload coverage.
- Modify: `e2e/specs/10-dashboard-orgs-slug-settings.spec.ts`
  - Add organization logo upload coverage.

Do not run `pnpm db:generate`, `pnpm db:migrate`, or `pnpm db:push` during this implementation unless the user explicitly asks. The table already exists.

---

### Task 1: Add Storage Constants And S3 Dependency

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src/lib/const.ts`

- [ ] **Step 1: Add the S3 dependency**

Run:

```bash
pnpm add @aws-sdk/client-s3
```

Expected: `package.json` and `pnpm-lock.yaml` include `@aws-sdk/client-s3`.

- [ ] **Step 2: Add storage constants**

Modify `src/lib/const.ts` by adding this section near the platform settings constants:

```typescript
export const STORAGE_PROVIDER_LOCAL = "local"
export const STORAGE_PROVIDER_S3 = "s3"
export const STORAGE_PROVIDERS = [STORAGE_PROVIDER_LOCAL, STORAGE_PROVIDER_S3] as const
export type PlatformStorageProviderName = (typeof STORAGE_PROVIDERS)[number]

export const STORAGE_SETTING_KEY_PROVIDER = "storage.provider"
export const STORAGE_SETTING_KEY_LOCAL_PATH = "storage.local.path"
export const STORAGE_SETTING_KEY_PUBLIC_BASE_URL = "storage.publicBaseUrl"
export const STORAGE_SETTING_KEY_S3_ENDPOINT = "storage.s3.endpoint"
export const STORAGE_SETTING_KEY_S3_REGION = "storage.s3.region"
export const STORAGE_SETTING_KEY_S3_BUCKET = "storage.s3.bucket"
export const STORAGE_SETTING_KEY_S3_ACCESS_KEY_ID = "storage.s3.accessKeyId"
export const STORAGE_SETTING_KEY_S3_SECRET_ACCESS_KEY = "storage.s3.secretAccessKey"
export const STORAGE_SETTING_KEY_S3_FORCE_PATH_STYLE = "storage.s3.forcePathStyle"
export const STORAGE_SETTING_KEYS = [
  STORAGE_SETTING_KEY_PROVIDER,
  STORAGE_SETTING_KEY_LOCAL_PATH,
  STORAGE_SETTING_KEY_PUBLIC_BASE_URL,
  STORAGE_SETTING_KEY_S3_ENDPOINT,
  STORAGE_SETTING_KEY_S3_REGION,
  STORAGE_SETTING_KEY_S3_BUCKET,
  STORAGE_SETTING_KEY_S3_ACCESS_KEY_ID,
  STORAGE_SETTING_KEY_S3_SECRET_ACCESS_KEY,
  STORAGE_SETTING_KEY_S3_FORCE_PATH_STYLE
] as const
export const STORAGE_SETTING_SENSITIVE_KEYS = [STORAGE_SETTING_KEY_S3_ACCESS_KEY_ID, STORAGE_SETTING_KEY_S3_SECRET_ACCESS_KEY] as const

export const DEFAULT_LOCAL_UPLOAD_PATH = "./uploads"
export const UPLOAD_MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const UPLOAD_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] as const
export type UploadImageMimeType = (typeof UPLOAD_IMAGE_MIME_TYPES)[number]
export const UPLOAD_PURPOSE_AVATAR = "avatars"
export const UPLOAD_PURPOSE_ORG_LOGO = "organization-logos"
export const UPLOAD_PURPOSE_PLATFORM_TEST = "platform-settings"
export const UPLOAD_PURPOSES = [UPLOAD_PURPOSE_AVATAR, UPLOAD_PURPOSE_ORG_LOGO, UPLOAD_PURPOSE_PLATFORM_TEST] as const
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number]
export const ROUTE_API_UPLOAD_AVATAR = "/api/uploads/avatar"
export const ROUTE_API_UPLOAD_ORG_LOGO = "/api/uploads/org-logo"
```

- [ ] **Step 3: Verify constants compile**

Run:

```bash
pnpm typecheck
```

Expected: TypeScript succeeds, or only fails because later tasks have not been implemented if the constants are already referenced.

---

### Task 2: Implement Storage Settings Service

**Files:**
- Create: `src/server/service/platform-settings/storage-settings.ts`
- Modify: `src/server/service/platform-settings/index.ts`

- [ ] **Step 1: Create failing type surface by importing the future service**

Temporarily add this import to `src/server/api/routers/admin-platform-setting.ts`:

```typescript
import { getStorageSettings, testStorageUploadSchema, updateStorageSettings, updateStorageSettingsSchema } from "@/server/service/platform-settings"
```

Run:

```bash
pnpm typecheck
```

Expected: FAIL with missing exports from `@/server/service/platform-settings`.

- [ ] **Step 2: Create `storage-settings.ts`**

Create `src/server/service/platform-settings/storage-settings.ts` with this service shape:

```typescript
import "server-only"

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

type PlatformSettingsDb = typeof appDb
type PlatformSettingsTransaction = Parameters<Parameters<PlatformSettingsDb["transaction"]>[0]>[0]
type PlatformSettingsWriteDb = PlatformSettingsDb | PlatformSettingsTransaction

export const storageProviderSchema = z.enum(STORAGE_PROVIDERS)

export const updateStorageSettingsSchema = z.object({
  clearS3AccessKeyId: z.boolean().default(false),
  clearS3SecretAccessKey: z.boolean().default(false),
  localPath: z.string().trim().min(1, "本地上传路径不能为空。"),
  provider: storageProviderSchema,
  publicBaseUrl: z.string().trim().optional(),
  s3AccessKeyId: z.string().trim().optional(),
  s3Bucket: z.string().trim().optional(),
  s3Endpoint: z.string().trim().optional(),
  s3ForcePathStyle: z.boolean().default(false),
  s3Region: z.string().trim().optional(),
  s3SecretAccessKey: z.string().trim().optional()
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

const toBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === "true") {
    return true
  }

  if (value === "false") {
    return false
  }

  return fallback
}

const getRows = async (db: PlatformSettingsDb) => {
  const rows = await db.select().from(platformSetting).where(inArray(platformSetting.key, STORAGE_SETTING_KEYS))
  const values = new Map(rows.map((row) => [row.key, row.value]))

  return { rows, values }
}

const getSecretValue = (values: Map<string, string>, key: string) => {
  const value = values.get(key)

  return value ? decryptSecret(value) : undefined
}

const serializeSettingValue = (key: string, value: string) => (sensitiveKeys.has(key) ? encryptSecret(value) : value)

const upsertSetting = async (db: PlatformSettingsWriteDb, key: string, value: string, updatedBy: string) => {
  await db
    .insert(platformSetting)
    .values({ key, updatedBy, value: serializeSettingValue(key, value) })
    .onConflictDoUpdate({
      set: { updatedAt: new Date(), updatedBy, value: serializeSettingValue(key, value) },
      target: platformSetting.key
    })
}

const deleteSetting = async (db: PlatformSettingsWriteDb, key: string) => {
  await db.delete(platformSetting).where(eq(platformSetting.key, key))
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
    source: rows.length > 0 ? "database" : "default"
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
      bucket: values.get(keys.s3Bucket),
      endpoint: values.get(keys.s3Endpoint) || undefined,
      forcePathStyle: toBoolean(values.get(keys.s3ForcePathStyle), false),
      region: values.get(keys.s3Region) || "auto",
      secretAccessKey: getSecretValue(values, keys.s3SecretAccessKey)
    }
  }
}

const assertStorageConfigComplete = (input: UpdateStorageSettingsInput, existing: Awaited<ReturnType<typeof getStorageSettings>>) => {
  if (input.provider === STORAGE_PROVIDER_LOCAL && !input.localPath) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "本地上传模式需要配置上传路径。" })
  }

  if (input.provider === STORAGE_PROVIDER_S3) {
    if (!input.s3Bucket) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "S3 模式需要配置 Bucket。" })
    }

    if (!input.s3AccessKeyId && (!existing.s3AccessKeyIdConfigured || input.clearS3AccessKeyId)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "S3 模式需要配置 Access Key。" })
    }

    if (!input.s3SecretAccessKey && (!existing.s3SecretAccessKeyConfigured || input.clearS3SecretAccessKey)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "S3 模式需要配置 Secret Key。" })
    }
  }
}

export const updateStorageSettings = async (db: PlatformSettingsDb, input: UpdateStorageSettingsInput, updatedBy: string) => {
  const existing = await getStorageSettings(db)
  assertStorageConfigComplete(input, existing)

  await db.transaction(async (tx) => {
    await upsertSetting(tx, keys.provider, input.provider, updatedBy)
    await upsertSetting(tx, keys.localPath, input.localPath, updatedBy)
    await upsertSetting(tx, keys.publicBaseUrl, input.publicBaseUrl ?? "", updatedBy)
    await upsertSetting(tx, keys.s3Endpoint, input.s3Endpoint ?? "", updatedBy)
    await upsertSetting(tx, keys.s3Region, input.s3Region ?? "", updatedBy)
    await upsertSetting(tx, keys.s3Bucket, input.s3Bucket ?? "", updatedBy)
    await upsertSetting(tx, keys.s3ForcePathStyle, String(input.s3ForcePathStyle), updatedBy)

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
```

- [ ] **Step 3: Export storage settings helpers**

Modify `src/server/service/platform-settings/index.ts`:

```typescript
export * from "./email-settings"
export * from "./storage-settings"
```

- [ ] **Step 4: Verify the missing export failure is gone**

Run:

```bash
pnpm typecheck
```

Expected: the earlier missing export error is gone. New failures may remain until router procedures are wired.

---

### Task 3: Implement Storage Provider Service

**Files:**
- Create: `src/server/service/storage/types.ts`
- Create: `src/server/service/storage/providers/local.ts`
- Create: `src/server/service/storage/providers/s3.ts`
- Create: `src/server/service/storage/storage-service.ts`
- Create: `src/server/service/storage/index.ts`

- [ ] **Step 1: Create storage types**

Create `src/server/service/storage/types.ts`:

```typescript
import type { PlatformStorageProviderName, UploadPurpose } from "@/lib/const"

export type StorageObjectInput = {
  body: Buffer
  contentType: string
  key: string
}

export type StoredObject = {
  key: string
  provider: PlatformStorageProviderName
  url: string
}

export type StorageProvider = {
  deleteObject: (key: string) => Promise<void>
  getPublicUrl: (key: string) => string
  putObject: (input: StorageObjectInput) => Promise<StoredObject>
}

export type StorageUploadInput = {
  body: Buffer
  contentType: string
  extension: string
  filenamePrefix: string
  purpose: UploadPurpose
}
```

- [ ] **Step 2: Implement local provider**

Create `src/server/service/storage/providers/local.ts`:

```typescript
import "server-only"

import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"

import { STORAGE_PROVIDER_LOCAL } from "@/lib/const"
import type { StorageObjectInput, StorageProvider, StoredObject } from "../types"

const projectRoot = process.cwd()

const normalizePublicBaseUrl = (value: string) => value.replace(/\/+$/, "")

const resolveLocalRoot = (configuredPath: string) => {
  const resolved = path.resolve(projectRoot, configuredPath)
  const allowedRoot = path.resolve(projectRoot)

  if (!resolved.startsWith(allowedRoot)) {
    throw new Error("Local upload path must stay inside the project workspace.")
  }

  return resolved
}

export const createLocalStorageProvider = ({ localPath, publicBaseUrl }: { localPath: string; publicBaseUrl: string }): StorageProvider => {
  const root = resolveLocalRoot(localPath)

  const resolveObjectPath = (key: string) => {
    const resolved = path.resolve(root, key)

    if (!resolved.startsWith(root)) {
      throw new Error("Invalid storage object key.")
    }

    return resolved
  }

  const getPublicUrl = (key: string) => {
    const baseUrl = normalizePublicBaseUrl(publicBaseUrl)

    return baseUrl ? `${baseUrl}/${key}` : `/api/uploads/local/${key}`
  }

  return {
    deleteObject: async (key) => {
      await rm(resolveObjectPath(key), { force: true })
    },
    getPublicUrl,
    putObject: async (input: StorageObjectInput): Promise<StoredObject> => {
      const objectPath = resolveObjectPath(input.key)
      await mkdir(path.dirname(objectPath), { recursive: true })
      await writeFile(objectPath, input.body)

      return {
        key: input.key,
        provider: STORAGE_PROVIDER_LOCAL,
        url: getPublicUrl(input.key)
      }
    }
  }
}
```

- [ ] **Step 3: Implement S3 provider**

Create `src/server/service/storage/providers/s3.ts`:

```typescript
import "server-only"

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

import { STORAGE_PROVIDER_S3 } from "@/lib/const"
import type { StorageObjectInput, StorageProvider, StoredObject } from "../types"

type S3StorageProviderInput = {
  accessKeyId: string
  bucket: string
  endpoint?: string
  forcePathStyle: boolean
  publicBaseUrl: string
  region: string
  secretAccessKey: string
}

const normalizePublicBaseUrl = (value: string) => value.replace(/\/+$/, "")

export const createS3StorageProvider = (input: S3StorageProviderInput): StorageProvider => {
  const client = new S3Client({
    credentials: {
      accessKeyId: input.accessKeyId,
      secretAccessKey: input.secretAccessKey
    },
    endpoint: input.endpoint || undefined,
    forcePathStyle: input.forcePathStyle,
    region: input.region
  })

  const getPublicUrl = (key: string) => {
    const baseUrl = normalizePublicBaseUrl(input.publicBaseUrl)

    if (baseUrl) {
      return `${baseUrl}/${key}`
    }

    if (input.endpoint) {
      const endpoint = normalizePublicBaseUrl(input.endpoint)
      return input.forcePathStyle ? `${endpoint}/${input.bucket}/${key}` : `${endpoint}/${key}`
    }

    return `https://${input.bucket}.s3.${input.region}.amazonaws.com/${key}`
  }

  return {
    deleteObject: async (key) => {
      await client.send(new DeleteObjectCommand({ Bucket: input.bucket, Key: key }))
    },
    getPublicUrl,
    putObject: async (object: StorageObjectInput): Promise<StoredObject> => {
      await client.send(
        new PutObjectCommand({
          Body: object.body,
          Bucket: input.bucket,
          ContentType: object.contentType,
          Key: object.key
        })
      )

      return {
        key: object.key,
        provider: STORAGE_PROVIDER_S3,
        url: getPublicUrl(object.key)
      }
    }
  }
}
```

- [ ] **Step 4: Implement service orchestration**

Create `src/server/service/storage/storage-service.ts`:

```typescript
import "server-only"

import crypto from "node:crypto"

import { TRPCError } from "@trpc/server"

import {
  STORAGE_PROVIDER_LOCAL,
  STORAGE_PROVIDER_S3,
  UPLOAD_IMAGE_MIME_TYPES,
  UPLOAD_MAX_IMAGE_BYTES,
  UPLOAD_PURPOSE_PLATFORM_TEST,
  type UploadPurpose
} from "@/lib/const"
import { db } from "@/server/db"
import { getEffectiveStorageProviderConfig } from "@/server/service/platform-settings"
import { createLocalStorageProvider } from "./providers/local"
import { createS3StorageProvider } from "./providers/s3"
import type { StorageProvider, StorageUploadInput, StoredObject } from "./types"

const mimeExtensionMap = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp"
} as const

const sanitizeFilenamePart = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 80)

const createObjectKey = ({ extension, filenamePrefix, purpose }: { extension: string; filenamePrefix: string; purpose: UploadPurpose }) => {
  const random = crypto.randomUUID()
  const safePrefix = sanitizeFilenamePart(filenamePrefix)

  return `${purpose}/${safePrefix}-${random}.${extension}`
}

export const assertAllowedImageUpload = ({ contentType, size }: { contentType: string; size: number }) => {
  if (!UPLOAD_IMAGE_MIME_TYPES.some((item) => item === contentType)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "只支持 PNG、JPG、WebP 或 SVG 图片。" })
  }

  if (size > UPLOAD_MAX_IMAGE_BYTES) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "图片不能超过 2 MB。" })
  }

  return mimeExtensionMap[contentType as keyof typeof mimeExtensionMap]
}

const getProvider = async (): Promise<StorageProvider> => {
  const config = await getEffectiveStorageProviderConfig(db)

  if (config.provider === STORAGE_PROVIDER_LOCAL) {
    return createLocalStorageProvider({ localPath: config.local.path, publicBaseUrl: config.publicBaseUrl })
  }

  if (config.provider === STORAGE_PROVIDER_S3) {
    if (!config.s3.accessKeyId || !config.s3.secretAccessKey || !config.s3.bucket) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "S3 文件存储配置不完整。" })
    }

    return createS3StorageProvider({
      accessKeyId: config.s3.accessKeyId,
      bucket: config.s3.bucket,
      endpoint: config.s3.endpoint,
      forcePathStyle: config.s3.forcePathStyle,
      publicBaseUrl: config.publicBaseUrl,
      region: config.s3.region,
      secretAccessKey: config.s3.secretAccessKey
    })
  }

  throw new TRPCError({ code: "BAD_REQUEST", message: "文件存储配置不可用。" })
}

export const uploadObject = async (input: StorageUploadInput): Promise<StoredObject> => {
  const provider = await getProvider()
  const key = createObjectKey({ extension: input.extension, filenamePrefix: input.filenamePrefix, purpose: input.purpose })

  return provider.putObject({
    body: input.body,
    contentType: input.contentType,
    key
  })
}

export const testStorageUpload = async () => {
  const provider = await getProvider()
  const key = `${UPLOAD_PURPOSE_PLATFORM_TEST}/test-${Date.now()}-${crypto.randomUUID()}.txt`
  const result = await provider.putObject({
    body: Buffer.from(`Lever Admin storage test ${new Date().toISOString()}`),
    contentType: "text/plain; charset=utf-8",
    key
  })
  await provider.deleteObject(key)

  return result
}
```

- [ ] **Step 5: Export storage service**

Create `src/server/service/storage/index.ts`:

```typescript
export * from "./storage-service"
export type * from "./types"
```

- [ ] **Step 6: Verify service compiles**

Run:

```bash
pnpm typecheck
```

Expected: no storage service type errors.

---

### Task 4: Add Admin Storage Procedures And Settings UI

**Files:**
- Modify: `src/server/api/routers/admin-platform-setting.ts`
- Modify: `src/app/dashboard/admin/settings/page.tsx`
- Modify: `src/app/dashboard/admin/settings/_components/platform-settings-content.tsx`
- Create: `src/app/dashboard/admin/settings/_components/storage-settings-card.tsx`

- [ ] **Step 1: Add failing E2E coverage for the settings page**

Append to `e2e/specs/18-dashboard-admin-platform-settings.spec.ts`:

```typescript
test("shows default storage settings and saves local storage provider", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

  await deletePlatformSettings()
  await signInAsRole(page, "dashboard-admin-settings-storage-local", "super_admin")

  await page.goto("/dashboard/admin/settings")

  await expect(page.getByRole("main").getByText("文件存储")).toBeVisible()
  await expect(page.getByLabel("存储方式")).toContainText("Local")
  await page.getByLabel("本地上传路径").fill("./uploads/e2e-platform-settings")
  await page.getByRole("button", { name: "保存文件存储配置" }).click()

  await expect(toastWithText(page, "文件存储配置已保存。")).toBeVisible()
  await expect.poll(() => getPlatformSettingValue("storage.provider")).toBe("local")
  await expect.poll(() => getPlatformSettingValue("storage.local.path")).toBe("./uploads/e2e-platform-settings")
})

test("runs local storage upload test", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

  await deletePlatformSettings()
  await upsertPlatformSetting({ key: "storage.provider", value: "local" })
  await upsertPlatformSetting({ key: "storage.local.path", value: "./uploads/e2e-platform-test" })
  await signInAsRole(page, "dashboard-admin-settings-storage-test", "super_admin")

  await page.goto("/dashboard/admin/settings")
  await page.getByRole("button", { name: "执行上传测试" }).click()

  await expect(toastWithText(page, "上传测试已通过 local 完成。")).toBeVisible()
  await expect(page.getByText("最近上传测试成功")).toBeVisible()
})

test("saves s3 storage without exposing secrets", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

  await deletePlatformSettings()
  await signInAsRole(page, "dashboard-admin-settings-storage-s3", "super_admin")

  await page.goto("/dashboard/admin/settings")
  await page.getByLabel("存储方式").click()
  await page.getByRole("option", { name: "S3" }).click()
  await page.getByLabel("S3 Bucket").fill("lever-admin-e2e")
  await page.getByLabel("S3 Region").fill("us-east-1")
  await page.getByLabel("S3 Access Key").fill("access-key-e2e")
  await page.getByLabel("S3 Secret Key").fill("secret-key-e2e")
  await page.getByRole("button", { name: "保存文件存储配置" }).click()

  await expect(toastWithText(page, "文件存储配置已保存。")).toBeVisible()
  await expect(page.getByLabel("S3 Access Key")).toHaveValue("")
  await expect(page.getByLabel("S3 Secret Key")).toHaveValue("")
  await expect.poll(() => getPlatformSettingValue("storage.provider")).toBe("s3")
  await expect
    .poll(async () => {
      const value = await getPlatformSettingValue("storage.s3.secretAccessKey")

      return value?.startsWith("enc:v1:")
    })
    .toBe(true)
})
```

- [ ] **Step 2: Run the E2E spec and verify the new tests fail**

Run:

```bash
pnpm test:e2e -- e2e/specs/18-dashboard-admin-platform-settings.spec.ts --project=chromium
```

Expected: FAIL because the file storage UI/procedures are not implemented.

- [ ] **Step 3: Add router procedures**

Modify `src/server/api/routers/admin-platform-setting.ts`:

```typescript
import { testStorageUpload } from "@/server/service/storage"
import {
  getEmailSettings,
  getStorageSettings,
  testEmailSchema,
  testStorageUploadSchema,
  updateEmailSettings,
  updateEmailSettingsSchema,
  updateStorageSettings,
  updateStorageSettingsSchema
} from "@/server/service/platform-settings"
```

Add procedures inside `adminPlatformSettingRouter`:

```typescript
getStorageSettings: adminProcedure.query(async ({ ctx }) => {
  assertSuperAdmin(ctx.session.user.role)

  return getStorageSettings(ctx.db)
}),

testStorageUpload: adminProcedure.input(testStorageUploadSchema).mutation(async ({ ctx }) => {
  assertSuperAdmin(ctx.session.user.role)

  try {
    const result = await testStorageUpload()

    return {
      key: result.key,
      provider: result.provider,
      success: true,
      url: result.url
    }
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "上传测试失败，请检查文件存储配置。" })
  }
}),

updateStorageSettings: adminProcedure.input(updateStorageSettingsSchema).mutation(async ({ ctx, input }) => {
  assertSuperAdmin(ctx.session.user.role)

  return updateStorageSettings(ctx.db, input, ctx.session.user.id)
})
```

- [ ] **Step 4: Fetch initial storage settings**

Modify `src/app/dashboard/admin/settings/page.tsx`:

```typescript
const AdminPlatformSettingsPage = async () => {
  const [initialEmailSettings, initialStorageSettings] = await Promise.all([api.adminPlatformSetting.getEmailSettings(), api.adminPlatformSetting.getStorageSettings()])

  return <PlatformSettingsContent initialEmailSettings={initialEmailSettings} initialStorageSettings={initialStorageSettings} />
}
```

- [ ] **Step 5: Render storage card**

Modify `src/app/dashboard/admin/settings/_components/platform-settings-content.tsx`:

```typescript
"use client"

import type { RouterOutputs } from "@/trpc/react"
import { EmailSettingsCard } from "./email-settings-card"
import { StorageSettingsCard } from "./storage-settings-card"

type EmailSettings = RouterOutputs["adminPlatformSetting"]["getEmailSettings"]
type StorageSettings = RouterOutputs["adminPlatformSetting"]["getStorageSettings"]

export const PlatformSettingsContent = ({
  initialEmailSettings,
  initialStorageSettings
}: {
  initialEmailSettings: EmailSettings
  initialStorageSettings: StorageSettings
}) => (
  <div className="space-y-5 text-[13px]">
    <div>
      <h1 className="font-bold text-2xl tracking-normal">平台设置</h1>
      <p className="mt-2 text-muted-foreground text-xs">管理邮件服务、文件存储与连通性测试。</p>
    </div>
    <EmailSettingsCard initialEmailSettings={initialEmailSettings} />
    <StorageSettingsCard initialStorageSettings={initialStorageSettings} />
  </div>
)
```

- [ ] **Step 6: Create storage settings card**

Create `src/app/dashboard/admin/settings/_components/storage-settings-card.tsx` using the same patterns as `email-settings-card.tsx`. The component must include:

```typescript
"use client"

import { Database, Save, ShieldAlert, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { STORAGE_PROVIDER_LOCAL, STORAGE_PROVIDER_S3, STORAGE_PROVIDERS } from "@/lib/const"
import { api, type RouterOutputs } from "@/trpc/react"

type StorageSettings = RouterOutputs["adminPlatformSetting"]["getStorageSettings"]
type Provider = StorageSettings["provider"]
type FieldErrors = Partial<
  Record<"localPath" | "provider" | "publicBaseUrl" | "s3AccessKeyId" | "s3Bucket" | "s3Endpoint" | "s3Region" | "s3SecretAccessKey", string>
>

const formSchema = z.object({
  localPath: z.string().trim().min(1, "本地上传路径不能为空。"),
  provider: z.enum(STORAGE_PROVIDERS),
  publicBaseUrl: z.string().trim(),
  s3AccessKeyId: z.string().trim(),
  s3Bucket: z.string().trim(),
  s3Endpoint: z.string().trim(),
  s3ForcePathStyle: z.boolean(),
  s3Region: z.string().trim(),
  s3SecretAccessKey: z.string().trim()
})
```

The render must provide accessible labels exactly used by E2E:

```tsx
<Label htmlFor="storage-provider">存储方式</Label>
<Label htmlFor="storage-local-path">本地上传路径</Label>
<Label htmlFor="storage-public-base-url">公开访问基础 URL</Label>
<Label htmlFor="storage-s3-bucket">S3 Bucket</Label>
<Label htmlFor="storage-s3-region">S3 Region</Label>
<Label htmlFor="storage-s3-endpoint">S3 Endpoint</Label>
<Label htmlFor="storage-s3-access-key-id">S3 Access Key</Label>
<Label htmlFor="storage-s3-secret-access-key">S3 Secret Key</Label>
```

The save mutation must call:

```typescript
update.mutate({
  ...parsed.data,
  clearS3AccessKeyId: parsed.data.provider === STORAGE_PROVIDER_S3 ? clearS3AccessKeyId : false,
  clearS3SecretAccessKey: parsed.data.provider === STORAGE_PROVIDER_S3 ? clearS3SecretAccessKey : false,
  s3AccessKeyId: parsed.data.provider === STORAGE_PROVIDER_S3 ? parsed.data.s3AccessKeyId : "",
  s3SecretAccessKey: parsed.data.provider === STORAGE_PROVIDER_S3 ? parsed.data.s3SecretAccessKey : ""
})
```

The upload test button must call:

```typescript
const testUpload = api.adminPlatformSetting.testStorageUpload.useMutation({
  onError: (error) => toast.error(error.message),
  onSuccess: (result) => {
    setLastTestResult(result)
    toast.success(`上传测试已通过 ${result.provider} 完成。`)
  }
})
```

- [ ] **Step 7: Run settings tests**

Run:

```bash
pnpm test:e2e -- e2e/specs/18-dashboard-admin-platform-settings.spec.ts --project=chromium
```

Expected: PASS for existing email tests and new storage settings tests.

---

### Task 5: Add Protected Upload Route Handlers

**Files:**
- Create: `src/app/api/uploads/_lib/upload-auth.ts`
- Create: `src/app/api/uploads/avatar/route.ts`
- Create: `src/app/api/uploads/org-logo/route.ts`

- [ ] **Step 1: Create shared route auth helper**

Create `src/app/api/uploads/_lib/upload-auth.ts`:

```typescript
import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"

import { ORGANIZATION_ADMIN_ROLES, PLATFORM_ADMIN_ROLES } from "@/lib/const"
import { auth } from "@/server/better-auth"
import { db } from "@/server/db"
import { member, organization } from "@/server/db/schema"

export const getUploadSession = async (request: Request) => {
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true }
  })

  if (!session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录。" })
  }

  return session
}

const hasPlatformAdminRole = (role: string | null | undefined) => PLATFORM_ADMIN_ROLES.some((item) => item === role)
const hasOrgAdminRole = (role: string | null | undefined) => ORGANIZATION_ADMIN_ROLES.some((item) => item === role)

export const assertCanUploadOrgLogo = async ({ request, slug }: { request: Request; slug: string }) => {
  const session = await getUploadSession(request)

  if (hasPlatformAdminRole("role" in session.user ? session.user.role : undefined)) {
    return { session }
  }

  const [row] = await db
    .select({ memberRole: member.role })
    .from(organization)
    .innerJoin(member, and(eq(member.organizationId, organization.id), eq(member.userId, session.user.id)))
    .where(eq(organization.slug, slug))
    .limit(1)

  if (!row || !hasOrgAdminRole(row.memberRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "没有上传组织 Logo 的权限。" })
  }

  return { session }
}

export const toErrorResponse = (error: unknown) => {
  if (error instanceof TRPCError) {
    return Response.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400 })
  }

  return Response.json({ message: "上传失败，请稍后重试。" }, { status: 400 })
}
```

- [ ] **Step 2: Create avatar upload route**

Create `src/app/api/uploads/avatar/route.ts`:

```typescript
import { UPLOAD_PURPOSE_AVATAR } from "@/lib/const"
import { assertAllowedImageUpload, uploadObject } from "@/server/service/storage"
import { getUploadSession, toErrorResponse } from "../_lib/upload-auth"

export const POST = async (request: Request) => {
  try {
    const session = await getUploadSession(request)
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return Response.json({ message: "请选择要上传的头像文件。" }, { status: 400 })
    }

    const body = Buffer.from(await file.arrayBuffer())
    const extension = assertAllowedImageUpload({ contentType: file.type, size: body.byteLength })
    const result = await uploadObject({
      body,
      contentType: file.type,
      extension,
      filenamePrefix: session.user.id,
      purpose: UPLOAD_PURPOSE_AVATAR
    })

    return Response.json(result)
  } catch (error) {
    return toErrorResponse(error)
  }
}
```

- [ ] **Step 3: Create organization logo upload route**

Create `src/app/api/uploads/org-logo/route.ts`:

```typescript
import { UPLOAD_PURPOSE_ORG_LOGO } from "@/lib/const"
import { assertAllowedImageUpload, uploadObject } from "@/server/service/storage"
import { assertCanUploadOrgLogo, toErrorResponse } from "../_lib/upload-auth"

export const POST = async (request: Request) => {
  try {
    const formData = await request.formData()
    const slug = String(formData.get("slug") ?? "")
    const file = formData.get("file")

    if (!slug) {
      return Response.json({ message: "缺少组织 slug。" }, { status: 400 })
    }

    await assertCanUploadOrgLogo({ request, slug })

    if (!(file instanceof File)) {
      return Response.json({ message: "请选择要上传的 Logo 文件。" }, { status: 400 })
    }

    const body = Buffer.from(await file.arrayBuffer())
    const extension = assertAllowedImageUpload({ contentType: file.type, size: body.byteLength })
    const result = await uploadObject({
      body,
      contentType: file.type,
      extension,
      filenamePrefix: slug,
      purpose: UPLOAD_PURPOSE_ORG_LOGO
    })

    return Response.json(result)
  } catch (error) {
    return toErrorResponse(error)
  }
}
```

- [ ] **Step 4: Verify route handlers compile**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

---

### Task 6: Integrate Avatar Upload On Profile Page

**Files:**
- Modify: `src/app/dashboard/settings/profile/_components/profile-form.tsx`
- Modify: `e2e/specs/07-dashboard-settings-profile.spec.ts`

- [ ] **Step 1: Add failing E2E coverage**

Append to `e2e/specs/07-dashboard-settings-profile.spec.ts`:

```typescript
test("uploads an avatar image through platform storage", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

  const email = await createVerifiedUser(page, "profile-avatar-upload")

  await page.goto("/sign-in")
  await signInViaUi(page, { email })
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto("/dashboard/settings/profile")

  await page.getByLabel("上传头像").setInputFiles({
    buffer: Buffer.from("avatar-e2e"),
    mimeType: "image/png",
    name: "avatar.png"
  })

  await expect(page.getByText("头像已上传。")).toBeVisible()
  await page.getByRole("button", { name: "保存资料" }).click()
  await expect(page.getByText("个人资料已更新。")).toBeVisible()
  await expect(page.getByLabel("头像 URL")).toHaveValue(/\/avatars\//)
})
```

- [ ] **Step 2: Run profile E2E and verify failure**

Run:

```bash
pnpm test:e2e -- e2e/specs/07-dashboard-settings-profile.spec.ts --project=chromium
```

Expected: FAIL because `上传头像` input is not present.

- [ ] **Step 3: Add upload UI and handler**

In `src/app/dashboard/settings/profile/_components/profile-form.tsx`, add:

```typescript
import { Upload } from "lucide-react"
import { ROUTE_API_UPLOAD_AVATAR } from "@/lib/const"
```

Add state:

```typescript
const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
```

Add handler:

```typescript
const handleAvatarUpload = async (file: File | undefined) => {
  if (!file) {
    return
  }

  setIsUploadingAvatar(true)

  try {
    const formData = new FormData()
    formData.set("file", file)
    const response = await fetch(ROUTE_API_UPLOAD_AVATAR, { body: formData, method: "POST" })
    const payload = (await response.json()) as { message?: string; url?: string }

    if (!response.ok || !payload.url) {
      toast.error(payload.message ?? "头像上传失败。")
      return
    }

    setImage(payload.url)
    toast.success("头像已上传。")
  } finally {
    setIsUploadingAvatar(false)
  }
}
```

Add file input near the avatar URL input:

```tsx
<div className="space-y-2">
  <Label htmlFor="profile-avatar-upload">上传头像</Label>
  <Input
    accept="image/png,image/jpeg,image/webp,image/svg+xml"
    disabled={isUploadingAvatar || mutation.isPending}
    id="profile-avatar-upload"
    onChange={(event) => handleAvatarUpload(event.target.files?.[0])}
    type="file"
  />
  <p className="text-muted-foreground text-xs">支持 PNG、JPG、WebP、SVG，最大 2 MB。</p>
</div>
```

- [ ] **Step 4: Run profile E2E**

Run:

```bash
pnpm test:e2e -- e2e/specs/07-dashboard-settings-profile.spec.ts --project=chromium
```

Expected: PASS.

---

### Task 7: Integrate Organization Logo Upload

**Files:**
- Modify: `src/app/dashboard/orgs/[slug]/_components/org-setting-content.tsx`
- Modify: `e2e/specs/10-dashboard-orgs-slug-settings.spec.ts`

- [ ] **Step 1: Add failing E2E coverage**

Append to `e2e/specs/10-dashboard-orgs-slug-settings.spec.ts`:

```typescript
test("uploads organization logo from settings page", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "DB-backed organization flow only needs one browser project")

  const email = await createVerifiedUser(page, "dashboard-org-logo-upload")
  const slug = `org-logo-upload-${Date.now()}`
  const { rootId } = await seedOrganizationWithDepartments({
    departmentName: "Logo Upload Department E2E",
    rootName: "Logo Upload Root E2E",
    rootSlug: slug
  })
  await addOrganizationMemberByEmail({ email, organizationId: rootId, role: "owner" })

  await page.goto("/sign-in")
  await signInViaUi(page, { email })
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto(`/dashboard/orgs/${slug}/setting`)

  await page.getByLabel("上传 Logo").setInputFiles({
    buffer: Buffer.from("logo-e2e"),
    mimeType: "image/png",
    name: "logo.png"
  })

  await expect(page.getByText("Logo 已上传。")).toBeVisible()
  await page.getByRole("button", { name: "保存" }).click()
  await expect(page.getByText("组织信息已保存。")).toBeVisible()
  await expect(page.getByLabel("Logo URL")).toHaveValue(/\/organization-logos\//)
})
```

- [ ] **Step 2: Run the org E2E and verify failure**

Run:

```bash
pnpm test:e2e -- e2e/specs/10-dashboard-orgs-slug-settings.spec.ts --project=chromium --grep "uploads organization logo"
```

Expected: FAIL because `上传 Logo` input is not present.

- [ ] **Step 3: Add upload UI and handler**

In `src/app/dashboard/orgs/[slug]/_components/org-setting-content.tsx`, add:

```typescript
import { ROUTE_API_UPLOAD_ORG_LOGO } from "@/lib/const"
```

Add state:

```typescript
const [isUploadingLogo, setIsUploadingLogo] = useState(false)
```

Add handler:

```typescript
const handleLogoUpload = async (file: File | undefined) => {
  if (!file) {
    return
  }

  setIsUploadingLogo(true)

  try {
    const formData = new FormData()
    formData.set("file", file)
    formData.set("slug", slug)
    const response = await fetch(ROUTE_API_UPLOAD_ORG_LOGO, { body: formData, method: "POST" })
    const payload = (await response.json()) as { message?: string; url?: string }

    if (!response.ok || !payload.url) {
      toast.error(payload.message ?? "Logo 上传失败。")
      return
    }

    setLogo(payload.url)
    toast.success("Logo 已上传。")
  } finally {
    setIsUploadingLogo(false)
  }
}
```

Add file input near the Logo URL input:

```tsx
<div className="space-y-2">
  <Label htmlFor="org-logo-upload">上传 Logo</Label>
  <Input
    accept="image/png,image/jpeg,image/webp,image/svg+xml"
    disabled={isUploadingLogo || update.isPending}
    id="org-logo-upload"
    onChange={(event) => handleLogoUpload(event.target.files?.[0])}
    type="file"
  />
  <p className="text-muted-foreground text-xs">支持 PNG、JPG、WebP、SVG，最大 2 MB。</p>
</div>
```

- [ ] **Step 4: Run the focused org logo E2E**

Run:

```bash
pnpm test:e2e -- e2e/specs/10-dashboard-orgs-slug-settings.spec.ts --project=chromium --grep "uploads organization logo"
```

Expected: PASS.

---

### Task 8: Tighten E2E Helpers And Cleanup

**Files:**
- Modify: `e2e/helpers/db.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Extend platform setting cleanup**

Modify `deletePlatformSettings` in `e2e/helpers/db.ts` so it removes both email and storage keys:

```typescript
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
```

- [ ] **Step 2: Ignore local upload artifacts**

Add this line to `.gitignore`:

```gitignore
uploads/
```

- [ ] **Step 3: Remove accidental test files**

Run:

```bash
Get-ChildItem -Recurse -Path uploads -ErrorAction SilentlyContinue
```

Expected: The directory may exist, but upload test objects under `platform-settings/` should be cleaned by `testStorageUpload`.

---

### Task 9: Final Verification

**Files:**
- All files touched by previous tasks.

- [ ] **Step 1: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 2: Run Biome**

Run:

```bash
pnpm check
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 4: Run focused E2E specs**

Run:

```bash
pnpm test:e2e -- e2e/specs/18-dashboard-admin-platform-settings.spec.ts e2e/specs/07-dashboard-settings-profile.spec.ts e2e/specs/10-dashboard-orgs-slug-settings.spec.ts --project=chromium
```

Expected: PASS. If Docker is unavailable for Testcontainers, record the exact Docker/Testcontainers error and still complete `typecheck`, `check`, and `build`.

- [ ] **Step 5: Review diff for sensitive data leakage**

Run:

```bash
rg -n "secret-key-e2e|secretAccessKey|access-key-e2e|enc:v1:" src e2e prd --glob "*.ts" --glob "*.tsx" --glob "*.md"
```

Expected: Test literals only appear in E2E test inputs; production UI and API responses must never render saved secret values.

---

## Self-Review

- Spec coverage:
  - Local and S3 provider configuration: Task 2, Task 3, Task 4.
  - Database-backed key/value storage: Task 2.
  - Sensitive fields masked and encrypted: Task 2 and Task 4.
  - Upload test using saved config: Task 3 and Task 4.
  - Avatar upload: Task 5 and Task 6.
  - Organization Logo upload: Task 5 and Task 7.
  - Tests and verification: Task 4, Task 6, Task 7, Task 9.
- Placeholder scan: no unresolved placeholder markers are used as implementation instructions.
- Type consistency:
  - Provider constants use `STORAGE_PROVIDER_LOCAL`, `STORAGE_PROVIDER_S3`, and `PlatformStorageProviderName`.
  - Upload purposes use `UPLOAD_PURPOSE_AVATAR`, `UPLOAD_PURPOSE_ORG_LOGO`, and `UPLOAD_PURPOSE_PLATFORM_TEST`.
  - Admin procedures are `getStorageSettings`, `updateStorageSettings`, and `testStorageUpload`.
