# API Key Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build personal API Key management and platform API Key governance, including list pages, row-click shadcn Sheet details, standalone detail pages, one-time plaintext display, status actions, and usage logs.

**Architecture:** Better Auth API Key plugin remains the source of truth for key creation, verification, enable/disable, and deletion. Drizzle/tRPC provide product-level list/detail/search/risk/log aggregation, with shared UI components reused between Sheet and full detail pages. Personal routes enforce key ownership; admin routes enforce platform role authorization.

**Tech Stack:** Next.js 16 App Router, React 19, tRPC 11, Drizzle ORM, PostgreSQL, Better Auth API Key plugin, shadcn/ui, Zod, Playwright E2E.

---

## File Structure

- Modify: `src/server/db/schema.ts`
  - Add `apiKeyUsageLog` table and relations/indexes for `system_api_key_usage_log`.
- Create: `src/server/api/lib/api-key.ts`
  - Shared server helpers for masking, metadata parsing, scope parsing, risk scoring, usage summaries, ownership/admin checks, and list filters.
- Create: `src/server/api/routers/api-key.ts`
  - Personal procedures: `listMine`, `getMine`, `createMine`, `disableMine`, `enableMine`, `deleteMine`, `listMyUsageLogs`.
- Create: `src/server/api/routers/admin-api-key.ts`
  - Platform procedures: `list`, `get`, `getOverview`, `disable`, `enable`, `delete`, `listUsageLogs`.
- Modify: `src/server/api/root.ts`
  - Register `apiKey` and `adminApiKey` routers.
- Modify: `src/app/dashboard/_components/dashboard-sidebar.tsx`
  - Add settings API Keys and admin platform API Keys menu items.
- Create: `src/app/dashboard/settings/api-keys/page.tsx`
- Create: `src/app/dashboard/settings/api-keys/loading.tsx`
- Create: `src/app/dashboard/settings/api-keys/error.tsx`
- Create: `src/app/dashboard/settings/api-keys/[id]/page.tsx`
- Create: `src/app/dashboard/settings/api-keys/[id]/loading.tsx`
- Create: `src/app/dashboard/settings/api-keys/[id]/error.tsx`
- Create: `src/app/dashboard/settings/api-keys/_components/personal-api-keys-content.tsx`
- Create: `src/app/dashboard/settings/api-keys/_components/api-key-detail-content.tsx`
- Create: `src/app/dashboard/settings/api-keys/_components/api-key-dialogs.tsx`
- Create: `src/app/dashboard/settings/api-keys/_components/api-key-status.tsx`
- Create: `src/app/dashboard/admin/api-keys/page.tsx`
- Create: `src/app/dashboard/admin/api-keys/loading.tsx`
- Create: `src/app/dashboard/admin/api-keys/error.tsx`
- Create: `src/app/dashboard/admin/api-keys/[id]/page.tsx`
- Create: `src/app/dashboard/admin/api-keys/[id]/loading.tsx`
- Create: `src/app/dashboard/admin/api-keys/[id]/error.tsx`
- Create: `src/app/dashboard/admin/api-keys/_components/admin-api-keys-content.tsx`
- Create: `src/app/dashboard/admin/api-keys/_components/admin-api-key-detail-content.tsx`
- Create: `src/app/dashboard/admin/api-keys/_components/admin-api-key-dialogs.tsx`
- Modify: `e2e/helpers/db.ts`
  - Add API Key and API Key usage log fixtures.
- Create: `e2e/specs/14-dashboard-admin-api-keys.spec.ts`
- Create: `e2e/specs/16-dashboard-settings-api-keys.spec.ts`
- Modify: `prd/14-dashboard-admin-api-keys.md`
  - Update only if implementation deliberately changes current PRD behavior.
- Modify: `prd/16-dashboard-settings-api-keys.md`
  - Update only if implementation deliberately changes current PRD behavior.

## Task 1: Usage Log Schema

**Files:**
- Modify: `src/server/db/schema.ts`
- Later generate migration with: `pnpm db:generate`

- [ ] **Step 1: Add the usage log table**

Add `apiKeyUsageLog` near the existing `apikey` table:

```ts
export const apiKeyUsageLog = createSystemTable(
  "api_key_usage_log",
  {
    id: text("id").primaryKey(),
    apiKeyId: text("api_key_id"),
    configId: text("config_id").notNull(),
    referenceId: text("reference_id").notNull(),
    keyPrefix: text("key_prefix"),
    method: text("method").notNull(),
    path: text("path").notNull(),
    routeName: text("route_name"),
    statusCode: integer("status_code").notNull(),
    success: boolean("success").notNull(),
    errorCode: text("error_code"),
    failureReason: text("failure_reason"),
    requestId: text("request_id"),
    ipHash: text("ip_hash"),
    ipCountry: text("ip_country"),
    ipRegion: text("ip_region"),
    userAgentHash: text("user_agent_hash"),
    userAgentSummary: text("user_agent_summary"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => [
    index("system_api_key_usage_log_api_key_id_idx").on(table.apiKeyId),
    index("system_api_key_usage_log_config_reference_idx").on(table.configId, table.referenceId),
    index("system_api_key_usage_log_created_at_idx").on(table.createdAt),
    index("system_api_key_usage_log_success_idx").on(table.success),
    foreignKey({
      columns: [table.apiKeyId],
      foreignColumns: [apikey.id],
      name: "api_key_usage_log_api_key_fk"
    }).onDelete("set null")
  ]
)
```

Use `onDelete("set null")` with nullable `apiKeyId` so deleting an API key does not remove audit logs or block API key deletion.

- [ ] **Step 2: Add relations**

Add:

```ts
export const apiKeyRelations = relations(apikey, ({ many }) => ({
  usageLogs: many(apiKeyUsageLog)
}))

export const apiKeyUsageLogRelations = relations(apiKeyUsageLog, ({ one }) => ({
  apiKey: one(apikey, {
    fields: [apiKeyUsageLog.apiKeyId],
    references: [apikey.id]
  })
}))
```

- [ ] **Step 3: Verify schema types**

Run:

```bash
pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 4: Generate migration during implementation**

Run only after schema is final:

```bash
pnpm db:generate
```

Expected: a Drizzle migration adding `system_api_key_usage_log`.

## Task 2: Server Helpers

**Files:**
- Create: `src/server/api/lib/api-key.ts`

- [ ] **Step 1: Create shared types and formatters**

Implement helpers with no `any`/`unknown`:

```ts
import { TRPCError } from "@trpc/server"
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm"
import { z } from "zod"

import { PLATFORM_ROLE_SUPPORT } from "@/lib/const"
import { apikey, apiKeyUsageLog, organization, user } from "@/server/db/schema"

export const apiKeyStatusSchema = z.enum(["all", "enabled", "disabled", "expiring", "risky"])
export const usageResultSchema = z.enum(["all", "success", "failed"])

export type ApiKeyRiskLevel = "low" | "medium" | "high"
export type ApiKeyOwnerType = "user" | "organization"

export const maskApiKey = ({ prefix, start }: { prefix: string | null; start: string | null }) => {
  const visible = prefix ?? start ?? "key"
  return `${visible}••••••••`
}

export const parseScopes = (permissions: string | null) => {
  if (!permissions) {
    return []
  }

  try {
    const parsed = JSON.parse(permissions) as Record<string, string[]>
    return Object.entries(parsed).flatMap(([resource, actions]) => actions.map((action) => `${resource}:${action}`))
  } catch {
    return permissions
      .split(/[,\s]+/u)
      .map((scope) => scope.trim())
      .filter(Boolean)
  }
}
```

- [ ] **Step 2: Add ownership guards and support-role guard**

```ts
export const assertCanMutatePlatformApiKey = (role: string | null | undefined) => {
  if (role === PLATFORM_ROLE_SUPPORT) {
    throw new TRPCError({ code: "FORBIDDEN", message: "support 只能只读查看 API Key。" })
  }
}

export const assertPersonalKey = (key: { configId: string; referenceId: string }, userId: string) => {
  if (key.configId !== "user" || key.referenceId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "API Key 不存在。" })
  }
}
```

- [ ] **Step 3: Add risk helper**

```ts
export const buildApiKeyRisk = ({
  enabled,
  expiresAt,
  failed24h,
  lastRequest,
  scopes,
  total24h
}: {
  enabled: boolean | null
  expiresAt: Date | null
  failed24h: number
  lastRequest: Date | null
  scopes: string[]
  total24h: number
}) => {
  const reasons: string[] = []
  const now = Date.now()
  const expiresInMs = expiresAt ? expiresAt.getTime() - now : null
  const hasWriteScope = scopes.some((scope) => /write|delete|admin|\*/iu.test(scope))

  if (expiresInMs !== null && expiresInMs <= 30 * 24 * 60 * 60 * 1000) {
    reasons.push(expiresInMs < 0 ? "已过期" : "30 天内到期")
  }
  if (!lastRequest || now - lastRequest.getTime() > 90 * 24 * 60 * 60 * 1000) {
    reasons.push("长期未使用")
  }
  if (hasWriteScope && (!expiresAt || expiresInMs === null || expiresInMs > 180 * 24 * 60 * 60 * 1000)) {
    reasons.push("高权限长期有效")
  }
  if (total24h > 0 && failed24h / total24h >= 0.1) {
    reasons.push("近 24 小时失败率异常")
  }

  const level: ApiKeyRiskLevel = reasons.some((reason) => reason.includes("失败率") || reason.includes("高权限")) ? "high" : reasons.length > 0 ? "medium" : "low"

  return { level, reasons }
}
```

## Task 3: Personal API Key tRPC Router

**Files:**
- Create: `src/server/api/routers/api-key.ts`
- Modify: `src/server/api/root.ts`

- [ ] **Step 1: Create router inputs**

```ts
const listInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
  search: z.string().default(""),
  status: apiKeyStatusSchema.default("all")
})

const createInput = z.object({
  expiresInDays: z.number().int().min(1).max(365).default(90),
  name: z.string().min(1).max(80),
  note: z.string().max(200).optional(),
  scopes: z.array(z.string().min(1)).min(1).max(20)
})

const keyIdInput = z.object({ id: z.string().min(1) })
```

- [ ] **Step 2: Implement `listMine` and `getMine`**

Use direct Drizzle reads from `system_apikey`, filter `configId="user"` and `referenceId=ctx.session.user.id`, never select `apikey.key`.

Return shape:

```ts
{
  items: Array<{
    createdAt: Date
    enabled: boolean | null
    expiresAt: Date | null
    id: string
    lastRequest: Date | null
    maskedKey: string
    name: string | null
    risk: { level: "low" | "medium" | "high"; reasons: string[] }
    scopes: string[]
    status: "enabled" | "disabled" | "expired"
  }>
  page: number
  pageCount: number
  total: number
}
```

- [ ] **Step 3: Implement `createMine`**

Call Better Auth server API:

```ts
const created = await auth.api.createApiKey({
  body: {
    configId: "user",
    expiresIn: input.expiresInDays * 24 * 60 * 60,
    metadata: input.note ? { note: input.note, scopes: input.scopes } : { scopes: input.scopes },
    name: input.name,
    prefix: "lev_live",
    userId: ctx.session.user.id
  }
})
```

Return the plaintext key only from this mutation response. Do not persist plaintext anywhere outside Better Auth.

- [ ] **Step 4: Implement enable, disable, delete**

Before mutation, read the key and call `assertPersonalKey`. Then use:

```ts
await auth.api.updateApiKey({ body: { configId: "user", enabled: false, keyId: input.id, userId: ctx.session.user.id } })
await auth.api.updateApiKey({ body: { configId: "user", enabled: true, keyId: input.id, userId: ctx.session.user.id } })
await auth.api.deleteApiKey({ body: { configId: "user", keyId: input.id }, headers: await headers() })
```

- [ ] **Step 5: Implement `listMyUsageLogs`**

Require ownership first, then query `apiKeyUsageLog` by `apiKeyId`, `configId="user"`, `referenceId=currentUser.id`, defaulting to the last 90 days.

- [ ] **Step 6: Register router**

In `src/server/api/root.ts`:

```ts
import { apiKeyRouter } from "@/server/api/routers/api-key"

export const appRouter = createTRPCRouter({
  apiKey: apiKeyRouter,
  // existing routers...
})
```

## Task 4: Platform Admin API Key tRPC Router

**Files:**
- Create: `src/server/api/routers/admin-api-key.ts`
- Modify: `src/server/api/root.ts`

- [ ] **Step 1: Implement platform list/search**

Use `adminProcedure`; join users and organizations by `referenceId` depending on `configId`.

Support search across key name, prefix/start, user name/email, and organization name. Return risk fields and owner fields:

```ts
owner: {
  id: string
  label: string
  type: "user" | "organization"
}
```

- [ ] **Step 2: Implement overview**

Return:

```ts
{
  enabled: number
  expiring: number
  recent24h: number
  risky: number
  total: number
}
```

- [ ] **Step 3: Implement get/detail/logs**

`get` returns basic info, owner info, risk reasons, usage summary, and recent logs. `listUsageLogs` returns paginated logs for admin. Neither returns plaintext key or `apikey.key`.

- [ ] **Step 4: Implement enable, disable, delete**

Use `assertCanMutatePlatformApiKey(ctx.session.user.role)` before mutations. Platform admin enable, disable, and delete update `system_apikey` metadata directly with Drizzle after admin authorization, because Better Auth API Key plugin endpoints are owner/org scoped and cannot reliably govern another user's or organization's key from the platform admin page. Do not select or expose `apikey.key`.

- [ ] **Step 5: Register router**

In `src/server/api/root.ts`:

```ts
import { adminApiKeyRouter } from "@/server/api/routers/admin-api-key"

export const appRouter = createTRPCRouter({
  adminApiKey: adminApiKeyRouter,
  // existing routers...
})
```

## Task 5: Sidebar Navigation

**Files:**
- Modify: `src/app/dashboard/_components/dashboard-sidebar.tsx`

- [ ] **Step 1: Add icons and routes**

Import `KeyRound` from `lucide-react`.

Add in account settings after “我的会话”:

```ts
{ href: "/dashboard/settings/api-keys", icon: KeyRound, label: "API Keys" }
```

Add in admin group:

```ts
{ href: "/dashboard/admin/api-keys", icon: KeyRound, label: "平台 API Key" }
```

- [ ] **Step 2: Verify active state**

Run:

```bash
pnpm typecheck
```

Expected: exit 0.

## Task 6: Personal API Key Pages

**Files:**
- Create settings API Key route files and `_components` listed in File Structure.

- [ ] **Step 1: Create server page**

`src/app/dashboard/settings/api-keys/page.tsx` should use RSC caller to prefetch `apiKey.listMine`, read optional `keyId` search param, and pass initial data to `PersonalApiKeysContent`.

- [ ] **Step 2: Build list UI**

Use shadcn `Card`, `Input`, `DropdownMenu`, `Button`, `Sheet`, `Skeleton`, `Table`, `Dialog`. Desktop row click opens Sheet and updates URL query (`?keyId=`); mobile cards link to `/dashboard/settings/api-keys/[id]`.

- [ ] **Step 3: Build create dialog**

Fields: name, expiresInDays, scopes, note. On success, show one-time result bar immediately above table with plaintext key, copy button, and “仅显示一次”. Closing the bar discards plaintext.

- [ ] **Step 4: Build shared detail content**

`api-key-detail-content.tsx` receives `mode: "sheet" | "page"` and one `apiKey.getMine` result. Render basic info, risk/summary, logs, and actions. Use the same component inside Sheet and `[id]` page.

- [ ] **Step 5: Build loading/error states**

`loading.tsx` uses skeleton cards; `error.tsx` uses existing dashboard error styling pattern.

## Task 7: Platform Admin API Key Pages

**Files:**
- Create admin API Key route files and `_components` listed in File Structure.

- [ ] **Step 1: Create server page**

`src/app/dashboard/admin/api-keys/page.tsx` should call `adminApiKey.list` and `adminApiKey.getOverview`; unauthorized users naturally receive `FORBIDDEN` from tRPC and page shows error state.

- [ ] **Step 2: Build overview/list UI**

Render title outside cards, stats row, one table card with search + status DropdownMenu in the same row. Desktop row click opens shadcn Sheet; mobile cards link to `/dashboard/admin/api-keys/[id]`.

- [ ] **Step 3: Build admin detail content**

`admin-api-key-detail-content.tsx` renders owner, owner type, masked key, scopes, dates, risk reasons, usage summary, logs, and actions. Include “查看所属主体” link to user/org page when the route exists.

- [ ] **Step 4: Build admin action dialogs**

Use confirmation dialogs for enable/disable/delete. Disable mutation buttons for support role if the server detail result exposes `canMutate: false`.

- [ ] **Step 5: Build standalone detail page**

`src/app/dashboard/admin/api-keys/[id]/page.tsx` fetches `adminApiKey.get` and uses the same detail component in `mode="page"`.

## Task 8: E2E Fixtures

**Files:**
- Modify: `e2e/helpers/db.ts`

- [ ] **Step 1: Add API key fixture helpers**

Add helpers that insert masked/key-hash test records directly into `system_apikey`; do not need valid plaintext keys for UI tests.

```ts
export const createApiKeyFixture = async ({
  configId = "user",
  enabled = true,
  expiresAt,
  name,
  referenceId,
  scopes = ["user:read"]
}: {
  configId?: "user" | "organization"
  enabled?: boolean
  expiresAt?: Date
  name: string
  referenceId: string
  scopes?: string[]
}) => {
  const sql = createE2eSql()
  const id = `api-key-${randomUUID()}`

  try {
    await sql`
      insert into "system_apikey" ("id", "config_id", "name", "start", "reference_id", "prefix", "key", "enabled", "expires_at", "permissions", "created_at", "updated_at")
      values (${id}, ${configId}, ${name}, 'lev_live_test', ${referenceId}, 'lev_live', ${`hash-${id}`}, ${enabled}, ${expiresAt ?? null}, ${scopes.join(",")}, now(), now())
    `
    return { id, name }
  } finally {
    await sql.end()
  }
}
```

- [ ] **Step 2: Add usage log fixture**

Insert into `system_api_key_usage_log` with paths, status codes, country, user agent summary, and failure reason.

## Task 9: E2E Tests

**Files:**
- Create: `e2e/specs/14-dashboard-admin-api-keys.spec.ts`
- Create: `e2e/specs/16-dashboard-settings-api-keys.spec.ts`

- [ ] **Step 1: Write spec 16 tests**

Cover:
- Anonymous redirect to `/sign-in?redirectTo=%2Fdashboard%2Fsettings%2Fapi-keys`.
- Authenticated user sees sidebar API Keys link and only their own key.
- Desktop row click opens Sheet, shows skeleton under delayed tRPC route, and “完整详情页” link.
- Mobile key card navigates to `/dashboard/settings/api-keys/[id]`.
- Create dialog shows plaintext result once above table.

- [ ] **Step 2: Write spec 14 tests**

Cover:
- Non-admin receives forbidden/admin error.
- Admin sees platform stats and can search by user/org/key name.
- Desktop row click opens Sheet with risk reason and logs.
- Row actions include owner/log/disable-delete behavior.
- Full detail page opens directly.

- [ ] **Step 3: Run targeted tests**

Run:

```bash
pnpm test:e2e -- e2e/specs/16-dashboard-settings-api-keys.spec.ts --project=chromium
pnpm test:e2e -- e2e/specs/14-dashboard-admin-api-keys.spec.ts --project=chromium
```

Expected: both specs pass. Docker/Testcontainers must be running.

## Task 10: Final Verification

**Files:**
- All touched files.

- [ ] **Step 1: Run typecheck**

```bash
pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 2: Run Biome**

```bash
pnpm check
```

Expected: exit 0.

- [ ] **Step 3: Run build**

```bash
pnpm build
```

Expected: exit 0.

- [ ] **Step 4: Run relevant E2E**

```bash
pnpm test:e2e -- e2e/specs/14-dashboard-admin-api-keys.spec.ts e2e/specs/16-dashboard-settings-api-keys.spec.ts --project=chromium
```

Expected: exit 0. If Docker is unavailable, record the exact Docker/Testcontainers error.

## Self-Review

- Spec coverage: Covers personal and admin API Key routes, shadcn Sheet detail, standalone detail pages, one-time plaintext display, logs, risk, sidebar entries, server authorization, and E2E spec-to-PRD alignment.
- Placeholder scan: No implementation step relies on “TBD”, “TODO”, or unspecified behavior.
- Type consistency: Router names are `apiKey` for personal and `adminApiKey` for platform admin, matching proposed `RouterOutputs` usage and avoiding conflict with Better Auth client naming.
- PRD conflict check: The plan does not add admin “create API Key for another user” because PRD 14 explicitly excludes that from v1.
