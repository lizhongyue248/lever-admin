# Sessions Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/dashboard/settings/sessions` so users can view their active login devices, identify the current session with the design-approved top-right symbol, revoke other sessions, and revoke all other sessions.

**Architecture:** Follow the existing profile/security settings pattern: a Server Component guards access and fetches initial tRPC data, while a page-local Client Component handles dialogs, mutations, toast feedback, and `router.refresh()`. tRPC reads and revokes Better Auth `system_session` rows with server-side ownership checks and never sends full session tokens to the client. The UI matches the approved `prd/dashboard-design.pen` 09 screens, including browser/device icons and the current-session top-right shield marker instead of an inline text badge.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, tRPC 11, Drizzle ORM, Better Auth session tables, Tailwind CSS 4, shadcn/ui, Zod, Playwright E2E.

---

## File Structure

- Modify: `prd/09-dashboard-settings-sessions.md`
  - Replace Prisma with Drizzle.
  - Document that current-session indication is a highlighted row/card plus top-right shield symbol, not an inline text badge.
  - Clarify `session.revoke` accepts a `sessionId`, not a full token, so full session tokens are not returned to the client.
  - Add an implementation note for the “会话健康” side card.
- Create: `src/server/api/routers/session.ts`
  - `session.listMine` protected query.
  - `session.revoke` protected mutation.
  - `session.revokeOthers` protected mutation.
- Modify: `src/server/api/root.ts`
  - Register `session: sessionRouter`.
- Create: `src/app/dashboard/settings/sessions/page.tsx`
  - Server-side session guard and initial `api.session.listMine()` call.
- Create: `src/app/dashboard/settings/sessions/_components/sessions-page-content.tsx`
  - Main layout, action dialogs, mutations, responsive table/card rendering.
- Create: `src/app/dashboard/settings/sessions/_components/session-device-icon.tsx`
  - Browser/device icon mapping from display metadata.
- Create: `src/app/dashboard/settings/sessions/_components/session-health-card.tsx`
  - Right-side “会话健康” summary card.
- Create: `src/app/dashboard/settings/sessions/_components/session-list.tsx`
  - Desktop table and mobile cards with current-session top-right shield marker.
- Create: `e2e/specs/09-dashboard-settings-sessions.spec.ts`
  - PRD-matching E2E tests.

No schema changes are planned. Do not run `pnpm db:generate` or `pnpm db:migrate`.

---

## API Contract

`session.listMine` returns display-safe session data:

```ts
type SessionListMineOutput = {
  health: {
    activeCount: number
    currentCount: 1
    revocableCount: number
    highRiskCount: number
    latestActivityLabel: string
    longestOnlineLabel: string
  }
  sessions: {
    browser: "chrome" | "safari" | "firefox" | "edge" | "unknown"
    browserLabel: string
    createdAt: Date
    deviceLabel: string
    expiresAt: Date
    id: string
    ipAddress: string | null
    isCurrent: boolean
    lastActiveAt: Date
    lastActiveLabel: string
    userAgent: string | null
  }[]
}
```

Mutations:

```ts
session.revoke({ sessionId: string }) -> { revoked: true }
session.revokeOthers() -> { revokedCount: number }
```

Important security rule: do not return `system_session.token` from `session.listMine`. Use `session.id` for UI actions and verify `userId` server-side before deleting.

---

## Task 1: Update PRD 09

**Files:**
- Modify: `prd/09-dashboard-settings-sessions.md`

- [ ] **Step 1: Replace Prisma wording with Drizzle**

Change:

```md
- Create T3 App: Next.js App Router, TypeScript, tRPC, Prisma, Tailwind CSS
```

to:

```md
- Create T3 App: Next.js App Router, TypeScript, tRPC, Drizzle ORM, Tailwind CSS
```

- [ ] **Step 2: Update current-session visual requirement**

Replace:

```md
- 会话列表中当前会话置顶并使用 badge 标记。
```

with:

```md
- 会话列表中当前会话置顶并整行高亮，当前状态使用右上角盾牌符号标识，不使用行内文字 badge。
```

- [ ] **Step 3: Update interface wording**

Replace:

```md
- `session.revoke`：撤销指定 sessionToken，要求属于当前用户。
```

with:

```md
- `session.revoke`：撤销指定 sessionId，服务端要求该会话属于当前用户。
```

- [ ] **Step 4: Add implementation notes**

Append under `## 实现要点`:

```md
- 会话列表可展示设备、浏览器、IP、创建时间和最近活跃时间，但不得向客户端返回完整 session token。
- 右侧信息块使用「会话健康」，展示高风险会话、最近活跃和最长在线摘要。
- 浏览器图标按 user agent 推断，未知浏览器使用通用浏览器图标。
```

---

## Task 2: Add Failing E2E Tests First

**Files:**
- Create: `e2e/specs/09-dashboard-settings-sessions.spec.ts`

- [ ] **Step 1: Write anonymous redirect and authenticated render tests**

Create the file:

```ts
import { expect, test } from "@playwright/test"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"

test.describe("09 dashboard settings sessions", () => {
  test("redirects anonymous users to sign in with sessions redirect target", async ({ page }) => {
    await page.goto("/dashboard/settings/sessions")

    await expect(page).toHaveURL(/\/sign-in\?redirectTo=%2Fdashboard%2Fsettings%2Fsessions/)
  })

  test("renders the authenticated sessions page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "sessions")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/settings/sessions")

    await expect(page.getByRole("heading", { name: "我的会话" })).toBeVisible()
    await expect(page.getByText("退出全部其他设备", { exact: true })).toBeVisible()
    await expect(page.getByText("会话概览", { exact: true })).toBeVisible()
    await expect(page.getByText("登录设备", { exact: true })).toBeVisible()
    await expect(page.getByText("会话健康", { exact: true })).toBeVisible()
    await expect(page.getByTestId("current-session-marker")).toBeVisible()
    await expect(page.getByTestId("dashboard-sidebar-label-我的会话")).toBeVisible()

    const breadcrumbs = page.getByLabel("面包屑")
    await expect(breadcrumbs.getByText("首页", { exact: true })).toBeVisible()
    await expect(breadcrumbs.getByText("设置", { exact: true })).toBeVisible()
    await expect(breadcrumbs.getByText("我的会话", { exact: true })).toBeVisible()
  })
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm test:e2e e2e/specs/09-dashboard-settings-sessions.spec.ts --project=chromium
```

Expected: FAIL because `/dashboard/settings/sessions` page does not exist yet or does not render the required UI.

- [ ] **Step 3: Add revoke dialog and mobile tests**

Extend the same file:

```ts
test("opens the revoke-all-other-sessions confirmation dialog", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

  const email = await createVerifiedUser(page, "sessions-revoke-all")

  await page.goto("/sign-in")
  await signInViaUi(page, { email })
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto("/dashboard/settings/sessions")

  await page.getByRole("button", { name: "退出全部其他设备" }).click()
  await expect(page.getByRole("dialog", { name: "退出全部其他设备" })).toBeVisible()
  await expect(page.getByText("当前设备会保留登录状态。")).toBeVisible()
})

test("renders the sessions page on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "Mobile sessions layout only needs the mobile browser project")

  const email = await createVerifiedUser(page, "sessions-mobile")

  await page.goto("/sign-in")
  await signInViaUi(page, { email })
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto("/dashboard/settings/sessions")

  await expect(page.getByRole("heading", { name: "我的会话" })).toBeVisible()
  await expect(page.getByText("活跃会话", { exact: true })).toBeVisible()
  await expect(page.getByTestId("current-session-marker")).toBeVisible()
})
```

- [ ] **Step 4: Run the focused tests and verify RED**

Run:

```bash
pnpm test:e2e e2e/specs/09-dashboard-settings-sessions.spec.ts --project=chromium --project=mobile-chrome
```

Expected: FAIL for missing page/UI.

---

## Task 3: Add Session Router

**Files:**
- Create: `src/server/api/routers/session.ts`
- Modify: `src/server/api/root.ts`

- [ ] **Step 1: Create the router implementation**

Create `src/server/api/routers/session.ts`:

```ts
import { TRPCError } from "@trpc/server"
import { and, desc, eq, ne } from "drizzle-orm"
import { z } from "zod"

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { session } from "@/server/db/schema"

const getBrowser = (userAgent: string | null) => {
  const value = userAgent?.toLowerCase() ?? ""

  if (value.includes("edg/")) {
    return { browser: "edge" as const, browserLabel: "Edge" }
  }

  if (value.includes("firefox/")) {
    return { browser: "firefox" as const, browserLabel: "Firefox" }
  }

  if (value.includes("chrome/") || value.includes("chromium/")) {
    return { browser: "chrome" as const, browserLabel: "Chrome" }
  }

  if (value.includes("safari/")) {
    return { browser: "safari" as const, browserLabel: "Safari" }
  }

  return { browser: "unknown" as const, browserLabel: "浏览器" }
}

const getDeviceLabel = (userAgent: string | null) => {
  const value = userAgent?.toLowerCase() ?? ""

  if (value.includes("iphone")) {
    return "iPhone"
  }

  if (value.includes("ipad")) {
    return "iPad"
  }

  if (value.includes("android")) {
    return "Android"
  }

  if (value.includes("windows")) {
    return "Windows"
  }

  if (value.includes("mac os") || value.includes("macintosh")) {
    return "Mac"
  }

  return "未知设备"
}

const formatRelativeActivity = (date: Date) => {
  const diffMs = Math.max(0, Date.now() - date.getTime())
  const diffMinutes = Math.floor(diffMs / 60_000)

  if (diffMinutes < 1) {
    return "刚刚"
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours} 小时前`
  }

  return `${Math.floor(diffHours / 24)} 天前`
}

const formatOnlineDuration = (createdAt: Date) => {
  const diffMs = Math.max(0, Date.now() - createdAt.getTime())
  const diffHours = Math.floor(diffMs / 3_600_000)

  if (diffHours < 1) {
    return "不足 1 小时"
  }

  if (diffHours < 24) {
    return `${diffHours} 小时`
  }

  return `${Math.floor(diffHours / 24)} 天`
}

export const sessionRouter = createTRPCRouter({
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id
    const currentSessionId = ctx.session.session.id

    const rows = await ctx.db
      .select({
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        id: session.id,
        ipAddress: session.ipAddress,
        updatedAt: session.updatedAt,
        userAgent: session.userAgent
      })
      .from(session)
      .where(eq(session.userId, userId))
      .orderBy(desc(session.id))

    const sortedRows = rows.sort((left, right) => {
      if (left.id === currentSessionId) {
        return -1
      }

      if (right.id === currentSessionId) {
        return 1
      }

      return right.createdAt.getTime() - left.createdAt.getTime()
    })

    const sessions = sortedRows.map((row) => {
      const browser = getBrowser(row.userAgent)
      const lastActiveAt = row.updatedAt ?? row.createdAt

      return {
        ...browser,
        createdAt: row.createdAt,
        deviceLabel: getDeviceLabel(row.userAgent),
        expiresAt: row.expiresAt,
        id: row.id,
        ipAddress: row.ipAddress,
        isCurrent: row.id === currentSessionId,
        lastActiveAt,
        lastActiveLabel: formatRelativeActivity(lastActiveAt),
        userAgent: row.userAgent
      }
    })

    const longestSession = sessions.reduce<Date | null>((oldest, item) => {
      if (!oldest || item.createdAt < oldest) {
        return item.createdAt
      }

      return oldest
    }, null)

    return {
      health: {
        activeCount: sessions.length,
        currentCount: 1 as const,
        highRiskCount: 0,
        latestActivityLabel: sessions[0]?.lastActiveLabel ?? "暂无",
        longestOnlineLabel: longestSession ? formatOnlineDuration(longestSession) : "暂无",
        revocableCount: sessions.filter((item) => !item.isCurrent).length
      },
      sessions
    }
  }),

  revoke: protectedProcedure.input(z.object({ sessionId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    if (input.sessionId === ctx.session.session.id) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "当前会话请通过退出登录结束。" })
    }

    const deletedRows = await ctx.db
      .delete(session)
      .where(and(eq(session.id, input.sessionId), eq(session.userId, ctx.session.user.id)))
      .returning({ id: session.id })

    if (deletedRows.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "未找到可撤销的会话。" })
    }

    return { revoked: true }
  }),

  revokeOthers: protectedProcedure.mutation(async ({ ctx }) => {
    const deletedRows = await ctx.db
      .delete(session)
      .where(and(eq(session.userId, ctx.session.user.id), ne(session.id, ctx.session.session.id)))
      .returning({ id: session.id })

    return { revokedCount: deletedRows.length }
  })
})
```

- [ ] **Step 2: Register the router**

Modify `src/server/api/root.ts`:

```ts
import { dashboardRouter } from "@/server/api/routers/dashboard"
import { profileRouter } from "@/server/api/routers/profile"
import { securityRouter } from "@/server/api/routers/security"
import { sessionRouter } from "@/server/api/routers/session"
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc"

export const appRouter = createTRPCRouter({
  dashboard: dashboardRouter,
  profile: profileRouter,
  security: securityRouter,
  session: sessionRouter
})
```

- [ ] **Step 3: Typecheck the router**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

---

## Task 4: Add Page Shell

**Files:**
- Create: `src/app/dashboard/settings/sessions/page.tsx`

- [ ] **Step 1: Create the server page**

Create `src/app/dashboard/settings/sessions/page.tsx`:

```tsx
import { redirect } from "next/navigation"

import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"
import { SessionsPageContent } from "./_components/sessions-page-content"

const SessionsPage = async () => {
  const session = await getSession()

  if (!session?.user) {
    redirect("/sign-in?redirectTo=%2Fdashboard%2Fsettings%2Fsessions")
  }

  const data = await api.session.listMine()

  return <SessionsPageContent data={data} />
}

export default SessionsPage
```

- [ ] **Step 2: Run E2E and verify the RED narrows**

Run:

```bash
pnpm test:e2e e2e/specs/09-dashboard-settings-sessions.spec.ts --project=chromium
```

Expected: still FAIL because page content components do not exist yet.

---

## Task 5: Add UI Components

**Files:**
- Create: `src/app/dashboard/settings/sessions/_components/session-device-icon.tsx`
- Create: `src/app/dashboard/settings/sessions/_components/session-health-card.tsx`
- Create: `src/app/dashboard/settings/sessions/_components/session-list.tsx`
- Create: `src/app/dashboard/settings/sessions/_components/sessions-page-content.tsx`

- [ ] **Step 1: Create browser icon component**

Create `session-device-icon.tsx`:

```tsx
import { Compass, Globe2, PanelTop, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { RouterOutputs } from "@/trpc/react"

type Browser = RouterOutputs["session"]["listMine"]["sessions"][number]["browser"]

type SessionDeviceIconProps = {
  browser: Browser
  current?: boolean
}

const browserIcons: Record<Browser, LucideIcon> = {
  chrome: Globe2,
  edge: PanelTop,
  firefox: Globe2,
  safari: Compass,
  unknown: Globe2
}

export const SessionDeviceIcon = ({ browser, current = false }: SessionDeviceIconProps) => {
  const Icon = browserIcons[browser]

  return (
    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground", current && "bg-primary/10 text-primary")}>
      <Icon className="size-4" />
    </span>
  )
}
```

- [ ] **Step 2: Create health card**

Create `session-health-card.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RouterOutputs } from "@/trpc/react"

type SessionHealth = RouterOutputs["session"]["listMine"]["health"]

type SessionHealthCardProps = {
  health: SessionHealth
}

export const SessionHealthCard = ({ health }: SessionHealthCardProps) => (
  <Card className="gap-4 rounded-lg py-5">
    <CardHeader className="px-5">
      <CardTitle className="text-base">会话健康</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4 px-5">
      <p className="text-muted-foreground text-xs leading-5">基于活跃会话数量、当前设备和最近活跃时间，快速判断账号是否存在异常登录迹象。</p>
      <div className="divide-y rounded-md border bg-background/60 dark:bg-muted/20">
        <div className="flex items-center justify-between px-3 py-3">
          <span className="text-muted-foreground text-xs">高风险会话</span>
          <span className="font-semibold text-primary text-lg">{health.highRiskCount}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-3">
          <span className="text-muted-foreground text-xs">最近活跃</span>
          <span className="font-medium text-xs">{health.latestActivityLabel}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-3">
          <span className="text-muted-foreground text-xs">最长在线</span>
          <span className="font-medium text-xs">{health.longestOnlineLabel}</span>
        </div>
      </div>
    </CardContent>
  </Card>
)
```

- [ ] **Step 3: Create session list component**

Create `session-list.tsx`:

```tsx
import { ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { RouterOutputs } from "@/trpc/react"
import { SessionDeviceIcon } from "./session-device-icon"

type SessionItem = RouterOutputs["session"]["listMine"]["sessions"][number]

type SessionListProps = {
  onOpenRevoke: (session: SessionItem) => void
  onSignOut: () => void
  sessions: SessionItem[]
}

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(date)

const CurrentSessionMarker = () => (
  <span className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary" data-testid="current-session-marker">
    <ShieldCheck className="size-4" />
  </span>
)

export const SessionList = ({ onOpenRevoke, onSignOut, sessions }: SessionListProps) => (
  <Card className="gap-4 rounded-lg py-5">
    <CardHeader className="px-5">
      <CardTitle className="text-base">登录设备</CardTitle>
      <p className="text-muted-foreground text-xs">当前会话置顶显示，不展示完整 session token。</p>
    </CardHeader>
    <CardContent className="px-5">
      {sessions.length === 0 ? (
        <div className="rounded-md border bg-background/60 p-6 text-center text-muted-foreground text-sm">暂无活跃会话。</div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border lg:block">
            <div className="grid grid-cols-[minmax(260px,1fr)_120px_160px_120px] bg-muted/40 px-4 py-3 font-medium text-muted-foreground text-xs">
              <span>设备</span>
              <span>IP</span>
              <span>最近活跃</span>
              <span>操作</span>
            </div>
            <div className="divide-y">
              {sessions.map((item) => (
                <div className={cn("relative grid grid-cols-[minmax(260px,1fr)_120px_160px_120px] items-center px-4 py-4", item.isCurrent && "bg-primary/5")} key={item.id}>
                  {item.isCurrent ? <CurrentSessionMarker /> : null}
                  <div className="flex min-w-0 items-center gap-3 pr-8">
                    <SessionDeviceIcon browser={item.browser} current={item.isCurrent} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">
                        {item.deviceLabel} · {item.browserLabel}
                      </p>
                      <p className="mt-1 text-muted-foreground text-xs">创建于 {formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                  <span className="text-xs">{item.ipAddress ?? "未知 IP"}</span>
                  <span className="text-xs">{item.lastActiveLabel}</span>
                  {item.isCurrent ? (
                    <Button className="w-fit px-0 text-primary" onClick={onSignOut} size="sm" type="button" variant="link">
                      退出登录
                    </Button>
                  ) : (
                    <Button className="w-fit px-0 text-destructive" onClick={() => onOpenRevoke(item)} size="sm" type="button" variant="link">
                      撤销
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 lg:hidden">
            {sessions.map((item) => (
              <div className={cn("relative rounded-lg border bg-card p-4", item.isCurrent && "border-primary/40 bg-primary/5")} key={item.id}>
                {item.isCurrent ? <CurrentSessionMarker /> : null}
                <div className="flex min-w-0 items-center gap-3 pr-8">
                  <SessionDeviceIcon browser={item.browser} current={item.isCurrent} />
                  <p className="truncate font-medium text-sm">
                    {item.deviceLabel} · {item.browserLabel}
                  </p>
                </div>
                <p className="mt-4 text-muted-foreground text-xs">
                  {item.ipAddress ?? "未知 IP"} · {item.lastActiveLabel} · 创建于 {formatDate(item.createdAt)}
                </p>
                <div className="mt-3 flex justify-end">
                  {item.isCurrent ? (
                    <Button className="px-0 text-primary" onClick={onSignOut} size="sm" type="button" variant="link">
                      退出登录
                    </Button>
                  ) : (
                    <Button className="px-0 text-destructive" onClick={() => onOpenRevoke(item)} size="sm" type="button" variant="link">
                      撤销
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </CardContent>
  </Card>
)
```

- [ ] **Step 4: Create page composition and dialogs**

Create `sessions-page-content.tsx`:

```tsx
"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { authClient } from "@/server/better-auth/client"
import { api } from "@/trpc/react"
import type { RouterOutputs } from "@/trpc/react"
import { SessionHealthCard } from "./session-health-card"
import { SessionList } from "./session-list"

type SessionsData = RouterOutputs["session"]["listMine"]
type SessionItem = SessionsData["sessions"][number]

type SessionsPageContentProps = {
  data: SessionsData
}

export const SessionsPageContent = ({ data }: SessionsPageContentProps) => {
  const router = useRouter()
  const [revokeTarget, setRevokeTarget] = useState<SessionItem | null>(null)
  const [revokeOthersOpen, setRevokeOthersOpen] = useState(false)

  const handleSignOut = async () => {
    await authClient.signOut()
    router.replace("/sign-in")
    router.refresh()
  }

  const revokeSession = api.session.revoke.useMutation({
    onError: () => {
      toast.error("会话撤销失败，请稍后重试。")
    },
    onSuccess: () => {
      toast.success("会话已撤销。")
      setRevokeTarget(null)
      router.refresh()
    }
  })

  const revokeOthers = api.session.revokeOthers.useMutation({
    onError: () => {
      toast.error("其他设备退出失败，请稍后重试。")
    },
    onSuccess: ({ revokedCount }) => {
      toast.success(revokedCount > 0 ? "其他设备已退出。" : "没有其他设备需要退出。")
      setRevokeOthersOpen(false)
      router.refresh()
    }
  })

  return (
    <div className="space-y-5 text-[13px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-normal">我的会话</h1>
          <p className="max-w-2xl text-muted-foreground text-sm">查看当前登录设备，撤销不再使用或可疑的会话。</p>
        </div>
        <Button disabled={data.health.revocableCount === 0} onClick={() => setRevokeOthersOpen(true)} type="button" variant="destructive">
          退出全部其他设备
        </Button>
      </div>

      <Card className="gap-4 rounded-lg py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">会话概览</CardTitle>
          <p className="text-muted-foreground text-xs">当前会话会保留；撤销其他会话后，对应设备需要重新登录。</p>
        </CardHeader>
        <CardContent className="grid gap-3 px-5 sm:grid-cols-3">
          <div>
            <p className="font-semibold text-3xl text-primary">{data.health.activeCount}</p>
            <p className="mt-1 text-muted-foreground text-xs">活跃会话</p>
          </div>
          <div>
            <p className="font-semibold text-3xl text-primary">{data.health.currentCount}</p>
            <p className="mt-1 text-muted-foreground text-xs">当前设备</p>
          </div>
          <div>
            <p className="font-semibold text-3xl text-primary">{data.health.revocableCount}</p>
            <p className="mt-1 text-muted-foreground text-xs">可撤销</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,760px)_290px]">
        <SessionList onOpenRevoke={setRevokeTarget} onSignOut={handleSignOut} sessions={data.sessions} />
        <SessionHealthCard health={data.health} />
      </div>

      <Dialog onOpenChange={(open) => !open && setRevokeTarget(null)} open={Boolean(revokeTarget)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>撤销会话</DialogTitle>
            <DialogDescription>该设备会立即退出登录，并需要重新完成身份验证。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button disabled={revokeSession.isPending} onClick={() => setRevokeTarget(null)} type="button" variant="outline">
              取消
            </Button>
            <Button disabled={revokeSession.isPending || !revokeTarget} onClick={() => revokeTarget && revokeSession.mutate({ sessionId: revokeTarget.id })} type="button" variant="destructive">
              确认撤销
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setRevokeOthersOpen} open={revokeOthersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>退出全部其他设备</DialogTitle>
            <DialogDescription>当前设备会保留登录状态。其他设备会立即退出，并需要重新登录。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button disabled={revokeOthers.isPending} onClick={() => setRevokeOthersOpen(false)} type="button" variant="outline">
              取消
            </Button>
            <Button disabled={revokeOthers.isPending} onClick={() => revokeOthers.mutate()} type="button" variant="destructive">
              确认退出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 5: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

---

## Task 6: Verify E2E Green and Add Revoke Coverage

**Files:**
- Modify: `e2e/specs/09-dashboard-settings-sessions.spec.ts`

- [ ] **Step 1: Run the current E2E tests**

Run:

```bash
pnpm test:e2e e2e/specs/09-dashboard-settings-sessions.spec.ts --project=chromium --project=mobile-chrome
```

Expected: PASS for anonymous redirect, authenticated render, dialog open, and mobile render.

- [ ] **Step 2: Add a single-session revoke test using a second login context**

Extend the test file:

```ts
test("revokes another active session", async ({ browser, page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

  const email = await createVerifiedUser(page, "sessions-revoke-one")
  const otherContext = await browser.newContext()
  const otherPage = await otherContext.newPage()

  try {
    await otherPage.goto("/sign-in")
    await signInViaUi(otherPage, { email })
    await expect(otherPage).toHaveURL(/\/dashboard$/)

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/settings/sessions")

    await expect(page.getByText("2", { exact: true }).first()).toBeVisible()
    await page.getByRole("button", { name: "撤销" }).first().click()
    await expect(page.getByRole("dialog", { name: "撤销会话" })).toBeVisible()
    await page.getByRole("button", { name: "确认撤销" }).click()
    await expect(page.getByText("会话已撤销。")).toBeVisible()
  } finally {
    await otherContext.close()
  }
})
```

- [ ] **Step 3: Run the revoke test and verify GREEN**

Run:

```bash
pnpm test:e2e e2e/specs/09-dashboard-settings-sessions.spec.ts --project=chromium
```

Expected: PASS.

---

## Task 7: Final Verification

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
pnpm test:e2e e2e/specs/09-dashboard-settings-sessions.spec.ts --project=chromium --project=mobile-chrome
```

Expected: PASS. If port `3100` is already in use by a stale E2E Next process, identify that specific process first and stop only that process tree, then rerun.

- [ ] **Step 4: Run build**

```bash
pnpm build
```

Expected: PASS and `/dashboard/settings/sessions` appears as a dynamic route.

---

## Self-Review

- PRD coverage: route, dashboard layout inheritance, current-session marker, browser icons, session health card, revoke single, revoke others, mobile cards, and no full token exposure are all covered.
- TDD coverage: E2E tests are written and run RED before implementation, then rerun GREEN after implementation.
- Type consistency: router is registered as `session`, page reads `api.session.listMine()`, client mutations use `api.session.revoke` and `api.session.revokeOthers`, and component props use `RouterOutputs["session"]["listMine"]`.
- Scope: this plan does not add schema changes, organization session management, audit history, or risk scoring beyond first-version display summaries.
