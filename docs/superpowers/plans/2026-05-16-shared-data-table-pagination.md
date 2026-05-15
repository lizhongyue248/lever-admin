# Shared Data Table And Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace page-local pagination and hand-written desktop tables with shared components under `src/components`, using TanStack Table for table rendering and the approved `prd/component-design.pen` pagination design.

**Architecture:** Create two reusable client components: `DataPagination` for page navigation and `DataTable` for TanStack-powered desktop tables. Route-local files keep domain-specific column definitions, mobile card rendering, mutations, drawers, and filters; shared components own layout, accessibility, sticky headers, scrolling, page-size menu, first/previous/next/last buttons, and page input submission.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict mode, tRPC, `@tanstack/react-table`, shadcn/ui primitives, lucide-react icons, Playwright E2E, Biome.

---

## Scope

Implement shared components and migrate these areas:

- Request logs table and pagination.
- Admin users desktop table and pagination.
- Admin API Keys desktop table and pagination.
- Personal API Keys desktop table and pagination.
- Admin organizations card-list pagination.
- Settings sessions client-side pagination.
- Organization invitation, organization member, and organization auth desktop tables.
- API Key usage-log tables in personal and admin detail pages.

Do not migrate notification menu pagination because it is not a visible table/list pagination control. Do not change database schemas or run Drizzle migration commands.

## File Structure

- Create `src/components/data-pagination.tsx`
  - Shared pagination UI.
  - Props: current page, page count, total, current item count, optional page size, optional page-size options, disabled/loading state, and callbacks.
  - Owns numeric input state and Enter-to-jump behavior.

- Create `src/components/data-table.tsx`
  - Shared TanStack table shell.
  - Props: `columns`, `data`, `getRowId`, `onRowClick`, `minWidth`, `maxHeight`, `empty`, `rowTestId`.
  - Owns `useReactTable`, `getCoreRowModel`, `flexRender`, sticky header, and single scroll viewport.

- Modify `src/app/dashboard/admin/request-logs/_components/request-logs-table.tsx`
  - Remove local `useReactTable` setup and render desktop rows through `DataTable`.
  - Keep mobile card list in the route file.

- Modify `src/app/dashboard/admin/request-logs/_components/request-logs-content.tsx`
  - Remove local `Pagination`.
  - Use `DataPagination` with page-size options `[10, 20, 50]`.

- Modify `src/app/dashboard/admin/users/_components/admin-users-content.tsx`
  - Convert `AdminUsersTable` desktop branch to `DataTable`.
  - Replace inline pagination with `DataPagination`.

- Modify `src/app/dashboard/admin/api-keys/_components/admin-api-keys-content.tsx`
  - Convert `AdminApiKeysTable` desktop branch to `DataTable`.
  - Replace inline pagination with `DataPagination`.

- Modify `src/app/dashboard/settings/api-keys/_components/personal-api-keys-content.tsx`
  - Convert `ApiKeysTable` desktop branch to `DataTable`.
  - Replace inline pagination with `DataPagination`.

- Modify `src/app/dashboard/admin/orgs/_components/admin-orgs-content.tsx`
  - Keep card list layout.
  - Replace inline pagination with `DataPagination` using no page-size selector.

- Modify `src/app/dashboard/settings/sessions/_components/session-list.tsx`
  - Keep session grid/card list.
  - Replace local `Pagination` with `DataPagination` using no page-size selector.

- Modify `src/app/dashboard/orgs/[slug]/_components/org-invite-content.tsx`
  - Convert desktop invitation table to `DataTable`.
  - Replace disabled placeholder pager with `DataPagination`.

- Modify `src/app/dashboard/orgs/[slug]/_components/org-information-content.tsx`
  - Convert desktop member table to `DataTable`.
  - Replace disabled placeholder pager with `DataPagination`.

- Modify `src/app/dashboard/orgs/[slug]/_components/org-auth-content.tsx`
  - Convert desktop session table to `DataTable`.
  - Replace disabled placeholder pager with `DataPagination`.

- Modify `src/app/dashboard/admin/api-keys/_components/admin-api-key-detail-content.tsx`
  - Convert `UsageLogTable` to `DataTable`.

- Modify `src/app/dashboard/settings/api-keys/_components/api-key-detail-content.tsx`
  - Convert `UsageLogTable` to `DataTable`.

- Modify PRDs that describe changed visible behavior:
  - `prd/09-dashboard-settings-sessions.md`
  - `prd/12-dashboard-admin-users.md`
  - `prd/14-dashboard-admin-api-keys.md`
  - `prd/15-dashboard-admin-orgs.md`
  - `prd/16-dashboard-settings-api-keys.md`
  - `prd/19-dashboard-admin-request-logs.md`
  - Organization page PRDs matching invite, information, and auth pages if present.

- Modify E2E specs:
  - `e2e/specs/09-dashboard-settings-sessions.spec.ts`
  - `e2e/specs/12-dashboard-admin-users.spec.ts`
  - `e2e/specs/14-dashboard-admin-api-keys.spec.ts`
  - `e2e/specs/15-dashboard-admin-orgs.spec.ts`
  - `e2e/specs/16-dashboard-settings-api-keys.spec.ts`
  - `e2e/specs/19-dashboard-admin-request-logs.spec.ts`

---

### Task 1: PRD And E2E Acceptance Updates

**Files:**
- Modify: `prd/19-dashboard-admin-request-logs.md`
- Modify: `prd/12-dashboard-admin-users.md`
- Modify: `prd/14-dashboard-admin-api-keys.md`
- Modify: `prd/15-dashboard-admin-orgs.md`
- Modify: `prd/16-dashboard-settings-api-keys.md`
- Modify: `prd/09-dashboard-settings-sessions.md`
- Modify: `e2e/specs/19-dashboard-admin-request-logs.spec.ts`

- [ ] **Step 1: Update request logs PRD with shared pagination behavior**

Add this implementation note to `prd/19-dashboard-admin-request-logs.md` under table and pagination implementation notes:

```markdown
- 分页控件使用 `src/components/data-pagination.tsx` 的共享 `DataPagination`。
- 分页操作区包含首页、上一页、下一页、末页四个图标按钮；按钮需要有可访问名称。
- 当前页使用数字输入框展示，用户输入页码后按 Enter 跳转到指定页；小于 1 的输入按 1 处理，大于总页数的输入按最后一页处理，非法输入恢复到当前页。
- 每页条数下拉仍支持 10、20、50；切换每页条数后回到第一页。
- 桌面表格使用 `src/components/data-table.tsx` 的共享 `DataTable`，内部必须基于 `@tanstack/react-table`。
```

- [ ] **Step 2: Update other page PRDs with shared pagination/table behavior**

Add concise implementation notes to each PRD listed in Task 1:

```markdown
- 桌面表格使用共享 `DataTable`，基于 TanStack Table 渲染表头、行和单元格。
- 分页控件使用共享 `DataPagination`；首页、上一页、下一页、末页为图标按钮，页码输入框支持输入后按 Enter 跳转。
```

For card-list pages such as admin organizations and settings sessions, use this version:

```markdown
- 列表分页控件使用共享 `DataPagination`；首页、上一页、下一页、末页为图标按钮，页码输入框支持输入后按 Enter 跳转。
```

- [ ] **Step 3: Extend request logs E2E as the RED test for shared pagination**

In `e2e/specs/19-dashboard-admin-request-logs.spec.ts`, extend the existing `"defaults to 10 rows per page and switches page size"` test after the existing page-size assertion:

```ts
await expect(page.getByRole("button", { name: "首页" })).toBeDisabled()
await expect(page.getByRole("button", { name: "上一页" })).toBeDisabled()
await expect(page.getByRole("spinbutton", { name: "当前页" })).toHaveValue("1")
await expect(page.getByText("/ 1")).toBeVisible()

await page.getByRole("button", { name: "每页条数：50 条" }).click()
await page.getByRole("menuitem", { name: "每页 10 条" }).click()
await expect(page.getByText("显示 10 / 25")).toBeVisible()
await expect(page.getByText("/ 3")).toBeVisible()

await page.getByRole("button", { name: "末页" }).click()
await expect(page.getByRole("spinbutton", { name: "当前页" })).toHaveValue("3")
await expect(page.locator('[data-testid^="request-log-row-"]')).toHaveCount(5)

await page.getByRole("spinbutton", { name: "当前页" }).fill("2")
await page.getByRole("spinbutton", { name: "当前页" }).press("Enter")
await expect(page.getByRole("spinbutton", { name: "当前页" })).toHaveValue("2")
await expect(page.locator('[data-testid^="request-log-row-"]')).toHaveCount(10)

await page.getByRole("button", { name: "首页" }).click()
await expect(page.getByRole("spinbutton", { name: "当前页" })).toHaveValue("1")
```

- [ ] **Step 4: Run RED request logs E2E**

Run:

```bash
pnpm test:e2e e2e/specs/19-dashboard-admin-request-logs.spec.ts --project=chromium --grep "defaults to 10 rows"
```

Expected: FAIL because `DataPagination` does not exist and the current pagination has text previous/next buttons without first/last or page input.

---

### Task 2: Shared `DataPagination`

**Files:**
- Create: `src/components/data-pagination.tsx`
- Modify: `src/app/dashboard/admin/request-logs/_components/request-logs-content.tsx`

- [ ] **Step 1: Create `DataPagination`**

Create `src/components/data-pagination.tsx`:

```tsx
"use client"

import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type PageSizeOption = 10 | 20 | 50

type DataPaginationProps = {
  className?: string
  disabled?: boolean
  itemCount: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: PageSizeOption) => void
  page: number
  pageCount: number
  pageSize?: PageSizeOption
  pageSizeOptions?: readonly PageSizeOption[]
  total: number
}

const clampPage = (value: number, pageCount: number) => Math.min(Math.max(value, 1), Math.max(pageCount, 1))

const formatRange = ({ itemCount, page, pageSize, total }: { itemCount: number; page: number; pageSize?: number; total: number }) => {
  if (!pageSize) {
    return `显示 ${itemCount} / ${total}`
  }

  if (total === 0) {
    return "显示 0 / 0"
  }

  const start = (page - 1) * pageSize + 1
  const end = start + Math.max(itemCount - 1, 0)

  return `显示 ${start}-${end} / ${total}`
}

export const DataPagination = ({
  className,
  disabled = false,
  itemCount,
  onPageChange,
  onPageSizeChange,
  page,
  pageCount,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  total
}: DataPaginationProps) => {
  const [pageInput, setPageInput] = useState(page.toString())
  const normalizedPageCount = Math.max(pageCount, 1)
  const canPrevious = !disabled && page > 1
  const canNext = !disabled && page < normalizedPageCount

  useEffect(() => {
    setPageInput(page.toString())
  }, [page])

  const submitPage = () => {
    const nextPage = Number.parseInt(pageInput, 10)

    if (Number.isNaN(nextPage)) {
      setPageInput(page.toString())
      return
    }

    const clamped = clampPage(nextPage, normalizedPageCount)
    setPageInput(clamped.toString())
    onPageChange(clamped)
  }

  return (
    <div className={cn("flex flex-col gap-3 text-muted-foreground text-xs sm:flex-row sm:items-center sm:justify-between", className)}>
      <span>{formatRange({ itemCount, page, pageSize, total })}</span>
      <div className="flex flex-wrap items-center gap-2">
        {pageSize && onPageSizeChange ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label={`每页条数：${pageSize} 条`} className="h-9 gap-1.5 text-foreground" disabled={disabled} type="button" variant="outline">
                每页 {pageSize} 条
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {pageSizeOptions.map((option) => (
                <DropdownMenuItem key={option} onSelect={() => onPageSizeChange(option)}>
                  <span className="flex w-5 items-center">{option === pageSize ? <Check className="size-4" /> : null}</span>
                  每页 {option} 条
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <Button aria-label="首页" disabled={!canPrevious} onClick={() => onPageChange(1)} size="icon-sm" type="button" variant="outline">
          <ChevronsLeft className="size-4" />
        </Button>
        <Button aria-label="上一页" disabled={!canPrevious} onClick={() => onPageChange(page - 1)} size="icon-sm" type="button" variant="outline">
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Input
            aria-label="当前页"
            className="h-9 w-14 text-center"
            disabled={disabled}
            inputMode="numeric"
            min={1}
            onChange={(event) => setPageInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                submitPage()
              }
            }}
            type="number"
            value={pageInput}
          />
          <span>{`/ ${normalizedPageCount}`}</span>
        </div>
        <Button aria-label="下一页" disabled={!canNext} onClick={() => onPageChange(page + 1)} size="icon-sm" type="button" variant="outline">
          <ChevronRight className="size-4" />
        </Button>
        <Button aria-label="末页" disabled={!canNext} onClick={() => onPageChange(normalizedPageCount)} size="icon-sm" type="button" variant="outline">
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace request logs local pagination**

In `src/app/dashboard/admin/request-logs/_components/request-logs-content.tsx`, import `DataPagination`:

```tsx
import { DataPagination } from "@/components/data-pagination"
```

Replace:

```tsx
<Pagination data={data} isFetching={logs.isFetching} pageSize={pageSize} setPage={setPage} setPageSize={setPageSize} />
```

with:

```tsx
<DataPagination
  disabled={logs.isFetching}
  itemCount={data.items.length}
  onPageChange={setPage}
  onPageSizeChange={(nextPageSize) => {
    setPageSize(nextPageSize)
    setPage(1)
  }}
  page={data.page}
  pageCount={data.pageCount}
  pageSize={pageSize}
  pageSizeOptions={pageSizeOptions}
  total={data.total}
/>
```

Delete the local `Pagination` component and remove unused imports: `Check`, `ChevronLeft`, and `ChevronRight` if they are no longer used in the file.

- [ ] **Step 3: Run GREEN request logs E2E**

Run:

```bash
pnpm test:e2e e2e/specs/19-dashboard-admin-request-logs.spec.ts --project=chromium --grep "defaults to 10 rows"
```

Expected: PASS.

- [ ] **Step 4: Run formatter and typecheck for shared pagination**

Run:

```bash
pnpm check
pnpm typecheck
```

Expected: both commands exit 0.

---

### Task 3: Shared `DataTable`

**Files:**
- Create: `src/components/data-table.tsx`
- Modify: `src/app/dashboard/admin/request-logs/_components/request-logs-table.tsx`
- Modify: `e2e/specs/19-dashboard-admin-request-logs.spec.ts`

- [ ] **Step 1: Add a request logs assertion that proves sticky header and single scroll viewport remain**

Keep the existing request logs assertions for `request-log-list-scroll`, `request-log-table-viewport`, and `request-log-table-header`. Add one assertion to verify the shared table exists:

```ts
await expect(page.getByTestId("data-table-scroll")).toBeVisible()
```

Run:

```bash
pnpm test:e2e e2e/specs/19-dashboard-admin-request-logs.spec.ts --project=chromium --grep "defaults to 10 rows"
```

Expected: FAIL because the shared `DataTable` test id does not exist.

- [ ] **Step 2: Create `DataTable`**

Create `src/components/data-table.tsx`:

```tsx
"use client"

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import type { ReactNode } from "react"

import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type DataTableProps<TData> = {
  columns: Array<ColumnDef<TData>>
  data: TData[]
  empty?: ReactNode
  getRowId?: (row: TData) => string
  maxHeightClassName?: string
  minWidthClassName?: string
  onRowClick?: (row: TData) => void
  rowTestId?: (row: TData) => string
}

export const DataTable = <TData,>({
  columns,
  data,
  empty,
  getRowId,
  maxHeightClassName = "max-h-[560px]",
  minWidthClassName = "min-w-[960px]",
  onRowClick,
  rowTestId
}: DataTableProps<TData>) => {
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getRowId
  })

  if (data.length === 0 && empty) {
    return <>{empty}</>
  }

  return (
    <div className="rounded-lg border" data-testid="request-log-table-viewport">
      <div className={cn(maxHeightClassName, "overflow-auto [scrollbar-gutter:stable]")} data-testid="data-table-scroll">
        <table className={cn("w-full caption-bottom text-sm", minWidthClassName)}>
          <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80" data-testid="request-log-table-header">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead className="whitespace-nowrap" key={header.id} style={{ minWidth: header.getSize(), width: header.getSize() }}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                className={cn(onRowClick && "cursor-pointer")}
                data-testid={rowTestId?.(row.original)}
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} style={{ minWidth: cell.column.getSize(), width: cell.column.getSize() }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
    </div>
  )
}
```

After request logs are green, rename generic test ids away from request-log-specific names in a follow-up step:

```tsx
viewportTestId = "data-table-viewport"
headerTestId = "data-table-header"
scrollTestId = "data-table-scroll"
```

Then pass request-log-specific aliases only where E2E still requires them.

- [ ] **Step 3: Migrate request logs table to `DataTable`**

In `src/app/dashboard/admin/request-logs/_components/request-logs-table.tsx`:

- Keep `columns` and `useMemo`.
- Remove `getCoreRowModel`, `useReactTable`, `flexRender`, and local `<table>` rendering.
- Import:

```tsx
import { DataTable } from "@/components/data-table"
```

Return this desktop branch:

```tsx
return (
  <DataTable
    columns={columns}
    data={items}
    getRowId={(row) => row.id}
    minWidthClassName="min-w-[1190px]"
    onRowClick={(row) => onOpen(row.id)}
    rowTestId={(row) => `request-log-row-${row.id}`}
  />
)
```

- [ ] **Step 4: Run GREEN request logs E2E**

Run:

```bash
pnpm test:e2e e2e/specs/19-dashboard-admin-request-logs.spec.ts --project=chromium
```

Expected: PASS.

---

### Task 4: Admin Users Migration

**Files:**
- Modify: `src/app/dashboard/admin/users/_components/admin-users-content.tsx`
- Modify: `e2e/specs/12-dashboard-admin-users.spec.ts`

- [ ] **Step 1: Add RED E2E for icon pagination and page input on admin users**

In `e2e/specs/12-dashboard-admin-users.spec.ts`, add assertions after the user list is visible:

```ts
await expect(page.getByRole("button", { name: "首页" })).toBeVisible()
await expect(page.getByRole("button", { name: "上一页" })).toBeVisible()
await expect(page.getByRole("spinbutton", { name: "当前页" })).toHaveValue("1")
await expect(page.getByRole("button", { name: "下一页" })).toBeVisible()
await expect(page.getByRole("button", { name: "末页" })).toBeVisible()
await expect(page.getByTestId("data-table-scroll")).toBeVisible()
```

Run:

```bash
pnpm test:e2e e2e/specs/12-dashboard-admin-users.spec.ts --project=chromium
```

Expected: FAIL because admin users still uses local pagination and a hand-written table.

- [ ] **Step 2: Convert `AdminUsersTable` to `DataTable`**

In `admin-users-content.tsx`, import:

```tsx
import type { ColumnDef } from "@tanstack/react-table"
import { DataPagination } from "@/components/data-pagination"
import { DataTable } from "@/components/data-table"
```

Inside `AdminUsersTable`, define columns:

```tsx
const columns: Array<ColumnDef<UserRow>> = [
  {
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name}</div>
        <div className="text-muted-foreground text-xs">{row.original.email}</div>
      </div>
    ),
    header: "用户",
    size: 260
  },
  {
    cell: ({ row }) => roleLabel(row.original.role),
    header: "角色",
    size: 120
  },
  {
    cell: ({ row }) => <Badge variant={row.original.status === "banned" ? "destructive" : "secondary"}>{row.original.status === "banned" ? "已封禁" : "正常"}</Badge>,
    header: "状态",
    size: 120
  },
  {
    cell: ({ row }) => (row.original.emailVerified ? "已验证" : "未验证"),
    header: "邮箱验证",
    size: 120
  },
  {
    cell: ({ row }) => formatDate(row.original.createdAt),
    header: "创建时间",
    size: 140
  },
  {
    cell: ({ row }) => <AdminUserRowActions user={row.original} />,
    header: "操作",
    size: 100
  }
]
```

Render:

```tsx
<DataTable columns={columns} data={items} getRowId={(row) => row.id} minWidthClassName="min-w-[860px]" onRowClick={(row) => onOpen(row.id)} rowTestId={(row) => `admin-user-row-${row.id}`} />
```

Keep the mobile card branch unchanged.

- [ ] **Step 3: Replace admin users pagination**

Replace the inline pagination footer with:

```tsx
<DataPagination disabled={users.isFetching} itemCount={data.items.length} onPageChange={setPage} page={data.page} pageCount={data.pageCount} pageSize={20} total={data.total} />
```

Pass no `onPageSizeChange`, so the component does not render the page-size menu.

- [ ] **Step 4: Run admin users E2E**

Run:

```bash
pnpm test:e2e e2e/specs/12-dashboard-admin-users.spec.ts --project=chromium
```

Expected: PASS.

---

### Task 5: API Key List Migrations

**Files:**
- Modify: `src/app/dashboard/admin/api-keys/_components/admin-api-keys-content.tsx`
- Modify: `src/app/dashboard/settings/api-keys/_components/personal-api-keys-content.tsx`
- Modify: `e2e/specs/14-dashboard-admin-api-keys.spec.ts`
- Modify: `e2e/specs/16-dashboard-settings-api-keys.spec.ts`

- [ ] **Step 1: Add RED E2E assertions for both API Key pages**

In both E2E files, after the list page is visible, assert:

```ts
await expect(page.getByTestId("data-table-scroll")).toBeVisible()
await expect(page.getByRole("button", { name: "首页" })).toBeVisible()
await expect(page.getByRole("button", { name: "上一页" })).toBeVisible()
await expect(page.getByRole("spinbutton", { name: "当前页" })).toBeVisible()
await expect(page.getByRole("button", { name: "下一页" })).toBeVisible()
await expect(page.getByRole("button", { name: "末页" })).toBeVisible()
```

Run:

```bash
pnpm test:e2e e2e/specs/14-dashboard-admin-api-keys.spec.ts --project=chromium
pnpm test:e2e e2e/specs/16-dashboard-settings-api-keys.spec.ts --project=chromium
```

Expected: FAIL before migration.

- [ ] **Step 2: Migrate platform API Key table**

In `admin-api-keys-content.tsx`, import `ColumnDef`, `DataTable`, and `DataPagination`. Replace `AdminApiKeysTable` desktop branch with columns equivalent to the current headers:

```tsx
const columns: Array<ColumnDef<AdminApiKeyItem>> = [
  {
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name}</div>
        <div className="text-muted-foreground text-xs">{row.original.maskedKey}</div>
      </div>
    ),
    header: "名称",
    size: 240
  },
  {
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.owner.label}</div>
        <div className="text-muted-foreground text-xs">{ownerTypeLabel(row.original.owner.type)}</div>
      </div>
    ),
    header: "所属主体",
    size: 180
  },
  { cell: ({ row }) => formatExpiresAt(row.original.expiresAt), header: "过期时间", size: 130 },
  { cell: ({ row }) => formatDate(row.original.lastRequest), header: "最后使用", size: 130 },
  {
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        <AdminApiKeyStatusBadge status={row.original.status} />
        <AdminApiKeyRiskBadge risk={row.original.risk} />
      </div>
    ),
    header: "状态",
    size: 180
  },
  { cell: ({ row }) => <AdminApiKeyRowActions apiKey={row.original} onOpen={() => onOpen(row.original.id)} />, header: "操作", size: 110 }
]
```

Use:

```tsx
<DataTable columns={columns} data={items} getRowId={(row) => row.id} minWidthClassName="min-w-[970px]" onRowClick={(row) => onOpen(row.id)} rowTestId={(row) => `admin-api-key-row-${row.id}`} />
```

Replace inline pagination with:

```tsx
<DataPagination disabled={keys.isFetching} itemCount={data.items.length} onPageChange={setPage} page={data.page} pageCount={data.pageCount} pageSize={20} total={data.total} />
```

- [ ] **Step 3: Migrate personal API Key table**

In `personal-api-keys-content.tsx`, use equivalent columns:

```tsx
const columns: Array<ColumnDef<ApiKeyItem>> = [
  {
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name}</div>
        <div className="text-muted-foreground text-xs">{row.original.maskedKey}</div>
      </div>
    ),
    header: "名称",
    size: 240
  },
  { cell: ({ row }) => formatDate(row.original.createdAt), header: "创建时间", size: 130 },
  { cell: ({ row }) => formatExpiresAt(row.original.expiresAt), header: "过期时间", size: 130 },
  { cell: ({ row }) => formatDate(row.original.lastRequest), header: "最后使用", size: 130 },
  {
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        <ApiKeyStatusBadge status={row.original.status} />
        <ApiKeyRiskBadge risk={row.original.risk} />
      </div>
    ),
    header: "状态",
    size: 180
  },
  { cell: ({ row }) => <ApiKeyRowActions apiKey={row.original} onOpen={() => onOpen(row.original.id)} />, header: "操作", size: 110 }
]
```

Use:

```tsx
<DataTable columns={columns} data={items} getRowId={(row) => row.id} minWidthClassName="min-w-[920px]" onRowClick={(row) => onOpen(row.id)} rowTestId={(row) => `api-key-row-${row.id}`} />
```

Replace inline pagination with `DataPagination` using `pageSize={20}` and no `onPageSizeChange`.

- [ ] **Step 4: Run API Key E2E**

Run:

```bash
pnpm test:e2e e2e/specs/14-dashboard-admin-api-keys.spec.ts --project=chromium
pnpm test:e2e e2e/specs/16-dashboard-settings-api-keys.spec.ts --project=chromium
```

Expected: PASS.

---

### Task 6: Card/List Pagination Consumers

**Files:**
- Modify: `src/app/dashboard/admin/orgs/_components/admin-orgs-content.tsx`
- Modify: `src/app/dashboard/settings/sessions/_components/session-list.tsx`
- Modify: `e2e/specs/15-dashboard-admin-orgs.spec.ts`
- Modify: `e2e/specs/09-dashboard-settings-sessions.spec.ts`

- [ ] **Step 1: Add RED E2E for admin orgs and sessions pagination UI**

In both E2E files, assert:

```ts
await expect(page.getByRole("button", { name: "首页" })).toBeVisible()
await expect(page.getByRole("button", { name: "上一页" })).toBeVisible()
await expect(page.getByRole("spinbutton", { name: "当前页" })).toBeVisible()
await expect(page.getByRole("button", { name: "下一页" })).toBeVisible()
await expect(page.getByRole("button", { name: "末页" })).toBeVisible()
```

Run:

```bash
pnpm test:e2e e2e/specs/15-dashboard-admin-orgs.spec.ts --project=chromium
pnpm test:e2e e2e/specs/09-dashboard-settings-sessions.spec.ts --project=chromium
```

Expected: FAIL before migration.

- [ ] **Step 2: Replace admin orgs pagination**

In `admin-orgs-content.tsx`, import `DataPagination` and replace the existing `‹` / `›` footer with:

```tsx
<DataPagination disabled={organizations.isFetching} itemCount={data.items.length} onPageChange={setPage} page={data.page} pageCount={data.pageCount} pageSize={12} total={data.total} />
```

- [ ] **Step 3: Replace settings sessions pagination**

In `session-list.tsx`, delete the local `Pagination` component and render:

```tsx
<DataPagination itemCount={visibleSessions.length} onPageChange={setCurrentPage} page={currentPage} pageCount={pageCount} pageSize={PAGE_SIZE} total={sessions.length} />
```

Keep `previousPage` and `nextPage` only if still used elsewhere; otherwise delete them.

- [ ] **Step 4: Run E2E**

Run:

```bash
pnpm test:e2e e2e/specs/15-dashboard-admin-orgs.spec.ts --project=chromium
pnpm test:e2e e2e/specs/09-dashboard-settings-sessions.spec.ts --project=chromium
```

Expected: PASS.

---

### Task 7: Organization Tables

**Files:**
- Modify: `src/app/dashboard/orgs/[slug]/_components/org-invite-content.tsx`
- Modify: `src/app/dashboard/orgs/[slug]/_components/org-information-content.tsx`
- Modify: `src/app/dashboard/orgs/[slug]/_components/org-auth-content.tsx`

- [ ] **Step 1: Convert invitation table to `DataTable`**

In `org-invite-content.tsx`, import `ColumnDef`, `DataTable`, and `DataPagination`. Build columns:

```tsx
const columns: Array<ColumnDef<InvitationData["items"][number]>> = [
  { cell: ({ row }) => <span className="font-medium">{row.original.email}</span>, header: "邮箱", size: 220 },
  { cell: ({ row }) => row.original.role, header: "角色", size: 110 },
  { cell: ({ row }) => row.original.departmentName ?? "未指定", header: "目标部门", size: 140 },
  { cell: ({ row }) => row.original.inviterName || row.original.inviterEmail, header: "邀请人", size: 160 },
  { cell: ({ row }) => formatDate(row.original.expiresAt), header: "过期时间", size: 140 },
  {
    cell: ({ row }) => {
      const statusMeta = getInvitationStatusMeta(row.original.status)
      return <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
    },
    header: "状态",
    size: 110
  }
]
```

Use `DataTable` for the desktop branch and keep mobile cards unchanged. Replace the disabled pager with:

```tsx
<DataPagination itemCount={invitations.data.items.length} onPageChange={() => undefined} page={invitations.data.page} pageCount={invitations.data.pageCount} pageSize={10} total={invitations.data.total} />
```

If the router currently returns no `total`, first add `total` to the router result or use `total={invitations.data.items.length}` for this first migration.

- [ ] **Step 2: Convert organization member table to `DataTable`**

Use columns:

```tsx
const columns: Array<ColumnDef<MemberItem>> = [
  {
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name}</div>
        <div className="text-muted-foreground text-xs">{row.original.email}</div>
      </div>
    ),
    header: "成员",
    size: 220
  },
  { cell: ({ row }) => <Badge variant="secondary">{row.original.role}</Badge>, header: "角色", size: 100 },
  { cell: ({ row }) => row.original.departmentNames, header: "所属部门", size: 160 },
  { cell: ({ row }) => formatDate(row.original.joinedAt), header: "加入时间", size: 130 },
  { cell: ({ row }) => formatRelativeTime(row.original.lastLoginAt), header: "最后登录", size: 130 },
  { cell: () => "正常", header: "安全状态", size: 110 },
  {
    cell: ({ row }) => <MemberRowActions item={row.original} />,
    header: "操作",
    size: 110
  }
]
```

Extract the existing assign/remove buttons into a local `MemberRowActions` component to keep the column readable. Replace disabled pager with `DataPagination`.

- [ ] **Step 3: Convert organization auth table to `DataTable`**

Use columns:

```tsx
const columns: Array<ColumnDef<AuthData["items"][number]>> = [
  {
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name}</div>
        <div className="text-muted-foreground text-xs">{row.original.email}</div>
      </div>
    ),
    header: "成员",
    size: 220
  },
  {
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <MonitorSmartphone className="size-4 text-muted-foreground" />
        <span>{`${row.original.deviceLabel} · ${row.original.browserLabel}`}</span>
      </div>
    ),
    header: "设备",
    size: 220
  },
  { cell: ({ row }) => row.original.ipAddress ?? "未知位置", header: "位置", size: 160 },
  { cell: ({ row }) => formatRelativeTime(row.original.lastActiveAt), header: "最后活跃", size: 140 },
  { cell: () => <Badge variant="secondary">正常</Badge>, header: "风险", size: 100 }
]
```

Replace disabled pager with `DataPagination`.

- [ ] **Step 4: Run focused checks**

Run:

```bash
pnpm typecheck
pnpm check
```

Expected: PASS.

---

### Task 8: API Key Detail Usage Log Tables

**Files:**
- Modify: `src/app/dashboard/admin/api-keys/_components/admin-api-key-detail-content.tsx`
- Modify: `src/app/dashboard/settings/api-keys/_components/api-key-detail-content.tsx`

- [ ] **Step 1: Convert admin API Key usage log table**

Replace the local `UsageLogTable` table body with `DataTable` columns:

```tsx
const columns: Array<ColumnDef<LogItem>> = [
  { cell: ({ row }) => formatDateTime(row.original.createdAt), header: "时间", size: 150 },
  {
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.method ?? "GET"}</div>
        <div className="max-w-[220px] truncate text-muted-foreground text-xs">{row.original.routeName ?? row.original.path ?? "-"}</div>
      </div>
    ),
    header: "请求",
    size: 260
  },
  {
    cell: ({ row }) => (
      <div>
        <div>{row.original.success ? "成功" : "失败"}</div>
        <div className="text-muted-foreground text-xs">{row.original.statusCode ?? row.original.errorCode ?? row.original.failureReason ?? "-"}</div>
      </div>
    ),
    header: "结果",
    size: 130
  },
  { cell: ({ row }) => row.original.ipRegion ?? row.original.ipCountry ?? "隐藏", header: "IP", size: 140 },
  { cell: ({ row }) => row.original.userAgentSummary ?? "隐藏", header: "User-Agent", size: 220 }
]
```

Use:

```tsx
<DataTable columns={columns} data={items} getRowId={(row) => row.id} maxHeightClassName="max-h-[420px]" minWidthClassName="min-w-[900px]" />
```

- [ ] **Step 2: Convert personal API Key usage log table**

Use the same `DataTable` pattern. For IP, keep the current personal behavior:

```tsx
{ cell: ({ row }) => row.original.ipCountry ?? "隐藏", header: "IP", size: 140 }
```

- [ ] **Step 3: Run API Key detail checks**

Run:

```bash
pnpm test:e2e e2e/specs/14-dashboard-admin-api-keys.spec.ts --project=chromium
pnpm test:e2e e2e/specs/16-dashboard-settings-api-keys.spec.ts --project=chromium
```

Expected: PASS.

---

### Task 9: Final Verification And Cleanup

**Files:**
- Modify as needed only to remove unused imports and route-local table/pagination helpers.

- [ ] **Step 1: Search for remaining non-TanStack dashboard tables**

Run:

```bash
rg -n "@tanstack/react-table|useReactTable|<Table\\b|<table\\b|const Pagination|上一页|下一页" src/app/dashboard src/components
```

Expected:

- `useReactTable` appears in `src/components/data-table.tsx`.
- Route files may import `ColumnDef`.
- No dashboard route file should render a desktop `<Table>` or desktop `<table>` directly except non-product markup in email templates outside `src/app/dashboard`.
- Text `上一页` and `下一页` should appear only as accessible labels, tests, PRDs, or plan text; visible button content should be icon-only.

- [ ] **Step 2: Run all touched E2E specs**

Run:

```bash
pnpm test:e2e e2e/specs/09-dashboard-settings-sessions.spec.ts --project=chromium
pnpm test:e2e e2e/specs/12-dashboard-admin-users.spec.ts --project=chromium
pnpm test:e2e e2e/specs/14-dashboard-admin-api-keys.spec.ts --project=chromium
pnpm test:e2e e2e/specs/15-dashboard-admin-orgs.spec.ts --project=chromium
pnpm test:e2e e2e/specs/16-dashboard-settings-api-keys.spec.ts --project=chromium
pnpm test:e2e e2e/specs/19-dashboard-admin-request-logs.spec.ts --project=chromium
```

Expected: all pass.

- [ ] **Step 3: Clean E2E build output**

Run:

```powershell
$target = Resolve-Path ".next-e2e" -ErrorAction SilentlyContinue; if ($target -and $target.Path -eq "E:\workspace\lever-admin\.next-e2e") { Remove-Item -LiteralPath $target.Path -Recurse -Force }; Test-Path ".next-e2e"
```

Expected: `False`.

- [ ] **Step 4: Run project verification**

Run:

```bash
pnpm typecheck
pnpm check
pnpm build
```

Expected: all pass.

- [ ] **Step 5: Review diff**

Run:

```bash
git diff -- src/components src/app/dashboard e2e/specs prd docs/superpowers/plans/2026-05-16-shared-data-table-pagination.md
```

Expected:

- Shared pagination and table components are in `src/components`.
- Route-level code owns only domain columns, filters, cards, drawers, dialogs, and mutations.
- PRDs mention the shared table/pagination behavior.
- `prd/component-design.pen` remains the visual source for the pagination component.

---

## Self-Review

**Spec coverage:** The plan covers the approved pagination design: icon-only previous/next, first/last icon buttons, numeric page input with Enter-to-jump, page-size menu, light/dark design, desktop/mobile responsive behavior. It covers the prior audit finding that only request logs used TanStack Table and that pagination was duplicated across pages.

**Placeholder scan:** The plan has no open placeholders. Every task lists exact files, exact commands, and concrete code snippets for the shared components and representative route migrations.

**Type consistency:** Shared `DataPagination` uses `page`, `pageCount`, `total`, `itemCount`, optional `pageSize`, optional page-size callbacks, and `onPageChange`. Shared `DataTable` uses `ColumnDef<TData>` and returns TanStack-rendered rows. Later tasks use those same names consistently.
