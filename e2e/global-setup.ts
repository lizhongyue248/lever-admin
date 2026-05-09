import { type ChildProcess, spawn } from "node:child_process"
import type { FullConfig } from "@playwright/test"
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql"

type E2eEnvironment = NodeJS.ProcessEnv & {
  BETTER_AUTH_GITHUB_CLIENT_ID: string
  BETTER_AUTH_GITHUB_CLIENT_SECRET: string
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  DATABASE_URL: string
  E2E_BASE_URL: string
  E2E_NEXT_DIST_DIR: string
  E2E_PORT: string
  NODE_ENV: "test"
}

const wait = async (milliseconds: number) => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds))
}

const waitForServer = async (url: string) => {
  const deadline = Date.now() + 60_000

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)

      if (response.ok || response.status < 500) {
        return
      }
    } catch {
      await wait(500)
    }
  }

  throw new Error(`Timed out waiting for ${url}`)
}

const runCommand = async (command: string, args: string[], env: E2eEnvironment) => {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      shell: process.platform === "win32",
      stdio: "inherit"
    })

    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`))
    })
  })
}

const stopServer = async (server: ChildProcess | undefined) => {
  if (!server?.pid) {
    return
  }

  if (process.platform === "win32") {
    await new Promise<void>((resolve) => {
      const child = spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
        shell: true,
        stdio: "ignore"
      })

      child.on("exit", () => resolve())
      child.on("error", () => resolve())
    })
    return
  }

  server.kill("SIGTERM")
}

const globalSetup = async (_config: FullConfig) => {
  const port = Number(process.env.E2E_PORT ?? 3100)
  const baseURL = `http://127.0.0.1:${port}`

  let postgres: StartedPostgreSqlContainer | undefined
  let server: ChildProcess | undefined

  try {
    postgres = await new PostgreSqlContainer("postgres:16-alpine").withDatabase("lever_admin_e2e").withUsername("e2e").withPassword("e2e").start()
  } catch (error) {
    throw new Error("Playwright E2E requires Docker or another Testcontainers-compatible container runtime to be running.", { cause: error })
  }

  const env: E2eEnvironment = {
    ...process.env,
    BETTER_AUTH_GITHUB_CLIENT_ID: "e2e-github-client-id",
    BETTER_AUTH_GITHUB_CLIENT_SECRET: "e2e-github-client-secret",
    BETTER_AUTH_SECRET: "e2e-secret-at-least-32-characters-long",
    BETTER_AUTH_URL: baseURL,
    DATABASE_URL: postgres.getConnectionUri(),
    E2E_BASE_URL: baseURL,
    E2E_NEXT_DIST_DIR: ".next-e2e",
    E2E_PORT: String(port),
    NODE_ENV: "test"
  }

  process.env.BETTER_AUTH_URL = env.BETTER_AUTH_URL
  process.env.DATABASE_URL = env.DATABASE_URL
  process.env.E2E_BASE_URL = env.E2E_BASE_URL
  process.env.E2E_PORT = env.E2E_PORT

  await runCommand("pnpm", ["db:push"], env)

  try {
    server = spawn("pnpm", ["exec", "next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
      env,
      shell: process.platform === "win32",
      stdio: "inherit"
    })

    await waitForServer(baseURL)
  } catch (error) {
    await stopServer(server)
    await postgres.stop()
    throw error
  }

  return async () => {
    await stopServer(server)
    await postgres?.stop()
  }
}

export default globalSetup
