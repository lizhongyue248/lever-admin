# Playwright Testcontainers E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Playwright-only end-to-end testing backed by a Testcontainers PostgreSQL database for the public auth pages.

**Architecture:** Playwright global setup starts a PostgreSQL container, pushes the Drizzle schema, starts a Next.js dev server with test environment variables, and tears everything down after the suite. Tests use real browser interactions and a small DB helper for seed/update operations.

**Tech Stack:** Playwright, Testcontainers PostgreSQL, Next.js 16, Better Auth, Drizzle, PostgreSQL.

**Implementation Notes:**

- Next.js test server is started with `pnpm exec next dev --hostname 127.0.0.1 --port <port>` so CLI args are parsed correctly on Windows.
- E2E helpers quote `"system_user"` in direct SQL because `system_user` can be parsed as a PostgreSQL keyword/system identifier.
- Playwright generated output directories are ignored by Git, Biome, and TypeScript: `playwright-report/`, `test-results/`, `blob-report/`.
- Auth card titles render as `h1` so Playwright can use accessible heading selectors.

---

## File Structure

- Create `playwright.config.ts`: Playwright config, base URL, browsers, test directory, global setup.
- Create `e2e/global-setup.ts`: start/stop PostgreSQL and Next.js test server.
- Create `e2e/helpers/db.ts`: PostgreSQL client helper and minimal DB update helpers for tests.
- Create `e2e/helpers/test-data.ts`: unique E2E email/password helpers.
- Create `e2e/specs/auth-public.spec.ts`: public auth page smoke, layout, navigation tests.
- Create `e2e/specs/theme-toggle.spec.ts`: theme toggle behavior tests.
- Create `e2e/specs/auth-email-password.spec.ts`: real sign-up plus verified login flow.
- Modify `package.json`: add Playwright/Testcontainers dependencies and E2E scripts.
- Modify `AGENTS.md`: document E2E command and Docker/Testcontainers expectation.

## Task 1: Install Dependencies And Scripts

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [x] Install dependencies:

```bash
pnpm add -D @playwright/test testcontainers @testcontainers/postgresql
```

- [x] Add scripts to `package.json`:

```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:headed": "playwright test --headed",
  "test:e2e:debug": "playwright test --debug",
  "verify:e2e": "pnpm typecheck && pnpm check && pnpm build && pnpm test:e2e"
}
```

- [x] Run:

```bash
pnpm exec playwright install chromium
```

Expected: Chromium browser installed or already present.

## Task 2: Add Playwright Configuration

**Files:**
- Create: `playwright.config.ts`

- [x] Create config:

```ts
import { defineConfig, devices } from "@playwright/test"

const port = Number(process.env.E2E_PORT ?? 3100)

export default defineConfig({
  fullyParallel: false,
  globalSetup: "./e2e/global-setup.ts",
  reporter: [["list"], ["html", { open: "never" }]],
  testDir: "./e2e/specs",
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure"
  },
  webServer: undefined,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] }
    }
  ]
})
```

- [x] Run:

```bash
pnpm test:e2e -- --list
```

Expected: Playwright starts config loading; no tests may exist yet.

## Task 3: Add Global Setup

**Files:**
- Create: `e2e/global-setup.ts`

- [x] Implement global setup:

```ts
import type { FullConfig } from "@playwright/test"
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import { spawn, type ChildProcess } from "node:child_process"

const waitForServer = async (url: string) => {
  const deadline = Date.now() + 60_000

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok || response.status < 500) {
        return
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  throw new Error(`Timed out waiting for ${url}`)
}

const runCommand = async (command: string, args: string[], env: NodeJS.ProcessEnv) =>
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      shell: process.platform === "win32",
      stdio: "inherit"
    })

    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`))
    })
  })

const globalSetup = async (_config: FullConfig) => {
  const port = Number(process.env.E2E_PORT ?? 3100)
  const baseURL = `http://127.0.0.1:${port}`

  let postgres: StartedPostgreSqlContainer | undefined
  let server: ChildProcess | undefined

  postgres = await new PostgreSqlContainer("postgres:16-alpine").withDatabase("lever_admin_e2e").withUsername("e2e").withPassword("e2e").start()

  const env = {
    ...process.env,
    BETTER_AUTH_GITHUB_CLIENT_ID: "e2e-github-client-id",
    BETTER_AUTH_GITHUB_CLIENT_SECRET: "e2e-github-client-secret",
    BETTER_AUTH_SECRET: "e2e-secret-at-least-32-characters-long",
    BETTER_AUTH_URL: baseURL,
    DATABASE_URL: postgres.getConnectionUri(),
    E2E_BASE_URL: baseURL,
    E2E_PORT: String(port),
    NODE_ENV: "test",
    SKIP_ENV_VALIDATION: "0"
  }

  process.env.DATABASE_URL = env.DATABASE_URL
  process.env.E2E_BASE_URL = baseURL

  await runCommand("pnpm", ["db:push"], env)

  server = spawn("pnpm", ["dev", "--", "--hostname", "127.0.0.1", "--port", String(port)], {
    env,
    shell: process.platform === "win32",
    stdio: "inherit"
  })

  await waitForServer(baseURL)

  return async () => {
    server?.kill()
    await postgres?.stop()
  }
}

export default globalSetup
```

- [x] Run:

```bash
pnpm test:e2e -- --list
```

Expected: setup starts PostgreSQL, pushes schema, starts Next, then lists tests once tests exist.

## Task 4: Add E2E Helpers

**Files:**
- Create: `e2e/helpers/db.ts`
- Create: `e2e/helpers/test-data.ts`

- [x] Create `e2e/helpers/test-data.ts`:

```ts
export const e2ePassword = "E2e-password-12345"

export const uniqueEmail = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
```

- [x] Create `e2e/helpers/db.ts`:

```ts
import postgres from "postgres"

export const createE2eSql = () => {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for E2E DB helpers")
  }

  return postgres(databaseUrl, { max: 1 })
}

export const markEmailVerified = async (email: string) => {
  const sql = createE2eSql()

  try {
    await sql`update system_user set email_verified = true where email = ${email}`
  } finally {
    await sql.end()
  }
}
```

## Task 5: Add Public Auth E2E Tests

**Files:**
- Create: `e2e/specs/auth-public.spec.ts`

- [x] Add smoke, layout, and navigation tests for PRD 01-05 public pages.

- [x] Run:

```bash
pnpm test:e2e e2e/specs/auth-public.spec.ts --project=chromium
```

Expected: tests pass against Testcontainers-backed Next server.

## Task 6: Add Theme Toggle E2E Tests

**Files:**
- Create: `e2e/specs/theme-toggle.spec.ts`

- [x] Add tests that click `aria-label="切换主题"` and assert `html.dark` toggles.

- [x] Run:

```bash
pnpm test:e2e e2e/specs/theme-toggle.spec.ts --project=chromium
```

Expected: theme toggle tests pass.

## Task 7: Add Email Password E2E Test

**Files:**
- Create: `e2e/specs/auth-email-password.spec.ts`

- [x] Add flow:
  - sign up with a unique email
  - mark email verified in DB
  - navigate to sign in
  - sign in with the same password
  - assert `/app` and “工作台测试页”

- [x] Run:

```bash
pnpm test:e2e e2e/specs/auth-email-password.spec.ts --project=chromium
```

Expected: real auth flow passes.

## Task 8: Update Agent Docs

**Files:**
- Modify: `AGENTS.md`

- [x] Add E2E commands and Docker requirement:

```md
# E2E
pnpm test:e2e          # Playwright E2E with Testcontainers PostgreSQL
pnpm verify:e2e        # typecheck + check + build + E2E
```

- [x] Mention Docker must be running before E2E.

## Task 9: Final Verification

- [x] Run:

```bash
pnpm typecheck
pnpm check
pnpm build
pnpm test:e2e --project=chromium
```

Expected: all pass. If Docker is unavailable, report that E2E could not run and include the exact Testcontainers error.
