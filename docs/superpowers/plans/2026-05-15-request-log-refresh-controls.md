# Request Log Refresh Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add manual refresh and timed auto-refresh controls to the system request logs search toolbar.

**Architecture:** Keep request log data ownership in `RequestLogsContent`, because the existing tRPC queries and detail sheet state live there. Extract the toolbar into a focused client component so the current 469-line page component does not grow past the repository's component size guidance. Use existing shadcn `Button` and `DropdownMenu` primitives with lucide icons and accessible labels.

**Tech Stack:** Next.js App Router, React 19 client components, tRPC React Query, shadcn/ui, lucide-react, Playwright E2E, Biome.

---

## File Structure

- Modify: `e2e/specs/19-dashboard-admin-request-logs.spec.ts`
  - Adds a focused E2E assertion for the refresh icon button and auto-refresh dropdown options.
- Create: `src/app/dashboard/admin/request-logs/_components/request-log-labels.ts`
  - Holds filter type aliases and label maps currently embedded in `request-logs-content.tsx`.
- Create: `src/app/dashboard/admin/request-logs/_components/request-log-toolbar.tsx`
  - Renders search input, manual refresh button, auto-refresh dropdown, and the four existing filter menus.
- Modify: `src/app/dashboard/admin/request-logs/_components/request-logs-content.tsx`
  - Imports extracted labels and toolbar.
  - Adds `autoRefreshMs` state.
  - Adds manual refresh behavior for list, overview, and open detail.
  - Adds interval-based refresh cleanup.
- Already updated before this plan: `prd/19-dashboard-admin-request-logs.md` and `prd/dashboard-logs-design.pen`.

---

### Task 1: Add Failing E2E Coverage

**Files:**
- Modify: `e2e/specs/19-dashboard-admin-request-logs.spec.ts`

- [ ] **Step 1: Add a test for manual and timed refresh controls**

Append this test inside the existing `test.describe("19 dashboard admin request logs", () => { ... })` block:

```ts
  test("supports manual refresh and timed refresh menu", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    await signInAsAdmin(page, "dashboard-request-log-refresh")
    await page.goto("/dashboard/admin/request-logs")

    await expect(page.getByRole("button", { name: "刷新请求日志" })).toBeVisible()

    const autoRefreshButton = page.getByRole("button", { name: "定时刷新：关闭" })
    await expect(autoRefreshButton).toBeVisible()
    await autoRefreshButton.click()

    await expect(page.getByRole("menuitem", { name: "关闭" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "每 10 秒" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "每 30 秒" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "每 1 分钟" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "每 5 分钟" })).toBeVisible()

    await page.getByRole("menuitem", { name: "每 10 秒" }).click()
    await expect(page.getByRole("button", { name: "定时刷新：每 10 秒" })).toBeVisible()
  })
```

- [ ] **Step 2: Run the focused E2E and confirm it fails**

Run:

```bash
pnpm test:e2e e2e/specs/19-dashboard-admin-request-logs.spec.ts --project=chromium
```

Expected: FAIL because the current page does not render buttons named `刷新请求日志` or `定时刷新：关闭`.

- [ ] **Step 3: Commit the failing test**

```bash
git add e2e/specs/19-dashboard-admin-request-logs.spec.ts
git commit -m "test: cover request log refresh controls"
```

---

### Task 2: Extract Labels Shared By Content And Toolbar

**Files:**
- Create: `src/app/dashboard/admin/request-logs/_components/request-log-labels.ts`
- Modify: `src/app/dashboard/admin/request-logs/_components/request-logs-content.tsx`

- [ ] **Step 1: Create shared label definitions**

Create `src/app/dashboard/admin/request-logs/_components/request-log-labels.ts`:

```ts
import type { RouterInputs } from "@/trpc/react"

type ListInput = RouterInputs["adminRequestLog"]["list"]

export type ResultFilter = NonNullable<ListInput["result"]>
export type RiskFilter = NonNullable<ListInput["risk"]>
export type SourceFilter = NonNullable<ListInput["source"]>
export type TimeRangeFilter = NonNullable<ListInput["timeRange"]>

export const resultLabels: Record<ResultFilter, string> = {
  all: "全部结果",
  failed: "失败",
  success: "成功"
}

export const riskLabels: Record<RiskFilter, string> = {
  all: "全部风险",
  high: "高风险",
  low: "低风险",
  medium: "中风险"
}

export const sourceLabels: Record<SourceFilter, string> = {
  all: "全部来源",
  api_key: "API Key",
  auth: "Auth",
  dashboard: "Dashboard",
  route_handler: "Route",
  system: "系统",
  trpc: "tRPC"
}

export const timeRangeLabels: Record<TimeRangeFilter, string> = {
  "1h": "最近 1 小时",
  "24h": "最近 24 小时",
  "7d": "最近 7 天",
  "30d": "最近 30 天",
  all: "全部时间"
}
```

- [ ] **Step 2: Replace local filter type and label definitions in `request-logs-content.tsx`**

Remove these local declarations from `request-logs-content.tsx`:

```ts
type ListInput = RouterInputs["adminRequestLog"]["list"]
type ResultFilter = NonNullable<ListInput["result"]>
type RiskFilter = NonNullable<ListInput["risk"]>
type SourceFilter = NonNullable<ListInput["source"]>
type TimeRangeFilter = NonNullable<ListInput["timeRange"]>

const resultLabels: Record<ResultFilter, string> = {
  all: "全部结果",
  failed: "失败",
  success: "成功"
}
const riskLabels: Record<RiskFilter, string> = {
  all: "全部风险",
  high: "高风险",
  low: "低风险",
  medium: "中风险"
}
const sourceLabels: Record<SourceFilter, string> = {
  all: "全部来源",
  api_key: "API Key",
  auth: "Auth",
  dashboard: "Dashboard",
  route_handler: "Route",
  system: "系统",
  trpc: "tRPC"
}
const timeRangeLabels: Record<TimeRangeFilter, string> = {
  "1h": "最近 1 小时",
  "24h": "最近 24 小时",
  "7d": "最近 7 天",
  "30d": "最近 30 天",
  all: "全部时间"
}
```

Add this import near the other local imports:

```ts
import { type ResultFilter, resultLabels, riskLabels, type RiskFilter, sourceLabels, type SourceFilter, timeRangeLabels, type TimeRangeFilter } from "./request-log-labels"
```

Remove `type RouterInputs` from the existing tRPC import so it becomes:

```ts
import { api, type RouterOutputs } from "@/trpc/react"
```

- [ ] **Step 3: Run typecheck for the extraction**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit the label extraction**

```bash
git add src/app/dashboard/admin/request-logs/_components/request-log-labels.ts src/app/dashboard/admin/request-logs/_components/request-logs-content.tsx
git commit -m "refactor: extract request log filter labels"
```

---

### Task 3: Build The Toolbar Component

**Files:**
- Create: `src/app/dashboard/admin/request-logs/_components/request-log-toolbar.tsx`

- [ ] **Step 1: Create the toolbar component**

Create `src/app/dashboard/admin/request-logs/_components/request-log-toolbar.tsx`:

```tsx
"use client"

import { Check, ChevronDown, RefreshCw, Search, TimerReset } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

import { type ResultFilter, resultLabels, type RiskFilter, riskLabels, type SourceFilter, sourceLabels, type TimeRangeFilter, timeRangeLabels } from "./request-log-labels"

const autoRefreshOptions: Array<{ label: string; value: number | null }> = [
  { label: "关闭", value: null },
  { label: "每 10 秒", value: 10_000 },
  { label: "每 30 秒", value: 30_000 },
  { label: "每 1 分钟", value: 60_000 },
  { label: "每 5 分钟", value: 300_000 }
]

const getAutoRefreshLabel = (value: number | null) => autoRefreshOptions.find((option) => option.value === value)?.label ?? "关闭"

export const RequestLogToolbar = ({
  autoRefreshMs,
  isRefreshing,
  onAutoRefreshChange,
  onRefresh,
  onResultChange,
  onRiskChange,
  onSearchChange,
  onSourceChange,
  onTimeRangeChange,
  resetPage,
  result,
  risk,
  search,
  source,
  timeRange
}: {
  autoRefreshMs: number | null
  isRefreshing: boolean
  onAutoRefreshChange: (value: number | null) => void
  onRefresh: () => void
  onResultChange: (value: ResultFilter) => void
  onRiskChange: (value: RiskFilter) => void
  onSearchChange: (value: string) => void
  onSourceChange: (value: SourceFilter) => void
  onTimeRangeChange: (value: TimeRangeFilter) => void
  resetPage: () => void
  result: ResultFilter
  risk: RiskFilter
  search: string
  source: SourceFilter
  timeRange: TimeRangeFilter
}) => {
  const autoRefreshLabel = getAutoRefreshLabel(autoRefreshMs)

  return (
    <div className="grid gap-2 lg:grid-cols-[minmax(260px,1fr)_repeat(4,150px)]">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_40px_40px] gap-2">
        <div className="relative min-w-0">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="搜索请求日志"
            className="pl-9"
            onChange={(event) => {
              onSearchChange(event.target.value)
              resetPage()
            }}
            placeholder="搜索用户、路径、requestId、完整 IP 或 User-Agent"
            value={search}
          />
        </div>
        <Button aria-label="刷新请求日志" disabled={isRefreshing} onClick={onRefresh} size="icon" title="刷新请求日志" type="button" variant="outline">
          <RefreshCw className={isRefreshing ? "size-4 animate-spin" : "size-4"} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label={`定时刷新：${autoRefreshLabel}`} size="icon" title={`定时刷新：${autoRefreshLabel}`} type="button" variant="outline">
              <TimerReset className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {autoRefreshOptions.map((option) => (
              <DropdownMenuItem key={option.label} onSelect={() => onAutoRefreshChange(option.value)}>
                <span className="flex w-5 items-center">{option.value === autoRefreshMs ? <Check className="size-4" /> : null}</span>
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <FilterMenu label={timeRangeLabels[timeRange]} onSelect={onTimeRangeChange} options={timeRangeLabels} resetPage={resetPage} />
      <FilterMenu label={resultLabels[result]} onSelect={onResultChange} options={resultLabels} resetPage={resetPage} />
      <FilterMenu label={riskLabels[risk]} onSelect={onRiskChange} options={riskLabels} resetPage={resetPage} />
      <FilterMenu label={sourceLabels[source]} onSelect={onSourceChange} options={sourceLabels} resetPage={resetPage} />
    </div>
  )
}

const FilterMenu = <TValue extends string>({
  label,
  onSelect,
  options,
  resetPage
}: {
  label: string
  onSelect: (value: TValue) => void
  options: Record<TValue, string>
  resetPage: () => void
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button className="w-full justify-between" type="button" variant="outline">
        {label}
        <ChevronDown className="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-44">
      {Object.entries(options).map(([value, text]) => (
        <DropdownMenuItem
          key={value}
          onSelect={() => {
            onSelect(value as TValue)
            resetPage()
          }}
        >
          {text}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
)
```

- [ ] **Step 2: Run typecheck and expect the new file to be valid**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit the toolbar component**

```bash
git add src/app/dashboard/admin/request-logs/_components/request-log-toolbar.tsx
git commit -m "feat: add request log toolbar component"
```

---

### Task 4: Wire Refresh Behavior Into Request Logs Page

**Files:**
- Modify: `src/app/dashboard/admin/request-logs/_components/request-logs-content.tsx`

- [ ] **Step 1: Remove toolbar-only imports**

Change the lucide import from:

```ts
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, ExternalLink, FileText, Search, ShieldAlert, Timer } from "lucide-react"
```

to:

```ts
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, Download, ExternalLink, FileText, ShieldAlert, Timer } from "lucide-react"
```

Remove these imports because the toolbar component owns them now:

```ts
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
```

Add this local component import:

```ts
import { RequestLogToolbar } from "./request-log-toolbar"
```

- [ ] **Step 2: Add auto-refresh state**

After the existing filter state declarations:

```ts
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>("24h")
  const [sheetLogId, setSheetLogId] = useState<string | null>(selectedLogId)
```

change to:

```ts
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>("24h")
  const [autoRefreshMs, setAutoRefreshMs] = useState<number | null>(null)
  const [sheetLogId, setSheetLogId] = useState<string | null>(selectedLogId)
```

- [ ] **Step 3: Add manual and interval refresh logic**

After these existing lines:

```ts
  const data = logs.data ?? initialLogs
  const overviewData = overview.data ?? initialOverview
```

add:

```ts
  const isRefreshing = logs.isRefetching || overview.isRefetching || (Boolean(sheetLogId) && detail.isRefetching)
  const refreshRequestLogs = () => {
    void logs.refetch()
    void overview.refetch()

    if (sheetLogId) {
      void detail.refetch()
    }
  }

  useEffect(() => {
    if (!autoRefreshMs) {
      return
    }

    const intervalId = window.setInterval(() => {
      refreshRequestLogs()
    }, autoRefreshMs)

    return () => window.clearInterval(intervalId)
  }, [autoRefreshMs, detail.refetch, logs.refetch, overview.refetch, sheetLogId])
```

This intentionally keeps refresh non-blocking. Failed refetches are shown by the existing query error UI.

- [ ] **Step 4: Replace the inline search/filter grid with the toolbar**

Replace this block:

```tsx
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_repeat(4,150px)]">
            <div className="relative min-w-0">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="搜索请求日志"
                className="pl-9"
                onChange={(event) => {
                  setSearch(event.target.value)
                  resetPage()
                }}
                placeholder="搜索用户、路径、requestId、完整 IP 或 User-Agent"
                value={search}
              />
            </div>
            <FilterMenu label={timeRangeLabels[timeRange]} onSelect={(value) => setTimeRange(value as TimeRangeFilter)} options={timeRangeLabels} resetPage={resetPage} />
            <FilterMenu label={resultLabels[result]} onSelect={(value) => setResult(value as ResultFilter)} options={resultLabels} resetPage={resetPage} />
            <FilterMenu label={riskLabels[risk]} onSelect={(value) => setRisk(value as RiskFilter)} options={riskLabels} resetPage={resetPage} />
            <FilterMenu label={sourceLabels[source]} onSelect={(value) => setSource(value as SourceFilter)} options={sourceLabels} resetPage={resetPage} />
          </div>
```

with:

```tsx
          <RequestLogToolbar
            autoRefreshMs={autoRefreshMs}
            isRefreshing={isRefreshing}
            onAutoRefreshChange={setAutoRefreshMs}
            onRefresh={refreshRequestLogs}
            onResultChange={setResult}
            onRiskChange={setRisk}
            onSearchChange={setSearch}
            onSourceChange={setSource}
            onTimeRangeChange={setTimeRange}
            resetPage={resetPage}
            result={result}
            risk={risk}
            search={search}
            source={source}
            timeRange={timeRange}
          />
```

- [ ] **Step 5: Remove the old inline `FilterMenu` component**

Delete the `const FilterMenu = ...` component from `request-logs-content.tsx`; it is now implemented in `request-log-toolbar.tsx`.

- [ ] **Step 6: Run formatter and typecheck**

Run:

```bash
pnpm check:write
pnpm typecheck
```

Expected: both commands PASS.

- [ ] **Step 7: Commit the behavior wiring**

```bash
git add src/app/dashboard/admin/request-logs/_components/request-logs-content.tsx src/app/dashboard/admin/request-logs/_components/request-log-toolbar.tsx
git commit -m "feat: wire request log refresh controls"
```

---

### Task 5: Verify E2E And Build

**Files:**
- No new file changes expected unless verification exposes a real issue.

- [ ] **Step 1: Run focused request logs E2E**

Run:

```bash
pnpm test:e2e e2e/specs/19-dashboard-admin-request-logs.spec.ts --project=chromium
```

Expected: PASS. The original detail test and the new refresh-control test both pass.

- [ ] **Step 2: Run repository checks**

Run:

```bash
pnpm typecheck
pnpm check
pnpm build
```

Expected: all PASS.

- [ ] **Step 3: Inspect changed files**

Run:

```bash
git diff --stat
git diff -- e2e/specs/19-dashboard-admin-request-logs.spec.ts src/app/dashboard/admin/request-logs/_components/request-log-labels.ts src/app/dashboard/admin/request-logs/_components/request-log-toolbar.tsx src/app/dashboard/admin/request-logs/_components/request-logs-content.tsx
```

Expected: only the E2E spec and request-log page component files changed for this feature. Existing PRD/design changes remain intact.

- [ ] **Step 4: Final commit if verification changes were needed**

If Step 1 or Step 2 required fixes after the Task 4 commit, commit those fixes:

```bash
git add e2e/specs/19-dashboard-admin-request-logs.spec.ts src/app/dashboard/admin/request-logs/_components/request-log-labels.ts src/app/dashboard/admin/request-logs/_components/request-log-toolbar.tsx src/app/dashboard/admin/request-logs/_components/request-logs-content.tsx
git commit -m "fix: stabilize request log refresh controls"
```

---

## Self-Review

- Spec coverage: The plan covers the requested manual refresh icon button, the timed refresh icon button, dropdown options for off/10s/30s/1m/5m, list and overview refresh, and open-detail refresh.
- PRD/design coverage: `prd/19-dashboard-admin-request-logs.md` and `prd/dashboard-logs-design.pen` already include this UI and behavior; coding tasks do not need new product changes unless implementation discovers a design conflict.
- Security coverage: No new server API or authorization surface is introduced; existing admin tRPC authorization remains unchanged.
- Test coverage: E2E verifies visible controls, menu options, and selected interval label. Existing E2E still verifies seeded logs and detail display.
- Component size coverage: Extracting labels and toolbar keeps `request-logs-content.tsx` below the 500-line guidance while making the new toolbar independently readable.
