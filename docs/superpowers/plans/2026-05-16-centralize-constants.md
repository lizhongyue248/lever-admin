# Centralize Constants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move cross-page and cross-server business constants into `src/lib/const.ts` while leaving page-local display details close to their components.

**Architecture:** `src/lib/const.ts` remains the shared product contract for roles, statuses, filters, pagination, providers, routes, and behavior thresholds. Server routers, shared components, and page components import these constants instead of repeating string literals and magic numbers. Purely local UI labels, icon maps, table column widths, skeleton keys, and chart-only config stay local.

**Tech Stack:** Next.js 16 App Router, TypeScript strict mode, tRPC, Zod, Drizzle, React, Biome.

---

## File Structure

- Modify: `src/lib/const.ts`
  - Add shared constants and derived union types for filters, pagination, statuses, API Key, request logs, email provider settings, OAuth providers, and core routes.
- Modify: `src/components/data-pagination.tsx`
  - Use shared page size options.
- Modify: public auth and route files that repeat core route constants:
  - `src/app/page.tsx`
  - `src/app/(auth)/sign-in/_components/sign-in-form.tsx`
  - `src/app/(auth)/sign-up/_components/sign-up-form.tsx`
  - `src/app/(auth)/reset-password/_components/reset-password-form.tsx`
  - `src/app/app/_components/sign-out-button.tsx`
  - `src/app/invite/[id]/_components/invitation-confirmation-card.tsx`
- Modify: API Key shared code and pages:
  - `src/server/api/lib/api-key.ts`
  - `src/server/api/lib/api-key-usage-stats.ts`
  - `src/server/api/routers/api-key.ts`
  - `src/server/api/routers/admin-api-key.ts`
  - `src/app/dashboard/settings/api-keys/page.tsx`
  - `src/app/dashboard/settings/api-keys/_components/personal-api-keys-content.tsx`
  - `src/app/dashboard/settings/api-keys/_components/api-key-status.tsx`
  - `src/app/dashboard/admin/api-keys/page.tsx`
  - `src/app/dashboard/admin/api-keys/_components/admin-api-keys-content.tsx`
  - `src/app/dashboard/admin/api-keys/_components/admin-api-key-detail-content.tsx`
- Modify: request log server and UI:
  - `src/server/api/routers/admin-request-log.ts`
  - `src/server/service/request-logs/request-log-risk.ts`
  - `src/server/service/request-logs/request-log-sanitizer.ts`
  - `src/server/service/request-logs/record-request-log.ts`
  - `src/app/dashboard/admin/request-logs/page.tsx`
  - `src/app/dashboard/admin/request-logs/_components/request-log-labels.ts`
  - `src/app/dashboard/admin/request-logs/_components/request-log-toolbar.tsx`
  - `src/app/dashboard/admin/request-logs/_components/request-logs-content.tsx`
  - `src/app/dashboard/admin/request-logs/_components/request-logs-table.tsx`
- Modify: platform settings and email provider code:
  - `src/server/service/platform-settings/email-settings.ts`
  - `src/server/service/email/email-service.ts`
  - `src/server/api/routers/admin-platform-setting.ts`
  - `src/app/dashboard/admin/settings/_components/email-settings-card.tsx`
- Modify: user, organization, invitation, notification status usage:
  - `src/server/api/lib/invitations.ts`
  - `src/server/api/routers/admin-user.ts`
  - `src/server/api/routers/admin-org.ts`
  - `src/server/api/routers/org.ts`
  - `src/server/api/routers/notification.ts`
  - `src/app/dashboard/_components/dashboard-notification-menu.tsx`
  - `src/app/dashboard/admin/orgs/_components/admin-orgs-content.tsx`
  - `src/app/dashboard/admin/users/_components/admin-users-content.tsx`
  - `src/app/dashboard/orgs/[slug]/_components/org-invite-content.tsx`
- Modify: OAuth and security/session risk:
  - `src/server/api/lib/oauth-providers.ts`
  - `src/server/api/lib/session-risk.ts`
  - `src/server/api/routers/security.ts`
  - `src/app/(auth)/_components/oauth-buttons.tsx`
  - `src/app/dashboard/settings/security/_components/oauth-accounts-card.tsx`
- Verify: no PRD changes required because this is an internal refactor with no user-visible behavior, layout, route, interaction, or API behavior change.

---

### Task 1: Expand `src/lib/const.ts`

**Files:**
- Modify: `src/lib/const.ts`

- [ ] **Step 1: Add shared filter, pagination, status, provider, route, and threshold constants**

Append these constants after the existing role constants. Keep the existing role exports unchanged.

```ts
export const FILTER_ALL = "all"

export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 10
export const DENSE_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 50
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

export const USER_STATUS_ACTIVE = "active"
export const USER_STATUS_BANNED = "banned"
export const USER_STATUS_FILTERS = [FILTER_ALL, USER_STATUS_ACTIVE, USER_STATUS_BANNED] as const
export type UserStatusFilter = (typeof USER_STATUS_FILTERS)[number]

export const ORGANIZATION_STATUS_ACTIVE = "active"
export const ORGANIZATION_STATUS_DISABLED = "disabled"
export const ORGANIZATION_STATUS_FILTERS = [FILTER_ALL, ORGANIZATION_STATUS_ACTIVE, ORGANIZATION_STATUS_DISABLED] as const
export type OrganizationStatusFilter = (typeof ORGANIZATION_STATUS_FILTERS)[number]

export const INVITATION_STATUS_PENDING = "pending"
export const INVITATION_STATUS_ACCEPTED = "accepted"
export const INVITATION_STATUS_REJECTED = "rejected"
export const INVITATION_STATUS_EXPIRED = "expired"
export const INVITATION_STATUS_CANCELED = "canceled"
export const INVITATION_STATUSES = [
  INVITATION_STATUS_ACCEPTED,
  INVITATION_STATUS_CANCELED,
  INVITATION_STATUS_EXPIRED,
  INVITATION_STATUS_PENDING,
  INVITATION_STATUS_REJECTED
] as const
export type InvitationStatus = (typeof INVITATION_STATUSES)[number]

export const NOTIFICATION_TYPE_INVITATION = "invitation"
export const NOTIFICATION_TYPE_SECURITY = "security"
export const NOTIFICATION_TYPE_SYSTEM = "system"
export const NOTIFICATION_TYPE_FILTERS = [FILTER_ALL, NOTIFICATION_TYPE_INVITATION, NOTIFICATION_TYPE_SECURITY, NOTIFICATION_TYPE_SYSTEM] as const
export type NotificationTypeFilter = (typeof NOTIFICATION_TYPE_FILTERS)[number]

export const API_KEY_STATUS_ENABLED = "enabled"
export const API_KEY_STATUS_DISABLED = "disabled"
export const API_KEY_STATUS_EXPIRING = "expiring"
export const API_KEY_STATUS_EXPIRED = "expired"
export const API_KEY_STATUS_RISKY = "risky"
export const API_KEY_STATUS_FILTERS = [FILTER_ALL, API_KEY_STATUS_ENABLED, API_KEY_STATUS_DISABLED, API_KEY_STATUS_EXPIRING, API_KEY_STATUS_RISKY] as const
export type ApiKeyStatusFilter = (typeof API_KEY_STATUS_FILTERS)[number]

export const API_KEY_OWNER_USER = "user"
export const API_KEY_OWNER_ORGANIZATION = "organization"
export const API_KEY_OWNER_TYPES = [API_KEY_OWNER_USER, API_KEY_OWNER_ORGANIZATION] as const
export type ApiKeyOwnerType = (typeof API_KEY_OWNER_TYPES)[number]

export const RISK_LEVEL_LOW = "low"
export const RISK_LEVEL_MEDIUM = "medium"
export const RISK_LEVEL_HIGH = "high"
export const RISK_LEVELS = [RISK_LEVEL_LOW, RISK_LEVEL_MEDIUM, RISK_LEVEL_HIGH] as const
export type RiskLevel = (typeof RISK_LEVELS)[number]

export const SESSION_RISK_NORMAL = "normal"
export const SESSION_RISK_RISK = "risk"
export const SESSION_RISK_LEVELS = [SESSION_RISK_NORMAL, SESSION_RISK_RISK] as const
export type SessionRiskLevel = (typeof SESSION_RISK_LEVELS)[number]

export const API_KEY_EXPIRING_SOON_DAYS = 30
export const API_KEY_STALE_REQUEST_DAYS = 90
export const MASKED_API_KEY_VISIBLE_LENGTH = 12
export const API_KEY_USAGE_RECENT_DAYS = 7

export const REQUEST_LOG_SOURCE_API_KEY = "api_key"
export const REQUEST_LOG_SOURCE_AUTH = "auth"
export const REQUEST_LOG_SOURCE_DASHBOARD = "dashboard"
export const REQUEST_LOG_SOURCE_ROUTE_HANDLER = "route_handler"
export const REQUEST_LOG_SOURCE_SYSTEM = "system"
export const REQUEST_LOG_SOURCE_TRPC = "trpc"
export const REQUEST_LOG_SOURCE_FILTERS = [
  FILTER_ALL,
  REQUEST_LOG_SOURCE_API_KEY,
  REQUEST_LOG_SOURCE_AUTH,
  REQUEST_LOG_SOURCE_DASHBOARD,
  REQUEST_LOG_SOURCE_ROUTE_HANDLER,
  REQUEST_LOG_SOURCE_SYSTEM,
  REQUEST_LOG_SOURCE_TRPC
] as const
export type RequestLogSourceFilter = (typeof REQUEST_LOG_SOURCE_FILTERS)[number]
export type RequestLogSource = Exclude<RequestLogSourceFilter, typeof FILTER_ALL>

export const REQUEST_LOG_METHOD_DELETE = "DELETE"
export const REQUEST_LOG_METHOD_GET = "GET"
export const REQUEST_LOG_METHOD_PATCH = "PATCH"
export const REQUEST_LOG_METHOD_POST = "POST"
export const REQUEST_LOG_METHOD_PUT = "PUT"
export const REQUEST_LOG_METHOD_FILTERS = [
  FILTER_ALL,
  REQUEST_LOG_METHOD_DELETE,
  REQUEST_LOG_METHOD_GET,
  REQUEST_LOG_METHOD_PATCH,
  REQUEST_LOG_METHOD_POST,
  REQUEST_LOG_METHOD_PUT
] as const
export type RequestLogMethodFilter = (typeof REQUEST_LOG_METHOD_FILTERS)[number]

export const REQUEST_LOG_RESULT_FAILED = "failed"
export const REQUEST_LOG_RESULT_SUCCESS = "success"
export const REQUEST_LOG_RESULT_FILTERS = [FILTER_ALL, REQUEST_LOG_RESULT_FAILED, REQUEST_LOG_RESULT_SUCCESS] as const
export type RequestLogResultFilter = (typeof REQUEST_LOG_RESULT_FILTERS)[number]

export const REQUEST_LOG_RISK_FILTERS = [FILTER_ALL, RISK_LEVEL_HIGH, RISK_LEVEL_LOW, RISK_LEVEL_MEDIUM] as const
export type RequestLogRiskFilter = (typeof REQUEST_LOG_RISK_FILTERS)[number]

export const REQUEST_LOG_TIME_RANGE_1H = "1h"
export const REQUEST_LOG_TIME_RANGE_24H = "24h"
export const REQUEST_LOG_TIME_RANGE_7D = "7d"
export const REQUEST_LOG_TIME_RANGE_30D = "30d"
export const REQUEST_LOG_TIME_RANGE_FILTERS = [
  REQUEST_LOG_TIME_RANGE_1H,
  REQUEST_LOG_TIME_RANGE_24H,
  REQUEST_LOG_TIME_RANGE_7D,
  REQUEST_LOG_TIME_RANGE_30D,
  FILTER_ALL
] as const
export type RequestLogTimeRangeFilter = (typeof REQUEST_LOG_TIME_RANGE_FILTERS)[number]

export const REQUEST_LOG_DEFAULT_TIME_RANGE = REQUEST_LOG_TIME_RANGE_24H
export const REQUEST_LOG_SLOW_MS = 2000
export const REQUEST_LOG_HIGH_RISK_SLOW_MS = 10_000
export const REQUEST_LOG_EXPORT_LIMIT = 10_000
export const REQUEST_LOG_EXPORT_QUERY_LIMIT = REQUEST_LOG_EXPORT_LIMIT + 1
export const REQUEST_LOG_MAX_BODY_BYTES = 16 * 1024
export const REQUEST_LOG_REDACTED_VALUE = "[REDACTED]"

export const EMAIL_PROVIDER_CONSOLE = "console"
export const EMAIL_PROVIDER_RESEND = "resend"
export const EMAIL_PROVIDER_SMTP = "smtp"
export const EMAIL_PROVIDERS = [EMAIL_PROVIDER_CONSOLE, EMAIL_PROVIDER_RESEND, EMAIL_PROVIDER_SMTP] as const
export type EmailProviderName = (typeof EMAIL_PROVIDERS)[number]

export const EMAIL_SETTING_KEY_FROM = "email.from"
export const EMAIL_SETTING_KEY_PROVIDER = "email.provider"
export const EMAIL_SETTING_KEY_RESEND_API_KEY = "email.resend.apiKey"
export const EMAIL_SETTING_KEY_SMTP_HOST = "email.smtp.host"
export const EMAIL_SETTING_KEY_SMTP_PASSWORD = "email.smtp.password"
export const EMAIL_SETTING_KEY_SMTP_PORT = "email.smtp.port"
export const EMAIL_SETTING_KEY_SMTP_SECURE = "email.smtp.secure"
export const EMAIL_SETTING_KEY_SMTP_USER = "email.smtp.user"
export const EMAIL_SETTING_KEYS = [
  EMAIL_SETTING_KEY_FROM,
  EMAIL_SETTING_KEY_PROVIDER,
  EMAIL_SETTING_KEY_RESEND_API_KEY,
  EMAIL_SETTING_KEY_SMTP_HOST,
  EMAIL_SETTING_KEY_SMTP_PASSWORD,
  EMAIL_SETTING_KEY_SMTP_PORT,
  EMAIL_SETTING_KEY_SMTP_SECURE,
  EMAIL_SETTING_KEY_SMTP_USER
] as const
export const EMAIL_SETTING_SENSITIVE_KEYS = [EMAIL_SETTING_KEY_RESEND_API_KEY, EMAIL_SETTING_KEY_SMTP_PASSWORD] as const

export const OAUTH_PROVIDER_GITHUB = "github"
export const OAUTH_PROVIDER_GOOGLE = "google"
export const OAUTH_PROVIDERS = [OAUTH_PROVIDER_GITHUB, OAUTH_PROVIDER_GOOGLE] as const
export type OAuthProviderId = (typeof OAUTH_PROVIDERS)[number]

export const ROUTE_SIGN_IN = "/sign-in"
export const ROUTE_SIGN_UP = "/sign-up"
export const ROUTE_DASHBOARD = "/dashboard"
export const ROUTE_VERIFY_EMAIL = "/verify-email"
export const ROUTE_DASHBOARD_ADMIN_USERS = "/dashboard/admin/users"
export const ROUTE_DASHBOARD_ADMIN_ORGS = "/dashboard/admin/orgs"
export const ROUTE_DASHBOARD_ADMIN_API_KEYS = "/dashboard/admin/api-keys"
export const ROUTE_DASHBOARD_ADMIN_REQUEST_LOGS = "/dashboard/admin/request-logs"
export const ROUTE_DASHBOARD_ADMIN_SETTINGS = "/dashboard/admin/settings"
export const ROUTE_DASHBOARD_SETTINGS_PROFILE = "/dashboard/settings/profile"
export const ROUTE_DASHBOARD_SETTINGS_SECURITY = "/dashboard/settings/security"
export const ROUTE_DASHBOARD_SETTINGS_SESSIONS = "/dashboard/settings/sessions"
export const ROUTE_DASHBOARD_SETTINGS_API_KEYS = "/dashboard/settings/api-keys"

export const getEmailVerificationPendingRoute = (email?: string) => {
  const params = new URLSearchParams({ status: INVITATION_STATUS_PENDING })

  if (email) {
    params.set("email", email)
  }

  return `${ROUTE_VERIFY_EMAIL}?${params.toString()}`
}
```

- [ ] **Step 2: Fix semantic naming before use**

Change `getEmailVerificationPendingRoute` to use a verification-specific status constant, not invitation status:

```ts
export const EMAIL_VERIFICATION_STATUS_PENDING = "pending"
export const EMAIL_VERIFICATION_STATUS_SUCCESS = "success"
export const EMAIL_VERIFICATION_STATUS_FAILED = "failed"

export const getEmailVerificationPendingRoute = (email?: string) => {
  const params = new URLSearchParams({ status: EMAIL_VERIFICATION_STATUS_PENDING })

  if (email) {
    params.set("email", email)
  }

  return `${ROUTE_VERIFY_EMAIL}?${params.toString()}`
}
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: pass. If it fails because an exported type name conflicts with a local type, rename the local type or import the central type explicitly.

---

### Task 2: Replace Pagination Constants

**Files:**
- Modify: `src/components/data-pagination.tsx`
- Modify: `src/app/dashboard/admin/request-logs/_components/request-logs-content.tsx`
- Modify: page and list callers using hard-coded `page: 1`, `pageSize: 10`, `pageSize: 20`

- [ ] **Step 1: Update `DataPagination` default options**

In `src/components/data-pagination.tsx`, import and use `PAGE_SIZE_OPTIONS`.

```ts
import { PAGE_SIZE_OPTIONS } from "@/lib/const"
```

Change:

```ts
pageSizeOptions = [10, 20, 50],
```

to:

```ts
pageSizeOptions = PAGE_SIZE_OPTIONS,
```

- [ ] **Step 2: Update request logs pagination**

In `src/app/dashboard/admin/request-logs/_components/request-logs-content.tsx`, replace local options.

```ts
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  FILTER_ALL,
  PAGE_SIZE_OPTIONS,
  REQUEST_LOG_DEFAULT_TIME_RANGE,
  type PageSizeOption
} from "@/lib/const"
```

Change:

```ts
const pageSizeOptions = [10, 20, 50] as const
type PageSize = (typeof pageSizeOptions)[number]
```

to:

```ts
type PageSize = PageSizeOption
```

Change state defaults:

```ts
const [page, setPage] = useState(DEFAULT_PAGE)
const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE)
const [result, setResult] = useState<ResultFilter>(FILTER_ALL)
const [risk, setRisk] = useState<RiskFilter>(FILTER_ALL)
const [source, setSource] = useState<SourceFilter>(FILTER_ALL)
const [timeRange, setTimeRange] = useState<TimeRangeFilter>(REQUEST_LOG_DEFAULT_TIME_RANGE)
```

Change pagination prop:

```tsx
pageSizeOptions={PAGE_SIZE_OPTIONS}
```

- [ ] **Step 3: Update SSR initial list calls**

Replace hard-coded first-page calls with constants. Example for `src/app/dashboard/admin/api-keys/page.tsx`:

```ts
import { DEFAULT_PAGE, DENSE_PAGE_SIZE, FILTER_ALL } from "@/lib/const"
import { api } from "@/trpc/server"

const AdminApiKeysPage = async ({ searchParams }: { searchParams: Promise<{ keyId?: string }> }) => {
  const initialKeys = await api.adminApiKey.list({ page: DEFAULT_PAGE, pageSize: DENSE_PAGE_SIZE, search: "", status: FILTER_ALL })
  const { keyId } = await searchParams

  return <AdminApiKeysContent initialKeys={initialKeys} selectedKeyId={keyId ?? null} />
}
```

Apply the same pattern to:

```txt
src/app/dashboard/admin/users/page.tsx
src/app/dashboard/settings/api-keys/page.tsx
src/app/dashboard/admin/request-logs/page.tsx
src/app/dashboard/orgs/[slug]/auth/page.tsx
src/app/dashboard/orgs/[slug]/invite/page.tsx
src/app/dashboard/orgs/[slug]/information/page.tsx
```

- [ ] **Step 4: Update client list query defaults**

Replace `pageSize: 10` with `DEFAULT_PAGE_SIZE` and `pageSize: 20` with `DENSE_PAGE_SIZE` in:

```txt
src/app/dashboard/_components/dashboard-notification-menu.tsx
src/app/dashboard/admin/users/_components/admin-users-content.tsx
src/app/dashboard/admin/api-keys/_components/admin-api-keys-content.tsx
src/app/dashboard/settings/api-keys/_components/personal-api-keys-content.tsx
src/app/dashboard/orgs/[slug]/_components/org-auth-content.tsx
src/app/dashboard/orgs/[slug]/_components/org-information-content.tsx
src/app/dashboard/orgs/[slug]/_components/org-invite-content.tsx
```

Use imports like:

```ts
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, DENSE_PAGE_SIZE, FILTER_ALL } from "@/lib/const"
```

- [ ] **Step 5: Verify pagination refactor**

Run:

```bash
pnpm typecheck
pnpm check
```

Expected: both pass, with no visual or behavior change.

---

### Task 3: Replace API Key Constants

**Files:**
- Modify: `src/server/api/lib/api-key.ts`
- Modify: `src/server/api/lib/api-key-usage-stats.ts`
- Modify: `src/server/api/routers/api-key.ts`
- Modify: `src/server/api/routers/admin-api-key.ts`
- Modify: API Key UI files listed in File Structure

- [ ] **Step 1: Use central values in API Key server lib**

In `src/server/api/lib/api-key.ts`, replace local enum strings and thresholds:

```ts
import {
  API_KEY_EXPIRING_SOON_DAYS,
  API_KEY_OWNER_ORGANIZATION,
  API_KEY_OWNER_USER,
  API_KEY_STATUS_DISABLED,
  API_KEY_STATUS_ENABLED,
  API_KEY_STATUS_EXPIRING,
  API_KEY_STATUS_FILTERS,
  API_KEY_STALE_REQUEST_DAYS,
  MASKED_API_KEY_VISIBLE_LENGTH,
  PLATFORM_ROLE_SUPPORT,
  RISK_LEVEL_HIGH,
  RISK_LEVEL_LOW,
  RISK_LEVEL_MEDIUM,
  type ApiKeyOwnerType,
  type RiskLevel
} from "@/lib/const"
```

Use:

```ts
export const apiKeyStatusSchema = z.enum(API_KEY_STATUS_FILTERS)
export const usageResultSchema = z.enum([FILTER_ALL, REQUEST_LOG_RESULT_SUCCESS, REQUEST_LOG_RESULT_FAILED])

export type ApiKeyRiskLevel = RiskLevel
export type { ApiKeyOwnerType }
```

Replace local threshold constants with the imported names:

```ts
const millisecondsPerDay = 24 * 60 * 60 * 1000
```

Keep `millisecondsPerDay` local because it is a calculation helper, not a product threshold.

- [ ] **Step 2: Replace return literals**

In `getApiKeyStatus`, replace literals:

```ts
if (!enabled) {
  return API_KEY_STATUS_DISABLED
}

if (isExpiringSoon(expiresAt)) {
  return API_KEY_STATUS_EXPIRING
}

return API_KEY_STATUS_ENABLED
```

In `buildApiKeyRisk`, replace:

```ts
return { level: RISK_LEVEL_HIGH, reasons }
return { level: RISK_LEVEL_MEDIUM, reasons }
return { level: RISK_LEVEL_LOW, reasons }
```

- [ ] **Step 3: Replace owner-type literals**

In `assertPersonalKey`, replace `"user"` with `API_KEY_OWNER_USER`:

```ts
if (key.configId !== API_KEY_OWNER_USER || key.referenceId !== userId) {
  throw new TRPCError({ code: "NOT_FOUND", message: "API Key 不存在。" })
}
```

Replace `"organization"` comparisons in routers with `API_KEY_OWNER_ORGANIZATION`.

- [ ] **Step 4: Replace UI label maps only where they represent shared status domains**

In `src/app/dashboard/settings/api-keys/_components/api-key-status.tsx`, keep labels local but use central keys:

```ts
const statusConfig: Record<ApiKeyStatus, { label: string; variant: "default" | "destructive" | "outline" | "secondary"; icon: typeof CheckCircle2 }> = {
  [API_KEY_STATUS_DISABLED]: { icon: XCircle, label: "已禁用", variant: "outline" },
  [API_KEY_STATUS_ENABLED]: { icon: CheckCircle2, label: "启用中", variant: "default" },
  [API_KEY_STATUS_EXPIRED]: { icon: XCircle, label: "已过期", variant: "destructive" },
  [API_KEY_STATUS_EXPIRING]: { icon: Clock3, label: "即将过期", variant: "secondary" }
}
```

Do the same in admin API Key detail UI.

- [ ] **Step 5: Verify API Key refactor**

Run:

```bash
pnpm typecheck
pnpm check
```

Expected: pass.

---

### Task 4: Replace Request Log Constants

**Files:**
- Modify: `src/server/api/routers/admin-request-log.ts`
- Modify: `src/server/service/request-logs/request-log-risk.ts`
- Modify: `src/server/service/request-logs/request-log-sanitizer.ts`
- Modify: `src/server/service/request-logs/record-request-log.ts`
- Modify: request log UI files listed in File Structure

- [ ] **Step 1: Use central request log enum arrays in router schemas**

In `src/server/api/routers/admin-request-log.ts`, import:

```ts
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  FILTER_ALL,
  REQUEST_LOG_DEFAULT_TIME_RANGE,
  REQUEST_LOG_EXPORT_LIMIT,
  REQUEST_LOG_EXPORT_QUERY_LIMIT,
  REQUEST_LOG_HIGH_RISK_SLOW_MS,
  REQUEST_LOG_METHOD_FILTERS,
  REQUEST_LOG_RESULT_FAILED,
  REQUEST_LOG_RESULT_FILTERS,
  REQUEST_LOG_RESULT_SUCCESS,
  REQUEST_LOG_RISK_FILTERS,
  REQUEST_LOG_SLOW_MS,
  REQUEST_LOG_SOURCE_FILTERS,
  REQUEST_LOG_TIME_RANGE_1H,
  REQUEST_LOG_TIME_RANGE_24H,
  REQUEST_LOG_TIME_RANGE_30D,
  REQUEST_LOG_TIME_RANGE_7D,
  REQUEST_LOG_TIME_RANGE_FILTERS
} from "@/lib/const"
```

Replace schemas:

```ts
const requestLogSourceSchema = z.enum(REQUEST_LOG_SOURCE_FILTERS)
const requestLogMethodSchema = z.enum(REQUEST_LOG_METHOD_FILTERS)
const requestLogResultSchema = z.enum(REQUEST_LOG_RESULT_FILTERS)
const requestLogRiskSchema = z.enum(REQUEST_LOG_RISK_FILTERS)
const requestLogTimeRangeSchema = z.enum(REQUEST_LOG_TIME_RANGE_FILTERS)
```

Replace defaults:

```ts
page: z.number().int().min(1).default(DEFAULT_PAGE),
pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
result: requestLogResultSchema.default(FILTER_ALL),
risk: requestLogRiskSchema.default(FILTER_ALL),
source: requestLogSourceSchema.default(FILTER_ALL),
timeRange: requestLogTimeRangeSchema.default(REQUEST_LOG_DEFAULT_TIME_RANGE)
```

- [ ] **Step 2: Replace filter comparisons**

Change:

```ts
input.result === "success"
input.result === "failed"
input.risk !== "all"
input.source !== "all"
input.method !== "all"
```

to:

```ts
input.result === REQUEST_LOG_RESULT_SUCCESS
input.result === REQUEST_LOG_RESULT_FAILED
input.risk !== FILTER_ALL
input.source !== FILTER_ALL
input.method !== FILTER_ALL
```

- [ ] **Step 3: Replace export limits and slow thresholds**

Change:

```ts
.limit(10_001)

if (rows.length > 10_000) {
  throw new TRPCError({ code: "BAD_REQUEST", message: "导出结果超过 10,000 行，请缩小筛选范围。" })
}
```

to:

```ts
.limit(REQUEST_LOG_EXPORT_QUERY_LIMIT)

if (rows.length > REQUEST_LOG_EXPORT_LIMIT) {
  throw new TRPCError({ code: "BAD_REQUEST", message: `导出结果超过 ${REQUEST_LOG_EXPORT_LIMIT.toLocaleString()} 行，请缩小筛选范围。` })
}
```

Change SQL slow threshold:

```ts
slow24h: sql<number>`count(*) filter (where ${requestLog.durationMs} >= ${REQUEST_LOG_SLOW_MS})::int`,
```

- [ ] **Step 4: Replace risk and sanitizer thresholds**

In `src/server/service/request-logs/request-log-risk.ts`, import and use:

```ts
import { REQUEST_LOG_HIGH_RISK_SLOW_MS, REQUEST_LOG_SLOW_MS, RISK_LEVEL_HIGH, RISK_LEVEL_LOW, RISK_LEVEL_MEDIUM } from "@/lib/const"
```

Return central risk levels:

```ts
return { level: RISK_LEVEL_HIGH, reasons }
return { level: RISK_LEVEL_MEDIUM, reasons }
return { level: RISK_LEVEL_LOW, reasons }
```

In `src/server/service/request-logs/request-log-sanitizer.ts`, import and use:

```ts
import { REQUEST_LOG_MAX_BODY_BYTES, REQUEST_LOG_REDACTED_VALUE } from "@/lib/const"
```

- [ ] **Step 5: Update request log UI constants**

In `request-log-labels.ts`, keep labels local but use central types and keys:

```ts
import {
  FILTER_ALL,
  REQUEST_LOG_RESULT_FAILED,
  REQUEST_LOG_RESULT_SUCCESS,
  REQUEST_LOG_SOURCE_API_KEY,
  REQUEST_LOG_SOURCE_AUTH,
  REQUEST_LOG_SOURCE_DASHBOARD,
  REQUEST_LOG_SOURCE_ROUTE_HANDLER,
  REQUEST_LOG_SOURCE_SYSTEM,
  REQUEST_LOG_SOURCE_TRPC,
  REQUEST_LOG_TIME_RANGE_1H,
  REQUEST_LOG_TIME_RANGE_24H,
  REQUEST_LOG_TIME_RANGE_30D,
  REQUEST_LOG_TIME_RANGE_7D,
  RISK_LEVEL_HIGH,
  RISK_LEVEL_LOW,
  RISK_LEVEL_MEDIUM,
  type RequestLogResultFilter,
  type RequestLogRiskFilter,
  type RequestLogSourceFilter,
  type RequestLogTimeRangeFilter
} from "@/lib/const"
```

Then define:

```ts
export type ResultFilter = RequestLogResultFilter
export type RiskFilter = RequestLogRiskFilter
export type SourceFilter = RequestLogSourceFilter
export type TimeRangeFilter = RequestLogTimeRangeFilter
```

- [ ] **Step 6: Verify request logs**

Run:

```bash
pnpm typecheck
pnpm check
```

Expected: pass. If SQL interpolation rejects the constant in the template, use `sql<number>\`count(*) filter (where ${requestLog.durationMs} >= ${sql.raw(String(REQUEST_LOG_SLOW_MS))})::int\`` only for that expression.

---

### Task 5: Replace Email and OAuth Provider Constants

**Files:**
- Modify: `src/server/service/platform-settings/email-settings.ts`
- Modify: `src/server/service/email/email-service.ts`
- Modify: `src/server/api/routers/admin-platform-setting.ts`
- Modify: `src/server/api/lib/oauth-providers.ts`
- Modify: `src/app/(auth)/_components/oauth-buttons.tsx`
- Modify: `src/app/dashboard/settings/security/_components/oauth-accounts-card.tsx`

- [ ] **Step 1: Replace email provider schema and setting keys**

In `email-settings.ts`, import:

```ts
import {
  EMAIL_PROVIDER_CONSOLE,
  EMAIL_PROVIDER_RESEND,
  EMAIL_PROVIDER_SMTP,
  EMAIL_PROVIDERS,
  EMAIL_SETTING_KEY_FROM,
  EMAIL_SETTING_KEY_PROVIDER,
  EMAIL_SETTING_KEY_RESEND_API_KEY,
  EMAIL_SETTING_KEY_SMTP_HOST,
  EMAIL_SETTING_KEY_SMTP_PASSWORD,
  EMAIL_SETTING_KEY_SMTP_PORT,
  EMAIL_SETTING_KEY_SMTP_SECURE,
  EMAIL_SETTING_KEY_SMTP_USER,
  EMAIL_SETTING_KEYS,
  EMAIL_SETTING_SENSITIVE_KEYS
} from "@/lib/const"
```

Use:

```ts
export const emailProviderSchema = z.enum(EMAIL_PROVIDERS)

const keys = {
  from: EMAIL_SETTING_KEY_FROM,
  provider: EMAIL_SETTING_KEY_PROVIDER,
  resendApiKey: EMAIL_SETTING_KEY_RESEND_API_KEY,
  smtpHost: EMAIL_SETTING_KEY_SMTP_HOST,
  smtpPassword: EMAIL_SETTING_KEY_SMTP_PASSWORD,
  smtpPort: EMAIL_SETTING_KEY_SMTP_PORT,
  smtpSecure: EMAIL_SETTING_KEY_SMTP_SECURE,
  smtpUser: EMAIL_SETTING_KEY_SMTP_USER
} as const

const sensitiveKeys = new Set<string>(EMAIL_SETTING_SENSITIVE_KEYS)
const allowedKeys = EMAIL_SETTING_KEYS
```

Replace provider comparisons with central constants:

```ts
input.provider === EMAIL_PROVIDER_CONSOLE
input.provider === EMAIL_PROVIDER_RESEND
input.provider === EMAIL_PROVIDER_SMTP
```

- [ ] **Step 2: Replace email-service provider switch**

In `src/server/service/email/email-service.ts`, replace switch cases:

```ts
case EMAIL_PROVIDER_CONSOLE:
case EMAIL_PROVIDER_RESEND:
case EMAIL_PROVIDER_SMTP:
```

and production guard:

```ts
if (env.NODE_ENV === "production" && config.provider === EMAIL_PROVIDER_CONSOLE) {
```

- [ ] **Step 3: Replace OAuth provider ids**

In `src/server/api/lib/oauth-providers.ts`, import:

```ts
import { OAUTH_PROVIDER_GITHUB, OAUTH_PROVIDER_GOOGLE, type OAuthProviderId } from "@/lib/const"
```

Remove the local `OAuthProviderId` type and use:

```ts
id: OAUTH_PROVIDER_GITHUB
id: OAUTH_PROVIDER_GOOGLE
```

In OAuth UI files, replace `"github"` and `"google"` provider ids with central constants.

- [ ] **Step 4: Verify provider refactor**

Run:

```bash
pnpm typecheck
pnpm check
```

Expected: pass.

---

### Task 6: Replace User, Organization, Invitation, Notification, Session Constants

**Files:**
- Modify: status-related server routers and UI components listed in File Structure

- [ ] **Step 1: Replace admin user filters**

In `src/server/api/routers/admin-user.ts`, import:

```ts
import { FILTER_ALL, USER_STATUS_ACTIVE, USER_STATUS_BANNED, USER_STATUS_FILTERS } from "@/lib/const"
```

Use:

```ts
const userStatusSchema = z.enum(USER_STATUS_FILTERS)
```

Change filters and row mapping:

```ts
input.role === FILTER_ALL ? undefined : eq(user.role, input.role),
input.status === FILTER_ALL ? undefined : eq(user.banned, input.status === USER_STATUS_BANNED)
```

```ts
status: row.banned ? USER_STATUS_BANNED : USER_STATUS_ACTIVE
```

- [ ] **Step 2: Replace organization statuses**

In `src/server/api/routers/admin-org.ts`, import:

```ts
import { FILTER_ALL, ORGANIZATION_STATUS_ACTIVE, ORGANIZATION_STATUS_DISABLED, ORGANIZATION_STATUS_FILTERS } from "@/lib/const"
```

Use:

```ts
status: z.enum(ORGANIZATION_STATUS_FILTERS).default(FILTER_ALL)
```

and:

```ts
input.status === FILTER_ALL ? undefined : eq(organization.status, input.status)
```

For update:

```ts
status: z.enum([ORGANIZATION_STATUS_ACTIVE, ORGANIZATION_STATUS_DISABLED])
```

- [ ] **Step 3: Replace invitation status values**

In `src/server/api/lib/invitations.ts` and `src/server/api/routers/org.ts`, import invitation constants and replace:

```ts
INVITATION_STATUS_PENDING
INVITATION_STATUS_ACCEPTED
INVITATION_STATUS_REJECTED
INVITATION_STATUS_EXPIRED
INVITATION_STATUS_CANCELED
```

Example:

```ts
if (status === INVITATION_STATUS_PENDING && expiresAt && expiresAt < new Date()) {
  return INVITATION_STATUS_EXPIRED
}
```

- [ ] **Step 4: Replace notification filters**

In `src/app/dashboard/_components/dashboard-notification-menu.tsx`, replace local `NotificationType` with:

```ts
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  FILTER_ALL,
  INVITATION_STATUS_PENDING,
  NOTIFICATION_TYPE_INVITATION,
  NOTIFICATION_TYPE_SECURITY,
  type NotificationTypeFilter
} from "@/lib/const"
```

Use:

```ts
type NotificationType = NotificationTypeFilter

const filters: { label: string; value: NotificationType }[] = [
  { label: "全部", value: FILTER_ALL },
  { label: "邀请", value: NOTIFICATION_TYPE_INVITATION },
  { label: "安全", value: NOTIFICATION_TYPE_SECURITY }
]
```

Change list query:

```ts
const list = api.notification.list.useQuery({ page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE, type })
```

- [ ] **Step 5: Replace session risk constants**

In `src/server/api/lib/session-risk.ts`, import:

```ts
import { SESSION_RISK_NORMAL, SESSION_RISK_RISK, type SessionRiskLevel } from "@/lib/const"
```

Use:

```ts
export type RiskLevel = SessionRiskLevel
```

and:

```ts
level: reasons.length > 0 ? SESSION_RISK_RISK : SESSION_RISK_NORMAL
```

- [ ] **Step 6: Verify status refactor**

Run:

```bash
pnpm typecheck
pnpm check
```

Expected: pass.

---

### Task 7: Replace Core Route Constants

**Files:**
- Modify: auth route and dashboard navigation files listed in File Structure

- [ ] **Step 1: Replace root redirects**

In `src/app/page.tsx`, use:

```ts
import { ROUTE_DASHBOARD, ROUTE_SIGN_IN } from "@/lib/const"
```

Then:

```ts
redirect(session ? ROUTE_DASHBOARD : ROUTE_SIGN_IN)
```

- [ ] **Step 2: Replace auth route redirects**

In auth components, replace hard-coded `"/sign-in"`, `"/dashboard"`, and verify email route building.

For sign-up:

```ts
import { getEmailVerificationPendingRoute } from "@/lib/const"
```

Use:

```ts
router.replace(getEmailVerificationPendingRoute(parsed.data.email))
```

For reset password and sign out:

```ts
import { ROUTE_SIGN_IN } from "@/lib/const"
```

Use:

```ts
router.replace(ROUTE_SIGN_IN)
```

- [ ] **Step 3: Replace dashboard sidebar routes**

In `src/app/dashboard/_components/dashboard-sidebar.tsx`, replace fixed admin/settings hrefs with central constants:

```ts
{ href: ROUTE_DASHBOARD_ADMIN_USERS, icon: UsersRound, label: "用户管理" }
{ href: ROUTE_DASHBOARD_ADMIN_ORGS, icon: Building2, label: "平台组织" }
{ href: ROUTE_DASHBOARD_ADMIN_API_KEYS, icon: KeyRound, label: "平台 API Key" }
{ href: ROUTE_DASHBOARD_ADMIN_REQUEST_LOGS, icon: ScrollText, label: "请求日志" }
{ href: ROUTE_DASHBOARD_ADMIN_SETTINGS, icon: SlidersHorizontal, label: "平台设置" }
```

Use settings route constants for account routes:

```ts
{ href: ROUTE_DASHBOARD_SETTINGS_PROFILE, icon: Settings, label: "个人资料" }
{ href: ROUTE_DASHBOARD_SETTINGS_SECURITY, icon: ShieldCheck, label: "安全设置" }
{ href: ROUTE_DASHBOARD_SETTINGS_SESSIONS, icon: UsersRound, label: "我的会话" }
{ href: ROUTE_DASHBOARD_SETTINGS_API_KEYS, icon: KeyRound, label: "API Keys" }
```

- [ ] **Step 4: Keep dynamic routes local**

Do not add constants for routes that require a slug or id unless they appear in at least three files. Keep these local for now:

```ts
`/dashboard/orgs/${slug}`
`/dashboard/admin/users/${log.userId}`
`/dashboard/settings/api-keys/${id}`
```

- [ ] **Step 5: Verify route refactor**

Run:

```bash
pnpm typecheck
pnpm check
pnpm build
```

Expected: all pass.

---

### Task 8: Final Sweep and Verification

**Files:**
- Read-only sweep across `src`

- [ ] **Step 1: Search for remaining repeated constants**

Run:

```bash
rg -n "pageSize:\\s*(10|20)|\\[10,\\s*20,\\s*50\\]|\\\"all\\\"|\\\"active\\\"|\\\"disabled\\\"|\\\"pending\\\"|\\\"github\\\"|\\\"google\\\"|\\\"console\\\"|\\\"resend\\\"|\\\"smtp\\\"|10_000|2000|16 \\* 1024" src --glob "*.ts" --glob "*.tsx"
```

Expected: remaining hits are either:
- inside `src/lib/const.ts`
- local UI labels or text content
- one-off class names or component state
- Better Auth provider config literals that must match external API shape

- [ ] **Step 2: Inspect remaining hits manually**

For each remaining hit, classify it:

```txt
Move to const.ts: shared business value, repeated behavior threshold, or cross-layer enum.
Keep local: page-only label, icon map, chart config, skeleton key, CSS/className, or framework-required literal.
```

Move only the first category.

- [ ] **Step 3: Run full verification**

Run:

```bash
pnpm typecheck
pnpm check
pnpm build
```

Expected:

```txt
typecheck: exit 0
check: exit 0
build: exit 0
```

- [ ] **Step 4: Do not update PRDs**

This refactor does not change page layout, route behavior, user-visible interaction, server API behavior, or product copy. Do not update PRDs unless an implementation step intentionally changes behavior.

---

## Self-Review

**Spec coverage:** The plan covers constants previously identified for pagination, common `all`, status enums, API Key thresholds/status, request log filters/thresholds, platform email provider/settings keys, OAuth provider ids, core routes, and session/request risk. It explicitly excludes purely local UI configuration.

**Placeholder scan:** No task uses “TBD”, “TODO”, “similar to”, or vague implementation steps. Each task names exact files, imports, snippets, and verification commands.

**Type consistency:** Types introduced in `src/lib/const.ts` are used by later tasks with matching names: `PageSizeOption`, `ApiKeyOwnerType`, `RiskLevel`, `SessionRiskLevel`, `RequestLog*Filter`, `EmailProviderName`, and `OAuthProviderId`.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-16-centralize-constants.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

