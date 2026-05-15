# Request Logs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/dashboard/admin/request-logs` system request log page with DB-backed audit records, filtering, detail viewing, CSV export, and first-pass tRPC request collection.

**Architecture:** Store audit records in a new Drizzle `system_request_log` table. Keep sanitization and risk calculation in pure server service helpers, expose admin-only tRPC procedures for overview/list/detail/export, and build a dashboard page that follows the approved Pencil design. Request collection starts with tRPC route handling and uses non-blocking writes so logging never breaks the original request.

**Tech Stack:** Next.js 16 App Router, React 19, tRPC 11, Drizzle ORM, PostgreSQL, Better Auth session context, shadcn/ui, Playwright E2E.

---

### Task 1: E2E Coverage And DB Fixture

**Files:**
- Modify: `e2e/helpers/db.ts`
- Create: `e2e/specs/19-dashboard-admin-request-logs.spec.ts`

- [ ] **Step 1: Add a request-log fixture helper before production implementation**

Add `createRequestLogFixture` to `e2e/helpers/db.ts`; it inserts a row into `system_request_log` with full IP, full User-Agent, and a redacted body snapshot.

- [ ] **Step 2: Add a failing Playwright spec**

Create `19-dashboard-admin-request-logs.spec.ts` that signs in as `admin`, seeds one request log, visits `/dashboard/admin/request-logs`, asserts the heading, full IP, UA summary, and detail sheet body snapshot.

- [ ] **Step 3: Run the new spec and observe failure**

Run `pnpm test:e2e e2e/specs/19-dashboard-admin-request-logs.spec.ts --project=chromium`. Expected before implementation: failure because the route and table do not exist yet.

### Task 2: Schema And Request Log Services

**Files:**
- Modify: `src/server/db/schema.ts`
- Create: `src/server/service/request-logs/request-log-sanitizer.ts`
- Create: `src/server/service/request-logs/request-log-risk.ts`
- Create: `src/server/service/request-logs/record-request-log.ts`
- Create: `src/server/service/request-logs/index.ts`

- [ ] **Step 1: Add `requestLog` Drizzle schema**

Create the `system_request_log` table with fields from the PRD and indexes for created time, user, requestId, path, success, and risk level.

- [ ] **Step 2: Implement request body sanitization**

Implement `sanitizeRequestBody(value)` that returns JSON text and status, redacts keys such as `password`, `token`, `secret`, `authorization`, `cookie`, `apiKey`, `credential`, `code`, `otp`, and `captcha`, blocks non-JSON and oversized bodies.

- [ ] **Step 3: Implement risk calculation**

Implement `buildRequestLogRisk(input)` so forbidden/high-risk route failures and very slow requests are `high`, 4xx/slow requests are `medium`, and normal successful requests are `low`.

- [ ] **Step 4: Implement non-blocking record helper**

Implement `recordRequestLog(input)` with safe ID generation, IP/User-Agent summary helpers, metadata serialization, and `.catch()` protection so DB write failures do not bubble into the original request.

### Task 3: Admin tRPC Router

**Files:**
- Create: `src/server/api/routers/admin-request-log.ts`
- Modify: `src/server/api/root.ts`

- [ ] **Step 1: Add input schemas**

Define source/method/result/risk/time-range schemas and a list input with pagination, search, filters, and default `pageSize: 20`.

- [ ] **Step 2: Implement `getOverview`, `list`, `get`, and `exportCsv`**

Use `adminProcedure`; export is allowed only for `super_admin`, returns a CSV string plus filename, includes full IP/User-Agent, excludes request body snapshot.

- [ ] **Step 3: Register router**

Add `adminRequestLog` to `appRouter`.

### Task 4: Request Collection

**Files:**
- Modify: `src/proxy.ts`
- Modify: `src/app/api/trpc/[trpc]/route.ts`

- [ ] **Step 1: Add request ID propagation**

Generate or preserve `x-request-id` in `proxy.ts` for `/dashboard`, `/invite`, `/api/trpc`, and `/api/auth` matchers.

- [ ] **Step 2: Wrap tRPC route handling**

Measure duration, derive status/success from thrown errors, extract session from context, sanitize POST body clone, and call `recordRequestLog` after the handler returns or throws.

### Task 5: Dashboard UI

**Files:**
- Create: `src/app/dashboard/admin/request-logs/page.tsx`
- Create: `src/app/dashboard/admin/request-logs/loading.tsx`
- Create: `src/app/dashboard/admin/request-logs/error.tsx`
- Create: `src/app/dashboard/admin/request-logs/_components/request-logs-content.tsx`
- Modify: `src/app/dashboard/_components/dashboard-sidebar.tsx`

- [ ] **Step 1: Add server page**

Fetch initial `list` and `getOverview` data through `api.adminRequestLog`, pass selected `logId` from search params.

- [ ] **Step 2: Add client content**

Build summary cards, filters, desktop table, mobile cards, pagination, desktop Sheet, and CSV export action with toast feedback.

- [ ] **Step 3: Add sidebar navigation**

Add “请求日志” under the admin group after “平台 API Key”.

### Task 6: Verification

**Files:**
- Existing files only.

- [ ] **Step 1: Run typecheck**

Run `pnpm typecheck`. Expected: exit 0.

- [ ] **Step 2: Run lint/format check**

Run `pnpm check`. Expected: exit 0.

- [ ] **Step 3: Run build**

Run `pnpm build`. Expected: exit 0.

- [ ] **Step 4: Run focused E2E if Docker is available**

Run `pnpm test:e2e e2e/specs/19-dashboard-admin-request-logs.spec.ts --project=chromium`. Expected after implementation: all tests in that file pass.
