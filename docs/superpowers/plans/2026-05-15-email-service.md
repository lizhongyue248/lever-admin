# Email Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a unified transactional email service for Better Auth email verification, password reset, and organization invitation emails, with console, Resend, and SMTP providers.

**Architecture:** Better Auth and current tRPC invitation flows call small template wrapper functions, which render HTML/text and pass the result to `src/server/service/email/sendEmail`. Provider selection is driven by `EMAIL_PROVIDER`, while templates stay provider-agnostic and include light/dark email-client styling based on `prd/email-template-design.pen`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Better Auth 1.6, Drizzle, Zod env validation, Resend, Nodemailer SMTP, Playwright E2E, Biome.

---

## File Map

- Create `src/server/service/email/types.ts`: shared provider, send input, and template result types.
- Create `src/server/service/email/email-service.ts`: provider selection, validation, error logging, and public `sendEmail` function.
- Create `src/server/service/email/index.ts`: exports public service and template functions.
- Create `src/server/service/email/providers/console.ts`: local development provider that logs safe metadata and the action link.
- Create `src/server/service/email/providers/resend.ts`: Resend provider.
- Create `src/server/service/email/providers/smtp.ts`: SMTP provider backed by Nodemailer.
- Create `src/server/service/email/templates/shared.ts`: HTML escaping, shared layout, text fallback helpers, dark-mode CSS.
- Create `src/server/service/email/templates/verify-email.ts`: verification email template.
- Create `src/server/service/email/templates/reset-password.ts`: password reset email template.
- Create `src/server/service/email/templates/organization-invitation.ts`: organization invitation email template.
- Modify `src/env.js`: add email provider environment variables.
- Modify `.env.example`: document email provider variables.
- Modify `src/server/better-auth/config.ts`: replace console placeholders with unified email service.
- Modify `src/server/api/routers/org.ts`: call the same organization invitation email wrapper after the current manual invitation insert.
- Modify `e2e/specs/03-forgot-password.spec.ts`: keep existing UX assertions and add a Chromium flow that confirms reset request still succeeds with the email service.
- Modify `e2e/specs/05-verify-email.spec.ts`: keep existing resend flow as regression coverage for the verification email callback.
- Modify `e2e/specs/10A-organization-invitation-accept.spec.ts`: keep existing invite flow as regression coverage for invitation email dispatch.
- Modify `prd/17-email-service.md`: add implementation notes only if implementation deliberately differs from the current PRD.

Do not run `pnpm db:generate`, `pnpm db:migrate`, or `pnpm db:push`; this feature does not change database schema.

---

## Task 1: Dependencies And Env Contract

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src/env.js`
- Modify: `.env.example`

- [ ] **Step 1: Install email provider packages**

Run:

```bash
pnpm add resend nodemailer
pnpm add -D @types/nodemailer
```

Expected: `package.json` contains `resend` and `nodemailer` in dependencies, `@types/nodemailer` in devDependencies, and `pnpm-lock.yaml` is updated.

- [ ] **Step 2: Add env validation**

Modify `src/env.js` server schema:

```ts
EMAIL_FROM: z.string().default("Lever Admin <no-reply@example.com>"),
EMAIL_PROVIDER: z.enum(["console", "resend", "smtp"]).default("console"),
RESEND_API_KEY: z.string().optional(),
SMTP_HOST: z.string().optional(),
SMTP_PASSWORD: z.string().optional(),
SMTP_PORT: z.coerce.number().int().positive().default(587),
SMTP_SECURE: z.coerce.boolean().default(false),
SMTP_USER: z.string().optional(),
```

Modify `runtimeEnv` in the same file:

```ts
EMAIL_FROM: process.env.EMAIL_FROM,
EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
RESEND_API_KEY: process.env.RESEND_API_KEY,
SMTP_HOST: process.env.SMTP_HOST,
SMTP_PASSWORD: process.env.SMTP_PASSWORD,
SMTP_PORT: process.env.SMTP_PORT,
SMTP_SECURE: process.env.SMTP_SECURE,
SMTP_USER: process.env.SMTP_USER,
```

- [ ] **Step 3: Document env variables**

Append to `.env.example`:

```env
# Transactional email
# console logs safe email metadata locally; resend and smtp send real email.
EMAIL_PROVIDER="console"
EMAIL_FROM="Lever Admin <no-reply@example.com>"

# Required when EMAIL_PROVIDER="resend"
RESEND_API_KEY=""

# Required when EMAIL_PROVIDER="smtp"
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_SECURE="false"
```

- [ ] **Step 4: Verify env contract**

Run:

```bash
pnpm typecheck
```

Expected: existing project type errors, if any, are unrelated to the new env variables. If the command fails because new env keys are missing in `runtimeEnv`, fix `src/env.js` before continuing.

- [ ] **Step 5: Commit checkpoint**

```bash
git add package.json pnpm-lock.yaml src/env.js .env.example
git commit -m "chore: add email provider configuration"
```

Only run the commit if the user has approved committing in this workspace.

---

## Task 2: Email Service Core

**Files:**
- Create: `src/server/service/email/types.ts`
- Create: `src/server/service/email/providers/console.ts`
- Create: `src/server/service/email/providers/resend.ts`
- Create: `src/server/service/email/providers/smtp.ts`
- Create: `src/server/service/email/email-service.ts`
- Create: `src/server/service/email/index.ts`

- [ ] **Step 1: Create shared types**

Create `src/server/service/email/types.ts`:

```ts
export type EmailProviderName = "console" | "resend" | "smtp"

export type SendEmailInput = {
  html: string
  subject: string
  text: string
  to: string
}

export type SendEmailProviderInput = SendEmailInput & {
  from: string
}

export type SendEmailResult = {
  messageId?: string
  provider: EmailProviderName
}

export type EmailProvider = {
  send: (input: SendEmailProviderInput) => Promise<SendEmailResult>
}

export type RenderedEmail = {
  html: string
  subject: string
  text: string
}
```

- [ ] **Step 2: Create console provider**

Create `src/server/service/email/providers/console.ts`:

```ts
import "server-only"

import type { EmailProvider } from "../types"

const extractActionUrl = (text: string) => {
  const match = text.match(/https?:\/\/\S+|\/invite\/\S+/u)
  return match?.[0] ?? null
}

export const consoleEmailProvider: EmailProvider = {
  send: async (input) => {
    console.info("[email:console]", {
      actionUrl: extractActionUrl(input.text),
      from: input.from,
      subject: input.subject,
      to: input.to
    })

    return {
      provider: "console"
    }
  }
}
```

- [ ] **Step 3: Create Resend provider**

Create `src/server/service/email/providers/resend.ts`:

```ts
import "server-only"

import { Resend } from "resend"

import { env } from "@/env"

import type { EmailProvider } from "../types"

export const resendEmailProvider: EmailProvider = {
  send: async (input) => {
    if (!env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER is resend.")
    }

    const resend = new Resend(env.RESEND_API_KEY)
    const { data, error } = await resend.emails.send({
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

- [ ] **Step 4: Create SMTP provider**

Create `src/server/service/email/providers/smtp.ts`:

```ts
import "server-only"

import nodemailer from "nodemailer"

import { env } from "@/env"

import type { EmailProvider } from "../types"

export const smtpEmailProvider: EmailProvider = {
  send: async (input) => {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
      throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASSWORD are required when EMAIL_PROVIDER is smtp.")
    }

    const transporter = nodemailer.createTransport({
      auth: {
        pass: env.SMTP_PASSWORD,
        user: env.SMTP_USER
      },
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE
    })

    const result = await transporter.sendMail({
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

- [ ] **Step 5: Create provider selector and public send function**

Create `src/server/service/email/email-service.ts`:

```ts
import "server-only"

import { env } from "@/env"

import { consoleEmailProvider } from "./providers/console"
import { resendEmailProvider } from "./providers/resend"
import { smtpEmailProvider } from "./providers/smtp"
import type { EmailProvider, SendEmailInput, SendEmailResult } from "./types"

const providers = {
  console: consoleEmailProvider,
  resend: resendEmailProvider,
  smtp: smtpEmailProvider
} satisfies Record<typeof env.EMAIL_PROVIDER, EmailProvider>

export const sendEmail = async (input: SendEmailInput): Promise<SendEmailResult> => {
  const provider = providers[env.EMAIL_PROVIDER]

  try {
    return await provider.send({
      ...input,
      from: env.EMAIL_FROM
    })
  } catch (error) {
    console.error("[email:send-failed]", {
      message: error instanceof Error ? error.message : "Unknown email error",
      provider: env.EMAIL_PROVIDER,
      subject: input.subject,
      to: input.to
    })

    throw error
  }
}
```

If TypeScript rejects `Record<typeof env.EMAIL_PROVIDER, EmailProvider>`, replace it with:

```ts
const providers: Record<"console" | "resend" | "smtp", EmailProvider> = {
  console: consoleEmailProvider,
  resend: resendEmailProvider,
  smtp: smtpEmailProvider
}
```

- [ ] **Step 6: Export public API**

Create `src/server/service/email/index.ts`:

```ts
export { sendEmail } from "./email-service"
export type { RenderedEmail, SendEmailInput, SendEmailResult } from "./types"
export { renderOrganizationInvitationEmail } from "./templates/organization-invitation"
export { renderResetPasswordEmail } from "./templates/reset-password"
export { renderVerifyEmail } from "./templates/verify-email"
```

- [ ] **Step 7: Verify core compiles**

Run:

```bash
pnpm typecheck
```

Expected: PASS or only pre-existing unrelated failures. New email service files must not introduce import, type, or env errors.

- [ ] **Step 8: Commit checkpoint**

```bash
git add src/server/service/email
git commit -m "feat: add email service providers"
```

Only run the commit if the user has approved committing in this workspace.

---

## Task 3: Shared Email Template Layout

**Files:**
- Create: `src/server/service/email/templates/shared.ts`

- [ ] **Step 1: Create template helpers**

Create `src/server/service/email/templates/shared.ts`:

```ts
import "server-only"

type InfoRow = {
  label: string
  value: string
}

type EmailLayoutInput = {
  actionLabel: string
  actionUrl: string
  body: string
  infoRows: InfoRow[]
  preview: string
  securityNote: string
  title: string
}

export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

const renderInfoRows = (rows: InfoRow[]) =>
  rows
    .map(
      (row) => `
        <tr>
          <td style="padding:4px 0;color:#667085;font-size:13px;line-height:20px;width:112px;">${escapeHtml(row.label)}</td>
          <td style="padding:4px 0;color:#111827;font-size:13px;line-height:20px;font-weight:600;">${escapeHtml(row.value)}</td>
        </tr>`
    )
    .join("")

export const renderEmailLayout = (input: EmailLayoutInput) => {
  const actionUrl = escapeHtml(input.actionUrl)

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${escapeHtml(input.title)}</title>
    <style>
      :root { color-scheme: light dark; supported-color-schemes: light dark; }
      @media (prefers-color-scheme: dark) {
        body, .email-canvas { background:#141414 !important; }
        .email-card { background:#262626 !important; border-color:#3A3A3A !important; }
        .email-divider { background:#3A3A3A !important; }
        .email-panel, .email-note { background:#1F1F1F !important; border-color:#3A3A3A !important; }
        .email-link-panel { background:#1D2B44 !important; }
        .email-title, .email-strong, .email-brand { color:#FFFFFF !important; }
        .email-muted, .email-copy, .email-footer, .email-label { color:#A3A3A3 !important; }
        .email-link { color:#93C5FD !important; }
      }
      @media (max-width: 520px) {
        .email-wrap { width:100% !important; }
        .email-section { padding-left:22px !important; padding-right:22px !important; }
        .email-button { display:block !important; width:100% !important; box-sizing:border-box !important; }
        .email-info-label, .email-info-value { display:block !important; width:100% !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#F4F7FB;">
    <div class="email-canvas" style="background:#F4F7FB;padding:32px 16px;">
      <div class="email-wrap email-card" style="width:640px;max-width:100%;margin:0 auto;background:#FFFFFF;border:1px solid #D9E2EC;border-radius:8px;overflow:hidden;font-family:Inter,Arial,sans-serif;">
        <div style="height:6px;background:#2563EB;"></div>
        <div class="email-section" style="padding:26px 40px 24px 40px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="width:38px;">
                <div style="width:38px;height:38px;border-radius:8px;background:#EAF2FF;color:#2563EB;font-size:18px;font-weight:800;line-height:38px;text-align:center;">L</div>
              </td>
              <td style="padding-left:12px;">
                <div class="email-brand" style="color:#111827;font-size:17px;font-weight:700;line-height:22px;">Lever Admin</div>
                <div class="email-muted" style="color:#667085;font-size:12px;line-height:18px;">Identity and access management</div>
              </td>
            </tr>
          </table>
        </div>
        <div class="email-divider" style="height:1px;background:#D9E2EC;"></div>
        <div class="email-section" style="padding:34px 40px;">
          <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(input.preview)}</div>
          <h1 class="email-title" style="margin:0 0 10px 0;color:#111827;font-size:28px;line-height:34px;font-weight:700;">${escapeHtml(input.title)}</h1>
          <p class="email-copy" style="margin:0 0 22px 0;color:#667085;font-size:15px;line-height:24px;">${escapeHtml(input.body)}</p>
          <table class="email-panel" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 22px 0;background:#F8FAFC;border:1px solid #D9E2EC;border-radius:8px;padding:12px 16px;">
            ${renderInfoRows(input.infoRows)}
          </table>
          <a class="email-button" href="${actionUrl}" style="display:inline-block;margin:0 0 22px 0;background:#2563EB;color:#FFFFFF;text-decoration:none;font-size:14px;line-height:20px;font-weight:700;padding:12px 28px;border-radius:6px;text-align:center;">${escapeHtml(input.actionLabel)}</a>
          <div class="email-link-panel" style="margin:0 0 14px 0;background:#EAF2FF;border-radius:8px;padding:14px;">
            <div class="email-strong" style="color:#111827;font-size:12px;line-height:18px;font-weight:600;">如果按钮无法打开，请复制以下链接到浏览器：</div>
            <div class="email-link" style="color:#2563EB;font-size:12px;line-height:18px;word-break:break-all;">${actionUrl}</div>
          </div>
          <div class="email-note" style="background:#F9FAFB;border:1px solid #D9E2EC;border-radius:8px;padding:14px;">
            <div class="email-muted" style="color:#667085;font-size:12px;line-height:18px;">${escapeHtml(input.securityNote)}</div>
          </div>
        </div>
        <div class="email-divider" style="height:1px;background:#D9E2EC;"></div>
        <div class="email-section" style="padding:20px 40px 26px 40px;text-align:center;">
          <div class="email-footer" style="color:#667085;font-size:12px;line-height:18px;">Lever Admin · 安全身份管理</div>
          <div class="email-footer" style="color:#667085;font-size:12px;line-height:18px;">这是一封自动发送的事务邮件，请勿直接回复。</div>
        </div>
      </div>
    </div>
  </body>
</html>`
}

export const renderPlainTextEmail = (input: EmailLayoutInput) => {
  const lines = [
    "Lever Admin",
    "",
    input.title,
    "",
    input.body,
    "",
    ...input.infoRows.flatMap((row) => [`${row.label}: ${row.value}`]),
    "",
    `${input.actionLabel}: ${input.actionUrl}`,
    "",
    input.securityNote,
    "",
    "这是一封自动发送的事务邮件，请勿直接回复。"
  ]

  return lines.join("\n")
}
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS or only pre-existing unrelated failures. Fix template helper syntax before continuing.

- [ ] **Step 3: Commit checkpoint**

```bash
git add src/server/service/email/templates/shared.ts
git commit -m "feat: add shared email template layout"
```

Only run the commit if the user has approved committing in this workspace.

---

## Task 4: Three Email Templates

**Files:**
- Create: `src/server/service/email/templates/verify-email.ts`
- Create: `src/server/service/email/templates/reset-password.ts`
- Create: `src/server/service/email/templates/organization-invitation.ts`

- [ ] **Step 1: Create verify email template**

Create `src/server/service/email/templates/verify-email.ts`:

```ts
import "server-only"

import type { RenderedEmail } from "../types"
import { renderEmailLayout, renderPlainTextEmail } from "./shared"

type VerifyEmailInput = {
  email: string
  expiresInMinutes?: number
  name?: string | null
  url: string
}

export const renderVerifyEmail = ({ email, expiresInMinutes = 60, url }: VerifyEmailInput): RenderedEmail => {
  const layoutInput = {
    actionLabel: "验证邮箱",
    actionUrl: url,
    body: "点击下方按钮完成邮箱验证。验证完成后，你可以继续使用 Lever Admin 的身份、组织和权限管理能力。",
    infoRows: [
      { label: "验证邮箱", value: email },
      { label: "有效期", value: `${expiresInMinutes} 分钟` }
    ],
    preview: "确认你的 Lever Admin 邮箱地址。",
    securityNote: "如果不是你本人操作，可以忽略这封邮件。未验证前不会改变你的账号安全设置。",
    title: "确认你的邮箱地址"
  }

  return {
    html: renderEmailLayout(layoutInput),
    subject: "验证你的 Lever Admin 邮箱",
    text: renderPlainTextEmail(layoutInput)
  }
}
```

- [ ] **Step 2: Create reset password template**

Create `src/server/service/email/templates/reset-password.ts`:

```ts
import "server-only"

import type { RenderedEmail } from "../types"
import { renderEmailLayout, renderPlainTextEmail } from "./shared"

type ResetPasswordEmailInput = {
  email: string
  expiresInMinutes?: number
  name?: string | null
  url: string
}

export const renderResetPasswordEmail = ({ email, expiresInMinutes = 60, url }: ResetPasswordEmailInput): RenderedEmail => {
  const layoutInput = {
    actionLabel: "重置密码",
    actionUrl: url,
    body: "我们收到了重置密码请求。点击下方按钮设置新密码；完成后，当前账号的旧登录状态会按安全策略失效。",
    infoRows: [
      { label: "账号邮箱", value: email },
      { label: "链接有效期", value: `${expiresInMinutes} 分钟` }
    ],
    preview: "重置你的 Lever Admin 登录密码。",
    securityNote: "如果不是你本人请求，请忽略这封邮件，并检查账号安全设置。Lever Admin 不会通过邮件索要密码。",
    title: "重置登录密码"
  }

  return {
    html: renderEmailLayout(layoutInput),
    subject: "重置你的 Lever Admin 密码",
    text: renderPlainTextEmail(layoutInput)
  }
}
```

- [ ] **Step 3: Create organization invitation template**

Create `src/server/service/email/templates/organization-invitation.ts`:

```ts
import "server-only"

import type { RenderedEmail } from "../types"
import { renderEmailLayout, renderPlainTextEmail } from "./shared"

type OrganizationInvitationEmailInput = {
  departmentName?: string | null
  email: string
  expiresAt?: Date | null
  inviterEmail?: string | null
  inviterName?: string | null
  organizationName: string
  role: string
  url: string
}

const formatDateTime = (date: Date | null | undefined) => {
  if (!date) {
    return "未指定"
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date)
}

export const renderOrganizationInvitationEmail = (input: OrganizationInvitationEmailInput): RenderedEmail => {
  const inviter = input.inviterName || input.inviterEmail || "组织管理员"
  const infoRows = [
    { label: "组织", value: input.organizationName },
    { label: "角色", value: input.role },
    { label: "邀请人", value: input.inviterEmail ? `${inviter} · ${input.inviterEmail}` : inviter },
    { label: "接收邮箱", value: input.email },
    { label: "过期时间", value: formatDateTime(input.expiresAt) }
  ]

  if (input.departmentName) {
    infoRows.splice(1, 0, { label: "默认部门", value: input.departmentName })
  }

  const layoutInput = {
    actionLabel: "查看邀请",
    actionUrl: input.url,
    body: `${inviter} 邀请你以 ${input.role} 身份加入 ${input.organizationName}。接受后，你可以在 Lever Admin 中访问该组织授权给你的资源。`,
    infoRows,
    preview: `${input.organizationName} 邀请你加入。`,
    securityNote: "请确认邀请来自你信任的组织。接受邀请前，Lever Admin 会要求你登录并校验当前邮箱。",
    title: `${input.organizationName} 邀请你加入`
  }

  return {
    html: renderEmailLayout(layoutInput),
    subject: `你被邀请加入 ${input.organizationName}`,
    text: renderPlainTextEmail(layoutInput)
  }
}
```

- [ ] **Step 4: Verify templates compile**

Run:

```bash
pnpm typecheck
```

Expected: PASS or only pre-existing unrelated failures. Fix template imports and type names before continuing.

- [ ] **Step 5: Commit checkpoint**

```bash
git add src/server/service/email/templates
git commit -m "feat: add auth email templates"
```

Only run the commit if the user has approved committing in this workspace.

---

## Task 5: Better Auth Integration

**Files:**
- Modify: `src/server/better-auth/config.ts`

- [ ] **Step 1: Import email service and templates**

Add imports near the other server imports:

```ts
import { renderOrganizationInvitationEmail, renderResetPasswordEmail, renderVerifyEmail, sendEmail } from "@/server/service/email"
```

- [ ] **Step 2: Replace reset password console placeholder**

Replace the current `sendResetPassword` body:

```ts
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
```

- [ ] **Step 3: Replace verification console placeholder**

Replace the current `sendVerificationEmail` body:

```ts
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
```

- [ ] **Step 4: Replace Better Auth organization invitation placeholder**

Replace the current `organization({ sendInvitationEmail })` body:

```ts
sendInvitationEmail: async ({ email, invitation, organization }) => {
  const renderedEmail = renderOrganizationInvitationEmail({
    email,
    expiresAt: invitation.expiresAt ?? null,
    organizationName: organization.name,
    role: invitation.role,
    url: `${authBaseUrl}/invite/${invitation.id}`
  })

  await sendEmail({
    ...renderedEmail,
    to: email
  })
}
```

If TypeScript reports that `invitation.expiresAt` or `invitation.role` is unavailable in the Better Auth callback type, use safe local variables:

```ts
const invitationWithOptionalFields = invitation as typeof invitation & {
  expiresAt?: Date | null
  role?: string | null
}
```

Then pass `invitationWithOptionalFields.expiresAt ?? null` and `invitationWithOptionalFields.role ?? "member"`.

- [ ] **Step 5: Verify Better Auth config**

Run:

```bash
pnpm typecheck
```

Expected: PASS or only pre-existing unrelated failures. Fix Better Auth callback types before continuing.

- [ ] **Step 6: Commit checkpoint**

```bash
git add src/server/better-auth/config.ts
git commit -m "feat: send better auth emails through email service"
```

Only run the commit if the user has approved committing in this workspace.

---

## Task 6: Current tRPC Organization Invitation Integration

**Files:**
- Modify: `src/server/api/routers/org.ts`

- [ ] **Step 1: Add imports**

In `src/server/api/routers/org.ts`, add:

```ts
import { env } from "@/env"
import { renderOrganizationInvitationEmail, sendEmail } from "@/server/service/email"
```

If `env` is already imported in the file, reuse the existing import.

- [ ] **Step 2: Select department and inviter details before sending**

After the `ctx.db.insert(invitation).values(...)` call in `org.invitation.invite`, replace the current `console.info("[org:invitation]", ...)` block with:

```ts
const [inviter] = await ctx.db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, ctx.session.user.id)).limit(1)
const [department] = targetDepartmentId
  ? await ctx.db.select({ name: organizationDepartment.name }).from(organizationDepartment).where(eq(organizationDepartment.id, targetDepartmentId)).limit(1)
  : []

const invitationUrl = `${env.BETTER_AUTH_URL ?? defaultAuthBaseUrl}/invite/${id}`
const renderedEmail = renderOrganizationInvitationEmail({
  departmentName: department?.name ?? null,
  email: normalizedEmail,
  expiresAt,
  inviterEmail: inviter?.email ?? ctx.session.user.email,
  inviterName: inviter?.name ?? ctx.session.user.name,
  organizationName: org.name,
  role: input.role,
  url: invitationUrl
})

await sendEmail({
  ...renderedEmail,
  to: normalizedEmail
})
```

Because `defaultAuthBaseUrl` currently lives in `src/server/better-auth/config.ts`, do not import it from there. Instead add a local constant near the top of `org.ts`:

```ts
const defaultAppBaseUrl = "http://localhost:4000"
```

and use:

```ts
const invitationUrl = `${env.BETTER_AUTH_URL ?? defaultAppBaseUrl}/invite/${id}`
```

- [ ] **Step 3: Preserve mutation result**

Leave the existing return unchanged:

```ts
return { id, invited: true }
```

- [ ] **Step 4: Decide failure behavior**

Use strict sending for this first implementation: if `sendEmail` throws, the mutation fails and the invitation row remains inserted. This is acceptable for console provider and surfaces real provider misconfiguration early. If the user later wants background sending, add an outbox table in a separate PRD.

- [ ] **Step 5: Verify org invite compiles**

Run:

```bash
pnpm typecheck
```

Expected: PASS or only pre-existing unrelated failures. Fix missing imports or `ctx.session.user.name` type issues before continuing.

- [ ] **Step 6: Commit checkpoint**

```bash
git add src/server/api/routers/org.ts
git commit -m "feat: send organization invitation emails"
```

Only run the commit if the user has approved committing in this workspace.

---

## Task 7: E2E Regression Coverage

**Files:**
- Modify: `e2e/specs/03-forgot-password.spec.ts`
- Modify: `e2e/specs/05-verify-email.spec.ts`
- Modify: `e2e/specs/10A-organization-invitation-accept.spec.ts`

- [ ] **Step 1: Keep existing flow tests**

Do not rename the existing tests. They already cover:

- Password reset request still returns the safe success message.
- Verification resend still reaches the success state.
- Organization invite creation still produces a pending invitation and can be accepted/rejected.

- [ ] **Step 2: Add one assertion to invite creation flow**

In `e2e/specs/10A-organization-invitation-accept.spec.ts`, after:

```ts
await expect(page.getByRole("row").filter({ hasText: invitedEmail }).getByText("待接受")).toBeVisible()
```

add:

```ts
await expect.poll(() => getInvitationStatusByEmail({ email: invitedEmail, organizationId: rootId })).toBe("pending")
```

This catches failures where invitation creation is broken by email service integration.

- [ ] **Step 3: Add a reset request regression comment**

In `e2e/specs/03-forgot-password.spec.ts`, add a short comment above the existing existing-email test:

```ts
// This also exercises the Better Auth sendResetPassword callback through the console email provider in E2E.
```

- [ ] **Step 4: Add a verification resend regression comment**

In `e2e/specs/05-verify-email.spec.ts`, add a short comment above the resend test:

```ts
// This also exercises the Better Auth sendVerificationEmail callback through the console email provider in E2E.
```

- [ ] **Step 5: Run focused E2E tests**

Run with Docker available:

```bash
pnpm test:e2e --project=chromium e2e/specs/03-forgot-password.spec.ts e2e/specs/05-verify-email.spec.ts e2e/specs/10A-organization-invitation-accept.spec.ts
```

Expected: all selected Chromium tests pass. If Docker is not running, record the exact Testcontainers error and continue with `pnpm typecheck` and `pnpm check`.

- [ ] **Step 6: Commit checkpoint**

```bash
git add e2e/specs/03-forgot-password.spec.ts e2e/specs/05-verify-email.spec.ts e2e/specs/10A-organization-invitation-accept.spec.ts
git commit -m "test: cover email service auth flows"
```

Only run the commit if the user has approved committing in this workspace.

---

## Task 8: Final Verification And PRD Check

**Files:**
- Review: `prd/17-email-service.md`
- Review: `prd/03-forgot-password.md`
- Review: `prd/05-verify-email.md`
- Review: `prd/10A-organization-invitation-accept.md`
- Review: `prd/10-dashboard-orgs-slug-settings.md`

- [ ] **Step 1: Confirm PRD alignment**

Check that implementation matches:

- `src/server/service/email` exists and owns provider switching.
- `verify-email.ts`, `reset-password.ts`, and `organization-invitation.ts` exist.
- `EMAIL_PROVIDER=console | resend | smtp` is documented and validated.
- Better Auth callbacks no longer directly call provider SDKs.
- Current tRPC invite flow also sends through the same organization invitation template.
- HTML templates include dark-mode CSS but default to light inline styles.

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Run Biome**

```bash
pnpm check
```

Expected: PASS.

- [ ] **Step 4: Run production build**

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 5: Run focused E2E if Docker is available**

```bash
pnpm test:e2e --project=chromium e2e/specs/03-forgot-password.spec.ts e2e/specs/05-verify-email.spec.ts e2e/specs/10A-organization-invitation-accept.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Final diff review**

Run:

```bash
git status --short
git diff -- src/server/service/email src/server/better-auth/config.ts src/server/api/routers/org.ts src/env.js .env.example e2e/specs/03-forgot-password.spec.ts e2e/specs/05-verify-email.spec.ts e2e/specs/10A-organization-invitation-accept.spec.ts
```

Expected: only the planned files are changed, plus package lock updates from dependency installation. Do not revert unrelated existing workspace changes such as `prd/dashboard-api-key-detail-v2.js`.

---

## Self-Review

- Spec coverage: The plan covers `src/server/service/email`, provider switching, three independent templates, Resend, SMTP, console development behavior, Better Auth callbacks, current tRPC invitation dispatch, dark-mode email CSS, env docs, and verification.
- Placeholder scan: No `TBD`, `TODO`, or vague "add tests" steps are left; each code-producing task includes concrete snippets and commands.
- Type consistency: Public names are consistent across tasks: `sendEmail`, `renderVerifyEmail`, `renderResetPasswordEmail`, `renderOrganizationInvitationEmail`, `RenderedEmail`, and `SendEmailInput`.
