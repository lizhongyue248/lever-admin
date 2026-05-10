# Security Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/dashboard/settings/security` as the PRD 08 security settings page, using real Better Auth/Drizzle data for password, 2FA, Passkey, OAuth accounts, sessions, and security status.

**Architecture:** Reuse the existing `/dashboard` layout from PRD 06. The page itself follows the existing profile page pattern: a Server Component guards access and fetches a tRPC overview, then page-local Client Components handle interactive Better Auth operations. Better Auth remains the source of truth for security actions; tRPC only aggregates safe display data.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict mode, tRPC 11, Drizzle ORM, Better Auth 1.6 plugins, Tailwind CSS 4, shadcn/ui, Zod, Playwright E2E.

---

## File Structure

- Modify: `prd/08-dashboard-settings-security.md`
  - Clarify Drizzle is the ORM for this repository.
  - Document first-version behavior for GitHub configured / Google unconfigured.
  - Document E2E scope for 2FA and Passkey browser APIs.
- Create: `src/server/api/routers/security.ts`
  - tRPC `security.getOverview` protected procedure.
  - Safe aggregation of user security state without returning tokens, secrets, public keys, credentials, backup codes, or session tokens.
- Modify: `src/server/api/root.ts`
  - Register `security: securityRouter`.
- Create: `src/app/dashboard/settings/security/page.tsx`
  - Server-side session guard and initial `api.security.getOverview()` call.
- Create: `src/app/dashboard/settings/security/_components/security-page-content.tsx`
  - Main responsive layout and composition.
- Create: `src/app/dashboard/settings/security/_components/security-score-card.tsx`
  - Compact status/radar-like score visualization using CSS/Tailwind only.
- Create: `src/app/dashboard/settings/security/_components/password-change-card.tsx`
  - Password change form using `authClient.changePassword`.
- Create: `src/app/dashboard/settings/security/_components/two-factor-card.tsx`
  - 2FA enable/verify/disable dialogs using Better Auth client APIs.
- Create: `src/app/dashboard/settings/security/_components/passkey-card.tsx`
  - Passkey list, add dialog, delete confirmation using Better Auth client APIs.
- Create: `src/app/dashboard/settings/security/_components/oauth-accounts-card.tsx`
  - GitHub/Google provider status, link/unlink actions, disabled state for Google.
- Create: `src/app/dashboard/settings/security/_components/recent-login-card.tsx`
  - Recent login method/session summary.
- Create: `e2e/specs/08-dashboard-settings-security.spec.ts`
  - PRD-matching E2E tests.

No new dependencies are required. `react-qr-code`, `zod`, `sonner`, `lucide-react`, Better Auth plugins, and shadcn/ui primitives are already installed.

No schema changes are planned. Do not run `pnpm db:generate` or `pnpm db:migrate`. If local development DB is out of sync, use the project preference: `pnpm db:push`.

---

## API Contract

`security.getOverview` returns only display-safe data:

```ts
type SecurityOverview = {
  user: {
    id: string
    email: string
    emailVerified: boolean
    twoFactorEnabled: boolean
  }
  password: {
    hasPassword: boolean
    updatedAt: Date | null
  }
  twoFactor: {
    enabled: boolean
    verified: boolean
  }
  passkeys: {
    id: string
    name: string
    deviceType: string
    backedUp: boolean
    createdAt: Date | null
  }[]
  oauthProviders: {
    github: {
      configured: boolean
      linked: boolean
      accountId: string | null
      connectedAt: Date | null
      canUnlink: boolean
    }
    google: {
      configured: false
      linked: false
      accountId: null
      connectedAt: null
      canUnlink: false
    }
  }
  sessions: {
    activeCount: number
    current: {
      createdAt: Date
      ipAddress: string | null
      userAgent: string | null
    } | null
  }
  score: {
    total: number
    dimensions: {
      key: "password" | "twoFactor" | "passkey" | "oauth" | "session"
      label: string
      value: number
      source: string
    }[]
  }
  recentLoginMethods: {
    label: string
    status: "active" | "available" | "unconfigured"
    description: string
  }[]
}
```

Data sources:

- Password: `system_account` rows for the current user where a password credential exists.
- 2FA: `system_user.two_factor_enabled` plus `system_two_factor.verified`.
- Passkey: `system_passkey` rows for the current user.
- OAuth: `system_account.provider_id` rows such as `github`; Google remains unconfigured until env/config is added.
- Sessions: `system_session` rows for the current user.
- Score: derived server-side from the above sources.

---

## Task 1: Update PRD 08 Implementation Notes

**Files:**
- Modify: `prd/08-dashboard-settings-security.md`

- [ ] **Step 1: Replace Prisma wording with Drizzle**

Change the common engineering constraint line from:

```md
- Create T3 App: Next.js App Router, TypeScript, tRPC, Prisma, Tailwind CSS
```

to:

```md
- Create T3 App: Next.js App Router, TypeScript, tRPC, Drizzle ORM, Tailwind CSS
```

- [ ] **Step 2: Add provider and E2E notes**

Append under `## 实现要点`:

```md
- 首版 GitHub 绑定使用现有 Better Auth GitHub provider；Google provider 暂未配置时只展示为「未配置」，按钮禁用。
- 自动化测试不直接完成 WebAuthn 设备注册和真实 TOTP 校验，只覆盖入口、弹窗、校验提示和可用状态；真实浏览器能力由 Better Auth 客户端 API 承接。
- 页面聚合接口只返回展示所需字段，不返回 session token、OAuth token、Passkey public key / credential ID、2FA secret 或 backup codes。
```

- [ ] **Step 3: Review PRD wording**

Confirm the PRD still says the page inherits `06-dashboard.md` layout and only defines the main content area.

---

## Task 2: Add `security.getOverview`

**Files:**
- Create: `src/server/api/routers/security.ts`
- Modify: `src/server/api/root.ts`

- [ ] **Step 1: Write the router**

Create `src/server/api/routers/security.ts`:

```ts
import { TRPCError } from "@trpc/server"
import { and, desc, eq, isNotNull, sql } from "drizzle-orm"

import { env } from "@/env"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { account, passkey, session, twoFactor, user } from "@/server/db/schema"

const credentialProviderIds = new Set(["credential", "email", "email-password"])

const countRows = async (query: Promise<{ value: number }[]>) => {
  const [row] = await query

  return row?.value ?? 0
}

const getDimensionValue = (enabled: boolean) => (enabled ? 100 : 35)

export const securityRouter = createTRPCRouter({
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id

    const [currentUser] = await ctx.db
      .select({
        email: user.email,
        emailVerified: user.emailVerified,
        id: user.id,
        twoFactorEnabled: user.twoFactorEnabled
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    if (!currentUser) {
      throw new TRPCError({ code: "NOT_FOUND", message: "未找到当前用户。" })
    }

    const accountRows = await ctx.db
      .select({
        accountId: account.accountId,
        createdAt: account.createdAt,
        id: account.id,
        hasPassword: isNotNull(account.password),
        providerId: account.providerId,
        updatedAt: account.updatedAt
      })
      .from(account)
      .where(eq(account.userId, userId))
      .orderBy(desc(account.createdAt))

    const passkeyRows = await ctx.db
      .select({
        backedUp: passkey.backedUp,
        createdAt: passkey.createdAt,
        deviceType: passkey.deviceType,
        id: passkey.id,
        name: passkey.name
      })
      .from(passkey)
      .where(eq(passkey.userId, userId))
      .orderBy(desc(passkey.createdAt))

    const [twoFactorRow] = await ctx.db
      .select({
        verified: twoFactor.verified
      })
      .from(twoFactor)
      .where(eq(twoFactor.userId, userId))
      .limit(1)

    const activeSessionCount = await countRows(ctx.db.select({ value: sql<number>`count(*)::int` }).from(session).where(eq(session.userId, userId)))

    const [currentSession] = await ctx.db
      .select({
        createdAt: session.createdAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent
      })
      .from(session)
      .where(and(eq(session.userId, userId), eq(session.id, ctx.session.session.id)))
      .limit(1)

    const passwordAccount = accountRows.find((row) => row.hasPassword || credentialProviderIds.has(row.providerId))
    const githubAccount = accountRows.find((row) => row.providerId === "github") ?? null
    const hasPassword = Boolean(passwordAccount)
    const hasPasskey = passkeyRows.length > 0
    const hasGithub = Boolean(githubAccount)
    const hasTwoFactor = Boolean(currentUser.twoFactorEnabled && twoFactorRow?.verified)
    const loginMethodCount = [hasPassword, hasPasskey, hasGithub].filter(Boolean).length
    const canUnlinkGithub = hasGithub && loginMethodCount > 1

    const dimensions = [
      { key: "password" as const, label: "密码强度", value: getDimensionValue(hasPassword), source: "system_account.password/provider_id" },
      { key: "twoFactor" as const, label: "双因素", value: getDimensionValue(hasTwoFactor), source: "system_user.two_factor_enabled + system_two_factor.verified" },
      { key: "passkey" as const, label: "Passkey", value: getDimensionValue(hasPasskey), source: "system_passkey" },
      { key: "oauth" as const, label: "第三方账号", value: getDimensionValue(hasGithub), source: "system_account.provider_id" },
      { key: "session" as const, label: "会话风险", value: activeSessionCount <= 3 ? 100 : 65, source: "system_session count" }
    ]
    const total = Math.round(dimensions.reduce((sum, item) => sum + item.value, 0) / dimensions.length)

    return {
      oauthProviders: {
        github: {
          accountId: githubAccount?.accountId ?? null,
          canUnlink: canUnlinkGithub,
          configured: Boolean(env.BETTER_AUTH_GITHUB_CLIENT_ID && env.BETTER_AUTH_GITHUB_CLIENT_SECRET),
          connectedAt: githubAccount?.createdAt ?? null,
          linked: hasGithub
        },
        google: {
          accountId: null,
          canUnlink: false,
          configured: false,
          connectedAt: null,
          linked: false
        }
      },
      passkeys: passkeyRows.map((row) => ({
        backedUp: row.backedUp,
        createdAt: row.createdAt,
        deviceType: row.deviceType,
        id: row.id,
        name: row.name ?? "未命名 Passkey"
      })),
      password: {
        hasPassword,
        updatedAt: passwordAccount?.updatedAt ?? null
      },
      recentLoginMethods: [
        {
          description: hasPassword ? "当前账号可使用邮箱密码登录。" : "当前账号未检测到密码凭证。",
          label: "邮箱密码",
          status: hasPassword ? ("active" as const) : ("available" as const)
        },
        {
          description: hasPasskey ? "已添加可用于无密码登录的 Passkey。" : "添加 Passkey 后可减少密码暴露风险。",
          label: "Passkey",
          status: hasPasskey ? ("active" as const) : ("available" as const)
        },
        {
          description: hasGithub ? "GitHub 已作为第三方登录方式绑定。" : "GitHub 可作为备用登录方式。",
          label: "GitHub",
          status: hasGithub ? ("active" as const) : ("available" as const)
        },
        {
          description: "Google provider 暂未在 Better Auth 配置中启用。",
          label: "Google",
          status: "unconfigured" as const
        }
      ],
      score: {
        dimensions,
        total
      },
      sessions: {
        activeCount: activeSessionCount,
        current: currentSession ?? null
      },
      twoFactor: {
        enabled: hasTwoFactor,
        verified: Boolean(twoFactorRow?.verified)
      },
      user: currentUser
    }
  })
})
```

- [ ] **Step 2: Register router**

Modify `src/server/api/root.ts`:

```ts
import { dashboardRouter } from "@/server/api/routers/dashboard"
import { profileRouter } from "@/server/api/routers/profile"
import { securityRouter } from "@/server/api/routers/security"
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc"

export const appRouter = createTRPCRouter({
  dashboard: dashboardRouter,
  profile: profileRouter,
  security: securityRouter
})
```

- [ ] **Step 3: Typecheck the API**

Run:

```bash
pnpm typecheck
```

Expected: no TypeScript errors from `security.ts` or `root.ts`.

---

## Task 3: Add Page Shell and Main Composition

**Files:**
- Create: `src/app/dashboard/settings/security/page.tsx`
- Create: `src/app/dashboard/settings/security/_components/security-page-content.tsx`

- [ ] **Step 1: Create the server page**

Use the same redirect pattern as profile:

```tsx
import { redirect } from "next/navigation"

import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"
import { SecurityPageContent } from "./_components/security-page-content"

const SecurityPage = async () => {
  const session = await getSession()

  if (!session?.user) {
    redirect("/sign-in?redirectTo=%2Fdashboard%2Fsettings%2Fsecurity")
  }

  const data = await api.security.getOverview()

  return <SecurityPageContent data={data} />
}

export default SecurityPage
```

- [ ] **Step 2: Create content composition**

`security-page-content.tsx` should:

- be a Client Component because child cards refresh after mutations.
- accept `RouterOutputs["security"]["getOverview"]`.
- use Chinese copy.
- use compact typography: root wrapper `space-y-5 text-[13px]`.
- use only theme tokens (`bg-card`, `text-muted-foreground`, `border`, `bg-background`, `bg-muted`, `text-primary`) so light/dark themes match `src/styles/globals.css`.
- avoid custom per-card shadows; all cards use the same `Card` base style plus `rounded-lg`.

Target composition:

```tsx
"use client"

import type { RouterOutputs } from "@/trpc/react"
import { OAuthAccountsCard } from "./oauth-accounts-card"
import { PasskeyCard } from "./passkey-card"
import { PasswordChangeCard } from "./password-change-card"
import { RecentLoginCard } from "./recent-login-card"
import { SecurityScoreCard } from "./security-score-card"
import { TwoFactorCard } from "./two-factor-card"

type SecurityPageData = RouterOutputs["security"]["getOverview"]

type SecurityPageContentProps = {
  data: SecurityPageData
}

export const SecurityPageContent = ({ data }: SecurityPageContentProps) => (
  <div className="space-y-5 text-[13px]">
    <div className="space-y-1">
      <h1 className="font-semibold text-2xl tracking-normal">安全设置</h1>
      <p className="max-w-2xl text-muted-foreground text-sm">集中管理密码、双因素认证、Passkey 与第三方登录方式。</p>
    </div>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,720px)_340px]">
      <div className="space-y-5">
        <PasswordChangeCard hasPassword={data.password.hasPassword} />
        <TwoFactorCard twoFactor={data.twoFactor} />
        <PasskeyCard passkeys={data.passkeys} />
        <OAuthAccountsCard oauthProviders={data.oauthProviders} />
      </div>

      <div className="space-y-5">
        <SecurityScoreCard score={data.score} />
        <RecentLoginCard methods={data.recentLoginMethods} sessions={data.sessions} />
      </div>
    </div>
  </div>
)
```

---

## Task 4: Implement Display Cards

**Files:**
- Create: `src/app/dashboard/settings/security/_components/security-score-card.tsx`
- Create: `src/app/dashboard/settings/security/_components/recent-login-card.tsx`

- [ ] **Step 1: Create score card**

Implement `SecurityScoreCard` with a compact CSS radar-style visual. Do not add extra numbers inside the chart center. Only the surrounding text shows the total score and dimensions.

Essential structure:

```tsx
import { ShieldCheck } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RouterOutputs } from "@/trpc/react"

type SecurityScore = RouterOutputs["security"]["getOverview"]["score"]

type SecurityScoreCardProps = {
  score: SecurityScore
}

export const SecurityScoreCard = ({ score }: SecurityScoreCardProps) => (
  <Card className="gap-4 rounded-lg py-5">
    <CardHeader className="px-5">
      <div className="flex items-center justify-between gap-3">
        <CardTitle className="text-base">安全雷达</CardTitle>
        <span className="font-semibold text-primary text-sm">{score.total}</span>
      </div>
    </CardHeader>
    <CardContent className="space-y-4 px-5">
      <div className="relative mx-auto aspect-square w-48 max-w-full rounded-full border bg-background/50 dark:bg-muted/20">
        <div className="absolute inset-6 rounded-full border border-dashed" />
        <div className="absolute inset-12 rounded-full border border-dashed" />
        <div className="absolute inset-0 grid place-items-center">
          <ShieldCheck className="size-8 text-primary" />
        </div>
      </div>
      <div className="space-y-2">
        {score.dimensions.map((item) => (
          <div className="flex items-center justify-between gap-3" key={item.key}>
            <span className="text-muted-foreground text-xs">{item.label}</span>
            <span className="font-medium text-xs">{item.value}</span>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)
```

- [ ] **Step 2: Create recent login card**

Show active session count, current device user agent summary, and method list. Never show session token.

---

## Task 5: Implement Password Change

**Files:**
- Create: `src/app/dashboard/settings/security/_components/password-change-card.tsx`

- [ ] **Step 1: Add local validation**

Use Zod:

```ts
const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "请输入当前密码。"),
    newPassword: z.string().min(8, "新密码至少 8 个字符。"),
    revokeOtherSessions: z.boolean(),
    confirmPassword: z.string().min(1, "请再次输入新密码。")
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "两次输入的新密码不一致。",
    path: ["confirmPassword"]
  })
```

- [ ] **Step 2: Call Better Auth**

On submit:

```ts
const result = await authClient.changePassword({
  currentPassword,
  newPassword,
  revokeOtherSessions
})
```

On success:

- show toast `密码已更新。`
- clear form
- call `router.refresh()`

On failure:

- show toast `密码更新失败，请检查当前密码。`

- [ ] **Step 3: UI requirements**

- Card title: `修改密码`
- Fields: `当前密码`, `新密码`, `确认新密码`
- Checkbox: `同时退出其他设备`
- Button: `更新密码`
- Keep disabled/loading state while submitting.

---

## Task 6: Implement 2FA Card

**Files:**
- Create: `src/app/dashboard/settings/security/_components/two-factor-card.tsx`

- [ ] **Step 1: Enable flow**

Dialog flow:

1. User clicks `开启 2FA`.
2. User enters current password.
3. Call `authClient.twoFactor.enable({ password })`.
4. Render returned TOTP URI as QR code using `react-qr-code`.
5. User enters verification code.
6. Call `authClient.twoFactor.verifyTotp({ code })`.
7. Show backup codes if returned by Better Auth response.
8. Toast `双因素认证已开启。`
9. `router.refresh()`.

- [ ] **Step 2: Disable flow**

Dialog flow:

1. User clicks `关闭 2FA`.
2. Confirmation text explains risk.
3. User enters current password.
4. Call `authClient.twoFactor.disable({ password })`.
5. Toast `双因素认证已关闭。`
6. `router.refresh()`.

- [ ] **Step 3: UI requirements**

- Card title: `双因素认证`
- Status text: `已开启` or `未开启`
- High-risk disable action uses `Dialog`, not inline silent action.

---

## Task 7: Implement Passkey Card

**Files:**
- Create: `src/app/dashboard/settings/security/_components/passkey-card.tsx`

- [ ] **Step 1: Render list and empty state**

Show each passkey:

- name
- device type
- backup state
- created date
- delete button

Empty copy:

```txt
还没有 Passkey。添加后可使用设备生物识别或安全密钥登录。
```

- [ ] **Step 2: Add passkey**

Dialog:

- field label: `Passkey 名称`
- button: `添加 Passkey`
- call:

```ts
await authClient.passkey.addPasskey({ name })
```

On success toast `Passkey 已添加。` and refresh.

- [ ] **Step 3: Delete passkey**

Confirmation dialog:

- title: `删除 Passkey`
- call:

```ts
await authClient.passkey.deletePasskey({ id: passkeyId })
```

On success toast `Passkey 已删除。` and refresh.

---

## Task 8: Implement OAuth Accounts Card

**Files:**
- Create: `src/app/dashboard/settings/security/_components/oauth-accounts-card.tsx`

- [ ] **Step 1: Render providers**

Rows:

- GitHub: configured from server env state, linked from `system_account`.
- Google: always `未配置` in first version.

- [ ] **Step 2: Link GitHub**

Button `绑定 GitHub`:

```ts
await authClient.linkSocial({
  callbackURL: "/dashboard/settings/security",
  provider: "github"
})
```

Disable when `configured === false`.

- [ ] **Step 3: Unlink GitHub**

Confirmation dialog:

- disabled if `canUnlink === false`
- copy explains the last login method cannot be removed
- call:

```ts
await authClient.unlinkAccount({
  accountId,
  providerId: "github"
})
```

On success toast `GitHub 已解绑。` and refresh.

---

## Task 9: Add E2E Tests

**Files:**
- Create: `e2e/specs/08-dashboard-settings-security.spec.ts`

- [ ] **Step 1: Anonymous redirect test**

```ts
test("redirects anonymous users to sign in with security redirect target", async ({ page }) => {
  await page.goto("/dashboard/settings/security")

  await expect(page).toHaveURL(/\/sign-in\?redirectTo=%2Fdashboard%2Fsettings%2Fsecurity/)
})
```

- [ ] **Step 2: Authenticated render test**

Use Chromium only for DB-backed sign-in:

```ts
test("renders the authenticated security page", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

  const email = await createVerifiedUser(page, "security")

  await page.goto("/sign-in")
  await signInViaUi(page, { email })
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto("/dashboard/settings/security")

  await expect(page.getByRole("heading", { name: "安全设置" })).toBeVisible()
  await expect(page.getByText("修改密码")).toBeVisible()
  await expect(page.getByText("双因素认证")).toBeVisible()
  await expect(page.getByText("Passkey")).toBeVisible()
  await expect(page.getByText("第三方账号")).toBeVisible()
  await expect(page.getByTestId("dashboard-sidebar-label-安全设置")).toBeVisible()
  await expect(page.getByLabel("面包屑").getByText("首页")).toBeVisible()
  await expect(page.getByLabel("面包屑").getByText("设置")).toBeVisible()
  await expect(page.getByLabel("面包屑").getByText("安全设置")).toBeVisible()
})
```

- [ ] **Step 3: Password validation test**

Assert mismatched confirmation shows:

```txt
两次输入的新密码不一致。
```

- [ ] **Step 4: Password success test**

Flow:

1. create verified user
2. sign in with `e2ePassword`
3. change password to a unique value based on `e2eNewPassword`
4. sign out
5. sign in with the new password
6. expect `/dashboard`

- [ ] **Step 5: 2FA and Passkey entry tests**

Do not complete real TOTP/WebAuthn in Playwright. Assert:

- clicking `开启 2FA` opens password dialog.
- clicking `添加 Passkey` opens passkey name dialog.

- [ ] **Step 6: Mobile render test**

Use `mobile-chrome` only:

```ts
test("renders the security page on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "Mobile security layout only needs the mobile browser project")
  // create user, sign in, navigate, assert key cards visible
})
```

---

## Task 10: Verification

**Files:**
- No new files.

- [ ] **Step 1: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 2: Run Biome**

```bash
pnpm check
```

Expected: PASS. If formatting fails, run `pnpm check:write`, then rerun `pnpm check`.

- [ ] **Step 3: Run focused E2E**

```bash
pnpm test:e2e e2e/specs/08-dashboard-settings-security.spec.ts --project=chromium --project=mobile-chrome
```

Expected: PASS. Videos remain `retain-on-failure` according to `playwright.config.ts`.

- [ ] **Step 4: Run build if practical**

```bash
pnpm build
```

Expected: PASS.

---

## Review Notes

- This plan intentionally does not add a new dashboard layout; `/dashboard/settings/security` inherits the existing `/dashboard/layout.tsx`, sidebar, topbar, breadcrumb, and theme switch behavior.
- This plan does not introduce schema changes because the Better Auth tables already exist in `src/server/db/schema.ts`.
- This plan treats Google as unconfigured until the Better Auth Google provider and env variables are added.
- Secrets are never sent to the client: no session tokens, OAuth tokens, TOTP secrets, backup codes except those returned once during the Better Auth enable flow, passkey public keys, or credential IDs.
- The first E2E version covers reliable browser automation paths and does not attempt to complete hardware/WebAuthn registration.
