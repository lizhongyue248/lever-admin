# Real Data Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace remaining production fake/static data with real database-backed metrics, calculated risk states, real empty states, and persistent organization status behavior.

**Architecture:** Add small server-side metric/risk helpers under `src/server/api/lib`, then wire existing tRPC routers to return real values. Keep existing page layouts and Pencil-approved visual structure; client components only render returned data, empty states, and actions.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, tRPC 11, Drizzle ORM, PostgreSQL, Better Auth, TanStack Table where already used, shadcn/ui, Playwright E2E with Testcontainers.

---

## Scope

This plan implements the PRD updates in:

- `prd/06-dashboard.md`
- `prd/07-dashboard-settings-profile.md`
- `prd/08-dashboard-settings-security.md`
- `prd/09-dashboard-settings-sessions.md`
- `prd/10-dashboard-orgs-slug-settings.md`
- `prd/11-dashboard-admin.md`
- `prd/15-dashboard-admin-orgs.md`

No new Pencil design is required because the approved layout does not change. Existing cards, tables, tabs, badges, and empty states stay in place; only their data sources and text states change.

Do not manually run `pnpm db:generate`, `pnpm db:migrate`, or `pnpm db:push` during implementation unless the user explicitly asks. Playwright E2E global setup already runs `pnpm db:push` against its Testcontainers database.

## File Structure

- Create `src/server/api/lib/session-risk.ts`
  - Shared server helper for user/session/member risk calculation.
  - Inputs are user IDs, optional organization or department scope, and current session ID.
  - Outputs normalized risk levels and reason arrays.

- Create `src/server/api/lib/oauth-providers.ts`
  - Shared server helper for configured OAuth provider registry.
  - Prevents `security.getOverview` from hardcoding Google as always disabled.

- Modify `src/server/api/routers/profile.ts`
  - Remove fixed profile completeness base score.
  - Count only unexpired active sessions.

- Modify `src/server/api/routers/security.ts`
  - Use provider registry.
  - Use real scoring rules and session risk helper.

- Modify `src/server/api/routers/session.ts`
  - Add real risk fields to `listMine`.
  - Replace fixed `highRiskCount: 0`.

- Modify `src/server/api/routers/dashboard.ts`
  - Replace static score constants and static frontend assumptions with real derived arrays.
  - Return personal login methods, API Key summary, recent events, organization permission distribution, and department structure summaries.

- Modify `src/app/dashboard/_components/dashboard-home-content.tsx`
  - Remove static `personalLoginSegments`, `permissionSegments`, fixed recent events, fixed device bars, fixed API Key subrows, and fixed team structure bubbles.
  - Render data returned by `dashboard.getHome`; render empty states when arrays are empty.

- Modify `src/server/api/routers/org.ts`
  - Replace `riskCount: 0`, `securityStatus: "normal"`, and `riskySessionCount: 0` with computed values.

- Modify `src/server/api/routers/admin-org.ts`
  - Add persistent organization status support.
  - Replace fixed active status, fixed risk count, and no-op `updateStatus`.

- Modify `src/server/db/schema.ts`
  - Add `organization.status` with default `"active"` and index.

- Modify `src/server/api/routers/notification.ts`
  - Remove or disable no-op mark-read behavior while only derived invitation notifications exist.

- Modify `src/app/dashboard/_components/dashboard-notification-menu.tsx`
  - Hide “全部标为已读” when the notification payload has no persistent read model.

- Modify `src/app/page.tsx`
  - Replace development test page with auth-aware redirect to `/dashboard` or `/sign-in`.

- Modify E2E helpers and specs:
  - `e2e/helpers/db.ts`
  - `e2e/specs/06-dashboard.spec.ts`
  - `e2e/specs/07-dashboard-settings-profile.spec.ts`
  - `e2e/specs/08-dashboard-settings-security.spec.ts`
  - `e2e/specs/09-dashboard-settings-sessions.spec.ts`
  - `e2e/specs/10-dashboard-orgs-slug-settings.spec.ts`
  - `e2e/specs/15-dashboard-admin-orgs.spec.ts`

---

### Task 1: Shared Risk And Provider Helpers

**Files:**
- Create: `src/server/api/lib/session-risk.ts`
- Create: `src/server/api/lib/oauth-providers.ts`
- Modify: `src/server/db/schema.ts`
- Modify: `e2e/helpers/db.ts`

- [ ] **Step 1: Add organization status to schema**

In `src/server/db/schema.ts`, add `status` to the organization table:

```ts
export const organization = createSystemTable(
  "organization",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    metadata: text("metadata"),
    status: text("status").default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [uniqueIndex("system_organization_slug_idx").on(table.slug), index("system_organization_status_idx").on(table.status)]
)
```

- [ ] **Step 2: Update E2E organization inserts**

In `e2e/helpers/db.ts`, update every insert into `"system_organization"` to include `"status"` with value `'active'`. For example:

```ts
await sql`
  insert into "system_organization" ("id", "name", "slug", "status", "created_at", "updated_at")
  values (${rootId}, ${rootName}, ${rootSlug}, 'active', now(), now())
  on conflict ("id") do update set
    "name" = excluded."name",
    "slug" = excluded."slug",
    "status" = excluded."status",
    "updated_at" = now()
`
```

- [ ] **Step 3: Create OAuth provider registry helper**

Create `src/server/api/lib/oauth-providers.ts`:

```ts
import { env } from "@/env"

export type OAuthProviderId = "github" | "google"

export type OAuthProviderConfig = {
  configured: boolean
  id: OAuthProviderId
  label: string
}

export const getOAuthProviderConfigs = (): OAuthProviderConfig[] => [
  {
    configured: Boolean(env.BETTER_AUTH_GITHUB_CLIENT_ID && env.BETTER_AUTH_GITHUB_CLIENT_SECRET),
    id: "github",
    label: "GitHub"
  },
  {
    configured: false,
    id: "google",
    label: "Google"
  }
]
```

If Google env vars are added to `src/env.js` in the future, update this helper only; do not hardcode Google state in `security.ts`.

- [ ] **Step 4: Create session risk helper**

Create `src/server/api/lib/session-risk.ts`:

```ts
import { and, eq, gt, gte, inArray, sql } from "drizzle-orm"

import type { db } from "@/server/db"
import { requestLog, session } from "@/server/db/schema"

export type RiskLevel = "normal" | "risk"

export type SessionRisk = {
  level: RiskLevel
  reasons: string[]
}

export type SessionRiskInput = {
  createdAt: Date
  id: string
  ipAddress: string | null
  updatedAt: Date | null
  userAgent: string | null
  userId: string
}

const riskWindowDays = 30
const maxActiveSessionsPerUser = 5

const getRiskWindowStart = (now = new Date()) => new Date(now.getTime() - riskWindowDays * 24 * 60 * 60 * 1000)

export const getSessionRisk = ({
  activeSessionCountForUser,
  hasHighRiskRequest,
  now = new Date(),
  sessionRow
}: {
  activeSessionCountForUser: number
  hasHighRiskRequest: boolean
  now?: Date
  sessionRow: SessionRiskInput
}): SessionRisk => {
  const reasons: string[] = []
  const lastActiveAt = sessionRow.updatedAt ?? sessionRow.createdAt

  if (activeSessionCountForUser > maxActiveSessionsPerUser) {
    reasons.push("活跃会话数量超过阈值")
  }

  if (!sessionRow.ipAddress || !sessionRow.userAgent) {
    reasons.push("会话缺少 IP 或 User-Agent")
  }

  if (sessionRow.createdAt < getRiskWindowStart(now) && lastActiveAt < getRiskWindowStart(now)) {
    reasons.push("长期未活跃会话")
  }

  if (hasHighRiskRequest) {
    reasons.push("最近存在高风险请求")
  }

  return {
    level: reasons.length > 0 ? "risk" : "normal",
    reasons
  }
}

export const getHighRiskUserIds = async ({
  database,
  organizationId,
  userIds
}: {
  database: typeof db
  organizationId?: string
  userIds: string[]
}) => {
  if (userIds.length === 0) {
    return new Set<string>()
  }

  const rows = await database
    .select({ userId: requestLog.userId })
    .from(requestLog)
    .where(
      and(
        inArray(requestLog.userId, userIds),
        organizationId ? eq(requestLog.organizationId, organizationId) : undefined,
        eq(requestLog.riskLevel, "high"),
        gte(requestLog.createdAt, getRiskWindowStart())
      )
    )

  return new Set(rows.flatMap((row) => (row.userId ? [row.userId] : [])))
}

export const getActiveSessionCountsByUser = async ({ database, userIds }: { database: typeof db; userIds: string[] }) => {
  if (userIds.length === 0) {
    return new Map<string, number>()
  }

  const rows = await database
    .select({
      count: sql<number>`count(*)::int`,
      userId: session.userId
    })
    .from(session)
    .where(and(inArray(session.userId, userIds), gt(session.expiresAt, new Date())))
    .groupBy(session.userId)

  return new Map(rows.map((row) => [row.userId, row.count]))
}
```

- [ ] **Step 5: Run typecheck for helper signatures**

Run: `pnpm typecheck`

Expected: typecheck passes or reports only compile errors directly related to the new helper types. Fix helper import/type errors before moving to Task 2.

---

### Task 2: Profile, Security, And Session Pages

**Files:**
- Modify: `src/server/api/routers/profile.ts`
- Modify: `src/server/api/routers/security.ts`
- Modify: `src/server/api/routers/session.ts`
- Modify: `src/app/dashboard/settings/sessions/_components/session-list.tsx`
- Test: `e2e/specs/07-dashboard-settings-profile.spec.ts`
- Test: `e2e/specs/08-dashboard-settings-security.spec.ts`
- Test: `e2e/specs/09-dashboard-settings-sessions.spec.ts`

- [ ] **Step 1: Update profile completeness formula**

In `src/server/api/routers/profile.ts`, replace `getCompleteness`:

```ts
const getCompleteness = (profileUser: Pick<typeof user.$inferSelect, "emailVerified" | "image" | "name">) => {
  const score = (profileUser.name.trim().length >= 2 ? 35 : 0) + (profileUser.emailVerified ? 35 : 0) + (profileUser.image ? 30 : 0)

  return Math.min(100, Math.max(0, score))
}
```

Also change active session count to count only unexpired sessions:

```ts
const activeSessionCount = await countRows(
  ctx.db
    .select({ value: sql<number>`count(*)::int` })
    .from(session)
    .where(and(eq(session.userId, userId), gt(session.expiresAt, new Date())))
)
```

Add `and` and `gt` imports from `drizzle-orm`.

- [ ] **Step 2: Update security overview to use provider helper**

In `src/server/api/routers/security.ts`, import:

```ts
import { getOAuthProviderConfigs } from "@/server/api/lib/oauth-providers"
import { getActiveSessionCountsByUser, getHighRiskUserIds } from "@/server/api/lib/session-risk"
```

Build provider output from `getOAuthProviderConfigs()` and `accountRows`. Keep the existing UI response shape by returning `github` and `google` keys:

```ts
const providers = getOAuthProviderConfigs()
const providerById = new Map(providers.map((provider) => [provider.id, provider]))
const googleAccount = accountRows.find((row) => row.providerId === "google") ?? null

oauthProviders: {
  github: {
    accountId: githubAccount?.accountId ?? null,
    canUnlink: canUnlinkGithub,
    configured: providerById.get("github")?.configured ?? false,
    connectedAt: githubAccount?.createdAt ?? null,
    linked: hasGithub
  },
  google: {
    accountId: googleAccount?.accountId ?? null,
    canUnlink: false,
    configured: providerById.get("google")?.configured ?? false,
    connectedAt: googleAccount?.createdAt ?? null,
    linked: Boolean(googleAccount)
  }
}
```

- [ ] **Step 3: Replace unexplained security score values**

In `security.ts`, change `getDimensionValue` to:

```ts
const getDimensionValue = (enabled: boolean) => (enabled ? 100 : 0)
```

Calculate session dimension from risk:

```ts
const highRiskUserIds = await getHighRiskUserIds({ database: ctx.db, userIds: [userId] })
const activeSessionCounts = await getActiveSessionCountsByUser({ database: ctx.db, userIds: [userId] })
const hasSessionRisk = highRiskUserIds.has(userId) || (activeSessionCounts.get(userId) ?? 0) > 5
const sessionDimensionValue = hasSessionRisk ? 40 : 100
```

Use `sessionDimensionValue` in the `dimensions` array.

- [ ] **Step 4: Update session list risk response**

In `src/server/api/routers/session.ts`, import the helper:

```ts
import { getActiveSessionCountsByUser, getHighRiskUserIds, getSessionRisk } from "@/server/api/lib/session-risk"
```

After loading `rows`, compute:

```ts
const activeSessionCounts = await getActiveSessionCountsByUser({ database: ctx.db, userIds: [userId] })
const highRiskUserIds = await getHighRiskUserIds({ database: ctx.db, userIds: [userId] })
```

Inside `sessions = sortedRows.map(...)`, add:

```ts
const risk = getSessionRisk({
  activeSessionCountForUser: activeSessionCounts.get(row.userId) ?? rows.length,
  hasHighRiskRequest: highRiskUserIds.has(row.userId),
  sessionRow: row
})
```

Return `riskLevel: risk.level` and `riskReasons: risk.reasons` per session. Replace `highRiskCount: 0` with:

```ts
highRiskCount: sessions.filter((item) => item.riskLevel === "risk").length
```

- [ ] **Step 5: Render session risk badges**

In `src/app/dashboard/settings/sessions/_components/session-list.tsx`, add a small destructive/secondary badge next to session device metadata:

```tsx
{session.riskLevel === "risk" ? (
  <Badge variant="destructive">{session.riskReasons[0] ?? "风险会话"}</Badge>
) : null}
```

Use an existing `Badge` import from `@/components/ui/badge`.

- [ ] **Step 6: Add E2E assertions**

Update:

- `e2e/specs/07-dashboard-settings-profile.spec.ts`: assert profile completeness changes after adding/removing avatar URL and does not assume base `50`.
- `e2e/specs/08-dashboard-settings-security.spec.ts`: assert Google disabled text is visible only as configured state and no raw fixed score text like `35` appears.
- `e2e/specs/09-dashboard-settings-sessions.spec.ts`: seed a session with missing User-Agent or more than 5 sessions and assert a risk badge appears.

Run:

```bash
pnpm exec playwright test e2e/specs/07-dashboard-settings-profile.spec.ts e2e/specs/08-dashboard-settings-security.spec.ts e2e/specs/09-dashboard-settings-sessions.spec.ts --project=chromium
```

Expected: all selected specs pass.

---

### Task 3: Dashboard Home Real Metrics

**Files:**
- Modify: `src/server/api/routers/dashboard.ts`
- Modify: `src/app/dashboard/_components/dashboard-home-content.tsx`
- Modify: `src/app/dashboard/_components/types.ts`
- Test: `e2e/specs/06-dashboard.spec.ts`

- [ ] **Step 1: Extend dashboard home response**

In `src/server/api/routers/dashboard.ts`, return data-driven arrays for both views.

For personal view, add:

```ts
loginMethods: [
  { label: "邮箱密码", value: hasPassword ? 1 : 0 },
  { label: "OAuth", value: linkedAccountCount },
  { label: "Passkey", value: passkeyCount }
],
personalApiKeyStatus: {
  expiringSoonCount,
  recentUsedCount,
  totalCount: personalApiKeyCount
},
recentEvents
```

Use real queries:

- `hasPassword` from `system_account` provider/password data.
- `expiringSoonCount` from `system_apikey.expires_at between now and now + 30 days`.
- `recentUsedCount` from `system_api_key_usage_log` for current user's keys in last 30 days.
- `recentEvents` from request logs, invitations, and API Key usage logs.

For organization view, add:

```ts
departmentStructure: {
  emptyDepartmentCount,
  largestDepartmentName,
  largestDepartmentSize,
  unassignedMemberCount
},
permissionDistribution: [
  { label: "owner", value: ownerCount },
  { label: "admin", value: adminCount },
  { label: "member", value: memberRoleCount }
],
recentEvents
```

- [ ] **Step 2: Replace fixed dashboard score constants**

In `dashboard.ts`, replace:

```ts
{ label: "团队", value: teamCount > 0 ? 82 : 0 }
{ label: "会话", value: activeSessionCount <= Math.max(memberCount, 1) * 3 ? 78 : 42 }
{ label: "OAuth", value: linkedAccountCount > 0 ? 80 : 0 }
```

with PRD-aligned formulas:

```ts
const departmentScore = memberCount === 0 ? 100 : departmentCount === 0 ? 20 : Math.max(20, 100 - Math.round((unassignedMemberCount / memberCount) * 100))
const sessionScore = riskySessionCount === 0 ? 100 : Math.max(20, 100 - riskySessionCount * 15)
const oauthScore = linkedAccountCount > 0 ? 100 : 0
```

- [ ] **Step 3: Remove static client segments and cards**

In `src/app/dashboard/_components/dashboard-home-content.tsx`, remove:

- `personalLoginSegments`
- `permissionSegments`
- fixed `[42, 64, 54, 80, 46]`
- fixed `RecentEventsCard` event literals
- fixed API Key subrows
- fixed team structure bubble text

Render data returned from Task 3 Step 1. Empty examples:

```tsx
const EmptyInlineState = ({ text }: { text: string }) => <p className="text-muted-foreground text-xs">{text}</p>
```

Use it for:

- `暂无登录方式数据`
- `暂无最近身份事件`
- `暂无部门结构数据`

- [ ] **Step 4: Add E2E regression checks**

In `e2e/specs/06-dashboard.spec.ts`, add tests that log in and assert the old fake strings are not present:

```ts
await expect(page.getByText("Chrome · 上海 · 12 分钟前")).toHaveCount(0)
await expect(page.getByText("密码 58%")).toHaveCount(0)
await expect(page.getByText("研发团队偏大")).toHaveCount(0)
```

Also seed one API Key usage log and assert its path or count appears in dashboard recent events/API Key status.

Run:

```bash
pnpm exec playwright test e2e/specs/06-dashboard.spec.ts --project=chromium
```

Expected: dashboard spec passes and old fake text is absent.

---

### Task 4: Organization Risk And Member Security State

**Files:**
- Modify: `src/server/api/routers/org.ts`
- Modify: `src/app/dashboard/orgs/[slug]/_components/organization-tree.tsx`
- Modify: `src/app/dashboard/orgs/[slug]/_components/org-information-content.tsx`
- Modify: `src/app/dashboard/orgs/[slug]/_components/org-overview-content.tsx`
- Modify: `src/app/dashboard/orgs/[slug]/_components/org-auth-content.tsx`
- Test: `e2e/specs/10-dashboard-orgs-slug-settings.spec.ts`

- [ ] **Step 1: Build organization risk maps in `org.ts`**

In `src/server/api/routers/org.ts`, import:

```ts
import { getActiveSessionCountsByUser, getHighRiskUserIds } from "@/server/api/lib/session-risk"
```

Create a local helper near `listDepartments`:

```ts
const buildOrgRiskContext = async (ctx: OrgContext, organizationId: string) => {
  const memberRows = await ctx.db.select({ memberId: member.id, userId: member.userId }).from(member).where(eq(member.organizationId, organizationId))
  const userIds = memberRows.map((row) => row.userId)
  const highRiskUserIds = await getHighRiskUserIds({ database: ctx.db, organizationId, userIds })
  const activeSessionCounts = await getActiveSessionCountsByUser({ database: ctx.db, userIds })
  const riskyUserIds = new Set(userIds.filter((userId) => highRiskUserIds.has(userId) || (activeSessionCounts.get(userId) ?? 0) > 5))

  return { memberRows, riskyUserIds }
}
```

- [ ] **Step 2: Replace department tree `riskCount: 0`**

In `listDepartments`, call `buildOrgRiskContext`. For the root node:

```ts
riskCount: riskContext.riskyUserIds.size
```

For each department node, query department member user IDs and count only those in `riskContext.riskyUserIds`:

```ts
riskCount: departmentRiskCountById.get(department.id) ?? 0
```

- [ ] **Step 3: Replace member `securityStatus: "normal"`**

In `listDepartmentMembers`, compute risky user IDs for the organization and return:

```ts
items: rows
  .map((row) => ({
    ...row,
    departmentNames: row.departmentNames ?? "未分配",
    securityStatus: riskContext.riskyUserIds.has(row.userId) ? ("risk" as const) : ("normal" as const)
  }))
  .filter((row) => input.securityStatus === "all" || row.securityStatus === input.securityStatus)
```

When filtering by risk, calculate `total` from the filtered set or move the risk predicate into a SQL subquery before pagination. Prefer SQL/subquery if time allows; if using filtered set first, fetch candidate rows before limit and document that this path is scoped to first-version organization sizes.

- [ ] **Step 4: Replace overview `riskySessionCount: 0`**

In `org.management.getOverview`, compute:

```ts
const activeSessionCounts = await getActiveSessionCountsByUser({ database: ctx.db, userIds: memberUserIds })
const riskySessionCount = Array.from(activeSessionCounts.values()).filter((count) => count > 5).reduce((sum, count) => sum + count, 0)
```

Also include high-risk request users as event/risk contributors:

```ts
const highRiskUserIds = await getHighRiskUserIds({ database: ctx.db, organizationId: org.id, userIds: memberUserIds })
```

- [ ] **Step 5: Update organization UI labels**

Ensure existing UI reads new values without assuming all risk is zero:

- `organization-tree.tsx`: risk icon already appears when `riskCount > 0`.
- `org-information-content.tsx`: risk filter should show rows with `securityStatus === "risk"`.
- `org-overview-content.tsx`: abnormal stat should display computed `riskySessionCount`.
- `org-auth-content.tsx`: show risk badge or reason if `org.session.list` returns it.

- [ ] **Step 6: Add organization E2E**

In `e2e/specs/10-dashboard-orgs-slug-settings.spec.ts`, seed:

- organization
- member
- request log with `riskLevel: "high"` and `organizationId`

Then assert:

```ts
await expect(page.getByText(/1 异常登录/)).toBeVisible()
await page.getByRole("combobox", { name: "安全状态" }).selectOption("risk")
await expect(page.getByRole("table")).toContainText(memberEmail)
```

Run:

```bash
pnpm exec playwright test e2e/specs/10-dashboard-orgs-slug-settings.spec.ts --project=chromium
```

Expected: organization risk test passes.

---

### Task 5: Platform Organization Status And Risk

**Files:**
- Modify: `src/server/api/routers/admin-org.ts`
- Modify: `src/app/dashboard/admin/orgs/_components/admin-orgs-content.tsx`
- Modify: `e2e/helpers/db.ts`
- Test: `e2e/specs/15-dashboard-admin-orgs.spec.ts`

- [ ] **Step 1: Query real organization status**

In `admin-org.ts`, replace:

```ts
status: sql<"active" | "disabled">`'active'`
```

with:

```ts
status: organization.status
```

Use status in the `where` filters before pagination:

```ts
const filters = and(
  input.search.trim() ? or(ilike(organization.name, search), ilike(organization.slug, search)) : undefined,
  input.status === "all" ? undefined : eq(organization.status, input.status)
)
```

Remove in-memory `filteredRows`.

- [ ] **Step 2: Compute real risk count**

Join or subquery `system_request_log` and `system_session` to return `riskCount`. Minimal first version:

```ts
riskCount: sql<number>`(
  select count(distinct risk_member."user_id")::int
  from "system_member" risk_member
  left join "system_request_log" risk_log
    on risk_log."user_id" = risk_member."user_id"
   and risk_log."organization_id" = ${organization.id}
   and risk_log."risk_level" = 'high'
   and risk_log."created_at" >= now() - interval '30 days'
  where risk_member."organization_id" = ${organization.id}
    and risk_log."id" is not null
)`
```

Keep session-count risk in Task 4 helper if sharing it is straightforward; otherwise add it in a second pass after high-risk request risk is working.

- [ ] **Step 3: Make updateStatus persist**

In `admin-org.ts`, replace no-op `updateStatus`:

```ts
updateStatus: adminProcedure.input(z.object({ organizationId: z.string().min(1), status: z.enum(["active", "disabled"]) })).mutation(async ({ ctx, input }) => {
  const [updated] = await ctx.db
    .update(organization)
    .set({ status: input.status, updatedAt: new Date() })
    .where(eq(organization.id, input.organizationId))
    .returning({ id: organization.id, status: organization.status })

  if (!updated) {
    throw new TRPCError({ code: "NOT_FOUND", message: "组织不存在。" })
  }

  return { organizationId: updated.id, status: updated.status }
})
```

- [ ] **Step 4: Enforce disabled organization behavior**

In `org.ts`, after `requireOrgAccess` loads `org`, reject disabled organizations for non-platform admins:

```ts
if (org.status === "disabled" && !isPlatformAdminRole(ctx.session.user.role)) {
  throw new TRPCError({ code: "FORBIDDEN", message: "该组织已停用。" })
}
```

In invite mutation, reject new invitations for disabled organizations.

- [ ] **Step 5: Update admin org UI actions**

In `src/app/dashboard/admin/orgs/_components/admin-orgs-content.tsx`, ensure status badge and status filter use `item.status`. If disable/enable actions are already present, wire them to `adminOrg.updateStatus`; if not present, add an overflow or icon action using the existing card action style.

Use visible labels:

- active: `正常`
- disabled: `已停用`

- [ ] **Step 6: Add E2E for status persistence**

In `e2e/specs/15-dashboard-admin-orgs.spec.ts`, add:

```ts
await page.getByRole("button", { name: /停用/ }).click()
await page.getByRole("button", { name: /确认停用/ }).click()
await expect(page.getByText("已停用")).toBeVisible()
await page.getByRole("combobox", { name: "状态" }).selectOption("disabled")
await expect(page.getByText(rootName)).toBeVisible()
```

Run:

```bash
pnpm exec playwright test e2e/specs/15-dashboard-admin-orgs.spec.ts --project=chromium
```

Expected: platform organization status persists and filter works.

---

### Task 6: Notifications And Root Route

**Files:**
- Modify: `src/server/api/routers/notification.ts`
- Modify: `src/app/dashboard/_components/dashboard-notification-menu.tsx`
- Modify: `src/app/page.tsx`
- Test: `e2e/specs/06-dashboard.spec.ts`
- Test: `e2e/specs/10A-organization-invitation-accept.spec.ts`

- [ ] **Step 1: Remove no-op mark-read server behavior**

In `notification.ts`, remove `markAllRead` and `markRead`, or return a clear unsupported error:

```ts
markAllRead: protectedProcedure.mutation(() => {
  throw new TRPCError({ code: "BAD_REQUEST", message: "当前通知来源不支持标记已读。" })
}),
markRead: protectedProcedure.input(z.object({ id: z.string().min(1) })).mutation(() => {
  throw new TRPCError({ code: "BAD_REQUEST", message: "当前通知来源不支持标记已读。" })
})
```

If using this version, import `TRPCError`.

- [ ] **Step 2: Hide mark-all-read UI for derived invitations**

In `dashboard-notification-menu.tsx`, remove or hide the “全部标为已读” button while `notification.list` only returns invitation notifications. Keep accept/reject/detail actions.

Remove client mutation calls for `markAllRead` and `markRead` if the UI no longer uses them.

- [ ] **Step 3: Replace root test page**

In `src/app/page.tsx`, replace the static test page with server redirect:

```tsx
import { redirect } from "next/navigation"

import { getServerSession } from "@/app/(auth)/_lib/server-session"

const Home = async () => {
  const session = await getServerSession()

  if (!session) {
    redirect("/sign-in")
  }

  redirect("/dashboard")
}

export default Home
```

If `getServerSession` returns a different shape, adapt to the existing helper signature without changing the redirect behavior.

- [ ] **Step 4: Add E2E checks**

In `e2e/specs/06-dashboard.spec.ts`, add:

```ts
await page.goto("/")
await expect(page).toHaveURL(/\/sign-in/)
await expect(page.getByText("首页访问测试成功")).toHaveCount(0)
```

In invitation notification tests, assert invitation accept/reject still work and mark-all-read is not visible:

```ts
await expect(page.getByRole("button", { name: "全部标为已读" })).toHaveCount(0)
```

Run:

```bash
pnpm exec playwright test e2e/specs/06-dashboard.spec.ts e2e/specs/10A-organization-invitation-accept.spec.ts --project=chromium
```

Expected: root redirects and invitation notification flow still works.

---

### Task 7: Final Fake Data Regression Sweep

**Files:**
- Modify tests only if a search reveals remaining production fake data.
- Test: relevant E2E specs listed below.

- [ ] **Step 1: Search production code for old fake strings**

Run:

```bash
rg -n "首页访问测试成功|Chrome · 上海|密码 58%|OAuth 31%|Passkey 11%|owner/admin 占比 25|研发团队偏大|riskCount: 0|riskySessionCount: 0|securityStatus: \"normal\"|status: sql<\"active\" \\| \"disabled\">`'active'`" src --glob "*.ts" --glob "*.tsx"
```

Expected: no matches in `src` except matches inside test assertions that explicitly verify absence.

- [ ] **Step 2: Run focused E2E specs**

Run:

```bash
pnpm exec playwright test e2e/specs/06-dashboard.spec.ts e2e/specs/07-dashboard-settings-profile.spec.ts e2e/specs/08-dashboard-settings-security.spec.ts e2e/specs/09-dashboard-settings-sessions.spec.ts e2e/specs/10-dashboard-orgs-slug-settings.spec.ts e2e/specs/10A-organization-invitation-accept.spec.ts e2e/specs/15-dashboard-admin-orgs.spec.ts --project=chromium
```

Expected: all selected specs pass.

- [ ] **Step 3: Run repository checks**

Run:

```bash
pnpm typecheck
pnpm check
pnpm build
```

Expected: all commands pass.

- [ ] **Step 4: Final PRD consistency check**

Run:

```bash
rg -n "固定假数据|静态占位|首页访问测试成功|固定 `0`|占位 toast|接口联调后" prd src --glob "*.md" --glob "*.ts" --glob "*.tsx"
```

Expected: no production implementation conflicts. PRD lines that say these patterns are forbidden are acceptable.

---

## Self-Review

Spec coverage:

- `06-dashboard.md`: Task 3 handles real dashboard metrics; Task 6 handles root route and notification no-op removal.
- `07-dashboard-settings-profile.md`: Task 2 handles profile completeness and active session counting.
- `08-dashboard-settings-security.md`: Task 2 handles provider registry and score removal.
- `09-dashboard-settings-sessions.md`: Task 2 handles session risk.
- `10-dashboard-orgs-slug-settings.md`: Task 4 handles org risk and member security status.
- `11-dashboard-admin.md`: Task 5 supplies platform organization risk data that management overview can reuse; if an admin overview route exists separately, apply the same helper there before final checks.
- `15-dashboard-admin-orgs.md`: Task 5 handles persistent status and risk.

Placeholder scan:

- The plan contains no incomplete placeholder steps.
- Every task has exact files, commands, and expected outcomes.

Type consistency:

- Shared helper names used across tasks are `getSessionRisk`, `getHighRiskUserIds`, `getActiveSessionCountsByUser`, and `getOAuthProviderConfigs`.
- Risk status values are `"normal"` and `"risk"` for member/session UI, matching existing `securityStatus` filter semantics.
