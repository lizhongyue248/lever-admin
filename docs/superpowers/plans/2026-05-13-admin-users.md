# Admin Users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/dashboard/admin/users` and `/dashboard/admin/users/[id]` so platform admins can search, inspect, and manage Better Auth users with list, drawer, and full-detail responsive states.

**Architecture:** Better Auth remains the source of truth for users, roles, bans, impersonation, and session revocation. tRPC exposes product-shaped admin procedures that wrap Better Auth server APIs and Drizzle aggregation where the UI needs counts or related organization data. The UI shares one `AdminUserDetailContent` between the desktop drawer and the full detail route, with layout containers deciding whether it appears as a right drawer or a page.

**Tech Stack:** Next.js 16 App Router, React 19, tRPC 11, TanStack Query, Drizzle ORM, Better Auth admin plugin, Tailwind CSS 4, shadcn/ui-style local components, Zod, Playwright E2E with Testcontainers PostgreSQL.

---

## File Structure

- Create: `src/server/api/routers/admin-user.ts`  
  Owns platform-admin user list/detail/mutations. Uses `adminProcedure`, Better Auth `auth.api.*`, and Drizzle reads for related organizations/API keys.
- Modify: `src/server/api/root.ts`  
  Registers `adminUser: adminUserRouter`.
- Create: `src/app/dashboard/admin/users/page.tsx`  
  Server page for list route. Prefetches first page and optional selected user for drawer.
- Create: `src/app/dashboard/admin/users/loading.tsx`  
  Route-level loading skeleton.
- Create: `src/app/dashboard/admin/users/error.tsx`  
  Route-level error boundary.
- Create: `src/app/dashboard/admin/users/[id]/page.tsx`  
  Server page for full user detail route.
- Create: `src/app/dashboard/admin/users/[id]/loading.tsx`
- Create: `src/app/dashboard/admin/users/[id]/error.tsx`
- Create: `src/app/dashboard/admin/users/_components/admin-users-content.tsx`  
  Client list UI: title, card-contained toolbar/table/cards, pagination, drawer routing.
- Create: `src/app/dashboard/admin/users/_components/admin-user-detail-content.tsx`  
  Shared detail UI for drawer and full page.
- Create: `src/app/dashboard/admin/users/_components/admin-user-dialogs.tsx`  
  Create user, role/password, ban/unban, delete, revoke confirmations.
- Create: `src/app/dashboard/admin/users/_components/admin-user-status.tsx`  
  Focused loading, empty, forbidden, and error states.
- Modify: `e2e/helpers/db.ts`  
  Add admin-user seed helpers.
- Create: `e2e/specs/dashboard-admin-users.spec.ts`  
  Covers list search, drawer open/close, mobile card navigation, and guarded actions.

Do not run `pnpm db:generate`, `pnpm db:migrate`, or `pnpm db:push` for this feature unless explicitly approved. Existing schema already includes Better Auth admin fields used by this plan.

---

### Task 1: Server Contract And Fixtures

**Files:**
- Modify: `e2e/helpers/db.ts`
- Create: `e2e/specs/dashboard-admin-users.spec.ts`

- [ ] **Step 1: Add deterministic user/session fixtures**

Append these helpers to `e2e/helpers/db.ts`:

```ts
export const createAdminUserFixture = async ({
  banned = false,
  email,
  name,
  role = "user"
}: {
  banned?: boolean
  email: string
  name: string
  role?: string
}) => {
  const sql = createE2eSql()
  const id = `user-${email.replace(/[^a-z0-9]/giu, "-")}`

  try {
    await sql`
      insert into "system_user" ("id", "name", "email", "email_verified", "role", "banned", "created_at", "updated_at")
      values (${id}, ${name}, ${email}, true, ${role}, ${banned}, now(), now())
      on conflict ("email") do update set
        "name" = excluded."name",
        "email_verified" = true,
        "role" = excluded."role",
        "banned" = excluded."banned",
        "updated_at" = now()
    `

    return { email, id, name, role }
  } finally {
    await sql.end()
  }
}

export const createUserSessionFixture = async ({ email, userAgent = "E2E Chrome" }: { email: string; userAgent?: string }) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ id: string }[]>`
      select "id"
      from "system_user"
      where "email" = ${email}
      limit 1
    `
    const userId = rows[0]?.id

    if (!userId) {
      throw new Error(`Cannot create session for missing user: ${email}`)
    }

    const token = `session-${crypto.randomUUID()}`
    await sql`
      insert into "system_session" ("id", "token", "user_id", "expires_at", "ip_address", "user_agent", "created_at", "updated_at")
      values (${`session-${crypto.randomUUID()}`}, ${token}, ${userId}, now() + interval '7 days', '127.0.0.1', ${userAgent}, now(), now())
    `

    return { token, userId }
  } finally {
    await sql.end()
  }
}
```

- [ ] **Step 2: Write the first failing E2E test for list and drawer behavior**

Create `e2e/specs/dashboard-admin-users.spec.ts`:

```ts
import { expect, test } from "@playwright/test"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { createAdminUserFixture, createUserSessionFixture, setUserRole } from "../helpers/db"

test.describe("dashboard admin users", () => {
  test("searches users and opens the desktop detail drawer", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "dashboard-admin-users-admin")
    await setUserRole(adminEmail, "admin")
    const target = await createAdminUserFixture({
      email: `maya-${Date.now()}@example.com`,
      name: "Maya Chen",
      role: "admin"
    })
    await createUserSessionFixture({ email: target.email })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await page.goto("/dashboard/admin/users")

    await expect(page.getByRole("heading", { name: "平台用户" })).toBeVisible()
    await page.getByLabel("搜索用户").fill("Maya")
    await expect(page.getByTestId(`admin-user-row-${target.id}`)).toBeVisible()

    await page.getByTestId(`admin-user-row-${target.id}`).click()
    await expect(page.getByTestId("admin-user-detail-drawer")).toBeVisible()
    await expect(page.getByTestId("admin-user-detail-drawer").getByText("Maya Chen")).toBeVisible()
    await expect(page.getByRole("link", { name: "完整页" })).toHaveAttribute("href", `/dashboard/admin/users/${target.id}`)

    await page.getByRole("button", { name: "关闭用户详情" }).click()
    await expect(page.getByTestId("admin-user-detail-drawer")).toBeHidden()
    await expect(page.getByTestId(`admin-user-row-${target.id}`)).toBeVisible()
  })
})
```

- [ ] **Step 3: Run the failing test**

Run:

```bash
pnpm test:e2e -- --project=chromium e2e/specs/dashboard-admin-users.spec.ts
```

Expected: FAIL because `/dashboard/admin/users` and the admin-user UI do not exist yet.

---

### Task 2: tRPC Admin User Router

**Files:**
- Create: `src/server/api/routers/admin-user.ts`
- Modify: `src/server/api/root.ts`

- [ ] **Step 1: Implement the router skeleton and typed inputs**

Create `src/server/api/routers/admin-user.ts`:

```ts
import { headers } from "next/headers"
import { TRPCError } from "@trpc/server"
import { and, desc, eq, ilike, or, sql } from "drizzle-orm"
import { z } from "zod"

import { PLATFORM_ADMIN_ROLES, PLATFORM_ROLE_ADMIN, PLATFORM_ROLE_SUPER_ADMIN, PLATFORM_ROLE_SUPPORT, PLATFORM_ROLE_USER } from "@/lib/const"
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc"
import { auth } from "@/server/better-auth"
import { apikey, member, organization, session, user } from "@/server/db/schema"

const platformRoleSchema = z.enum([PLATFORM_ROLE_USER, PLATFORM_ROLE_SUPPORT, PLATFORM_ROLE_ADMIN, PLATFORM_ROLE_SUPER_ADMIN])
const userStatusSchema = z.enum(["all", "active", "banned"])

const assertCanManageTarget = ({ actorRole, actorUserId, targetRole, targetUserId }: { actorRole: string | null | undefined; actorUserId: string; targetRole: string | null | undefined; targetUserId: string }) => {
  if (actorUserId === targetUserId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "不能对当前登录管理员执行该操作。" })
  }

  if (actorRole === PLATFORM_ROLE_SUPPORT && (targetRole === PLATFORM_ROLE_ADMIN || targetRole === PLATFORM_ROLE_SUPER_ADMIN)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "support 不可操作 admin 或 super_admin。" })
  }

  if (targetRole === PLATFORM_ROLE_SUPER_ADMIN && actorRole !== PLATFORM_ROLE_SUPER_ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要超级管理员权限。" })
  }
}

export const adminUserRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
        role: platformRoleSchema.or(z.literal("all")).default("all"),
        search: z.string().default(""),
        status: userStatusSchema.default("all")
      })
    )
    .query(async ({ ctx, input }) => {
      const trimmedSearch = input.search.trim()
      const searchValue = `%${trimmedSearch}%`
      const filters = and(
        trimmedSearch ? or(ilike(user.name, searchValue), ilike(user.email, searchValue)) : undefined,
        input.role === "all" ? undefined : eq(user.role, input.role),
        input.status === "all" ? undefined : eq(user.banned, input.status === "banned")
      )

      const [totalRow] = await ctx.db.select({ value: sql<number>`count(*)::int` }).from(user).where(filters)
      const rows = await ctx.db
        .select({
          banned: user.banned,
          createdAt: user.createdAt,
          email: user.email,
          emailVerified: user.emailVerified,
          id: user.id,
          image: user.image,
          name: user.name,
          role: user.role,
          sessionCount: sql<number>`(
            select count(*)::int
            from "system_session" active_session
            where active_session."user_id" = ${user.id}
              and active_session."expires_at" > now()
          )`
        })
        .from(user)
        .where(filters)
        .orderBy(desc(user.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize)

      const total = totalRow?.value ?? 0

      return {
        items: rows.map((row) => ({ ...row, role: row.role ?? PLATFORM_ROLE_USER, status: row.banned ? "banned" : "active" })),
        page: input.page,
        pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
        total
      }
    })
})
```

- [ ] **Step 2: Register the router**

Modify `src/server/api/root.ts`:

```ts
import { adminOrgRouter } from "@/server/api/routers/admin-org"
import { adminUserRouter } from "@/server/api/routers/admin-user"
import { dashboardRouter } from "@/server/api/routers/dashboard"
import { notificationRouter } from "@/server/api/routers/notification"
import { orgRouter } from "@/server/api/routers/org"
import { profileRouter } from "@/server/api/routers/profile"
import { securityRouter } from "@/server/api/routers/security"
import { sessionRouter } from "@/server/api/routers/session"
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc"

export const appRouter = createTRPCRouter({
  adminOrg: adminOrgRouter,
  adminUser: adminUserRouter,
  dashboard: dashboardRouter,
  notification: notificationRouter,
  org: orgRouter,
  profile: profileRouter,
  security: securityRouter,
  session: sessionRouter
})

export type AppRouter = typeof appRouter
export const createCaller = createCallerFactory(appRouter)
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS for the skeleton router.

---

### Task 3: Detail Queries And Mutations

**Files:**
- Modify: `src/server/api/routers/admin-user.ts`

- [ ] **Step 1: Add detail and session procedures**

Extend the router with these procedures:

```ts
  get: adminProcedure.input(z.object({ userId: z.string().min(1) })).query(async ({ ctx, input }) => {
    const [target] = await ctx.db
      .select({
        banReason: user.banReason,
        banned: user.banned,
        createdAt: user.createdAt,
        email: user.email,
        emailVerified: user.emailVerified,
        id: user.id,
        image: user.image,
        name: user.name,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        updatedAt: user.updatedAt
      })
      .from(user)
      .where(eq(user.id, input.userId))
      .limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在。" })
    }

    const organizations = await ctx.db
      .select({
        id: organization.id,
        name: organization.name,
        role: member.role,
        slug: organization.slug
      })
      .from(member)
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .where(eq(member.userId, input.userId))
      .orderBy(desc(member.createdAt))

    const apiKeys = await ctx.db
      .select({
        createdAt: apikey.createdAt,
        enabled: apikey.enabled,
        id: apikey.id,
        name: apikey.name,
        prefix: apikey.prefix,
        start: apikey.start
      })
      .from(apikey)
      .where(eq(apikey.referenceId, input.userId))
      .orderBy(desc(apikey.createdAt))

    return {
      ...target,
      apiKeys,
      organizations,
      role: target.role ?? PLATFORM_ROLE_USER,
      status: target.banned ? "banned" : "active"
    }
  }),

  listSessions: adminProcedure.input(z.object({ userId: z.string().min(1) })).query(async ({ ctx, input }) => {
    return await ctx.db
      .select({
        activeOrganizationId: session.activeOrganizationId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        id: session.id,
        impersonatedBy: session.impersonatedBy,
        ipAddress: session.ipAddress,
        token: session.token,
        userAgent: session.userAgent
      })
      .from(session)
      .where(eq(session.userId, input.userId))
      .orderBy(desc(session.createdAt))
  })
```

- [ ] **Step 2: Add create/update/admin mutations**

Add these mutations to the same router:

```ts
  create: adminProcedure
    .input(z.object({ email: z.string().email(), name: z.string().min(1), password: z.string().min(8), role: platformRoleSchema.default(PLATFORM_ROLE_USER) }))
    .mutation(async ({ input }) => {
      const headerList = await headers()
      return await auth.api.createUser({
        body: { email: input.email, name: input.name, password: input.password, role: input.role },
        headers: headerList
      })
    }),

  update: adminProcedure.input(z.object({ name: z.string().min(1), userId: z.string().min(1) })).mutation(async ({ input }) => {
    const headerList = await headers()
    return await auth.api.adminUpdateUser({
      body: { data: { name: input.name }, userId: input.userId },
      headers: headerList
    })
  }),

  setRole: adminProcedure.input(z.object({ role: platformRoleSchema, userId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const [target] = await ctx.db.select({ id: user.id, role: user.role }).from(user).where(eq(user.id, input.userId)).limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在。" })
    }

    assertCanManageTarget({ actorRole: ctx.session.user.role, actorUserId: ctx.session.user.id, targetRole: target.role, targetUserId: target.id })

    if (input.role === PLATFORM_ROLE_SUPER_ADMIN && ctx.session.user.role !== PLATFORM_ROLE_SUPER_ADMIN) {
      throw new TRPCError({ code: "FORBIDDEN", message: "只有 super_admin 可以设置 super_admin。" })
    }

    const headerList = await headers()
    return await auth.api.setRole({ body: { role: input.role, userId: input.userId }, headers: headerList })
  }),

  setPassword: adminProcedure.input(z.object({ newPassword: z.string().min(8), userId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const [target] = await ctx.db.select({ id: user.id, role: user.role }).from(user).where(eq(user.id, input.userId)).limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在。" })
    }

    assertCanManageTarget({ actorRole: ctx.session.user.role, actorUserId: ctx.session.user.id, targetRole: target.role, targetUserId: target.id })

    const headerList = await headers()
    return await auth.api.setUserPassword({ body: { newPassword: input.newPassword, userId: input.userId }, headers: headerList })
  })
```

- [ ] **Step 3: Add ban/delete/session/impersonation mutations**

Add:

```ts
  ban: adminProcedure.input(z.object({ banReason: z.string().min(1), userId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const [target] = await ctx.db.select({ id: user.id, role: user.role }).from(user).where(eq(user.id, input.userId)).limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在。" })
    }

    assertCanManageTarget({ actorRole: ctx.session.user.role, actorUserId: ctx.session.user.id, targetRole: target.role, targetUserId: target.id })

    const headerList = await headers()
    await auth.api.banUser({ body: { banReason: input.banReason, userId: input.userId }, headers: headerList })
    await auth.api.revokeUserSessions({ body: { userId: input.userId }, headers: headerList })
    return { banned: true }
  }),

  unban: adminProcedure.input(z.object({ userId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const [target] = await ctx.db.select({ id: user.id, role: user.role }).from(user).where(eq(user.id, input.userId)).limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在。" })
    }

    assertCanManageTarget({ actorRole: ctx.session.user.role, actorUserId: ctx.session.user.id, targetRole: target.role, targetUserId: target.id })

    const headerList = await headers()
    await auth.api.unbanUser({ body: { userId: input.userId }, headers: headerList })
    return { banned: false }
  }),

  remove: adminProcedure.input(z.object({ confirmEmail: z.string().email(), userId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const [target] = await ctx.db.select({ email: user.email, id: user.id, role: user.role }).from(user).where(eq(user.id, input.userId)).limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在。" })
    }

    assertCanManageTarget({ actorRole: ctx.session.user.role, actorUserId: ctx.session.user.id, targetRole: target.role, targetUserId: target.id })

    if (target.email !== input.confirmEmail) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "请输入正确的用户邮箱。" })
    }

    const headerList = await headers()
    return await auth.api.removeUser({ body: { userId: input.userId }, headers: headerList })
  }),

  revokeSession: adminProcedure.input(z.object({ sessionToken: z.string().min(1) })).mutation(async ({ input }) => {
    const headerList = await headers()
    return await auth.api.revokeUserSession({ body: { sessionToken: input.sessionToken }, headers: headerList })
  }),

  revokeAllSessions: adminProcedure.input(z.object({ userId: z.string().min(1) })).mutation(async ({ input }) => {
    const headerList = await headers()
    return await auth.api.revokeUserSessions({ body: { userId: input.userId }, headers: headerList })
  }),

  impersonate: adminProcedure.input(z.object({ userId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const [target] = await ctx.db.select({ id: user.id, role: user.role }).from(user).where(eq(user.id, input.userId)).limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在。" })
    }

    if (PLATFORM_ADMIN_ROLES.some((role) => role === target.role) && ctx.session.user.role !== PLATFORM_ROLE_SUPER_ADMIN) {
      throw new TRPCError({ code: "FORBIDDEN", message: "默认禁止模拟登录 admin 或 super_admin。" })
    }

    const headerList = await headers()
    return await auth.api.impersonateUser({ body: { userId: input.userId }, headers: headerList })
  })
```

- [ ] **Step 4: Run checks**

Run:

```bash
pnpm typecheck
pnpm check
```

Expected: both PASS. If Better Auth API method names differ in installed types, use the exact method name suggested by TypeScript and keep the tRPC procedure names unchanged.

---

### Task 4: List Route And Responsive List UI

**Files:**
- Create: `src/app/dashboard/admin/users/page.tsx`
- Create: `src/app/dashboard/admin/users/loading.tsx`
- Create: `src/app/dashboard/admin/users/error.tsx`
- Create: `src/app/dashboard/admin/users/_components/admin-users-content.tsx`
- Create: `src/app/dashboard/admin/users/_components/admin-user-status.tsx`

- [ ] **Step 1: Add the server page**

Create `src/app/dashboard/admin/users/page.tsx`:

```tsx
import { api } from "@/trpc/server"
import { AdminUsersContent } from "./_components/admin-users-content"

const AdminUsersPage = async ({ searchParams }: { searchParams: Promise<{ userId?: string }> }) => {
  const params = await searchParams
  const [users, selectedUser] = await Promise.all([
    api.adminUser.list({ page: 1, pageSize: 20, role: "all", search: "", status: "all" }),
    params.userId ? api.adminUser.get({ userId: params.userId }) : Promise.resolve(null)
  ])

  return <AdminUsersContent initialSelectedUser={selectedUser} initialUsers={users} selectedUserId={params.userId ?? null} />
}

export default AdminUsersPage
```

- [ ] **Step 2: Add loading and error states**

Create `src/app/dashboard/admin/users/loading.tsx`:

```tsx
const AdminUsersLoading = () => (
  <div className="space-y-5">
    <div>
      <div className="h-7 w-32 animate-pulse rounded-md bg-muted" />
      <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded-md bg-muted" />
    </div>
    <div className="h-[620px] animate-pulse rounded-lg border bg-card shadow-sm" />
  </div>
)

export default AdminUsersLoading
```

Create `src/app/dashboard/admin/users/error.tsx`:

```tsx
"use client"

import { DashboardErrorCard } from "@/app/dashboard/_components/dashboard-error-card"

const AdminUsersError = ({ reset }: { reset: () => void }) => <DashboardErrorCard description="用户管理数据加载失败，请稍后重试。" onRetry={reset} title="无法加载用户管理" />

export default AdminUsersError
```

- [ ] **Step 3: Create focused empty/error/forbidden helpers**

Create `src/app/dashboard/admin/users/_components/admin-user-status.tsx`:

```tsx
import { AlertCircle, Users } from "lucide-react"

import { Card } from "@/components/ui/card"

export const AdminUserEmptyState = () => (
  <Card className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border-dashed p-8 text-center text-muted-foreground text-sm">
    <Users className="size-8" />
    <div>暂无符合条件的用户。</div>
  </Card>
)

export const AdminUserErrorState = ({ message }: { message: string }) => (
  <Card className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border-destructive/40 p-8 text-center text-destructive text-sm">
    <AlertCircle className="size-8" />
    <div>{message}</div>
  </Card>
)
```

- [ ] **Step 4: Implement `AdminUsersContent`**

Create `src/app/dashboard/admin/users/_components/admin-users-content.tsx` with:

```tsx
"use client"

import { ChevronLeft, ChevronRight, ExternalLink, MoreHorizontal, Plus, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api, type RouterInputs, type RouterOutputs } from "@/trpc/react"
import { AdminUserDetailContent } from "./admin-user-detail-content"
import { AdminUserEmptyState, AdminUserErrorState } from "./admin-user-status"

type Users = RouterOutputs["adminUser"]["list"]
type UserRow = Users["items"][number]
type UserDetail = RouterOutputs["adminUser"]["get"]
type RoleFilter = RouterInputs["adminUser"]["list"]["role"]
type StatusFilter = RouterInputs["adminUser"]["list"]["status"]

const roleLabel = (role: string) => {
  const labels: Record<string, string> = { admin: "admin", support: "support", super_admin: "super_admin", user: "user" }
  return labels[role] ?? role
}

export const AdminUsersContent = ({ initialSelectedUser, initialUsers, selectedUserId }: { initialSelectedUser: UserDetail | null; initialUsers: Users; selectedUserId: string | null }) => {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [role, setRole] = useState<RoleFilter>("all")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [drawerUserId, setDrawerUserId] = useState<string | null>(selectedUserId)

  const users = api.adminUser.list.useQuery(
    { page, pageSize: 20, role, search, status },
    {
      initialData: page === 1 && role === "all" && search === "" && status === "all" ? initialUsers : undefined,
      placeholderData: (previousData) => previousData
    }
  )
  const drawerUser = api.adminUser.get.useQuery(
    { userId: drawerUserId ?? "" },
    {
      enabled: Boolean(drawerUserId),
      initialData: drawerUserId && initialSelectedUser?.id === drawerUserId ? initialSelectedUser : undefined
    }
  )
  const data = users.data ?? initialUsers

  const openDrawer = (userId: string) => {
    setDrawerUserId(userId)
    router.replace(`/dashboard/admin/users?userId=${encodeURIComponent(userId)}`, { scroll: false })
  }

  const closeDrawer = () => {
    setDrawerUserId(null)
    router.replace("/dashboard/admin/users", { scroll: false })
  }

  return (
    <div className="space-y-5 text-[13px]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl tracking-normal">平台用户</h1>
          <p className="mt-2 text-muted-foreground text-xs">查询、筛选并治理平台用户。点击用户行可在右侧查看完整身份与安全详情。</p>
        </div>
      </div>

      <Card className="rounded-lg shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="搜索用户"
                className="pl-9"
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="搜索用户名称或邮箱"
                value={search}
              />
            </div>
            <Select onValueChange={(value) => setRole(value as RoleFilter)} value={role}>
              <SelectTrigger className="w-full lg:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部角色</SelectItem>
                <SelectItem value="user">user</SelectItem>
                <SelectItem value="support">support</SelectItem>
                <SelectItem value="admin">admin</SelectItem>
                <SelectItem value="super_admin">super_admin</SelectItem>
              </SelectContent>
            </Select>
            <Select onValueChange={(value) => setStatus(value as StatusFilter)} value={status}>
              <SelectTrigger className="w-full lg:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">正常</SelectItem>
                <SelectItem value="banned">已封禁</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button">
              <Plus className="size-4" />
              创建用户
            </Button>
          </div>

          {users.error ? <AdminUserErrorState message="用户列表加载失败。" /> : data.items.length === 0 ? <AdminUserEmptyState /> : <AdminUsersTable items={data.items} onOpen={openDrawer} />}

          <div className="flex items-center justify-between text-muted-foreground">
            <span>显示 {data.items.length} / {data.total}</span>
            <div className="flex items-center gap-2">
              <Button disabled={users.isFetching || data.page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} size="icon-sm" type="button" variant="outline">
                <ChevronLeft className="size-4" />
              </Button>
              <span>{data.page} / {data.pageCount}</span>
              <Button disabled={users.isFetching || data.page >= data.pageCount} onClick={() => setPage((current) => Math.min(data.pageCount, current + 1))} size="icon-sm" type="button" variant="outline">
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {drawerUserId ? (
        <div className="fixed inset-0 z-50 hidden bg-background/70 backdrop-blur-sm lg:block" data-testid="admin-user-detail-drawer">
          <aside className="ml-auto flex h-full w-[680px] max-w-[calc(100vw-18rem)] flex-col border-l bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <div className="font-semibold">用户详情</div>
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/admin/users/${drawerUserId}`}>
                    <ExternalLink className="size-4" />
                    完整页
                  </Link>
                </Button>
                <Button aria-label="关闭用户详情" onClick={closeDrawer} size="sm" type="button" variant="ghost">
                  关闭
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {drawerUser.data ? <AdminUserDetailContent mode="drawer" user={drawerUser.data} /> : <div className="text-muted-foreground text-sm">正在加载用户详情...</div>}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}

const AdminUsersTable = ({ items, onOpen }: { items: UserRow[]; onOpen: (userId: string) => void }) => (
  <>
    <div className="hidden overflow-hidden rounded-lg border lg:block">
      <table className="w-full text-left">
        <thead className="bg-muted/50 text-muted-foreground text-xs">
          <tr>
            <th className="px-4 py-3">用户</th>
            <th className="px-4 py-3">角色</th>
            <th className="px-4 py-3">状态</th>
            <th className="px-4 py-3">邮箱验证</th>
            <th className="px-4 py-3">创建时间</th>
            <th className="px-4 py-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr className="cursor-pointer border-t hover:bg-muted/40" data-testid={`admin-user-row-${item.id}`} key={item.id} onClick={() => onOpen(item.id)}>
              <td className="px-4 py-3">
                <div className="font-medium">{item.name}</div>
                <div className="text-muted-foreground text-xs">{item.email}</div>
              </td>
              <td className="px-4 py-3">{roleLabel(item.role)}</td>
              <td className="px-4 py-3">
                <Badge variant={item.status === "banned" ? "destructive" : "secondary"}>{item.status === "banned" ? "已封禁" : "正常"}</Badge>
              </td>
              <td className="px-4 py-3">{item.emailVerified ? "已验证" : "未验证"}</td>
              <td className="px-4 py-3">{new Intl.DateTimeFormat("zh-CN").format(item.createdAt)}</td>
              <td className="px-4 py-3 text-right">
                <Button aria-label="更多用户操作" size="icon-sm" type="button" variant="ghost">
                  <MoreHorizontal className="size-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="grid gap-3 lg:hidden">
      {items.map((item) => (
        <Link className="rounded-lg border bg-card p-4 shadow-sm" data-testid={`admin-user-card-${item.id}`} href={`/dashboard/admin/users/${item.id}`} key={item.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">{item.name}</div>
              <div className="text-muted-foreground text-xs">{item.email}</div>
            </div>
            <Badge variant={item.status === "banned" ? "destructive" : "secondary"}>{item.status === "banned" ? "已封禁" : "正常"}</Badge>
          </div>
          <div className="mt-3 text-muted-foreground text-xs">
            {roleLabel(item.role)} · {item.emailVerified ? "已验证" : "未验证"}
          </div>
        </Link>
      ))}
    </div>
  </>
)
```

- [ ] **Step 5: Run the targeted E2E test**

Run:

```bash
pnpm test:e2e -- --project=chromium e2e/specs/dashboard-admin-users.spec.ts
```

Expected: The list renders and drawer assertions pass once detail content exists in Task 5.

---

### Task 5: Shared Detail UI And Full Detail Route

**Files:**
- Create: `src/app/dashboard/admin/users/_components/admin-user-detail-content.tsx`
- Create: `src/app/dashboard/admin/users/[id]/page.tsx`
- Create: `src/app/dashboard/admin/users/[id]/loading.tsx`
- Create: `src/app/dashboard/admin/users/[id]/error.tsx`

- [ ] **Step 1: Create the shared detail component**

Create `src/app/dashboard/admin/users/_components/admin-user-detail-content.tsx`:

```tsx
"use client"

import { Ban, KeyRound, Monitor, Shield, Smartphone } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/trpc/react"
import { type RouterOutputs } from "@/trpc/react"

type UserDetail = RouterOutputs["adminUser"]["get"]

export const AdminUserDetailContent = ({ mode, user }: { mode: "drawer" | "page"; user: UserDetail }) => (
  <div className={mode === "page" ? "grid gap-5 lg:grid-cols-[350px_1fr]" : "space-y-4"}>
    <Card className="rounded-lg shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">{user.name.slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0">
            <h2 className="truncate font-bold text-xl">{user.name}</h2>
            <p className="text-muted-foreground text-xs">{user.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">{user.role}</Badge>
              <Badge variant={user.status === "banned" ? "destructive" : "secondary"}>{user.status === "banned" ? "已封禁" : "正常"}</Badge>
              <Badge variant="outline">{user.emailVerified ? "已验证" : "未验证"}</Badge>
            </div>
          </div>
        </div>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">创建时间</dt>
            <dd>{new Intl.DateTimeFormat("zh-CN").format(user.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">双因素</dt>
            <dd>{user.twoFactorEnabled ? "已启用" : "未启用"}</dd>
          </div>
        </dl>
        <div className="grid gap-2">
          <Button type="button" variant="outline">
            <Shield className="size-4" />
            设置角色
          </Button>
          <Button type="button" variant="outline">
            <KeyRound className="size-4" />
            重置密码
          </Button>
          <Button type="button" variant="destructive">
            <Ban className="size-4" />
            {user.status === "banned" ? "解除封禁" : "封禁用户"}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card className="rounded-lg shadow-sm">
      <CardContent className="p-5">
        <Tabs defaultValue="sessions">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sessions">会话</TabsTrigger>
            <TabsTrigger value="orgs">组织</TabsTrigger>
            <TabsTrigger value="security">安全</TabsTrigger>
            <TabsTrigger value="keys">API Keys</TabsTrigger>
          </TabsList>
          <TabsContent className="mt-4 space-y-3" value="sessions">
            <UserSessions userId={user.id} />
          </TabsContent>
          <TabsContent className="mt-4 space-y-3" value="orgs">
            {user.organizations.length === 0 ? <p className="text-muted-foreground text-sm">该用户暂未加入组织。</p> : user.organizations.map((org) => <div className="rounded-lg border p-3 text-sm" key={org.id}>{org.name} · {org.role}</div>)}
          </TabsContent>
          <TabsContent className="mt-4" value="security">
            <p className="text-muted-foreground text-sm">双因素认证：{user.twoFactorEnabled ? "已启用" : "未启用"}</p>
          </TabsContent>
          <TabsContent className="mt-4 space-y-3" value="keys">
            {user.apiKeys.length === 0 ? <p className="text-muted-foreground text-sm">暂无 API Key。</p> : user.apiKeys.map((key) => <div className="rounded-lg border p-3 text-sm" key={key.id}>{key.name ?? "未命名密钥"} · {key.enabled ? "启用" : "停用"}</div>)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  </div>
)

const UserSessions = ({ userId }: { userId: string }) => {
  const sessions = api.adminUser.listSessions.useQuery({ userId })
  const items = sessions.data ?? []

  if (sessions.isLoading) {
    return <p className="text-muted-foreground text-sm">正在加载会话...</p>
  }

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">暂无活动会话。</p>
  }

  return items.map((item) => {
    const Icon = item.userAgent?.toLowerCase().includes("iphone") ? Smartphone : Monitor

    return (
      <div className="flex items-center gap-3 rounded-lg border p-3" key={item.id}>
        <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-sm">{item.userAgent ?? "Unknown device"}</div>
          <div className="text-muted-foreground text-xs">{item.ipAddress ?? "Unknown IP"}</div>
        </div>
        <Button size="sm" type="button" variant="outline">撤销</Button>
      </div>
    )
  })
}
```

- [ ] **Step 2: Add the full detail page**

Create `src/app/dashboard/admin/users/[id]/page.tsx`:

```tsx
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { api } from "@/trpc/server"
import { AdminUserDetailContent } from "../_components/admin-user-detail-content"

const AdminUserDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const user = await api.adminUser.get({ userId: id })

  return (
    <div className="space-y-5 text-[13px]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl tracking-normal">用户详情</h1>
          <p className="mt-2 text-muted-foreground text-xs">查看单个用户完整身份、安全、组织、会话和 API Key 信息。</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/admin/users">返回列表</Link>
        </Button>
      </div>
      <AdminUserDetailContent mode="page" user={user} />
    </div>
  )
}

export default AdminUserDetailPage
```

- [ ] **Step 3: Add loading/error states**

Create `src/app/dashboard/admin/users/[id]/loading.tsx`:

```tsx
const AdminUserDetailLoading = () => (
  <div className="grid gap-5 lg:grid-cols-[350px_1fr]">
    <div className="h-[520px] animate-pulse rounded-lg border bg-card" />
    <div className="h-[520px] animate-pulse rounded-lg border bg-card" />
  </div>
)

export default AdminUserDetailLoading
```

Create `src/app/dashboard/admin/users/[id]/error.tsx`:

```tsx
"use client"

import { DashboardErrorCard } from "@/app/dashboard/_components/dashboard-error-card"

const AdminUserDetailError = ({ reset }: { reset: () => void }) => <DashboardErrorCard description="用户详情加载失败，请稍后重试。" onRetry={reset} title="无法加载用户详情" />

export default AdminUserDetailError
```

- [ ] **Step 4: Run checks**

Run:

```bash
pnpm typecheck
pnpm check
```

Expected: PASS.

---

### Task 6: Dialogs And High-Risk Mutations

**Files:**
- Create: `src/app/dashboard/admin/users/_components/admin-user-dialogs.tsx`
- Modify: `src/app/dashboard/admin/users/_components/admin-users-content.tsx`
- Modify: `src/app/dashboard/admin/users/_components/admin-user-detail-content.tsx`

- [ ] **Step 1: Create reusable confirmation dialog components**

Create `src/app/dashboard/admin/users/_components/admin-user-dialogs.tsx`:

```tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { api } from "@/trpc/react"

export const BanUserDialog = ({ userId, userName }: { userId: string; userName: string }) => {
  const utils = api.useUtils()
  const [reason, setReason] = useState("")
  const [open, setOpen] = useState(false)
  const banUser = api.adminUser.ban.useMutation({
    onSuccess: async () => {
      await utils.adminUser.invalidate()
      toast.success("用户已封禁，活动会话已撤销。")
      setOpen(false)
      setReason("")
    }
  })

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">封禁用户</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>封禁 {userName}</DialogTitle>
          <DialogDescription>封禁后会立即撤销该用户的全部活动会话。</DialogDescription>
        </DialogHeader>
        <Input aria-label="封禁原因" onChange={(event) => setReason(event.target.value)} placeholder="输入封禁原因" value={reason} />
        <DialogFooter>
          <Button disabled={reason.trim().length === 0 || banUser.isPending} onClick={() => banUser.mutate({ banReason: reason, userId })} type="button" variant="destructive">
            确认封禁
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Add create, role, password, delete, revoke dialogs with explicit exports**

In the same file, add:

```tsx
export const RemoveUserDialog = ({ email, userId }: { email: string; userId: string }) => {
  const utils = api.useUtils()
  const [confirmEmail, setConfirmEmail] = useState("")
  const [open, setOpen] = useState(false)
  const removeUser = api.adminUser.remove.useMutation({
    onSuccess: async () => {
      await utils.adminUser.invalidate()
      toast.success("用户已删除。")
      setOpen(false)
      setConfirmEmail("")
    }
  })

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">删除用户</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>删除用户</DialogTitle>
          <DialogDescription>这是硬删除操作。请输入用户邮箱确认：{email}</DialogDescription>
        </DialogHeader>
        <Input aria-label="确认删除邮箱" onChange={(event) => setConfirmEmail(event.target.value)} value={confirmEmail} />
        <DialogFooter>
          <Button disabled={confirmEmail !== email || removeUser.isPending} onClick={() => removeUser.mutate({ confirmEmail, userId })} type="button" variant="destructive">
            硬删除用户
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

Add these exports in the same file after `RemoveUserDialog`:

```tsx
export const CreateUserDialog = () => {
  const utils = api.useUtils()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const createUser = api.adminUser.create.useMutation({
    onSuccess: async () => {
      await utils.adminUser.invalidate()
      toast.success("用户已创建。")
      setOpen(false)
      setEmail("")
      setName("")
      setPassword("")
    }
  })

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button type="button">创建用户</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建用户</DialogTitle>
          <DialogDescription>创建平台用户并设置初始密码。</DialogDescription>
        </DialogHeader>
        <Input aria-label="用户邮箱" onChange={(event) => setEmail(event.target.value)} placeholder="user@example.com" value={email} />
        <Input aria-label="用户姓名" onChange={(event) => setName(event.target.value)} placeholder="Maya Chen" value={name} />
        <Input aria-label="初始密码" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
        <DialogFooter>
          <Button disabled={createUser.isPending || email.length === 0 || name.length === 0 || password.length < 8} onClick={() => createUser.mutate({ email, name, password, role: "user" })} type="button">
            创建用户
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const SetRoleDialog = ({ currentRole, userId }: { currentRole: string; userId: string }) => {
  const utils = api.useUtils()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState(currentRole)
  const setRoleMutation = api.adminUser.setRole.useMutation({
    onSuccess: async () => {
      await utils.adminUser.invalidate()
      toast.success("角色已更新。")
      setOpen(false)
    }
  })

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">设置角色</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>设置平台角色</DialogTitle>
          <DialogDescription>角色变更会影响该用户的平台管理权限。</DialogDescription>
        </DialogHeader>
        <Input aria-label="平台角色" onChange={(event) => setRole(event.target.value)} value={role} />
        <DialogFooter>
          <Button disabled={setRoleMutation.isPending || role.length === 0} onClick={() => setRoleMutation.mutate({ role: role as "user" | "support" | "admin" | "super_admin", userId })} type="button">
            保存角色
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const SetPasswordDialog = ({ userId }: { userId: string }) => {
  const [newPassword, setNewPassword] = useState("")
  const [open, setOpen] = useState(false)
  const setPassword = api.adminUser.setPassword.useMutation({
    onSuccess: () => {
      toast.success("密码已重置。")
      setOpen(false)
      setNewPassword("")
    }
  })

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">重置密码</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重置用户密码</DialogTitle>
          <DialogDescription>请输入不少于 8 位的新密码。</DialogDescription>
        </DialogHeader>
        <Input aria-label="新密码" onChange={(event) => setNewPassword(event.target.value)} type="password" value={newPassword} />
        <DialogFooter>
          <Button disabled={setPassword.isPending || newPassword.length < 8} onClick={() => setPassword.mutate({ newPassword, userId })} type="button">
            保存新密码
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const UnbanUserDialog = ({ userId }: { userId: string }) => {
  const utils = api.useUtils()
  const unbanUser = api.adminUser.unban.useMutation({
    onSuccess: async () => {
      await utils.adminUser.invalidate()
      toast.success("用户已解除封禁。")
    }
  })

  return (
    <Button disabled={unbanUser.isPending} onClick={() => unbanUser.mutate({ userId })} type="button" variant="outline">
      解除封禁
    </Button>
  )
}

export const RevokeAllSessionsDialog = ({ userId }: { userId: string }) => {
  const utils = api.useUtils()
  const [open, setOpen] = useState(false)
  const revokeAll = api.adminUser.revokeAllSessions.useMutation({
    onSuccess: async () => {
      await utils.adminUser.invalidate()
      toast.success("全部会话已撤销。")
      setOpen(false)
    }
  })

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">撤销全部会话</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>撤销全部会话</DialogTitle>
          <DialogDescription>该用户所有设备都需要重新登录。</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={revokeAll.isPending} onClick={() => revokeAll.mutate({ userId })} type="button" variant="destructive">
            确认撤销
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const RevokeSessionDialog = ({ sessionToken }: { sessionToken: string }) => {
  const utils = api.useUtils()
  const revokeSession = api.adminUser.revokeSession.useMutation({
    onSuccess: async () => {
      await utils.adminUser.invalidate()
      toast.success("会话已撤销。")
    }
  })

  return (
    <Button disabled={revokeSession.isPending} onClick={() => revokeSession.mutate({ sessionToken })} size="sm" type="button" variant="outline">
      撤销
    </Button>
  )
}
```

- [ ] **Step 3: Wire dialogs into list and detail UI**

In `AdminUsersContent`, replace the static create button with:

```tsx
<CreateUserDialog />
```

In `AdminUserDetailContent`, replace the static action buttons with:

```tsx
<SetRoleDialog currentRole={user.role} userId={user.id} />
<SetPasswordDialog userId={user.id} />
{user.status === "banned" ? <UnbanUserDialog userId={user.id} /> : <BanUserDialog userId={user.id} userName={user.name} />}
<RemoveUserDialog email={user.email} userId={user.id} />
```

- [ ] **Step 4: Run targeted checks**

Run:

```bash
pnpm typecheck
pnpm check
```

Expected: PASS.

---

### Task 7: Route Coverage And Mobile E2E

**Files:**
- Modify: `e2e/specs/dashboard-admin-users.spec.ts`

- [ ] **Step 1: Add full detail page test**

Append:

```ts
test("opens the full user detail page directly", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

  const adminEmail = await createVerifiedUser(page, "dashboard-admin-users-detail")
  await setUserRole(adminEmail, "admin")
  const target = await createAdminUserFixture({
    email: `detail-${Date.now()}@example.com`,
    name: "Detail User",
    role: "support"
  })

  await page.goto("/sign-in")
  await signInViaUi(page, { email: adminEmail })
  await page.goto(`/dashboard/admin/users/${target.id}`)

  await expect(page.getByRole("heading", { name: "用户详情" })).toBeVisible()
  await expect(page.getByText("Detail User")).toBeVisible()
  await expect(page.getByText("support")).toBeVisible()
})
```

- [ ] **Step 2: Add a mobile list-to-detail test**

Append:

```ts
test("uses card navigation on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

  await page.setViewportSize({ height: 844, width: 390 })
  const adminEmail = await createVerifiedUser(page, "dashboard-admin-users-mobile")
  await setUserRole(adminEmail, "admin")
  const target = await createAdminUserFixture({
    email: `mobile-${Date.now()}@example.com`,
    name: "Mobile User",
    role: "user"
  })

  await page.goto("/sign-in")
  await signInViaUi(page, { email: adminEmail })
  await page.goto("/dashboard/admin/users")
  await page.getByLabel("搜索用户").fill("Mobile User")
  await page.getByTestId(`admin-user-card-${target.id}`).click()

  await expect(page).toHaveURL(new RegExp(`/dashboard/admin/users/${target.id}$`))
  await expect(page.getByRole("heading", { name: "用户详情" })).toBeVisible()
})
```

- [ ] **Step 3: Add a high-risk mutation test**

Append:

```ts
test("requires confirmation before deleting a user", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

  const adminEmail = await createVerifiedUser(page, "dashboard-admin-users-delete")
  await setUserRole(adminEmail, "admin")
  const target = await createAdminUserFixture({
    email: `delete-${Date.now()}@example.com`,
    name: "Delete Candidate",
    role: "user"
  })

  await page.goto("/sign-in")
  await signInViaUi(page, { email: adminEmail })
  await page.goto(`/dashboard/admin/users/${target.id}`)

  await page.getByRole("button", { name: "删除用户" }).click()
  await expect(page.getByRole("button", { name: "硬删除用户" })).toBeDisabled()
  await page.getByLabel("确认删除邮箱").fill(target.email)
  await expect(page.getByRole("button", { name: "硬删除用户" })).toBeEnabled()
})
```

- [ ] **Step 4: Run E2E**

Run:

```bash
pnpm test:e2e -- --project=chromium e2e/specs/dashboard-admin-users.spec.ts
```

Expected: PASS if Docker/Testcontainers is running.

---

### Task 8: Final Verification

**Files:**
- All touched files.

- [ ] **Step 1: Run TypeScript**

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

- [ ] **Step 4: Run targeted E2E**

Run:

```bash
pnpm test:e2e -- --project=chromium e2e/specs/dashboard-admin-users.spec.ts
```

Expected: PASS if Docker/Testcontainers is available. If Docker is unavailable, record the exact failure and run `pnpm typecheck`, `pnpm check`, and `pnpm build` before handoff.

---

## Self-Review

- Spec coverage: The plan covers `/dashboard/admin/users`, `/dashboard/admin/users/[id]`, desktop drawer behavior, mobile full detail navigation, loading/empty/error states, server-side admin authorization, high-risk confirmations, and PRD-defined Better Auth operations.
- Intentional deferral: The first implementation keeps API key display read-only in the user detail tab because the API key management page owns creation/rotation. It still displays masked key metadata from `system_apikey`.
- Risk: Better Auth server API method names are checked by TypeScript during Task 3. If installed Better Auth exposes a slightly different method alias, keep the public tRPC procedure names stable and adapt only the internal `auth.api.*` call.
