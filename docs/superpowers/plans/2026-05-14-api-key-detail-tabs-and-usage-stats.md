# API Key Detail Tabs and Usage Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update personal and platform API Key detail Sheet/detail pages so compact metadata stays small, logs are the primary default content, and a new chart/statistics tab shows usage aggregates.

**Architecture:** Add one shared server-side usage stats helper that both personal and platform routers call after ownership/admin authorization. Refactor the two detail content components to use shadcn `Tabs`, compact summary sections, reusable log/stat panels, and existing shadcn/Recharts UI patterns. Keep usage logs/statistics as graceful extension data: if the log table/query fails, return empty logs and zeroed stats while still rendering the base API Key details.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, tRPC 11, Drizzle ORM, PostgreSQL, shadcn/ui Tabs/Card/Table/Skeleton, Recharts, Playwright E2E with Testcontainers PostgreSQL.

---

## Scope

This plan implements the already-approved PRD and Pencil design changes for:

- `prd/14-dashboard-admin-api-keys.md`
- `prd/16-dashboard-settings-api-keys.md`
- `prd/dashboard-api-key-design.pen`

It does not change API Key creation, permissions/scopes, API Key verification, or log-writing middleware.

## File Structure

- Modify `src/server/api/lib/api-key.ts`
  - Add shared exported types for usage stats only if keeping API Key utility types centralized is preferred.
- Create `src/server/api/lib/api-key-usage-stats.ts`
  - Owns usage-stat return shape, empty fallback, and Drizzle aggregate queries for recent 24h, 7-day trend, status distribution, top paths, latency, and admin risk events.
- Modify `src/server/api/routers/api-key.ts`
  - Add `apiKey.getMyUsageStats`, verifying current user owns the key before returning stats.
- Modify `src/server/api/routers/admin-api-key.ts`
  - Add `adminApiKey.getUsageStats`, verifying platform admin access through `adminProcedure`.
- Modify `src/app/dashboard/settings/api-keys/_components/api-key-detail-content.tsx`
  - Replace large base-info card with compact summary.
  - Add `Tabs` with default `logs` tab and `stats` tab.
  - Fetch personal usage stats only when stats tab is selected or when full page prefetch is acceptable.
- Modify `src/app/dashboard/admin/api-keys/_components/admin-api-key-detail-content.tsx`
  - Mirror the personal detail layout, with owner/risk metadata and admin stats.
- Modify `src/app/dashboard/settings/api-keys/_components/personal-api-keys-content.tsx`
  - Update Sheet description/skeleton labels if needed to match compact summary + tabs.
- Modify `src/app/dashboard/admin/api-keys/_components/admin-api-keys-content.tsx`
  - Update Sheet description/skeleton labels if needed to match compact summary + tabs.
- Modify `e2e/specs/16-dashboard-settings-api-keys.spec.ts`
  - Add personal detail tab assertions for logs default and stats tab.
- Modify `e2e/specs/14-dashboard-admin-api-keys.spec.ts`
  - Add platform detail tab assertions for logs default, owner/risk compact summary, and stats tab.

## Data Contract

Both `apiKey.getMyUsageStats` and `adminApiKey.getUsageStats` should return this shape:

```ts
type ApiKeyUsageStats = {
  avgDurationMs24h: number | null
  failed24h: number
  failureRate24h: number
  latency: {
    avgDurationMs7d: number | null
    maxDurationMs7d: number | null
  }
  resultBreakdown: Array<{
    count: number
    label: "2xx" | "3xx" | "4xx" | "5xx" | "other"
  }>
  riskEvents: Array<{
    count: number
    label: string
  }>
  topPaths: Array<{
    count: number
    path: string
  }>
  total24h: number
  trend: Array<{
    date: string
    failed: number
    rateLimited: number
    success: number
    total: number
  }>
}
```

Empty fallback:

```ts
const emptyApiKeyUsageStats = (): ApiKeyUsageStats => ({
  avgDurationMs24h: null,
  failed24h: 0,
  failureRate24h: 0,
  latency: {
    avgDurationMs7d: null,
    maxDurationMs7d: null
  },
  resultBreakdown: [],
  riskEvents: [],
  topPaths: [],
  total24h: 0,
  trend: buildRecentTrendBuckets(new Date()).map((date) => ({
    date,
    failed: 0,
    rateLimited: 0,
    success: 0,
    total: 0
  }))
})
```

---

### Task 1: Write Failing E2E Coverage for Personal Detail Tabs

**Files:**
- Modify: `e2e/specs/16-dashboard-settings-api-keys.spec.ts`

- [ ] **Step 1: Add fixture logs that produce chartable stats**

In the existing `opens the desktop detail sheet with a skeleton and full detail link` test, replace the single `createApiKeyUsageLogFixture` call with three log fixtures:

```ts
await createApiKeyUsageLogFixture({
  apiKeyId: key.id,
  path: "/v1/settings/e2e",
  referenceId: user?.id ?? "",
  userAgentSummary: "Settings E2E client"
})
await createApiKeyUsageLogFixture({
  apiKeyId: key.id,
  path: "/v1/settings/e2e",
  referenceId: user?.id ?? "",
  statusCode: 403,
  success: false,
  failureReason: "role_forbidden",
  userAgentSummary: "Settings E2E client"
})
await createApiKeyUsageLogFixture({
  apiKeyId: key.id,
  path: "/v1/settings/profile",
  referenceId: user?.id ?? "",
  statusCode: 200,
  success: true,
  userAgentSummary: "Settings E2E client"
})
```

- [ ] **Step 2: Assert the new default logs tab and compact detail layout**

Append these assertions after the existing Sheet visibility assertions:

```ts
await expect(page.getByRole("tab", { name: "调用日志" })).toHaveAttribute("aria-selected", "true")
await expect(page.getByRole("tab", { name: "图表统计" })).toBeVisible()
await expect(page.getByTestId("api-key-compact-summary")).toBeVisible()
await expect(page.getByTestId("api-key-detail-sheet").getByText("最近使用日志")).toHaveCount(0)
await expect(page.getByTestId("api-key-detail-sheet").getByText("调用日志")).toBeVisible()
await expect(page.getByTestId("api-key-detail-sheet").getByText("/v1/settings/e2e")).toBeVisible()
```

- [ ] **Step 3: Assert the stats tab**

Append:

```ts
await page.getByRole("tab", { name: "图表统计" }).click()
await expect(page.getByTestId("api-key-usage-stats")).toBeVisible()
await expect(page.getByText("7 天调用趋势")).toBeVisible()
await expect(page.getByText("结果分布")).toBeVisible()
await expect(page.getByText("Top 路径")).toBeVisible()
await expect(page.getByText("/v1/settings/e2e")).toBeVisible()
```

- [ ] **Step 4: Run the focused personal E2E and verify it fails**

Run:

```bash
pnpm test:e2e -- e2e/specs/16-dashboard-settings-api-keys.spec.ts --project=chromium
```

Expected: FAIL because `图表统计`, `api-key-compact-summary`, and `api-key-usage-stats` are not implemented yet.

---

### Task 2: Write Failing E2E Coverage for Platform Detail Tabs

**Files:**
- Modify: `e2e/specs/14-dashboard-admin-api-keys.spec.ts`

- [ ] **Step 1: Add chartable admin logs to the Sheet test**

In `opens the desktop detail sheet with risk reasons and logs`, add two more logs after the existing failing log:

```ts
await createApiKeyUsageLogFixture({
  apiKeyId: key.id,
  path: "/v1/admin/risky",
  referenceId: targetUser.id,
  statusCode: 200,
  success: true,
  userAgentSummary: "Risk E2E client"
})
await createApiKeyUsageLogFixture({
  apiKeyId: key.id,
  failureReason: "rate_limited",
  path: "/v1/admin/audit",
  referenceId: targetUser.id,
  statusCode: 429,
  success: false,
  userAgentSummary: "Risk E2E client"
})
```

- [ ] **Step 2: Assert compact summary, logs default, and stats tab**

Append these assertions after the existing Sheet assertions:

```ts
await expect(page.getByRole("tab", { name: "调用日志" })).toHaveAttribute("aria-selected", "true")
await expect(page.getByRole("tab", { name: "图表统计" })).toBeVisible()
await expect(page.getByTestId("admin-api-key-compact-summary")).toBeVisible()
await expect(page.getByTestId("admin-api-key-detail-sheet").getByText("最近使用日志")).toHaveCount(0)
await page.getByRole("tab", { name: "图表统计" }).click()
await expect(page.getByTestId("admin-api-key-usage-stats")).toBeVisible()
await expect(page.getByText("7 天调用趋势")).toBeVisible()
await expect(page.getByText("风险事件")).toBeVisible()
await expect(page.getByText("role_forbidden")).toBeVisible()
```

- [ ] **Step 3: Add direct full-detail page stats tab assertion**

In `opens the full detail page directly`, append:

```ts
await page.getByRole("tab", { name: "图表统计" }).click()
await expect(page.getByTestId("admin-api-key-usage-stats")).toBeVisible()
await expect(page.getByText("Top 路径")).toBeVisible()
```

- [ ] **Step 4: Run the focused platform E2E and verify it fails**

Run:

```bash
pnpm test:e2e -- e2e/specs/14-dashboard-admin-api-keys.spec.ts --project=chromium
```

Expected: FAIL because compact summary and stats tab are not implemented yet.

---

### Task 3: Add Shared API Key Usage Stats Helper

**Files:**
- Create: `src/server/api/lib/api-key-usage-stats.ts`

- [ ] **Step 1: Create the helper file with return types and empty fallback**

Add:

```ts
import { and, eq, gte, sql } from "drizzle-orm"

import { db } from "@/server/db"
import { apiKeyUsageLog } from "@/server/db/schema"

const secondsPerDay = 24 * 60 * 60
const recentDays = 7

type UsageStatsScope = {
  apiKeyId: string
  configId?: "user" | "organization"
  referenceId?: string
}

export type ApiKeyUsageStats = {
  avgDurationMs24h: number | null
  failed24h: number
  failureRate24h: number
  latency: {
    avgDurationMs7d: number | null
    maxDurationMs7d: number | null
  }
  resultBreakdown: Array<{
    count: number
    label: "2xx" | "3xx" | "4xx" | "5xx" | "other"
  }>
  riskEvents: Array<{
    count: number
    label: string
  }>
  topPaths: Array<{
    count: number
    path: string
  }>
  total24h: number
  trend: Array<{
    date: string
    failed: number
    rateLimited: number
    success: number
    total: number
  }>
}

const formatBucketDate = (date: Date) => date.toISOString().slice(0, 10)

export const buildRecentTrendBuckets = (now: Date) =>
  Array.from({ length: recentDays }, (_, index) => {
    const date = new Date(now)
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCDate(date.getUTCDate() - (recentDays - 1 - index))
    return formatBucketDate(date)
  })

export const emptyApiKeyUsageStats = (now = new Date()): ApiKeyUsageStats => ({
  avgDurationMs24h: null,
  failed24h: 0,
  failureRate24h: 0,
  latency: {
    avgDurationMs7d: null,
    maxDurationMs7d: null
  },
  resultBreakdown: [],
  riskEvents: [],
  topPaths: [],
  total24h: 0,
  trend: buildRecentTrendBuckets(now).map((date) => ({
    date,
    failed: 0,
    rateLimited: 0,
    success: 0,
    total: 0
  }))
})
```

- [ ] **Step 2: Add shared filters and aggregate implementation**

Append below `emptyApiKeyUsageStats`:

```ts
const toNumber = (value: number | string | null | undefined) => Number(value ?? 0)

const buildFilters = ({ apiKeyId, configId, referenceId }: UsageStatsScope, since: Date) =>
  and(
    eq(apiKeyUsageLog.apiKeyId, apiKeyId),
    gte(apiKeyUsageLog.createdAt, since),
    configId ? eq(apiKeyUsageLog.configId, configId) : undefined,
    referenceId ? eq(apiKeyUsageLog.referenceId, referenceId) : undefined
  )

export const getApiKeyUsageStats = async (scope: UsageStatsScope): Promise<ApiKeyUsageStats> => {
  const now = new Date()
  const since24h = new Date(now.getTime() - secondsPerDay * 1000)
  const since7d = new Date(now.getTime() - recentDays * secondsPerDay * 1000)
  const emptyStats = emptyApiKeyUsageStats(now)

  try {
    const [summary] = await db
      .select({
        avgDurationMs24h: sql<number | null>`round(avg(${apiKeyUsageLog.durationMs}))::int`,
        failed24h: sql<number>`count(*) filter (where ${apiKeyUsageLog.success} = false)::int`,
        total24h: sql<number>`count(*)::int`
      })
      .from(apiKeyUsageLog)
      .where(buildFilters(scope, since24h))

    const trendRows = await db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${apiKeyUsageLog.createdAt}), 'YYYY-MM-DD')`,
        failed: sql<number>`count(*) filter (where ${apiKeyUsageLog.success} = false)::int`,
        rateLimited: sql<number>`count(*) filter (where ${apiKeyUsageLog.statusCode} = 429)::int`,
        success: sql<number>`count(*) filter (where ${apiKeyUsageLog.success} = true)::int`,
        total: sql<number>`count(*)::int`
      })
      .from(apiKeyUsageLog)
      .where(buildFilters(scope, since7d))
      .groupBy(sql`date_trunc('day', ${apiKeyUsageLog.createdAt})`)

    const resultBreakdown = await db
      .select({
        count: sql<number>`count(*)::int`,
        label: sql<ApiKeyUsageStats["resultBreakdown"][number]["label"]>`
          case
            when ${apiKeyUsageLog.statusCode} between 200 and 299 then '2xx'
            when ${apiKeyUsageLog.statusCode} between 300 and 399 then '3xx'
            when ${apiKeyUsageLog.statusCode} between 400 and 499 then '4xx'
            when ${apiKeyUsageLog.statusCode} between 500 and 599 then '5xx'
            else 'other'
          end
        `
      })
      .from(apiKeyUsageLog)
      .where(buildFilters(scope, since7d))
      .groupBy(sql`
        case
          when ${apiKeyUsageLog.statusCode} between 200 and 299 then '2xx'
          when ${apiKeyUsageLog.statusCode} between 300 and 399 then '3xx'
          when ${apiKeyUsageLog.statusCode} between 400 and 499 then '4xx'
          when ${apiKeyUsageLog.statusCode} between 500 and 599 then '5xx'
          else 'other'
        end
      `)

    const topPaths = await db
      .select({
        count: sql<number>`count(*)::int`,
        path: apiKeyUsageLog.path
      })
      .from(apiKeyUsageLog)
      .where(buildFilters(scope, since7d))
      .groupBy(apiKeyUsageLog.path)
      .orderBy(sql`count(*) desc`)
      .limit(5)

    const [latency] = await db
      .select({
        avgDurationMs7d: sql<number | null>`round(avg(${apiKeyUsageLog.durationMs}))::int`,
        maxDurationMs7d: sql<number | null>`max(${apiKeyUsageLog.durationMs})::int`
      })
      .from(apiKeyUsageLog)
      .where(buildFilters(scope, since7d))

    const riskEvents = await db
      .select({
        count: sql<number>`count(*)::int`,
        label: sql<string>`coalesce(${apiKeyUsageLog.failureReason}, ${apiKeyUsageLog.errorCode}, 'failed_request')`
      })
      .from(apiKeyUsageLog)
      .where(and(buildFilters(scope, since7d), eq(apiKeyUsageLog.success, false)))
      .groupBy(sql`coalesce(${apiKeyUsageLog.failureReason}, ${apiKeyUsageLog.errorCode}, 'failed_request')`)
      .orderBy(sql`count(*) desc`)
      .limit(5)

    const trendByDate = new Map(
      trendRows.map((row) => [
        row.date,
        {
          date: row.date,
          failed: toNumber(row.failed),
          rateLimited: toNumber(row.rateLimited),
          success: toNumber(row.success),
          total: toNumber(row.total)
        }
      ])
    )
    const total24h = toNumber(summary?.total24h)
    const failed24h = toNumber(summary?.failed24h)

    return {
      avgDurationMs24h: summary?.avgDurationMs24h ?? null,
      failed24h,
      failureRate24h: total24h === 0 ? 0 : Math.round((failed24h / total24h) * 1000) / 10,
      latency: {
        avgDurationMs7d: latency?.avgDurationMs7d ?? null,
        maxDurationMs7d: latency?.maxDurationMs7d ?? null
      },
      resultBreakdown: resultBreakdown.map((row) => ({
        count: toNumber(row.count),
        label: row.label
      })),
      riskEvents: riskEvents.map((row) => ({
        count: toNumber(row.count),
        label: row.label
      })),
      topPaths: topPaths.map((row) => ({
        count: toNumber(row.count),
        path: row.path
      })),
      total24h,
      trend: emptyStats.trend.map((bucket) => trendByDate.get(bucket.date) ?? bucket)
    }
  } catch {
    return emptyStats
  }
}
```

- [ ] **Step 3: Run TypeScript**

Run:

```bash
pnpm typecheck
```

Expected: PASS. If Drizzle SQL typing complains about a grouped SQL expression, keep the same return shape and adjust only the `groupBy(sql\`...\`)` expression until typecheck passes.

---

### Task 4: Add Personal and Platform tRPC Stats Procedures

**Files:**
- Modify: `src/server/api/routers/api-key.ts`
- Modify: `src/server/api/routers/admin-api-key.ts`

- [ ] **Step 1: Import shared stats helper in personal router**

Add to `src/server/api/routers/api-key.ts` imports:

```ts
import { getApiKeyUsageStats } from "@/server/api/lib/api-key-usage-stats"
```

- [ ] **Step 2: Add `getMyUsageStats` after `getMine`**

Insert after the `getMine` procedure:

```ts
  getMyUsageStats: protectedProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ ctx, input }) => {
    const [target] = await ctx.db.select(selectSafeApiKey).from(apikey).where(eq(apikey.id, input.id)).limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "API Key 不存在。" })
    }

    assertPersonalKey(target, ctx.session.user.id)

    return await getApiKeyUsageStats({
      apiKeyId: input.id,
      configId: "user",
      referenceId: ctx.session.user.id
    })
  }),
```

- [ ] **Step 3: Import shared stats helper in platform router**

Add to `src/server/api/routers/admin-api-key.ts` imports:

```ts
import { getApiKeyUsageStats } from "@/server/api/lib/api-key-usage-stats"
```

- [ ] **Step 4: Add `getUsageStats` after `get`**

Insert after the `get` procedure:

```ts
  getUsageStats: adminProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ ctx, input }) => {
    const [target] = await ctx.db
      .select(selectAdminSafeApiKey)
      .from(apikey)
      .leftJoin(user, and(eq(apikey.configId, "user"), eq(user.id, apikey.referenceId)))
      .leftJoin(organization, and(eq(apikey.configId, "organization"), eq(organization.id, apikey.referenceId)))
      .where(eq(apikey.id, input.id))
      .limit(1)

    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "API Key 不存在。" })
    }

    return await getApiKeyUsageStats({
      apiKeyId: input.id
    })
  }),
```

Note: The `target` read intentionally validates that the key exists without exposing whether a non-admin can see it; `adminProcedure` already enforces platform admin access.

- [ ] **Step 5: Run TypeScript**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

---

### Task 5: Refactor Personal API Key Detail UI

**Files:**
- Modify: `src/app/dashboard/settings/api-keys/_components/api-key-detail-content.tsx`

- [ ] **Step 1: Add imports**

Update imports:

```ts
import { Activity, BarChart3, CalendarClock, Fingerprint, Gauge, KeyRound, ShieldCheck } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api, type RouterOutputs } from "@/trpc/react"
```

Keep existing imports for buttons, cards, dropdowns, tables, dialogs, status badges.

- [ ] **Step 2: Add stats type aliases**

Near existing type aliases:

```ts
type ApiKeyUsageStats = RouterOutputs["apiKey"]["getMyUsageStats"]
```

- [ ] **Step 3: Add helper formatting functions**

Add below `formatDateTime`:

```ts
const formatDuration = (value: number | null) => (value === null ? "-" : `${value}ms`)
const formatPercent = (value: number) => `${value.toFixed(1)}%`
```

- [ ] **Step 4: Add compact summary component**

Add above `ApiKeyDetailContent`:

```tsx
const CompactSummary = ({ apiKey }: { apiKey: ApiKeyDetail }) => (
  <Card className="rounded-lg shadow-sm" data-testid="api-key-compact-summary">
    <CardContent className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" />
            <h2 className="truncate font-semibold text-base">{apiKey.name}</h2>
          </div>
          <div className="truncate text-muted-foreground text-xs">{apiKey.maskedKey}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ApiKeyStatusBadge status={apiKey.status} />
          <ApiKeyRiskBadge risk={apiKey.risk} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <SummaryItem label="过期时间" value={apiKey.expiresAt ? formatDateTime(apiKey.expiresAt) : "不过期"} />
        <SummaryItem label="最后使用" value={formatDateTime(apiKey.lastRequest)} />
        <SummaryItem label="24h 调用" value={`${apiKey.usageSummary.total24h} 次`} />
      </div>
    </CardContent>
  </Card>
)

const SummaryItem = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0">
    <div className="text-muted-foreground text-xs">{label}</div>
    <div className="mt-1 truncate font-medium">{value}</div>
  </div>
)
```

- [ ] **Step 5: Add reusable personal stats panel**

Add below `CompactSummary`:

```tsx
const PersonalUsageStats = ({ stats }: { stats: ApiKeyUsageStats }) => (
  <div className="space-y-4" data-testid="api-key-usage-stats">
    <div className="grid gap-3 md:grid-cols-4">
      <Stat icon={Gauge} label="24 小时调用" value={stats.total24h.toString()} />
      <Stat icon={ShieldCheck} label="失败率" value={formatPercent(stats.failureRate24h)} />
      <Stat icon={Activity} label="平均耗时" value={formatDuration(stats.avgDurationMs24h)} />
      <Stat icon={BarChart3} label="Top 路径" value={`${stats.topPaths.length} 个`} />
    </div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">7 天调用趋势</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={stats.trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} />
              <YAxis allowDecimals={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="success" fill="#22c55e" name="成功" radius={[4, 4, 0, 0]} stackId="calls" />
              <Bar dataKey="failed" fill="#f59e0b" name="失败" radius={[4, 4, 0, 0]} stackId="calls" />
              <Bar dataKey="rateLimited" fill="#ef4444" name="限流" radius={[4, 4, 0, 0]} stackId="calls" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">结果分布</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.resultBreakdown.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">暂无统计数据。</div>
          ) : (
            stats.resultBreakdown.map((item) => <DistributionBar count={item.count} key={item.label} label={item.label} total={stats.total24h} />)
          )}
        </CardContent>
      </Card>
    </div>
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Top 路径</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {stats.topPaths.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">暂无路径统计。</div>
        ) : (
          stats.topPaths.map((item) => (
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3" key={item.path}>
              <span className="truncate font-medium text-sm">{item.path}</span>
              <Badge variant="secondary">{item.count} 次</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  </div>
)

const DistributionBar = ({ count, label, total }: { count: number; label: string; total: number }) => {
  const percent = total === 0 ? 0 : Math.round((count / total) * 100)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{count} 次</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Replace the component body with tabs**

Inside `ApiKeyDetailContent`, add stats query:

```ts
  const stats = api.apiKey.getMyUsageStats.useQuery(
    { id: apiKey.id },
    {
      placeholderData: (previousData) => previousData
    }
  )
```

Replace the returned top-level content before dialogs with:

```tsx
    <div className="space-y-4">
      <CompactSummary apiKey={apiKey} />

      <Tabs defaultValue="logs">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="logs">调用日志</TabsTrigger>
          <TabsTrigger value="stats">图表统计</TabsTrigger>
        </TabsList>
        <TabsContent className="mt-4" value="logs">
          <Card className="rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Fingerprint className="size-4" />
                调用日志
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logItems.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">暂无调用日志。</div>
              ) : (
                <UsageLogTable items={logItems} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent className="mt-4" value="stats">
          {stats.data ? (
            <PersonalUsageStats stats={stats.data} />
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">正在加载统计数据。</div>
          )}
        </TabsContent>
      </Tabs>
```

Keep the existing disable/enable/delete dialogs after the tabs.

- [ ] **Step 7: Add personal `UsageLogTable` helper**

Move the existing inline table into a helper:

```tsx
const UsageLogTable = ({ items }: { items: ApiKeyDetail["recentLogs"] }) => (
  <div className="overflow-hidden rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead>时间</TableHead>
          <TableHead>请求</TableHead>
          <TableHead>结果</TableHead>
          <TableHead>IP</TableHead>
          <TableHead>User-Agent</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((log) => (
          <TableRow key={log.id}>
            <TableCell>{formatDateTime(log.createdAt)}</TableCell>
            <TableCell>
              <div className="font-medium">{log.method ?? "GET"}</div>
              <div className="max-w-[220px] truncate text-muted-foreground text-xs">{log.routeName ?? log.path ?? "-"}</div>
            </TableCell>
            <TableCell>
              <div>{log.success ? "成功" : "失败"}</div>
              <div className="text-muted-foreground text-xs">{log.statusCode ?? log.errorCode ?? log.failureReason ?? "-"}</div>
            </TableCell>
            <TableCell>{log.ipCountry ?? "隐藏"}</TableCell>
            <TableCell className="max-w-[200px] truncate">{log.userAgentSummary ?? "隐藏"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
)
```

- [ ] **Step 8: Run the personal focused E2E**

Run:

```bash
pnpm test:e2e -- e2e/specs/16-dashboard-settings-api-keys.spec.ts --project=chromium
```

Expected: the personal detail test now passes.

---

### Task 6: Refactor Platform API Key Detail UI

**Files:**
- Modify: `src/app/dashboard/admin/api-keys/_components/admin-api-key-detail-content.tsx`

- [ ] **Step 1: Add imports**

Update imports:

```ts
import { Activity, BarChart3, Building2, CalendarClock, Fingerprint, Gauge, KeyRound, LinkIcon, MoreHorizontal, ShieldAlert, ShieldCheck, UserRound } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
```

- [ ] **Step 2: Add stats type alias**

Add:

```ts
type AdminApiKeyUsageStats = RouterOutputs["adminApiKey"]["getUsageStats"]
```

- [ ] **Step 3: Add platform compact summary**

Add above `AdminApiKeyDetailContent`:

```tsx
const AdminCompactSummary = ({ apiKey }: { apiKey: AdminApiKeyDetail }) => (
  <Card className="rounded-lg shadow-sm" data-testid="admin-api-key-compact-summary">
    <CardContent className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" />
            <h2 className="truncate font-semibold text-base">{apiKey.name}</h2>
          </div>
          <div className="truncate text-muted-foreground text-xs">{apiKey.maskedKey}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminApiKeyStatusBadge status={apiKey.status} />
          <AdminApiKeyRiskBadge risk={apiKey.risk} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
        <SummaryItem label="主体" value={apiKey.owner.label} />
        <SummaryItem label="类型" value={ownerTypeLabel(apiKey.owner.type)} />
        <SummaryItem label="最后使用" value={formatDateTime(apiKey.lastRequest)} />
        <SummaryItem label="风险" value={apiKey.risk.reasons[0] ?? "暂无风险信号"} />
      </div>
    </CardContent>
  </Card>
)
```

Reuse this `SummaryItem` helper:

```tsx
const SummaryItem = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0">
    <div className="text-muted-foreground text-xs">{label}</div>
    <div className="mt-1 truncate font-medium">{value}</div>
  </div>
)
```

- [ ] **Step 4: Add platform stats panel**

Add:

```tsx
const AdminUsageStats = ({ stats }: { stats: AdminApiKeyUsageStats }) => (
  <div className="space-y-4" data-testid="admin-api-key-usage-stats">
    <div className="grid gap-3 md:grid-cols-4">
      <Stat icon={Gauge} label="24 小时调用" value={stats.total24h.toString()} />
      <Stat icon={ShieldCheck} label="失败率" value={`${stats.failureRate24h.toFixed(1)}%`} />
      <Stat icon={Activity} label="平均耗时" value={stats.avgDurationMs24h === null ? "-" : `${stats.avgDurationMs24h}ms`} />
      <Stat icon={BarChart3} label="风险事件" value={`${stats.riskEvents.length} 类`} />
    </div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">7 天调用趋势</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={stats.trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} />
              <YAxis allowDecimals={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="success" fill="#22c55e" name="成功" radius={[4, 4, 0, 0]} stackId="calls" />
              <Bar dataKey="failed" fill="#f59e0b" name="失败" radius={[4, 4, 0, 0]} stackId="calls" />
              <Bar dataKey="rateLimited" fill="#ef4444" name="限流" radius={[4, 4, 0, 0]} stackId="calls" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">风险事件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.riskEvents.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">暂无风险事件。</div>
          ) : (
            stats.riskEvents.map((item) => (
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3" key={item.label}>
                <span className="truncate font-medium text-sm">{item.label}</span>
                <Badge variant="outline">{item.count} 次</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <TopPathCard items={stats.topPaths} />
      <ResultBreakdownCard items={stats.resultBreakdown} total={stats.total24h} />
    </div>
  </div>
)
```

Add helper cards:

```tsx
const TopPathCard = ({ items }: { items: AdminApiKeyUsageStats["topPaths"] }) => (
  <Card className="rounded-lg shadow-sm">
    <CardHeader>
      <CardTitle className="text-base">Top 路径</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">暂无路径统计。</div>
      ) : (
        items.map((item) => (
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3" key={item.path}>
            <span className="truncate font-medium text-sm">{item.path}</span>
            <Badge variant="secondary">{item.count} 次</Badge>
          </div>
        ))
      )}
    </CardContent>
  </Card>
)

const ResultBreakdownCard = ({ items, total }: { items: AdminApiKeyUsageStats["resultBreakdown"]; total: number }) => (
  <Card className="rounded-lg shadow-sm">
    <CardHeader>
      <CardTitle className="text-base">结果分布</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">暂无统计数据。</div>
      ) : (
        items.map((item) => <DistributionBar count={item.count} key={item.label} label={item.label} total={total} />)
      )}
    </CardContent>
  </Card>
)
```

Use the same `DistributionBar` helper from Task 5.

- [ ] **Step 5: Add stats query and tabs**

Inside `AdminApiKeyDetailContent`, add:

```ts
  const stats = api.adminApiKey.getUsageStats.useQuery(
    { id: apiKey.id },
    {
      placeholderData: (previousData) => previousData
    }
  )
```

Replace the large base-info/owner/stats/log blocks with:

```tsx
    <div className="space-y-4">
      <AdminCompactSummary apiKey={apiKey} />

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={ownerHref(apiKey.owner)}>
            <LinkIcon className="size-4" />
            查看所属主体
          </Link>
        </Button>
        {apiKey.canMutate !== false ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" type="button" variant="outline">
                <MoreHorizontal className="size-4" />
                操作
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {apiKey.enabled ? (
                <DropdownMenuItem onSelect={() => setActiveAction("disable")} variant="destructive">
                  禁用
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setActiveAction("enable")}>启用</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setActiveAction("delete")} variant="destructive">
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <Tabs defaultValue="logs">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="logs">调用日志</TabsTrigger>
          <TabsTrigger value="stats">图表统计</TabsTrigger>
        </TabsList>
        <TabsContent className="mt-4" value="logs">
          <Card className="rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Fingerprint className="size-4" />
                调用日志
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usageLogs.isLoading && mode === "page" ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : logItems.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">暂无调用日志。</div>
              ) : (
                <UsageLogTable items={logItems} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent className="mt-4" value="stats">
          {stats.data ? (
            <AdminUsageStats stats={stats.data} />
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">正在加载统计数据。</div>
          )}
        </TabsContent>
      </Tabs>
```

Keep existing dialogs after the tabs.

- [ ] **Step 6: Run platform focused E2E**

Run:

```bash
pnpm test:e2e -- e2e/specs/14-dashboard-admin-api-keys.spec.ts --project=chromium
```

Expected: platform detail tab tests pass.

---

### Task 7: Update Sheet Skeletons and Descriptions

**Files:**
- Modify: `src/app/dashboard/settings/api-keys/_components/personal-api-keys-content.tsx`
- Modify: `src/app/dashboard/admin/api-keys/_components/admin-api-keys-content.tsx`

- [ ] **Step 1: Update personal Sheet description**

Replace:

```tsx
<SheetDescription className="sr-only">个人 API Key 基础信息、状态、风险和使用日志。</SheetDescription>
```

With:

```tsx
<SheetDescription className="sr-only">个人 API Key 摘要、调用日志和图表统计。</SheetDescription>
```

- [ ] **Step 2: Update admin Sheet description**

Replace:

```tsx
<SheetDescription className="sr-only">平台 API Key 基础信息、所属主体、状态、风险和使用日志。</SheetDescription>
```

With:

```tsx
<SheetDescription className="sr-only">平台 API Key 摘要、所属主体、调用日志和图表统计。</SheetDescription>
```

- [ ] **Step 3: Adjust skeletons to match compact summary + tabs**

For both `ApiKeyDetailSkeleton` and `AdminApiKeyDetailSkeleton`, keep the existing `data-testid` and use this structure:

```tsx
const ApiKeyDetailSkeleton = () => (
  <div className="space-y-4" data-testid="api-key-detail-skeleton">
    <Skeleton className="h-24 w-full rounded-lg" />
    <div className="grid grid-cols-2 gap-2">
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-9 w-full rounded-md" />
    </div>
    <Skeleton className="h-80 w-full rounded-lg" />
  </div>
)
```

For admin, preserve `data-testid="admin-api-key-detail-skeleton"`:

```tsx
const AdminApiKeyDetailSkeleton = () => (
  <div className="space-y-4" data-testid="admin-api-key-detail-skeleton">
    <Skeleton className="h-24 w-full rounded-lg" />
    <div className="grid grid-cols-2 gap-2">
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-9 w-full rounded-md" />
    </div>
    <Skeleton className="h-80 w-full rounded-lg" />
  </div>
)
```

- [ ] **Step 4: Run TypeScript and Biome**

Run:

```bash
pnpm typecheck
pnpm check
```

Expected: both pass.

---

### Task 8: Full Verification

**Files:**
- Verify only.

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

- [ ] **Step 3: Run focused personal E2E**

Run:

```bash
pnpm test:e2e -- e2e/specs/16-dashboard-settings-api-keys.spec.ts --project=chromium
```

Expected: PASS. Existing mobile project skips are acceptable when the command is scoped to `--project=chromium`.

- [ ] **Step 4: Run focused platform E2E**

Run:

```bash
pnpm test:e2e -- e2e/specs/14-dashboard-admin-api-keys.spec.ts --project=chromium
```

Expected: PASS.

- [ ] **Step 5: Avoid parallel Playwright server runs**

Do not run the two E2E commands in parallel. They both use the same default `E2E_PORT=3100` and can fail with `EADDRINUSE`.

---

## Self-Review

- Spec coverage:
  - Compact base summary: Task 5 and Task 6.
  - Logs default tab: Task 1, Task 2, Task 5, Task 6.
  - Stats/chart tab: Task 3, Task 4, Task 5, Task 6.
  - Personal ownership enforcement: Task 4 personal procedure.
  - Platform admin enforcement: Task 4 platform procedure.
  - Graceful empty stats fallback: Task 3 helper.
  - Sheet skeleton/description alignment: Task 7.
  - E2E coverage: Task 1, Task 2, Task 8.
- Placeholder scan: no unresolved placeholder markers; every implementation step lists concrete files, code, and commands.
- Type consistency:
  - Personal procedure is `apiKey.getMyUsageStats`, matching PRD and UI type alias.
  - Platform procedure is `adminApiKey.getUsageStats`, matching PRD and UI type alias.
  - Stats shape uses the same fields in server helper and UI components.
