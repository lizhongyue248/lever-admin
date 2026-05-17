import { defineConfig, devices } from "@playwright/test"

const port = Number(process.env.E2E_PORT ?? 3100)
const jsonReportPath = process.env.PLAYWRIGHT_JSON_REPORT_PATH

export default defineConfig({
  expect: {
    timeout: 30_000
  },
  fullyParallel: false,
  globalSetup: "./e2e/global-setup.ts",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] }
    }
  ],
  reporter: jsonReportPath ? [["list"], ["json", { outputFile: jsonReportPath }], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  testDir: "./e2e/specs",
  timeout: 90_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    video: "retain-on-failure"
  },
  workers: process.env.CI ? 1 : 2
})
