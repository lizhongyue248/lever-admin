# API Key V1 Role-Based Auth Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the existing API Key implementation with PRD v1: API Keys are identity credentials only, while route/interface layers enforce platform role, organization role, and resource ownership.

**Architecture:** Keep the existing Better Auth API Key plugin, Drizzle schema, tRPC routers, shadcn Sheet detail flows, and E2E structure. Remove API Key-level scope/permission input, output, table/detail display, and high-permission risk rules from product code; keep `system_apikey.permissions` in the database as an unused Better Auth-owned field.

**Tech Stack:** Next.js 16 App Router, React 19, tRPC 11, Drizzle ORM, PostgreSQL, Better Auth API Key plugin, shadcn/ui, Zod, Playwright E2E, Biome.

---

## File Structure

- Modify: `src/server/api/lib/api-key.ts`
  - Remove `parseScopes`, permission parsing schema, scope normalization, and high-permission risk logic.
  - Change `buildApiKeyRisk` to use expiry, stale usage, and failure rate only for v1.
- Modify: `src/server/api/routers/api-key.ts`
  - Remove scope metadata parsing, `permissionsFromScopes`, `getScopes`, `permissions` selection dependency in item mapping, and `scopes` from `createMine` input/output.
  - Create API Keys with metadata `{ note }` only and omit Better Auth `permissions`.
- Modify: `src/server/api/routers/admin-api-key.ts`
  - Remove scope metadata parsing, `getScopes`, and `scopes` from list/detail output.
  - Remove `permissions` from admin safe row types when it is no longer used.
- Modify: `src/app/dashboard/settings/api-keys/_components/api-key-dialogs.tsx`
  - Remove scope state, parser, schema field, `Textarea` labelled `权限范围`, and hint text.
  - Keep the create form as name, valid days, and note, matching the updated Pencil/PRD.
- Modify: `src/app/dashboard/settings/api-keys/_components/personal-api-keys-content.tsx`
  - Remove the `权限范围` table column and `item.scopes` rendering.
- Modify: `src/app/dashboard/settings/api-keys/_components/api-key-detail-content.tsx`
  - Remove `scopeLabel` and the `权限范围` info tile.
- Modify: `src/app/dashboard/admin/api-keys/_components/admin-api-keys-content.tsx`
  - Remove the `权限范围` table column and `item.scopes` rendering.
- Modify: `src/app/dashboard/admin/api-keys/_components/admin-api-key-detail-content.tsx`
  - Remove `scopeLabel` and the `权限范围` info tile.
- Modify: `e2e/helpers/db.ts`
  - Remove `permissionsFromScopes` and `scopes` fixture options.
  - Insert `{}` into `system_apikey.permissions` for compatibility, without treating it as authorization data.
- Modify: `e2e/specs/14-dashboard-admin-api-keys.spec.ts`
  - Remove fixture `scopes` inputs.
  - Add assertions that platform list/detail do not show `权限范围`.
  - Use role/resource failure reasons in log fixtures.
- Modify: `e2e/specs/16-dashboard-settings-api-keys.spec.ts`
  - Remove fixture `scopes` inputs.
  - Add assertions that personal list/detail/create dialog do not show `权限范围`.
  - Create API Key without filling a permissions field.
- Optional modify only if implementation differs from current PRD:
  - `prd/14-dashboard-admin-api-keys.md`
  - `prd/16-dashboard-settings-api-keys.md`

## Task 1: Write Failing E2E Assertions For PRD V1

**Files:**
- Modify: `e2e/specs/16-dashboard-settings-api-keys.spec.ts`
- Modify: `e2e/specs/14-dashboard-admin-api-keys.spec.ts`

- [ ] **Step 1: Update personal API Key tests to reject scope UI**

In `e2e/specs/16-dashboard-settings-api-keys.spec.ts`, remove all `scopes` fixture options and replace the create test form fill:

```ts
await page.getByLabel("API Key 名称").fill("Created Plaintext Key")
await page.getByLabel("有效天数").fill("30")
await expect(page.getByLabel("权限范围")).toHaveCount(0)
await page.getByLabel("备注").fill("Created by E2E")
await page.getByRole("button", { name: "创建", exact: true }).click()
```

Add these assertions after the personal list is visible in the “only current user's keys” test:

```ts
await expect(page.getByRole("columnheader", { name: "权限范围" })).toHaveCount(0)
await expect(page.getByTestId(`api-key-row-${ownKey.id}`).getByText("未声明")).toHaveCount(0)
```

Add this assertion after the personal detail sheet is visible:

```ts
await expect(page.getByTestId("api-key-detail-sheet").getByText("权限范围")).toHaveCount(0)
```

- [ ] **Step 2: Update platform API Key tests to reject scope UI**

In `e2e/specs/14-dashboard-admin-api-keys.spec.ts`, remove every `scopes: [...]` fixture option.

Add this assertion after the platform table is visible:

```ts
await expect(page.getByRole("columnheader", { name: "权限范围" })).toHaveCount(0)
```

In the desktop detail sheet test, change the usage log failure reason to a role/resource reason:

```ts
await createApiKeyUsageLogFixture({
  apiKeyId: key.id,
  failureReason: "role_forbidden",
  path: "/v1/admin/risky",
  referenceId: targetUser.id,
  statusCode: 403,
  success: false,
  userAgentSummary: "Risk E2E client"
})
```

Add this assertion after the platform detail sheet is visible:

```ts
await expect(page.getByTestId("admin-api-key-detail-sheet").getByText("权限范围")).toHaveCount(0)
```

- [ ] **Step 3: Run targeted E2E and confirm RED**

Run:

```bash
pnpm test:e2e -- e2e/specs/16-dashboard-settings-api-keys.spec.ts e2e/specs/14-dashboard-admin-api-keys.spec.ts --project=chromium
```

Expected now: FAIL because the current UI still renders the `权限范围` create field, table column, and detail tile. If Docker/Testcontainers is unavailable, record that exact error and continue with typecheck-driven implementation.

## Task 2: Remove Scope-Based Risk Logic

**Files:**
- Modify: `src/server/api/lib/api-key.ts`

- [ ] **Step 1: Remove permission parsing exports**

Delete these pieces from `src/server/api/lib/api-key.ts`:

```ts
const permissionSchema = z.record(z.string(), z.array(z.string()))
const normalizeScope = (scope: string) => scope.trim().toLowerCase()
const isNonEmptyString = (value: string) => value.length > 0
export const parseScopes = (permissions: string | null) => {
  // entire function
}
const hasHighPermissionScope = (scopes: string[]) => {
  // entire function
}
const hasLongLivedHighPermission = (scopes: string[], expiresAt: Date | null, now: Date) => {
  // entire function
}
```

- [ ] **Step 2: Change risk input type**

Replace `ApiKeyRiskInput` with:

```ts
type ApiKeyRiskInput = {
  enabled: boolean | null
  expiresAt: Date | null
  failed24h: number
  lastRequest: Date | null
  total24h: number
}
```

- [ ] **Step 3: Change risk scoring implementation**

Replace `buildApiKeyRisk` with:

```ts
export const buildApiKeyRisk = ({ expiresAt, failed24h, lastRequest, total24h }: ApiKeyRiskInput): ApiKeyRisk => {
  const now = new Date()
  const reasons: string[] = []
  const failureRate = total24h > 0 ? failed24h / total24h : 0

  if (expiresAt) {
    const daysUntilExpiry = getDaysUntil(expiresAt, now)

    if (daysUntilExpiry < 0) {
      reasons.push("已过期")
    } else if (daysUntilExpiry <= expiringSoonDays) {
      reasons.push("30 天内到期")
    }
  }

  if (!lastRequest || getDaysUntil(lastRequest, now) < -staleRequestDays) {
    reasons.push("长期未使用")
  }

  const hasFailureRateReason = failureRate >= 0.1

  if (hasFailureRateReason) {
    reasons.push("近 24 小时失败率异常")
  }

  if (hasFailureRateReason) {
    return { level: "high", reasons }
  }

  if (reasons.length > 0) {
    return { level: "medium", reasons }
  }

  return { level: "low", reasons }
}
```

- [ ] **Step 4: Run typecheck and confirm expected import failures**

Run:

```bash
pnpm typecheck
```

Expected now: FAIL in `api-key.ts` and `admin-api-key.ts` because they still import/use `parseScopes` and pass `scopes` to `buildApiKeyRisk`.

## Task 3: Remove Scopes From Personal tRPC Router

**Files:**
- Modify: `src/server/api/routers/api-key.ts`

- [ ] **Step 1: Clean imports and metadata schema**

Change the API Key lib import to:

```ts
import { apiKeyStatusSchema, assertPersonalKey, buildApiKeyRisk, maskApiKey, usageResultSchema } from "@/server/api/lib/api-key"
```

Replace metadata handling with note-only parsing:

```ts
const metadataSchema = z.object({
  note: z.string().optional()
})

const parseMetadata = (metadata: string | null) => {
  if (!metadata) {
    return { note: undefined }
  }

  try {
    const result = metadataSchema.safeParse(JSON.parse(metadata))

    if (!result.success) {
      return { note: undefined }
    }

    return {
      note: result.data.note
    }
  } catch {
    return { note: undefined }
  }
}
```

Delete `permissionsFromScopes` and `getScopes`.

- [ ] **Step 2: Remove permissions from row type and select**

Remove this property from `ApiKeySafeRow` and `selectSafeApiKey`:

```ts
permissions: string | null
```

Keep `metadata` selected because note may be displayed later and Better Auth metadata remains allowed for non-auth display.

- [ ] **Step 3: Remove scopes from item mapping**

In `toSafeItem`, delete:

```ts
const scopes = getScopes({ metadata: row.metadata, permissions: row.permissions })
```

Call risk without scopes:

```ts
const risk = buildApiKeyRisk({
  enabled,
  expiresAt: row.expiresAt,
  failed24h: usageSummary.failed24h,
  lastRequest: row.lastRequest,
  total24h: usageSummary.total24h
})
```

Remove `scopes` from the returned item object.

- [ ] **Step 4: Remove scopes from create input and Better Auth body**

Change `createMine` input to:

```ts
z.object({
  expiresInDays: z.number().int().min(1).max(365).default(90),
  name: z.string().min(1).max(80),
  note: z.string().max(200).optional()
})
```

Change the `auth.api.createApiKey` body to:

```ts
body: {
  configId: "user",
  expiresIn: input.expiresInDays * secondsPerDay,
  metadata: {
    note: input.note
  },
  name: input.name,
  prefix: "lev_live",
  userId: ctx.session.user.id
}
```

When converting the created key to a safe item, remove:

```ts
permissions: JSON.stringify(created.permissions),
```

- [ ] **Step 5: Run typecheck and confirm UI type failures remain**

Run:

```bash
pnpm typecheck
```

Expected now: FAIL in UI components and admin router because `scopes` has been removed from personal router output but consumers still reference it.

## Task 4: Remove Scopes From Platform Admin tRPC Router

**Files:**
- Modify: `src/server/api/routers/admin-api-key.ts`

- [ ] **Step 1: Clean imports and metadata schema**

Change the API Key lib import to:

```ts
import { apiKeyStatusSchema, assertCanMutatePlatformApiKey, buildApiKeyRisk, maskApiKey, usageResultSchema } from "@/server/api/lib/api-key"
```

Replace metadata parsing with:

```ts
const metadataSchema = z.object({
  note: z.string().optional()
})

const parseMetadata = (metadata: string | null) => {
  if (!metadata) {
    return { note: undefined }
  }

  try {
    const result = metadataSchema.safeParse(JSON.parse(metadata))

    if (!result.success) {
      return { note: undefined }
    }

    return {
      note: result.data.note
    }
  } catch {
    return { note: undefined }
  }
}
```

Delete `getScopes`.

- [ ] **Step 2: Remove permissions from safe row shape**

Remove this property from `ApiKeySafeRow` and `selectAdminSafeApiKey`:

```ts
permissions: string | null
```

- [ ] **Step 3: Remove scopes from item mapping**

In `toSafeItem`, delete:

```ts
const scopes = getScopes({ metadata: row.metadata, permissions: row.permissions })
```

Call risk without scopes:

```ts
const risk = buildApiKeyRisk({
  enabled,
  expiresAt: row.expiresAt,
  failed24h: usageSummary.failed24h,
  lastRequest: row.lastRequest,
  total24h: usageSummary.total24h
})
```

Remove `scopes` from the returned object.

- [ ] **Step 4: Run typecheck and confirm only UI/test-helper references remain**

Run:

```bash
pnpm typecheck
```

Expected now: FAIL only where `item.scopes`, `apiKey.scopes`, or `scopes` fixture options are still referenced.

## Task 5: Remove Scope UI From Personal API Key Pages

**Files:**
- Modify: `src/app/dashboard/settings/api-keys/_components/api-key-dialogs.tsx`
- Modify: `src/app/dashboard/settings/api-keys/_components/personal-api-keys-content.tsx`
- Modify: `src/app/dashboard/settings/api-keys/_components/api-key-detail-content.tsx`

- [ ] **Step 1: Simplify create dialog validation**

In `api-key-dialogs.tsx`, remove `useMemo` from the React import and remove `Textarea` if note remains the only textarea import path still uses it. Keep `Textarea` only for remarks.

Replace `createSchema` with:

```ts
const createSchema = z.object({
  expiresInDays: z.coerce.number().int().min(1).max(365),
  name: z.string().trim().min(1).max(80),
  note: z.string().trim().max(200).optional()
})
```

Delete:

```ts
const defaultScopes = "read:profile, read:organization"
const parseScopes = (value: string) => ...
const [scopes, setScopes] = useState(defaultScopes)
const parsedScopes = useMemo(() => parseScopes(scopes), [scopes])
setScopes(defaultScopes)
```

Submit only:

```ts
const parsed = createSchema.safeParse({
  expiresInDays,
  name,
  note: note.trim() || undefined
})
```

- [ ] **Step 2: Remove the permissions field from create dialog markup**

Delete the scope textarea and hint:

```tsx
<Textarea aria-label="权限范围" ... />
<p className="text-muted-foreground text-xs">权限范围可用逗号或换行分隔，至少填写一项。</p>
```

Keep:

```tsx
<Input aria-label="API Key 名称" onChange={(event) => setName(event.target.value)} placeholder="Production CLI" value={name} />
<Input aria-label="有效天数" inputMode="numeric" onChange={(event) => setExpiresInDays(event.target.value)} placeholder="90" value={expiresInDays} />
<Textarea aria-label="备注" onChange={(event) => setNote(event.target.value)} placeholder="可选备注，最多 200 字" value={note} />
```

- [ ] **Step 3: Remove personal table permissions column**

In `personal-api-keys-content.tsx`, remove:

```tsx
<TableHead>权限范围</TableHead>
<TableCell className="max-w-[220px] truncate">{item.scopes.length > 0 ? item.scopes.join(", ") : "未声明"}</TableCell>
```

Keep columns:

```tsx
<TableHead className="px-4">名称</TableHead>
<TableHead>创建时间</TableHead>
<TableHead>过期时间</TableHead>
<TableHead>最后使用</TableHead>
<TableHead>状态</TableHead>
<TableHead className="text-right">操作</TableHead>
```

- [ ] **Step 4: Remove personal detail permissions tile**

In `api-key-detail-content.tsx`, delete:

```ts
const scopeLabel = (scopes: string[]) => (scopes.length > 0 ? scopes.join(", ") : "未声明")
```

Delete:

```tsx
<Info label="权限范围" value={scopeLabel(apiKey.scopes)} />
```

- [ ] **Step 5: Run typecheck and confirm platform UI references remain**

Run:

```bash
pnpm typecheck
```

Expected now: FAIL only in platform admin UI and E2E helper/specs if personal UI is clean.

## Task 6: Remove Scope UI From Platform Admin API Key Pages

**Files:**
- Modify: `src/app/dashboard/admin/api-keys/_components/admin-api-keys-content.tsx`
- Modify: `src/app/dashboard/admin/api-keys/_components/admin-api-key-detail-content.tsx`

- [ ] **Step 1: Remove platform table permissions column**

In `admin-api-keys-content.tsx`, remove:

```tsx
<TableHead>权限范围</TableHead>
<TableCell className="max-w-[220px] truncate">{item.scopes.length > 0 ? item.scopes.join(", ") : "未声明"}</TableCell>
```

Keep columns:

```tsx
<TableHead className="px-4">名称</TableHead>
<TableHead>所属主体</TableHead>
<TableHead>过期时间</TableHead>
<TableHead>最后使用</TableHead>
<TableHead>状态</TableHead>
<TableHead className="text-right">操作</TableHead>
```

- [ ] **Step 2: Remove platform detail permissions tile**

In `admin-api-key-detail-content.tsx`, delete:

```ts
const scopeLabel = (scopes: string[]) => (scopes.length > 0 ? scopes.join(", ") : "未声明")
```

Delete:

```tsx
<Info label="权限范围" value={scopeLabel(apiKey.scopes)} />
```

- [ ] **Step 3: Run typecheck and confirm only E2E helper/spec references remain**

Run:

```bash
pnpm typecheck
```

Expected now: FAIL only in `e2e/helpers/db.ts` and the two API Key E2E specs if production code is clean.

## Task 7: Update E2E Fixtures And Finish Tests

**Files:**
- Modify: `e2e/helpers/db.ts`
- Modify: `e2e/specs/14-dashboard-admin-api-keys.spec.ts`
- Modify: `e2e/specs/16-dashboard-settings-api-keys.spec.ts`

- [ ] **Step 1: Simplify API Key fixture**

In `e2e/helpers/db.ts`, delete `permissionsFromScopes`.

Change `createApiKeyFixture` signature to:

```ts
export const createApiKeyFixture = async ({
  configId = "user",
  enabled = true,
  expiresAt,
  name,
  referenceId
}: {
  configId?: "user" | "organization"
  enabled?: boolean
  expiresAt?: Date
  name: string
  referenceId: string
}) => {
```

Change the insert value for `permissions` to an empty object string:

```ts
values (${id}, ${configId}, ${name}, ${prefix}, ${referenceId}, ${prefix}, ${`hash-${id}`}, ${enabled}, ${expiresAt ?? null}, ${JSON.stringify({})}, now(), now())
```

- [ ] **Step 2: Remove obsolete scope fixture options from specs**

Delete every object property like:

```ts
scopes: ["user:read"]
scopes: ["organization:read"]
scopes: ["admin:write"]
scopes: ["user:read", "token:write"]
```

- [ ] **Step 3: Run targeted E2E and confirm GREEN**

Run:

```bash
pnpm test:e2e -- e2e/specs/16-dashboard-settings-api-keys.spec.ts e2e/specs/14-dashboard-admin-api-keys.spec.ts --project=chromium
```

Expected: PASS. If Docker/Testcontainers is unavailable, record the exact failure and still run `pnpm typecheck` and `pnpm check`.

## Task 8: Regression Search And PRD Consistency Check

**Files:**
- Search only unless a conflict is found.
- Modify PRDs only if implementation intentionally differs from current PRD.

- [ ] **Step 1: Search for forbidden product scope remnants**

Run:

```bash
rg -n "scope|scopes|权限范围|高权限长期有效|parseScopes|permissionsFromScopes|调用身份" src e2e prd --glob "!prd/dashboard-api-key-design.pen"
```

Expected allowed matches:

```text
src/server/db/schema.ts: OAuth/account scope column may remain if unrelated to API Key.
src/server/db/schema.ts: system_apikey.permissions column may remain because Better Auth owns the schema.
prd/14-dashboard-admin-api-keys.md and prd/16-dashboard-settings-api-keys.md may mention scope only to state v1 does not support it.
```

Expected disallowed matches:

```text
src/server/api/routers/api-key.ts: scope parsing, create input, or item output
src/server/api/routers/admin-api-key.ts: scope parsing or item output
src/server/api/lib/api-key.ts: high-permission risk logic
src/app/dashboard/**/api-keys/**: visible 权限范围 or 调用身份 columns/tiles
e2e/specs/**api-keys**: filling 权限范围 or passing scopes fixture options
```

- [ ] **Step 2: Verify PRD consistency**

Open:

```bash
Get-Content -Path 'prd/14-dashboard-admin-api-keys.md'
Get-Content -Path 'prd/16-dashboard-settings-api-keys.md'
```

Confirm these implementation facts match the PRDs:

```text
API Key create form has name, expiry, note only.
Personal and platform pages do not display API Key permissions/scope.
Risk is based on expiry, stale usage, interface-layer failures, owner anomalies, rate limit/usage anomalies as data becomes available.
Better Auth permissions is not used as product authorization source.
```

If the implementation changes any of those facts, update the relevant PRD in the same session before final verification.

## Task 9: Final Verification

**Files:**
- All touched files.

- [ ] **Step 1: Run TypeScript validation**

Run:

```bash
pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 2: Run Biome**

Run:

```bash
pnpm check
```

Expected: exit 0.

- [ ] **Step 3: Run production build**

Run:

```bash
pnpm build
```

Expected: exit 0.

- [ ] **Step 4: Run relevant E2E**

Run:

```bash
pnpm test:e2e -- e2e/specs/14-dashboard-admin-api-keys.spec.ts e2e/specs/16-dashboard-settings-api-keys.spec.ts --project=chromium
```

Expected: exit 0. If Docker/Testcontainers is unavailable, report the exact reason and the checks that did run.

## Self-Review

- Spec coverage: The plan maps to PRD 14 and PRD 16 v1 API Key behavior: no API Key permissions UI, no scope create input, no permission-driven risk, no full key exposure, personal ownership enforced, platform admin governance preserved, shadcn Sheet detail preserved, and usage logs preserved.
- Placeholder scan: Each code-changing step names exact files and concrete snippets to add/remove; no deferred filler instructions remain.
- Type consistency: `buildApiKeyRisk` no longer accepts `scopes`, `apiKey.createMine` no longer accepts `scopes`, and RouterOutputs consumers no longer read `apiKey.scopes` or `item.scopes`.
- PRD conflict check: No database migration is planned because the PRDs allow the Better Auth `permissions` column to remain unused; removing the column would conflict with Better Auth schema ownership.
