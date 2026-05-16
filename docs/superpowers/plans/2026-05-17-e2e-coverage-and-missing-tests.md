# E2E Coverage And Missing Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional Playwright coverage instrumentation and fill the highest-risk missing E2E coverage for platform settings, request logs, API keys, admin users, and upload routes.

**Architecture:** Keep the existing Playwright + Testcontainers architecture. Add a local Playwright fixture that optionally collects Chromium JavaScript coverage when `E2E_COLLECT_COVERAGE=1`, a Node runner that enables collection and merges raw coverage into a JSON summary, then add focused E2E cases to existing numbered spec files so PRD traceability stays intact.

**Tech Stack:** Playwright, Next.js 16 App Router, Testcontainers PostgreSQL, Drizzle, Better Auth, tRPC, Node.js scripts.

---

## Scope

This plan intentionally keeps the first coverage pass E2E-only:

- No Vitest/Jest/c8/nyc unit-test stack in this pass.
- No coverage threshold gate in this pass.
- No external S3 service dependency in E2E; S3 tests cover form validation, persistence, encrypted secret storage, and clear-secret flows.
- No migration commands.

Current evidence:

- `package.json` has `test:e2e` but no coverage script.
- `playwright.config.ts` uses two projects: `chromium` and `mobile-chrome`.
- Existing specs import directly from `@playwright/test`, so optional coverage requires a shared local fixture and import migration.
- Existing DB helpers can seed users, sessions, API keys, request logs, and platform settings, but they lack helpers for checking API key state and local upload cleanup.

---

## File Map

Coverage infrastructure:

- Create: `e2e/fixtures/coverage.ts`
- Create: `e2e/scripts/run-playwright-coverage.mjs`
- Create: `e2e/scripts/merge-playwright-coverage.mjs`
- Modify: `e2e/global-setup.ts`
- Modify: `package.json`
- Modify: every `e2e/specs/*.spec.ts` import from `@playwright/test`
- Modify: `prd/99-e2e-testing-method.md`

E2E helpers:

- Modify: `e2e/helpers/db.ts`

Missing E2E tests:

- Modify: `e2e/specs/18-dashboard-admin-platform-settings.spec.ts`
- Modify: `e2e/specs/19-dashboard-admin-request-logs.spec.ts`
- Modify: `e2e/specs/16-dashboard-settings-api-keys.spec.ts`
- Modify: `e2e/specs/14-dashboard-admin-api-keys.spec.ts`
- Modify: `e2e/specs/12-dashboard-admin-users.spec.ts`
- Modify: `e2e/specs/13-dashboard-admin-users-id.spec.ts`
- Create or modify: `e2e/specs/uploads-api.spec.ts`

Optional production adjustment if needed for testability:

- Modify: `src/server/service/storage/storage-service.ts`
- Modify: `src/server/api/routers/admin-platform-setting.ts`

Only make the optional production adjustment if the current upload-test response does not expose enough information to assert cleanup in E2E.

---

### Task 1: Add Optional Playwright Coverage Infrastructure

**Files:**

- Create: `e2e/fixtures/coverage.ts`
- Create: `e2e/scripts/run-playwright-coverage.mjs`
- Create: `e2e/scripts/merge-playwright-coverage.mjs`
- Modify: `e2e/global-setup.ts`
- Modify: `package.json`
- Modify: `prd/99-e2e-testing-method.md`

- [ ] **Step 1: Write the local coverage fixture**

Create `e2e/fixtures/coverage.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { expect, test as base, type Page } from "@playwright/test"

const coverageRawDir = path.join(process.cwd(), ".playwright-coverage", "raw")

const sanitizeFilePart = (value: string) =>
  value
    .replace(/[^a-z0-9_-]+/giu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 160) || "test"

const shouldCollectCoverage = (browserName: string) => process.env.E2E_COLLECT_COVERAGE === "1" && browserName === "chromium"

export const test = base.extend<{ page: Page }>({
  page: async ({ browserName, page }, use, testInfo) => {
    const collectCoverage = shouldCollectCoverage(browserName)

    if (collectCoverage) {
      await page.coverage.startJSCoverage({
        reportAnonymousScripts: false,
        resetOnNavigation: false
      })
    }

    await use(page)

    if (!collectCoverage) {
      return
    }

    const entries = await page.coverage.stopJSCoverage()
    await mkdir(coverageRawDir, { recursive: true })
    const fileName = `${sanitizeFilePart(testInfo.file)}-${sanitizeFilePart(testInfo.title)}-${testInfo.retry}.json`
    await writeFile(path.join(coverageRawDir, fileName), JSON.stringify(entries, null, 2), "utf8")
  }
})

export { expect, type Page }
```

- [ ] **Step 2: Run a red check before migrating imports**

Run:

```bash
pnpm exec playwright test e2e/specs/00-auth-pages-design.spec.ts --project=chromium --list
```

Expected:

- The command lists tests.
- No coverage files are created because specs still import `@playwright/test` and `E2E_COLLECT_COVERAGE` is not set.

- [ ] **Step 3: Replace spec imports**

For every `e2e/specs/*.spec.ts`, replace:

```ts
import { expect, test } from "@playwright/test"
```

With:

```ts
import { expect, test } from "../fixtures/coverage"
```

For specs that import `Page`, replace:

```ts
import { expect, type Page, test } from "@playwright/test"
```

With:

```ts
import { expect, type Page, test } from "../fixtures/coverage"
```

Run:

```bash
rg -n 'from "@playwright/test"' e2e/specs -g "*.ts"
```

Expected:

- No matches in `e2e/specs`.
- Other Playwright infrastructure files may still import from `@playwright/test`.

- [ ] **Step 4: Add coverage directory cleanup to global setup**

Modify `e2e/global-setup.ts` imports:

```ts
import { type ChildProcess, spawn } from "node:child_process"
import { rm } from "node:fs/promises"
```

Inside `globalSetup`, before starting PostgreSQL, add:

```ts
  if (process.env.E2E_COLLECT_COVERAGE === "1") {
    await rm(".playwright-coverage", { force: true, recursive: true })
    await rm("coverage/playwright", { force: true, recursive: true })
  }
```

- [ ] **Step 5: Add a Node runner that works on Windows**

Create `e2e/scripts/run-playwright-coverage.mjs`:

```js
import { spawn } from "node:child_process"

const run = (command, args, env) =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      env,
      shell: process.platform === "win32",
      stdio: "inherit"
    })

    child.on("exit", (code) => resolve(code ?? 1))
    child.on("error", () => resolve(1))
  })

const env = {
  ...process.env,
  E2E_COLLECT_COVERAGE: "1"
}

const testCode = await run("pnpm", ["exec", "playwright", "test", "--project=chromium"], env)
const mergeCode = await run("node", ["e2e/scripts/merge-playwright-coverage.mjs"], env)

process.exit(testCode || mergeCode)
```

- [ ] **Step 6: Add the coverage merge script**

Create `e2e/scripts/merge-playwright-coverage.mjs`:

```js
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"

const rawDir = path.join(process.cwd(), ".playwright-coverage", "raw")
const outputDir = path.join(process.cwd(), "coverage", "playwright")
const outputPath = path.join(outputDir, "coverage-summary.json")

const mergeRanges = (ranges) => {
  const sorted = ranges
    .filter((range) => Number.isFinite(range.startOffset) && Number.isFinite(range.endOffset) && range.endOffset > range.startOffset)
    .sort((a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset)
  const merged = []

  for (const range of sorted) {
    const previous = merged.at(-1)

    if (!previous || range.startOffset > previous.endOffset) {
      merged.push({ endOffset: range.endOffset, startOffset: range.startOffset })
      continue
    }

    previous.endOffset = Math.max(previous.endOffset, range.endOffset)
  }

  return merged
}

const countUsedBytes = (entry) => {
  const usedRanges = entry.functions.flatMap((fn) => fn.ranges.filter((range) => range.count > 0))

  return mergeRanges(usedRanges).reduce((sum, range) => sum + range.endOffset - range.startOffset, 0)
}

const getScriptName = (url) => {
  if (!url) {
    return "anonymous"
  }

  try {
    const parsed = new URL(url)
    return parsed.pathname
  } catch {
    return url
  }
}

const files = await readdir(rawDir).catch(() => [])
const byUrl = new Map()

for (const file of files.filter((name) => name.endsWith(".json"))) {
  const entries = JSON.parse(await readFile(path.join(rawDir, file), "utf8"))

  for (const entry of entries) {
    if (!entry.url || !entry.text || !entry.functions) {
      continue
    }

    if (!entry.url.includes("/_next/") && !entry.url.includes("/dashboard") && !entry.url.includes("/sign-") && !entry.url.includes("/verify-email")) {
      continue
    }

    const key = getScriptName(entry.url)
    const previous = byUrl.get(key) ?? { totalBytes: 0, usedBytes: 0, url: key }
    previous.totalBytes = Math.max(previous.totalBytes, entry.text.length)
    previous.usedBytes = Math.max(previous.usedBytes, countUsedBytes(entry))
    byUrl.set(key, previous)
  }
}

const filesSummary = [...byUrl.values()]
  .map((item) => ({
    ...item,
    percent: item.totalBytes === 0 ? 0 : Number(((item.usedBytes / item.totalBytes) * 100).toFixed(2))
  }))
  .sort((a, b) => a.url.localeCompare(b.url))
const totalBytes = filesSummary.reduce((sum, item) => sum + item.totalBytes, 0)
const usedBytes = filesSummary.reduce((sum, item) => sum + item.usedBytes, 0)
const summary = {
  files: filesSummary,
  generatedAt: new Date().toISOString(),
  totals: {
    files: filesSummary.length,
    percent: totalBytes === 0 ? 0 : Number(((usedBytes / totalBytes) * 100).toFixed(2)),
    totalBytes,
    usedBytes
  }
}

await mkdir(outputDir, { recursive: true })
await writeFile(outputPath, JSON.stringify(summary, null, 2), "utf8")
console.log(`Playwright coverage written to ${outputPath}`)
console.log(`Total client JS byte coverage: ${summary.totals.percent}%`)
```

- [ ] **Step 7: Add package script**

Modify `package.json` scripts:

```json
"test:e2e:coverage": "node e2e/scripts/run-playwright-coverage.mjs",
```

Keep existing scripts unchanged.

- [ ] **Step 8: Update PRD 99**

In `prd/99-e2e-testing-method.md`, update the E2E structure block to include:

```txt
  fixtures/
    coverage.ts
  scripts/
    merge-playwright-coverage.mjs
    run-playwright-coverage.mjs
```

Add to run scripts:

```json
{
  "test:e2e:coverage": "node e2e/scripts/run-playwright-coverage.mjs"
}
```

Add a coverage section:

```md
## Playwright 覆盖率

- `pnpm test:e2e:coverage` 只运行 Chromium project，并设置 `E2E_COLLECT_COVERAGE=1`。
- 覆盖率通过 Playwright Chromium JavaScript coverage API 采集，输出到 `coverage/playwright/coverage-summary.json`。
- 该报告是 E2E 触达的浏览器端 JavaScript 字节覆盖率，不等同于服务端 TypeScript 分支覆盖率，也不替代后续单元测试覆盖率。
- 日常 `pnpm test:e2e` 不采集 coverage，避免增加常规测试耗时。
```

- [ ] **Step 9: Verify coverage infrastructure**

Run:

```bash
pnpm exec playwright test e2e/specs/00-auth-pages-design.spec.ts --project=chromium
```

Expected:

- Existing spec passes.
- No `coverage/playwright/coverage-summary.json` is created.

Run:

```bash
pnpm test:e2e:coverage -- e2e/specs/00-auth-pages-design.spec.ts
```

If the runner does not forward args yet, add argv forwarding:

```js
const extraArgs = process.argv.slice(2)
const testCode = await run("pnpm", ["exec", "playwright", "test", "--project=chromium", ...extraArgs], env)
```

Expected:

- Spec passes.
- `coverage/playwright/coverage-summary.json` exists.
- Summary has `totals.files > 0`, `totals.totalBytes > 0`, and a numeric `totals.percent`.

---

### Task 2: Add E2E Database And File Helpers

**Files:**

- Modify: `e2e/helpers/db.ts`
- Create: `e2e/helpers/files.ts`

- [ ] **Step 1: Add API key state helpers**

Append to `e2e/helpers/db.ts`:

```ts
export const getApiKeyById = async (id: string) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ enabled: boolean | null; id: string; name: string | null }[]>`
      select "id", "name", "enabled"
      from "auth_apikey"
      where "id" = ${id}
      limit 1
    `

    return rows[0] ?? null
  } finally {
    await sql.end()
  }
}

export const countApiKeysById = async (id: string) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ count: string }[]>`
      select count(*)::text as count
      from "auth_apikey"
      where "id" = ${id}
    `

    return Number(rows[0]?.count ?? 0)
  } finally {
    await sql.end()
  }
}
```

- [ ] **Step 2: Add user state helpers**

Append to `e2e/helpers/db.ts`:

```ts
export const getUserAdminStateByEmail = async (email: string) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ banned: boolean | null; email: string; role: string | null }[]>`
      select "email", "role", "banned"
      from "auth_user"
      where "email" = ${email}
      limit 1
    `

    return rows[0] ?? null
  } finally {
    await sql.end()
  }
}
```

- [ ] **Step 3: Add request log helper for route count**

Append to `e2e/helpers/db.ts`:

```ts
export const countRequestLogsByRouteName = async (routeName: string) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ count: string }[]>`
      select count(*)::text as count
      from "system_request_log"
      where "route_name" = ${routeName}
        and "deleted_at" is null
    `

    return Number(rows[0]?.count ?? 0)
  } finally {
    await sql.end()
  }
}
```

- [ ] **Step 4: Add local file helper**

Create `e2e/helpers/files.ts`:

```ts
import { access } from "node:fs/promises"
import path from "node:path"

export const localUploadObjectExists = async ({ key, localPath = "./uploads" }: { key: string; localPath?: string }) => {
  const objectPath = path.resolve(process.cwd(), localPath, key)

  try {
    await access(objectPath)
    return true
  } catch {
    return false
  }
}
```

- [ ] **Step 5: Verify helpers typecheck**

Run:

```bash
pnpm typecheck
```

Expected:

- TypeScript passes.

---

### Task 3: Expand Platform Settings E2E

**Files:**

- Modify: `e2e/specs/18-dashboard-admin-platform-settings.spec.ts`

- [ ] **Step 1: Import new helpers**

Update imports:

```ts
import { localUploadObjectExists } from "../helpers/files"
```

- [ ] **Step 2: Add Resend provider test**

Append inside the `test.describe("18 dashboard admin platform settings", () => { ... })` block:

```ts
  test("saves resend provider with encrypted api key and supports clearing it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    await deletePlatformSettings()
    await signInAsRole(page, "dashboard-admin-settings-resend", "super_admin")

    await page.goto("/dashboard/admin/settings")
    await page.getByLabel("Provider").click()
    await page.getByRole("option", { name: "Resend" }).click()
    await page.getByLabel("发件人").fill("Lever Admin <resend@example.com>")
    await page.getByLabel("Resend API Key").fill("re_test_secret")
    await page.getByRole("button", { name: "保存配置" }).click()

    await expect(toastWithText(page, "邮件服务配置已保存。")).toBeVisible()
    await expect.poll(() => getPlatformSettingValue("email.provider")).toBe("resend")
    await expect
      .poll(async () => {
        const value = await getPlatformSettingValue("email.resend.apiKey")
        return value?.startsWith("enc:v1:")
      })
      .toBe(true)
    await expect(page.getByLabel("Resend API Key")).toHaveValue("")

    await page.getByRole("button", { name: "清除已保存 Resend API Key" }).click()
    await page.getByRole("button", { name: "保存配置" }).click()
    await expect(page.getByText("Resend 需要配置 API Key。")).toBeVisible()
  })
```

If button text differs, adjust only the accessible name to the UI's actual text.

- [ ] **Step 3: Add S3 validation and secret persistence test**

Append:

```ts
  test("validates and saves s3 storage secrets without exposing them", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    await deletePlatformSettings()
    await signInAsRole(page, "dashboard-admin-storage-s3", "super_admin")

    await page.goto("/dashboard/admin/settings")
    await page.getByLabel("存储方式").click()
    await page.getByRole("option", { name: "S3" }).click()
    await page.getByRole("button", { name: "保存文件存储配置" }).click()

    await expect(page.getByText("S3 Bucket 不能为空。")).toBeVisible()
    await expect(page.getByText("S3 Region 或 S3 Endpoint 至少填写一项。")).toBeVisible()
    await expect(page.getByText("S3 Access Key 不能为空。")).toBeVisible()
    await expect(page.getByText("S3 Secret Key 不能为空。")).toBeVisible()

    await page.getByLabel("S3 Endpoint").fill("https://tos-s3-cn-beijing.volces.com")
    await page.getByLabel("S3 Region").fill("cn-beijing")
    await page.getByLabel("S3 Bucket").fill("lever-admin-e2e")
    await page.getByLabel("S3 Access Key").fill("AKLT_TEST")
    await page.getByLabel("S3 Secret Key").fill("SECRET_TEST")
    await page.getByLabel("forcePathStyle").click()
    await page.getByRole("button", { name: "保存文件存储配置" }).click()

    await expect(toastWithText(page, "文件存储配置已保存。")).toBeVisible()
    await expect.poll(() => getPlatformSettingValue("storage.provider")).toBe("s3")
    await expect.poll(() => getPlatformSettingValue("storage.s3.endpoint")).toBe("https://tos-s3-cn-beijing.volces.com")
    await expect.poll(() => getPlatformSettingValue("storage.s3.region")).toBe("cn-beijing")
    await expect.poll(() => getPlatformSettingValue("storage.s3.bucket")).toBe("lever-admin-e2e")
    await expect.poll(() => getPlatformSettingValue("storage.s3.forcePathStyle")).toBe("true")
    await expect
      .poll(async () => {
        const value = await getPlatformSettingValue("storage.s3.accessKeyId")
        return value?.startsWith("enc:v1:")
      })
      .toBe(true)
    await expect
      .poll(async () => {
        const value = await getPlatformSettingValue("storage.s3.secretAccessKey")
        return value?.startsWith("enc:v1:")
      })
      .toBe(true)
    await expect(page.getByLabel("S3 Access Key")).toHaveValue("")
    await expect(page.getByLabel("S3 Secret Key")).toHaveValue("")
  })
```

- [ ] **Step 4: Strengthen local upload test cleanup assertion**

In the existing `"runs storage upload test with saved local provider"` test, after:

```ts
await expect(page.getByText("最近上传测试成功")).toBeVisible()
```

Add:

```ts
    const successText = await page.getByText(/platform-test\/test-.*\.txt/u).textContent()
    const key = successText?.match(/platform-test\/test-[a-f0-9-]+\.txt/u)?.[0]
    expect(key).toBeTruthy()
    await expect.poll(() => localUploadObjectExists({ key: key ?? "" })).toBe(false)
```

- [ ] **Step 5: Verify platform settings spec**

Run:

```bash
pnpm exec playwright test e2e/specs/18-dashboard-admin-platform-settings.spec.ts --project=chromium
```

Expected:

- All platform settings tests pass.
- Failures should identify selector mismatches or real validation issues; fix tests only for selector names, fix product code only for genuine behavior bugs.

---

### Task 4: Expand Request Logs E2E

**Files:**

- Modify: `e2e/specs/19-dashboard-admin-request-logs.spec.ts`

- [ ] **Step 1: Import route count helper**

Update import from `../helpers/db`:

```ts
import { countRequestLogsByRouteName, createRequestLogFixture, getUserByEmail, setUserRole } from "../helpers/db"
```

- [ ] **Step 2: Add non-admin forbidden test**

Append:

```ts
  test("shows permission error to non-admin users", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    const email = await createVerifiedUser(page, "dashboard-request-logs-forbidden")
    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto("/dashboard/admin/request-logs")

    await expect(page.getByRole("main").getByText("需要平台管理员权限。")).toBeVisible()
  })
```

- [ ] **Step 3: Add filter coverage test**

Append:

```ts
  test("filters logs by method source result risk status and time range", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    const user = await signInAsAdmin(page, "dashboard-request-log-filters")
    await createRequestLogFixture({
      method: "GET",
      path: "/api/trpc/filter.match",
      requestId: `req-filter-match-${Date.now()}`,
      riskLevel: "high",
      routeName: "filter.match",
      source: "trpc",
      statusCode: 500,
      success: false,
      userEmail: user.email,
      userId: user.id,
      userName: user.name
    })
    await createRequestLogFixture({
      createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      method: "POST",
      path: "/api/auth/filter.old",
      requestId: `req-filter-old-${Date.now()}`,
      riskLevel: "low",
      routeName: "filter.old",
      source: "auth",
      statusCode: 200,
      success: true,
      userEmail: user.email,
      userId: user.id,
      userName: user.name
    })

    await page.goto("/dashboard/admin/request-logs")
    await page.getByLabel("搜索请求日志").fill("filter")
    await page.getByRole("combobox", { name: "来源" }).click()
    await page.getByRole("option", { name: "tRPC" }).click()
    await page.getByRole("combobox", { name: "方法" }).click()
    await page.getByRole("option", { name: "GET" }).click()
    await page.getByRole("combobox", { name: "结果" }).click()
    await page.getByRole("option", { name: "失败" }).click()
    await page.getByRole("combobox", { name: "风险" }).click()
    await page.getByRole("option", { name: "高风险" }).click()
    await page.getByLabel("状态码").fill("500")

    await expect(page.getByText("/api/trpc/filter.match")).toBeVisible()
    await expect(page.getByText("/api/auth/filter.old")).toHaveCount(0)

    await page.getByRole("combobox", { name: "时间范围" }).click()
    await page.getByRole("option", { name: "全部时间" }).click()
    await expect(page.getByText("/api/trpc/filter.match")).toBeVisible()
  })
```

If option labels differ, use the current UI labels in `request-log-labels.ts`.

- [ ] **Step 4: Add CSV export test**

Append:

```ts
  test("exports filtered request logs as csv", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    const user = await signInAsAdmin(page, "dashboard-request-log-export")
    await createRequestLogFixture({
      path: "/api/trpc/export.csv",
      requestId: `req-export-${Date.now()}`,
      routeName: "export.csv",
      userEmail: user.email,
      userId: user.id,
      userName: user.name
    })

    await page.goto("/dashboard/admin/request-logs")
    await page.getByLabel("搜索请求日志").fill("export.csv")
    const downloadPromise = page.waitForEvent("download")
    await page.getByRole("button", { name: "导出 CSV" }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/^request-logs-\d{4}-\d{2}-\d{2}\.csv$/u)
    const content = await download.createReadStream().then(
      (stream) =>
        new Promise<string>((resolve, reject) => {
          const chunks: Buffer[] = []
          stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
          stream.on("error", reject)
          stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
        })
    )
    expect(content).toContain("requestId,source,method,path")
    expect(content).toContain("/api/trpc/export.csv")
  })
```

- [ ] **Step 5: Add real request logging test**

Append:

```ts
  test("records a real trpc request in the request log table", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    await signInAsAdmin(page, "dashboard-request-log-real")
    await page.goto("/dashboard/admin/request-logs")
    await expect(page.getByRole("heading", { name: "系统请求日志" })).toBeVisible()

    await expect.poll(() => countRequestLogsByRouteName("adminRequestLog.list")).toBeGreaterThan(0)
  })
```

- [ ] **Step 6: Verify request logs spec**

Run:

```bash
pnpm exec playwright test e2e/specs/19-dashboard-admin-request-logs.spec.ts --project=chromium
```

Expected:

- All request log tests pass.

---

### Task 5: Add Personal API Key Mutation E2E

**Files:**

- Modify: `e2e/specs/16-dashboard-settings-api-keys.spec.ts`

- [ ] **Step 1: Import API key helpers**

Update import:

```ts
import { countApiKeysById, createAdminUserFixture, createApiKeyFixture, createApiKeyUsageLogFixture, getApiKeyById, getUserByEmail } from "../helpers/db"
```

- [ ] **Step 2: Add personal enable/disable/delete test**

Append inside describe:

```ts
  test("disables enables and deletes the current user's api key", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed api key flow only needs one browser project")

    const email = await createVerifiedUser(page, "settings-api-keys-actions")
    const user = await getUserByEmail(email)
    expect(user).not.toBeNull()
    const key = await createApiKeyFixture({
      name: "Personal Action Key",
      referenceId: user?.id ?? ""
    })

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/settings/api-keys")

    const row = page.getByTestId(`api-key-row-${key.id}`)
    await expect(row).toBeVisible()
    await row.getByRole("button", { name: "更多 API Key 操作" }).click()
    await page.getByRole("menuitem", { name: "禁用" }).click()
    await page.getByRole("button", { name: "确认禁用" }).click()
    await expect.poll(async () => (await getApiKeyById(key.id))?.enabled).toBe(false)

    await row.getByRole("button", { name: "更多 API Key 操作" }).click()
    await page.getByRole("menuitem", { name: "启用" }).click()
    await page.getByRole("button", { name: "确认启用" }).click()
    await expect.poll(async () => (await getApiKeyById(key.id))?.enabled).toBe(true)

    await row.getByRole("button", { name: "更多 API Key 操作" }).click()
    await page.getByRole("menuitem", { name: "删除" }).click()
    await expect(page.getByRole("button", { name: "永久删除" })).toBeDisabled()
    await page.getByLabel("确认删除 API Key").fill("Personal Action Key")
    await page.getByRole("button", { name: "永久删除" }).click()
    await expect.poll(() => countApiKeysById(key.id)).toBe(0)
  })
```

If accessible names differ, inspect `api-key-dialogs.tsx` and adjust selectors to the current UI text.

- [ ] **Step 3: Verify personal API key spec**

Run:

```bash
pnpm exec playwright test e2e/specs/16-dashboard-settings-api-keys.spec.ts --project=chromium
```

Expected:

- All personal API key tests pass.

---

### Task 6: Add Platform API Key Mutation E2E

**Files:**

- Modify: `e2e/specs/14-dashboard-admin-api-keys.spec.ts`

- [ ] **Step 1: Import API key helpers**

Update import from `../helpers/db` to include:

```ts
countApiKeysById,
getApiKeyById
```

- [ ] **Step 2: Add platform enable/disable/delete persistence test**

Append:

```ts
  test("persists platform api key disable enable and delete actions", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed api key flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "admin-api-key-actions-admin")
    await setUserRole(adminEmail, "admin")
    const owner = await createAdminUserFixture({
      email: `admin-api-key-actions-owner-${Date.now()}@example.com`,
      name: "Platform Key Action Owner"
    })
    const key = await createApiKeyFixture({
      name: "Platform Action Key",
      referenceId: owner.id
    })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/admin/api-keys")
    await page.getByLabel("搜索平台 API Key").fill("Platform Action Key")

    const row = page.getByTestId(`admin-api-key-row-${key.id}`)
    await expect(row).toBeVisible()
    await row.getByRole("button", { name: "更多平台 API Key 操作" }).click()
    await page.getByRole("menuitem", { name: "禁用" }).click()
    await page.getByRole("button", { name: "确认禁用" }).click()
    await expect.poll(async () => (await getApiKeyById(key.id))?.enabled).toBe(false)

    await row.getByRole("button", { name: "更多平台 API Key 操作" }).click()
    await page.getByRole("menuitem", { name: "启用" }).click()
    await page.getByRole("button", { name: "确认启用" }).click()
    await expect.poll(async () => (await getApiKeyById(key.id))?.enabled).toBe(true)

    await row.getByRole("button", { name: "更多平台 API Key 操作" }).click()
    await page.getByRole("menuitem", { name: "删除" }).click()
    await page.getByLabel("确认删除平台 API Key").fill("Platform Action Key")
    await page.getByRole("button", { name: "永久删除" }).click()
    await expect.poll(() => countApiKeysById(key.id)).toBe(0)
  })
```

- [ ] **Step 3: Verify platform API key spec**

Run:

```bash
pnpm exec playwright test e2e/specs/14-dashboard-admin-api-keys.spec.ts --project=chromium
```

Expected:

- All platform API key tests pass.

---

### Task 7: Add Admin User High-Risk Operation E2E

**Files:**

- Modify: `e2e/specs/12-dashboard-admin-users.spec.ts`
- Modify: `e2e/specs/13-dashboard-admin-users-id.spec.ts`

- [ ] **Step 1: Import helpers in admin users specs**

In both specs, include:

```ts
import { getUserAdminStateByEmail } from "../helpers/db"
```

- [ ] **Step 2: Add role and ban persistence test in `12-dashboard-admin-users.spec.ts`**

Append:

```ts
  test("sets role and bans then unbans a user from the admin users list", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin user flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "admin-users-actions-admin")
    await setUserRole(adminEmail, "admin")
    const targetEmail = `admin-users-actions-target-${Date.now()}@example.com`
    const target = await createAdminUserFixture({
      email: targetEmail,
      name: "Admin User Action Target"
    })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/admin/users")
    await page.getByLabel("搜索用户").fill("Admin User Action Target")

    const row = page.getByTestId(`admin-user-row-${target.id}`)
    await expect(row).toBeVisible()
    await row.getByRole("button", { name: "更多用户操作" }).click()
    await page.getByRole("menuitem", { name: "设置角色" }).click()
    await page.getByRole("combobox", { name: "平台角色" }).click()
    await page.getByRole("option", { name: "support" }).click()
    await page.getByRole("button", { name: "保存角色" }).click()
    await expect.poll(async () => (await getUserAdminStateByEmail(targetEmail))?.role).toBe("support")

    await row.getByRole("button", { name: "更多用户操作" }).click()
    await page.getByRole("menuitem", { name: "封禁用户" }).click()
    await page.getByLabel("封禁原因").fill("E2E policy violation")
    await page.getByRole("button", { name: "确认封禁" }).click()
    await expect.poll(async () => (await getUserAdminStateByEmail(targetEmail))?.banned).toBe(true)

    await row.getByRole("button", { name: "更多用户操作" }).click()
    await page.getByRole("menuitem", { name: "解除封禁" }).click()
    await page.getByRole("button", { name: "确认解除封禁" }).click()
    await expect.poll(async () => (await getUserAdminStateByEmail(targetEmail))?.banned).toBe(false)
  })
```

Adjust role option labels if the UI uses Chinese labels.

- [ ] **Step 3: Add reset password verification in `13-dashboard-admin-users-id.spec.ts`**

Append:

```ts
  test("resets a user's password from the full detail page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin user flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "admin-users-reset-admin")
    await setUserRole(adminEmail, "admin")
    const targetEmail = `admin-users-reset-target-${Date.now()}@example.com`
    const target = await createAdminUserFixture({
      email: targetEmail,
      name: "Password Reset Target"
    })
    const newPassword = "NewPassword123!"

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto(`/dashboard/admin/users/${target.id}`)

    await page.getByRole("button", { name: "重置密码" }).click()
    await page.getByLabel("新密码").fill(newPassword)
    await page.getByRole("button", { name: "确认重置密码" }).click()
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: "密码已重置" }).first()).toBeVisible()

    await page.getByRole("button", { name: "用户菜单" }).click()
    await page.getByRole("menuitem", { name: "退出登录" }).click()
    await expect(page).toHaveURL(/\/sign-in/)
    await signInViaUi(page, { email: targetEmail, password: newPassword })
    await expect(page).toHaveURL(/\/dashboard$/)
  })
```

- [ ] **Step 4: Verify admin user specs**

Run:

```bash
pnpm exec playwright test e2e/specs/12-dashboard-admin-users.spec.ts e2e/specs/13-dashboard-admin-users-id.spec.ts --project=chromium
```

Expected:

- Admin user tests pass.

---

### Task 8: Add Upload API Route E2E

**Files:**

- Create: `e2e/specs/uploads-api.spec.ts`
- Modify: `prd/99-e2e-testing-method.md`

- [ ] **Step 1: Create upload route spec**

Create `e2e/specs/uploads-api.spec.ts`:

```ts
import { expect, test } from "../fixtures/coverage"
import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { upsertPlatformSetting } from "../helpers/db"

const svgFile = {
  buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="red"/></svg>'),
  mimeType: "image/svg+xml",
  name: "upload.svg"
}

test.describe("upload api routes", () => {
  test("rejects avatar upload when unauthenticated", async ({ request }) => {
    const form = new FormData()
    form.append("file", new Blob([svgFile.buffer], { type: svgFile.mimeType }), svgFile.name)

    const response = await request.post("/api/uploads/avatar", { multipart: { file: svgFile } })

    expect(response.status()).toBe(401)
  })

  test("rejects non-image avatar uploads", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed upload flow only needs one browser project")

    const email = await createVerifiedUser(page, "upload-api-non-image")
    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    const response = await request.post("/api/uploads/avatar", {
      multipart: {
        file: {
          buffer: Buffer.from("not an image"),
          mimeType: "text/plain",
          name: "not-image.txt"
        }
      }
    })

    expect(response.status()).toBe(400)
    await expect(response.text()).resolves.toContain("仅支持 PNG、JPG、WebP 或 SVG 图片。")
  })

  test("uploads an avatar and reads it back from the local upload route", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed upload flow only needs one browser project")

    await upsertPlatformSetting({ key: "storage.provider", value: "local" })
    await upsertPlatformSetting({ key: "storage.local.path", value: "./uploads" })
    const email = await createVerifiedUser(page, "upload-api-avatar")
    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    const uploadResponse = await request.post("/api/uploads/avatar", {
      multipart: {
        file: svgFile
      }
    })
    expect(uploadResponse.status()).toBe(200)
    const uploaded = (await uploadResponse.json()) as { key: string; url: string }

    expect(uploaded.key).toMatch(/^avatars\/upload-[a-f0-9-]+\.svg$/u)
    const readResponse = await request.get(uploaded.url)
    expect(readResponse.status()).toBe(200)
    expect(readResponse.headers()["content-type"]).toContain("image/svg+xml")
  })

  test("returns 404 for a missing local uploaded object", async ({ request }) => {
    const response = await request.get("/api/uploads/local/avatars/missing-file.svg")

    expect(response.status()).toBe(404)
  })
})
```

If `request` does not share authenticated browser cookies after UI sign-in, replace `request.post` with `page.evaluate` `fetch` calls so the browser session cookies are included.

- [ ] **Step 2: Update PRD 99 with upload route spec**

Add:

```md
- `upload-api.spec.ts` -> upload route behavior shared by profile avatar and organization logo uploads.
```

- [ ] **Step 3: Verify upload route spec**

Run:

```bash
pnpm exec playwright test e2e/specs/uploads-api.spec.ts --project=chromium
```

Expected:

- Upload route tests pass.

---

### Task 9: Final Verification

**Files:**

- All changed files.

- [ ] **Step 1: Run targeted specs**

Run:

```bash
pnpm exec playwright test e2e/specs/18-dashboard-admin-platform-settings.spec.ts e2e/specs/19-dashboard-admin-request-logs.spec.ts e2e/specs/16-dashboard-settings-api-keys.spec.ts e2e/specs/14-dashboard-admin-api-keys.spec.ts e2e/specs/12-dashboard-admin-users.spec.ts e2e/specs/13-dashboard-admin-users-id.spec.ts e2e/specs/uploads-api.spec.ts --project=chromium
```

Expected:

- All targeted Chromium specs pass.

- [ ] **Step 2: Run coverage smoke**

Run:

```bash
pnpm test:e2e:coverage -- e2e/specs/00-auth-pages-design.spec.ts
```

Expected:

- Test passes.
- `coverage/playwright/coverage-summary.json` exists.
- JSON contains `totals.percent`, `totals.totalBytes`, and `files`.

- [ ] **Step 3: Run type and lint checks**

Run:

```bash
pnpm typecheck
pnpm check
```

Expected:

- Both commands exit with code 0.

- [ ] **Step 4: Run full E2E if time and Docker allow**

Run:

```bash
pnpm test:e2e
```

Expected:

- All projects pass.
- If Docker/Testcontainers is unavailable, record the exact error and do not claim full E2E success.

- [ ] **Step 5: Build**

Run:

```bash
pnpm build
```

Expected:

- Build exits with code 0.
- If the known Turbopack local storage path warning appears, record it as an existing warning unless it changes into an error.

---

## Self-Review

- Spec coverage: This plan covers optional Playwright coverage instrumentation, PRD documentation, and high-risk missing E2E scenarios identified in the coverage audit.
- Placeholder scan: No placeholder markers are present.
- Type consistency: New helpers use existing E2E PostgreSQL helper style and current physical table prefixes: `auth_*` for Better Auth, `system_*` for product tables.
- Scope control: Unit-test framework adoption and coverage thresholds are explicitly out of scope for this implementation pass.
