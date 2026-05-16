import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { test as base, expect, type Page } from "@playwright/test"

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
