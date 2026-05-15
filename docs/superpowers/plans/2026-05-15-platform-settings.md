# Platform Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/dashboard/admin/settings` so `super_admin` users can save platform email service settings in the database and send a test email.

**Architecture:** Add a controlled `system_platform_setting` key/value table, a server-only platform settings service, and a tRPC router that exposes only typed email-setting procedures. Refactor the email service so runtime mail sending reads database settings first and falls back to existing env values only when database settings are empty.

**Tech Stack:** Next.js 16 App Router, React 19, tRPC 11, Drizzle ORM, PostgreSQL, Zod, Better Auth session roles, shadcn/ui, Sonner, Playwright E2E with Testcontainers PostgreSQL.

---

## File Structure

- Modify `src/server/db/schema.ts`: add `system_platform_setting`.
- Create `src/server/service/platform-settings/secret-codec.ts`: server-only encryption/decryption helper for sensitive values.
- Create `src/server/service/platform-settings/email-settings.ts`: allowed keys, validation schemas, read/write helpers, effective config resolution, safe client output.
- Create `src/server/service/platform-settings/index.ts`: service exports.
- Modify `src/server/service/email/types.ts`: allow provider senders to receive runtime provider config.
- Modify `src/server/service/email/providers/resend.ts`: use passed API key instead of env-only client.
- Modify `src/server/service/email/providers/smtp.ts`: use passed SMTP config instead of env-only transporter.
- Modify `src/server/service/email/email-service.ts`: load effective email config from platform settings before sending.
- Create `src/server/api/routers/admin-platform-setting.ts`: `getEmailSettings`, `updateEmailSettings`, `sendTestEmail`.
- Modify `src/server/api/root.ts`: register `adminPlatformSetting`.
- Modify `src/app/dashboard/_components/dashboard-sidebar.tsx`: add “平台设置” after “平台 API Key”.
- Create `src/app/dashboard/admin/settings/page.tsx`: server component that loads initial settings.
- Create `src/app/dashboard/admin/settings/error.tsx`: dashboard error card.
- Create `src/app/dashboard/admin/settings/loading.tsx`: skeleton.
- Create `src/app/dashboard/admin/settings/_components/platform-settings-content.tsx`: client page container.
- Create `src/app/dashboard/admin/settings/_components/email-settings-card.tsx`: email settings form and test email UI.
- Create `e2e/specs/18-dashboard-admin-platform-settings.spec.ts`: route, permission, save, secret masking, test email cases.
- Modify `e2e/helpers/db.ts`: helpers for platform setting rows.
- Modify `prd/17-email-service.md`: document database-first, env-fallback behavior.
- Keep `prd/18-dashboard-admin-platform-settings.md` aligned if implementation details shift.

## Key Design Decisions

- The UI is not a generic key/value editor. It only edits the email-service keys defined by the server.
- `adminProcedure` allows `admin` and `super_admin`, so the new router must additionally require `ctx.session.user.role === "super_admin"` for every procedure.
- Sensitive values are never returned to the client. The client receives only `configured: boolean`.
- Empty sensitive inputs preserve existing values. Clear buttons send explicit clear flags.
- The test email uses the last saved database/env effective config, not unsaved form state.
- Do not run `pnpm db:generate`, `pnpm db:migrate`, or `pnpm db:push` during implementation unless the user explicitly asks. `pnpm test:e2e` may still run `db:push` internally against its Testcontainers database through `e2e/global-setup.ts`.

---

### Task 1: Database Schema And E2E Helpers

**Files:**
- Modify: `src/server/db/schema.ts`
- Modify: `e2e/helpers/db.ts`

- [ ] **Step 1: Add the Drizzle table**

Add this table near the other platform tables in `src/server/db/schema.ts`:

```ts
export const platformSetting = createSystemTable("platform_setting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull()
})
```

- [ ] **Step 2: Add direct SQL helpers for E2E setup and assertions**

Append helpers to `e2e/helpers/db.ts`:

```ts
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

  try {
    await sql`delete from "system_platform_setting"`
  } finally {
    await sql.end()
  }
}
```

- [ ] **Step 3: Verify type-level schema changes**

Run:

```bash
pnpm typecheck
```

Expected: it may still pass because the table is not used yet. If it fails, fix import/type errors in `schema.ts` before continuing.

---

### Task 2: Platform Email Settings Service

**Files:**
- Create: `src/server/service/platform-settings/secret-codec.ts`
- Create: `src/server/service/platform-settings/email-settings.ts`
- Create: `src/server/service/platform-settings/index.ts`

- [ ] **Step 1: Create the secret codec**

Create `src/server/service/platform-settings/secret-codec.ts`:

```ts
import "server-only"

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

import { env } from "@/env"

const algorithm = "aes-256-gcm"
const encryptedPrefix = "enc:v1:"

const getKey = () => createHash("sha256").update(env.BETTER_AUTH_SECRET ?? "lever-admin-development-platform-settings").digest()

export const encryptSecret = (value: string) => {
  const iv = randomBytes(12)
  const cipher = createCipheriv(algorithm, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${encryptedPrefix}${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`
}

export const decryptSecret = (value: string) => {
  if (!value.startsWith(encryptedPrefix)) {
    return value
  }

  const [ivValue, tagValue, encryptedValue] = value.slice(encryptedPrefix.length).split(":")

  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Invalid encrypted platform setting format.")
  }

  const decipher = createDecipheriv(algorithm, getKey(), Buffer.from(ivValue, "base64url"))
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"))

  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8")
}
```

- [ ] **Step 2: Create service schemas and key constants**

Create `src/server/service/platform-settings/email-settings.ts` with these exported schemas and types:

```ts
import "server-only"

import { TRPCError } from "@trpc/server"
import { eq, inArray } from "drizzle-orm"
import { z } from "zod"

import { env } from "@/env"
import { platformSetting } from "@/server/db/schema"
import type { EmailProviderName } from "@/server/service/email/types"
import { decryptSecret, encryptSecret } from "./secret-codec"

export const emailProviderSchema = z.enum(["console", "resend", "smtp"])

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
  from: "email.from",
  provider: "email.provider",
  resendApiKey: "email.resend.apiKey",
  smtpHost: "email.smtp.host",
  smtpPassword: "email.smtp.password",
  smtpPort: "email.smtp.port",
  smtpSecure: "email.smtp.secure",
  smtpUser: "email.smtp.user"
} as const

const sensitiveKeys = new Set<string>([keys.resendApiKey, keys.smtpPassword])
const allowedKeys = Object.values(keys)
```

- [ ] **Step 3: Implement read, validate, and write helpers**

Add these helpers in the same file:

```ts
type PlatformSettingsDb = typeof import("@/server/db").db

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
  const rows = await db.select().from(platformSetting).where(inArray(platformSetting.key, allowedKeys))
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

export const getEmailSettings = async (db: PlatformSettingsDb) => {
  const { rows, values } = await getRows(db)
  const provider = emailProviderSchema.catch(env.EMAIL_PROVIDER).parse(values.get(keys.provider) ?? env.EMAIL_PROVIDER)
  const smtpPortValue = values.get(keys.smtpPort)

  return {
    from: values.get(keys.from) ?? env.EMAIL_FROM,
    provider,
    resendApiKeyConfigured: Boolean(values.get(keys.resendApiKey) ?? env.RESEND_API_KEY),
    source: rows.length > 0 ? ("database" as const) : ("env" as const),
    smtpHost: values.get(keys.smtpHost) ?? env.SMTP_HOST ?? "",
    smtpPasswordConfigured: Boolean(values.get(keys.smtpPassword) ?? env.SMTP_PASSWORD),
    smtpPort: smtpPortValue ? Number(smtpPortValue) : env.SMTP_PORT,
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
      port: values.get(keys.smtpPort) ? Number(values.get(keys.smtpPort)) : env.SMTP_PORT,
      secure: toBoolean(values.get(keys.smtpSecure), env.SMTP_SECURE),
      user: values.get(keys.smtpUser) ?? env.SMTP_USER
    }
  }
}

const assertEmailConfigComplete = (input: UpdateEmailSettingsInput, existing: Awaited<ReturnType<typeof getEmailSettings>>) => {
  if (env.NODE_ENV === "production" && input.provider === "console") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "生产环境不能启用 Console 邮件服务。" })
  }

  if (input.provider === "resend" && !input.resendApiKey && (!existing.resendApiKeyConfigured || input.clearResendApiKey)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Resend 模式需要配置 API Key。" })
  }

  if (input.provider === "smtp") {
    if (!input.smtpHost || !input.smtpUser) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "SMTP 模式需要配置 Host 和用户名。" })
    }

    if (!input.smtpPassword && (!existing.smtpPasswordConfigured || input.clearSmtpPassword)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "SMTP 模式需要配置密码。" })
    }
  }
}
```

- [ ] **Step 4: Implement upsert/delete operations**

Continue in `email-settings.ts`:

```ts
const serializeSettingValue = (key: string, value: string) => (sensitiveKeys.has(key) ? encryptSecret(value) : value)

const upsertSetting = async (db: PlatformSettingsDb, key: string, value: string, updatedBy: string) => {
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

const deleteSetting = async (db: PlatformSettingsDb, key: string) => {
  await db.delete(platformSetting).where(eq(platformSetting.key, key))
}

export const updateEmailSettings = async (db: PlatformSettingsDb, input: UpdateEmailSettingsInput, updatedBy: string) => {
  const existing = await getEmailSettings(db)
  assertEmailConfigComplete(input, existing)

  await upsertSetting(db, keys.provider, input.provider, updatedBy)
  await upsertSetting(db, keys.from, input.from, updatedBy)
  await upsertSetting(db, keys.smtpPort, String(input.smtpPort), updatedBy)
  await upsertSetting(db, keys.smtpSecure, String(input.smtpSecure), updatedBy)

  if (input.provider === "resend" && input.resendApiKey) {
    await upsertSetting(db, keys.resendApiKey, input.resendApiKey, updatedBy)
  }

  if (input.provider === "smtp") {
    await upsertSetting(db, keys.smtpHost, input.smtpHost ?? "", updatedBy)
    await upsertSetting(db, keys.smtpUser, input.smtpUser ?? "", updatedBy)
    if (input.smtpPassword) {
      await upsertSetting(db, keys.smtpPassword, input.smtpPassword, updatedBy)
    }
  }

  if (input.clearResendApiKey) {
    await deleteSetting(db, keys.resendApiKey)
  }

  if (input.clearSmtpPassword) {
    await deleteSetting(db, keys.smtpPassword)
  }

  return getEmailSettings(db)
}
```

- [ ] **Step 5: Export the service**

Create `src/server/service/platform-settings/index.ts`:

```ts
export {
  emailProviderSchema,
  getEffectiveEmailProviderConfig,
  getEmailSettings,
  testEmailSchema,
  updateEmailSettings,
  updateEmailSettingsSchema
} from "./email-settings"
```

- [ ] **Step 6: Run typecheck and fix exact DB typing if needed**

Run:

```bash
pnpm typecheck
```

Expected: if the `PlatformSettingsDb` structural type is too narrow for Drizzle's chained query builder, replace it with `typeof db` imported as a type from `src/server/db/index.ts` and rerun.

---

### Task 3: Email Provider Runtime Config Refactor

**Files:**
- Modify: `src/server/service/email/types.ts`
- Modify: `src/server/service/email/providers/resend.ts`
- Modify: `src/server/service/email/providers/smtp.ts`
- Modify: `src/server/service/email/providers/console.ts`
- Modify: `src/server/service/email/email-service.ts`

- [ ] **Step 1: Extend email provider input types**

In `src/server/service/email/types.ts`, add runtime config types:

```ts
export type EmailProviderRuntimeConfig = {
  resendApiKey?: string
  smtp?: {
    host?: string
    password?: string
    port: number
    secure: boolean
    user?: string
  }
}

export type SendEmailProviderInput = SendEmailInput & {
  config: EmailProviderRuntimeConfig
  from: string
}
```

- [ ] **Step 2: Refactor Resend provider to use config**

In `src/server/service/email/providers/resend.ts`, remove the module-level env client and use a per-call client:

```ts
import "server-only"

import { Resend } from "resend"

import type { EmailProvider } from "../types"

export const resendEmailProvider: EmailProvider = {
  send: async (input) => {
    if (!input.config.resendApiKey) {
      throw new Error("Resend API Key is required when email provider is resend.")
    }

    const { data, error } = await new Resend(input.config.resendApiKey).emails.send({
      from: input.from,
      html: input.html,
      subject: input.subject,
      text: input.text,
      to: input.to
    })

    if (error) {
      throw new Error(error.message)
    }

    return {
      messageId: data?.id,
      provider: "resend"
    }
  }
}
```

- [ ] **Step 3: Refactor SMTP provider to use config**

In `src/server/service/email/providers/smtp.ts`, create transporters from the saved config:

```ts
import "server-only"

import nodemailer from "nodemailer"

import type { EmailProvider } from "../types"

export const smtpEmailProvider: EmailProvider = {
  send: async (input) => {
    const smtp = input.config.smtp

    if (!smtp?.host || !smtp.user || !smtp.password) {
      throw new Error("SMTP host, user, and password are required when email provider is smtp.")
    }

    const result = await nodemailer
      .createTransport({
        auth: {
          pass: smtp.password,
          user: smtp.user
        },
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure
      })
      .sendMail({
        from: input.from,
        html: input.html,
        subject: input.subject,
        text: input.text,
        to: input.to
      })

    return {
      messageId: result.messageId,
      provider: "smtp"
    }
  }
}
```

- [ ] **Step 4: Keep console provider compatible**

Open `src/server/service/email/providers/console.ts` and confirm it accepts the wider `SendEmailProviderInput` without changes. If it destructures input, keep only `from`, `to`, `subject`, `text`, and `html`.

- [ ] **Step 5: Load effective config in the send entry**

Update `src/server/service/email/email-service.ts`:

```ts
import "server-only"

import { env } from "@/env"
import { db } from "@/server/db"
import { getEffectiveEmailProviderConfig } from "@/server/service/platform-settings"

import type { EmailProvider, EmailProviderName, SendEmailInput, SendEmailResult } from "./types"

const getProvider = async (providerName: EmailProviderName): Promise<EmailProvider> => {
  switch (providerName) {
    case "console":
      return (await import("./providers/console")).consoleEmailProvider
    case "resend":
      return (await import("./providers/resend")).resendEmailProvider
    case "smtp":
      return (await import("./providers/smtp")).smtpEmailProvider
  }
}

export const sendEmail = async (input: SendEmailInput): Promise<SendEmailResult> => {
  const config = await getEffectiveEmailProviderConfig(db)

  if (env.NODE_ENV === "production" && config.provider === "console") {
    throw new Error("Console email provider is not allowed in production.")
  }

  const provider = await getProvider(config.provider)

  try {
    return await provider.send({
      ...input,
      config: {
        resendApiKey: config.resendApiKey,
        smtp: config.smtp
      },
      from: config.from
    })
  } catch (error) {
    console.error("[email:send-failed]", {
      errorName: error instanceof Error ? error.name : "UnknownEmailError",
      provider: config.provider
    })

    throw error
  }
}
```

- [ ] **Step 6: Verify existing email call sites still typecheck**

Run:

```bash
pnpm typecheck
```

Expected: existing verify email, reset password, and organization invitation call sites keep using `sendEmail({ to, subject, html, text })`.

---

### Task 4: tRPC Router For Platform Settings

**Files:**
- Create: `src/server/api/routers/admin-platform-setting.ts`
- Modify: `src/server/api/root.ts`

- [ ] **Step 1: Implement super-admin guard and procedures**

Create `src/server/api/routers/admin-platform-setting.ts`:

```ts
import { TRPCError } from "@trpc/server"

import { PLATFORM_ROLE_SUPER_ADMIN } from "@/lib/const"
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc"
import { sendEmail } from "@/server/service/email"
import { getEmailSettings, testEmailSchema, updateEmailSettings, updateEmailSettingsSchema } from "@/server/service/platform-settings"

const assertSuperAdmin = (role: string | null | undefined) => {
  if (role !== PLATFORM_ROLE_SUPER_ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要超级管理员权限。" })
  }
}

export const adminPlatformSettingRouter = createTRPCRouter({
  getEmailSettings: adminProcedure.query(async ({ ctx }) => {
    assertSuperAdmin(ctx.session.user.role)

    return getEmailSettings(ctx.db)
  }),

  sendTestEmail: adminProcedure.input(testEmailSchema).mutation(async ({ ctx, input }) => {
    assertSuperAdmin(ctx.session.user.role)

    const result = await sendEmail({
      html: `<p>Lever Admin 测试邮件已发送。</p><p>操作者：${ctx.session.user.email}</p>`,
      subject: "Lever Admin 测试邮件",
      text: `Lever Admin 测试邮件已发送。\n操作者：${ctx.session.user.email}`,
      to: input.to
    })

    return {
      messageId: result.messageId ?? null,
      provider: result.provider,
      success: true
    }
  }),

  updateEmailSettings: adminProcedure.input(updateEmailSettingsSchema).mutation(async ({ ctx, input }) => {
    assertSuperAdmin(ctx.session.user.role)

    return updateEmailSettings(ctx.db, input, ctx.session.user.id)
  })
})
```

- [ ] **Step 2: Register the router**

Modify `src/server/api/root.ts`:

```ts
import { adminPlatformSettingRouter } from "@/server/api/routers/admin-platform-setting"
```

Add it to `appRouter`:

```ts
adminPlatformSetting: adminPlatformSettingRouter,
```

- [ ] **Step 3: Verify router types**

Run:

```bash
pnpm typecheck
```

Expected: `RouterInputs["adminPlatformSetting"]` and `RouterOutputs["adminPlatformSetting"]` are inferred by the frontend.

---

### Task 5: Dashboard Navigation And Page Shell

**Files:**
- Modify: `src/app/dashboard/_components/dashboard-sidebar.tsx`
- Create: `src/app/dashboard/admin/settings/page.tsx`
- Create: `src/app/dashboard/admin/settings/error.tsx`
- Create: `src/app/dashboard/admin/settings/loading.tsx`

- [ ] **Step 1: Add sidebar entry**

In `src/app/dashboard/_components/dashboard-sidebar.tsx`, add `SlidersHorizontal` to the lucide import and append the item after platform API keys:

```ts
{ href: "/dashboard/admin/settings", icon: SlidersHorizontal, label: "平台设置" }
```

- [ ] **Step 2: Create the server page**

Create `src/app/dashboard/admin/settings/page.tsx`:

```tsx
import { api } from "@/trpc/server"
import { PlatformSettingsContent } from "./_components/platform-settings-content"

const AdminPlatformSettingsPage = async () => {
  const initialEmailSettings = await api.adminPlatformSetting.getEmailSettings()

  return <PlatformSettingsContent initialEmailSettings={initialEmailSettings} />
}

export default AdminPlatformSettingsPage
```

- [ ] **Step 3: Create error boundary**

Create `src/app/dashboard/admin/settings/error.tsx`:

```tsx
"use client"

import { DashboardErrorCard } from "@/app/dashboard/_components/dashboard-error-card"

const AdminPlatformSettingsError = ({ error, reset }: { error: Error; reset: () => void }) => (
  <DashboardErrorCard description="平台设置加载失败，请确认当前账号拥有超级管理员权限。" error={error} reset={reset} title="无法加载平台设置" />
)

export default AdminPlatformSettingsError
```

- [ ] **Step 4: Create loading skeleton**

Create `src/app/dashboard/admin/settings/loading.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const AdminPlatformSettingsLoading = () => (
  <div className="space-y-5 text-[13px]">
    <div className="space-y-2">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
    <Card className="rounded-lg">
      <CardContent className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </CardContent>
    </Card>
  </div>
)

export default AdminPlatformSettingsLoading
```

- [ ] **Step 5: Verify route shell**

Run:

```bash
pnpm typecheck
```

Expected: route imports and server caller types compile.

---

### Task 6: Email Settings UI

**Files:**
- Create: `src/app/dashboard/admin/settings/_components/platform-settings-content.tsx`
- Create: `src/app/dashboard/admin/settings/_components/email-settings-card.tsx`

- [ ] **Step 1: Create the page content wrapper**

Create `platform-settings-content.tsx`:

```tsx
"use client"

import type { RouterOutputs } from "@/trpc/react"
import { EmailSettingsCard } from "./email-settings-card"

type EmailSettings = RouterOutputs["adminPlatformSetting"]["getEmailSettings"]

export const PlatformSettingsContent = ({ initialEmailSettings }: { initialEmailSettings: EmailSettings }) => (
  <div className="space-y-5 text-[13px]">
    <div>
      <h1 className="font-bold text-2xl tracking-normal">平台设置</h1>
      <p className="mt-2 text-muted-foreground text-xs">管理会影响整个平台运行行为的设置。</p>
    </div>
    <EmailSettingsCard initialEmailSettings={initialEmailSettings} />
  </div>
)
```

- [ ] **Step 2: Create form state and validation**

Create `email-settings-card.tsx` with these imports, types, and schema:

```tsx
"use client"

import { Mail, Save, Send, ShieldAlert } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { api, type RouterOutputs } from "@/trpc/react"

type EmailSettings = RouterOutputs["adminPlatformSetting"]["getEmailSettings"]
type Provider = EmailSettings["provider"]

type FieldErrors = Partial<
  Record<"from" | "provider" | "resendApiKey" | "smtpHost" | "smtpPassword" | "smtpPort" | "smtpUser" | "testTo", string>
>

const formSchema = z.object({
  from: z.string().trim().min(1, "发件人不能为空。"),
  provider: z.enum(["console", "resend", "smtp"]),
  resendApiKey: z.string().trim(),
  smtpHost: z.string().trim(),
  smtpPassword: z.string().trim(),
  smtpPort: z.coerce.number().int().positive("SMTP Port 必须为正整数。"),
  smtpSecure: z.boolean(),
  smtpUser: z.string().trim()
})

const testSchema = z.object({
  testTo: z.string().trim().email("请输入有效的测试收件人邮箱。")
})
```

- [ ] **Step 3: Implement mutations and submit handlers**

Inside `EmailSettingsCard`, use local state initialized from `initialEmailSettings` and call tRPC mutations:

```tsx
export const EmailSettingsCard = ({ initialEmailSettings }: { initialEmailSettings: EmailSettings }) => {
  const router = useRouter()
  const [provider, setProvider] = useState<Provider>(initialEmailSettings.provider)
  const [from, setFrom] = useState(initialEmailSettings.from)
  const [resendApiKey, setResendApiKey] = useState("")
  const [smtpHost, setSmtpHost] = useState(initialEmailSettings.smtpHost)
  const [smtpPort, setSmtpPort] = useState(String(initialEmailSettings.smtpPort))
  const [smtpUser, setSmtpUser] = useState(initialEmailSettings.smtpUser)
  const [smtpPassword, setSmtpPassword] = useState("")
  const [smtpSecure, setSmtpSecure] = useState(initialEmailSettings.smtpSecure)
  const [testTo, setTestTo] = useState("")
  const [clearResendApiKey, setClearResendApiKey] = useState(false)
  const [clearSmtpPassword, setClearSmtpPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const update = api.adminPlatformSetting.updateEmailSettings.useMutation({
    onError: (error) => setFormError(error.message),
    onSuccess: (settings) => {
      setProvider(settings.provider)
      setFrom(settings.from)
      setSmtpHost(settings.smtpHost)
      setSmtpPort(String(settings.smtpPort))
      setSmtpUser(settings.smtpUser)
      setSmtpSecure(settings.smtpSecure)
      setResendApiKey("")
      setSmtpPassword("")
      setClearResendApiKey(false)
      setClearSmtpPassword(false)
      setErrors({})
      setFormError(null)
      toast.success("邮件服务配置已保存。")
      router.refresh()
    }
  })

  const sendTest = api.adminPlatformSetting.sendTestEmail.useMutation({
    onError: (error) => toast.error(error.message),
    onSuccess: (result) => toast.success(`测试邮件已通过 ${result.provider} 发送。`)
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = formSchema.safeParse({ from, provider, resendApiKey, smtpHost, smtpPassword, smtpPort, smtpSecure, smtpUser })

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      setErrors({
        from: fieldErrors.from?.[0],
        provider: fieldErrors.provider?.[0],
        resendApiKey: fieldErrors.resendApiKey?.[0],
        smtpHost: fieldErrors.smtpHost?.[0],
        smtpPassword: fieldErrors.smtpPassword?.[0],
        smtpPort: fieldErrors.smtpPort?.[0],
        smtpUser: fieldErrors.smtpUser?.[0]
      })
      setFormError(null)
      return
    }

    setErrors({})
    setFormError(null)
    update.mutate({
      ...parsed.data,
      clearResendApiKey,
      clearSmtpPassword
    })
  }

  const handleSendTest = () => {
    const parsed = testSchema.safeParse({ testTo })

    if (!parsed.success) {
      setErrors((current) => ({ ...current, testTo: parsed.error.flatten().fieldErrors.testTo?.[0] }))
      return
    }

    setErrors((current) => ({ ...current, testTo: undefined }))
    sendTest.mutate({ to: parsed.data.testTo })
  }

  return null
}
```

Replace `return null` in the next step.

- [ ] **Step 4: Render the simplified card from the approved design**

Use one card, save button at the bottom of the form, and no stats/fallback card:

```tsx
return (
  <Card className="rounded-lg shadow-sm">
    <CardHeader className="px-5">
      <CardTitle className="flex items-center gap-2 text-base">
        <Mail className="size-4 text-primary" />
        邮件服务
      </CardTitle>
    </CardHeader>
    <CardContent className="grid gap-5 px-5 pb-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email-provider">Provider</Label>
          <Select onValueChange={(value) => setProvider(value as Provider)} value={provider}>
            <SelectTrigger id="email-provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="console">Console</SelectItem>
              <SelectItem value="resend">Resend</SelectItem>
              <SelectItem value="smtp">SMTP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-from">发件人</Label>
          <Input id="email-from" onChange={(event) => setFrom(event.target.value)} value={from} />
          {errors.from ? <p className="text-destructive text-xs">{errors.from}</p> : null}
        </div>

        {provider === "resend" ? (
          <div className="space-y-2">
            <Label htmlFor="resend-api-key">Resend API Key</Label>
            <Input id="resend-api-key" onChange={(event) => setResendApiKey(event.target.value)} placeholder={initialEmailSettings.resendApiKeyConfigured ? "已配置，留空不修改" : "输入 Resend API Key"} type="password" value={resendApiKey} />
            <Button onClick={() => setClearResendApiKey(true)} size="sm" type="button" variant="outline">
              清除已保存 Key
            </Button>
          </div>
        ) : null}

        {provider === "smtp" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input id="smtp-host" onChange={(event) => setSmtpHost(event.target.value)} value={smtpHost} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">Port</Label>
              <Input id="smtp-port" inputMode="numeric" onChange={(event) => setSmtpPort(event.target.value)} value={smtpPort} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-user">SMTP Username</Label>
              <Input id="smtp-user" onChange={(event) => setSmtpUser(event.target.value)} value={smtpUser} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-password">SMTP Password</Label>
              <Input id="smtp-password" onChange={(event) => setSmtpPassword(event.target.value)} placeholder={initialEmailSettings.smtpPasswordConfigured ? "已配置，留空不修改" : "输入 SMTP 密码"} type="password" value={smtpPassword} />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch checked={smtpSecure} id="smtp-secure" onCheckedChange={setSmtpSecure} />
              <Label htmlFor="smtp-secure">启用 SSL/TLS</Label>
            </div>
          </div>
        ) : null}

        {formError ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-xs">{formError}</p> : null}

        <div className="flex justify-end border-t pt-4">
          <Button disabled={update.isPending} type="submit">
            <Save className="size-4" />
            保存配置
          </Button>
        </div>
      </form>

      <div className="space-y-4">
        <div className="space-y-3 rounded-lg border bg-background/60 p-4 dark:bg-muted/20">
          <Label htmlFor="test-email">测试收件人</Label>
          <Input id="test-email" inputMode="email" onChange={(event) => setTestTo(event.target.value)} placeholder="ops@example.io" value={testTo} />
          {errors.testTo ? <p className="text-destructive text-xs">{errors.testTo}</p> : null}
          <Button className="w-full" disabled={sendTest.isPending} onClick={handleSendTest} type="button" variant="secondary">
            <Send className="size-4" />
            发送测试邮件
          </Button>
        </div>

        <Alert className="border-amber-500/40 bg-amber-500/10">
          <ShieldAlert className="size-4" />
          <AlertTitle>安全提示</AlertTitle>
          <AlertDescription>密钥和密码保存后不会回显明文；留空保存会保留已有敏感值。</AlertDescription>
        </Alert>
      </div>
    </CardContent>
  </Card>
)
```

- [ ] **Step 5: Run frontend checks**

Run:

```bash
pnpm typecheck
pnpm check
```

Expected: React props, shadcn imports, and Biome formatting pass.

---

### Task 7: E2E Coverage

**Files:**
- Create: `e2e/specs/18-dashboard-admin-platform-settings.spec.ts`

- [ ] **Step 1: Write the E2E spec**

Create the spec with these cases:

```ts
import { expect, test } from "@playwright/test"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { deletePlatformSettings, getPlatformSettingValue, setUserRole } from "../helpers/db"

test.describe("18 dashboard admin platform settings", () => {
  test("shows permission error to non-super-admin users", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "dashboard-admin-settings-forbidden")
    await setUserRole(email, "admin")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto("/dashboard/admin/settings")

    await expect(page.getByRole("main").getByText("需要超级管理员权限。")).toBeVisible()
  })

  test("shows empty email settings and saves console provider", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    await deletePlatformSettings()
    const email = await createVerifiedUser(page, "dashboard-admin-settings-console")
    await setUserRole(email, "super_admin")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/admin/settings")

    await expect(page.getByRole("heading", { name: "平台设置" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "邮件服务" })).toBeVisible()
    await page.getByLabel("发件人").fill("Lever Admin <ops@example.com>")
    await page.getByRole("button", { name: "保存配置" }).click()

    await expect(page.locator("[data-sonner-toast]").filter({ hasText: "邮件服务配置已保存。" }).first()).toBeVisible()
    await expect.poll(() => getPlatformSettingValue("email.provider")).toBe("console")
    await expect.poll(() => getPlatformSettingValue("email.from")).toBe("Lever Admin <ops@example.com>")
  })

  test("saves smtp without exposing password and sends test email", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    await deletePlatformSettings()
    const email = await createVerifiedUser(page, "dashboard-admin-settings-smtp")
    await setUserRole(email, "super_admin")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/admin/settings")

    await page.getByLabel("Provider").click()
    await page.getByRole("option", { name: "SMTP" }).click()
    await page.getByLabel("发件人").fill("Lever Admin <smtp@example.com>")
    await page.getByLabel("SMTP Host").fill("smtp.example.com")
    await page.getByLabel("Port").fill("587")
    await page.getByLabel("SMTP Username").fill("smtp-user@example.com")
    await page.getByLabel("SMTP Password").fill("secret-password")
    await page.getByRole("button", { name: "保存配置" }).click()

    await expect(page.locator("[data-sonner-toast]").filter({ hasText: "邮件服务配置已保存。" }).first()).toBeVisible()
    await expect(page.getByLabel("SMTP Password")).toHaveValue("")
    await expect.poll(() => getPlatformSettingValue("email.provider")).toBe("smtp")
    await expect.poll(async () => {
      const value = await getPlatformSettingValue("email.smtp.password")
      return value?.startsWith("enc:v1:")
    }).toBe(true)

    await page.getByLabel("Provider").click()
    await page.getByRole("option", { name: "Console" }).click()
    await page.getByRole("button", { name: "保存配置" }).click()
    await page.getByLabel("测试收件人").fill("ops@example.io")
    await page.getByRole("button", { name: "发送测试邮件" }).click()

    await expect(page.locator("[data-sonner-toast]").filter({ hasText: "测试邮件已通过 console 发送。" }).first()).toBeVisible()
  })

  test("validates test email recipient", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    const email = await createVerifiedUser(page, "dashboard-admin-settings-test-validation")
    await setUserRole(email, "super_admin")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/admin/settings")

    await page.getByLabel("测试收件人").fill("bad-email")
    await page.getByRole("button", { name: "发送测试邮件" }).click()

    await expect(page.getByText("请输入有效的测试收件人邮箱。")).toBeVisible()
  })
})
```

- [ ] **Step 2: Run the focused E2E spec**

Run only after the app implementation compiles:

```bash
pnpm test:e2e -- e2e/specs/18-dashboard-admin-platform-settings.spec.ts --project=chromium
```

Expected: all four tests pass. If Docker is unavailable, record the exact Testcontainers error and continue with typecheck/build verification.

---

### Task 8: PRD And Verification

**Files:**
- Modify: `prd/17-email-service.md`
- Modify if implementation changes wording: `prd/18-dashboard-admin-platform-settings.md`

- [ ] **Step 1: Update email service PRD**

In `prd/17-email-service.md`, replace the provider switching text with database-first behavior:

```md
- Provider 配置由平台设置服务解析：优先读取数据库 `system_platform_setting`，数据库为空时回退环境变量。
- 环境变量仍用于本地开发、E2E 和首次部署兜底；后台设置页保存后以数据库配置为准。
```

- [ ] **Step 2: Confirm platform settings PRD still matches implementation**

Scan:

```bash
rg -n "统计|状态卡片|配置完整度|最后更新|环境变量兜底卡片|任意 key|保存配置按钮" prd/18-dashboard-admin-platform-settings.md
```

Expected: no UI stats/fallback card remains; “保存配置按钮位于邮件配置表单底部” remains.

- [ ] **Step 3: Run final verification**

Run:

```bash
pnpm typecheck
pnpm check
pnpm build
```

Expected: all pass. Then run the focused E2E command from Task 7 when Docker is available.

- [ ] **Step 4: Review the diff before handoff**

Run:

```bash
git diff -- src/server/db/schema.ts src/server/service/platform-settings src/server/service/email src/server/api src/app/dashboard e2e prd/17-email-service.md prd/18-dashboard-admin-platform-settings.md
```

Expected: changes are limited to the platform settings feature, email config resolution, navigation entry, tests, and PRD sync.

---

## Self-Review Checklist

- PRD coverage: the plan covers route, sidebar entry, one-card UI, bottom save button, super-admin permission, key/value table, database-first email config, env fallback, sensitive masking, test email, loading/error/forbidden states, E2E, and PRD sync.
- Scope control: no generic key/value editor, no stats cards, no email logs, no templates editor, no queue or delivery tracking.
- Database command safety: schema changes are planned, but `db:generate`, `db:migrate`, and manual `db:push` are excluded unless explicitly approved.
- Type consistency: the router name is `adminPlatformSetting`, matching frontend `RouterOutputs["adminPlatformSetting"]` and `api.adminPlatformSetting.*`.
- Security consistency: all mutations check `super_admin`, secret values are encrypted at rest, and client outputs only expose configured booleans.
