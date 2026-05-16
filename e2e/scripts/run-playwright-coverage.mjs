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

const extraArgs = process.argv.slice(2).filter((arg) => arg !== "--")
const testCode = await run("pnpm", ["exec", "playwright", "test", "--project=chromium", ...extraArgs], env)
const mergeCode = await run("node", ["e2e/scripts/merge-playwright-coverage.mjs"], env)

process.exit(testCode || mergeCode)
