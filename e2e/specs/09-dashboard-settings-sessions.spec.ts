import { expect, test } from "@playwright/test"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"

test.describe("09 dashboard settings sessions", () => {
  test("redirects anonymous users to sign in with sessions redirect target", async ({ page }) => {
    await page.goto("/dashboard/settings/sessions")

    await expect(page).toHaveURL(/\/sign-in\?redirectTo=%2Fdashboard%2Fsettings%2Fsessions/)
  })

  test("renders the authenticated sessions page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "sessions")

    await page.setViewportSize({ height: 1200, width: 2048 })
    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/settings/sessions")

    await expect(page.getByRole("heading", { name: "我的会话" })).toBeVisible()
    await expect(page.getByText("退出全部其他设备", { exact: true })).toBeVisible()
    await expect(page.getByText("会话概览", { exact: true })).toBeVisible()
    await expect(page.getByText("登录设备", { exact: true })).toBeVisible()
    await expect(page.getByText("会话健康", { exact: true })).toBeVisible()
    await expect(page.getByTestId("current-session-marker")).toHaveCount(0)
    await expect(page.getByTestId("session-device-system-icon").filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByTestId("session-device-browser-icon").filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByRole("button", { name: "上一页" })).toBeDisabled()
    await expect(page.getByRole("button", { name: "下一页" })).toBeDisabled()
    await expect(page.getByText("第 1 / 1 页", { exact: true })).toBeVisible()
    await expect(page.getByTestId("dashboard-sidebar-label-我的会话")).toBeVisible()

    const summaryCard = page.getByText("会话概览", { exact: true }).locator("xpath=ancestor::div[contains(@class, 'rounded-lg')][1]")
    const sessionListCard = page.getByText("登录设备", { exact: true }).locator("xpath=ancestor::div[contains(@class, 'rounded-lg')][1]")
    const healthCard = page.getByText("会话健康", { exact: true }).locator("xpath=ancestor::div[contains(@class, 'rounded-lg')][1]")

    await expect(async () => {
      const summaryBox = await summaryCard.boundingBox()
      const sessionListBox = await sessionListCard.boundingBox()
      const healthBox = await healthCard.boundingBox()

      expect(summaryBox).not.toBeNull()
      expect(sessionListBox).not.toBeNull()
      expect(healthBox).not.toBeNull()

      if (!summaryBox || !sessionListBox || !healthBox) {
        return
      }

      const summaryRight = summaryBox.x + summaryBox.width
      const lowerRight = Math.max(sessionListBox.x + sessionListBox.width, healthBox.x + healthBox.width)
      const lowerWidthWithoutGap = sessionListBox.width + healthBox.width
      const sessionListRatio = sessionListBox.width / lowerWidthWithoutGap
      const healthRatio = healthBox.width / lowerWidthWithoutGap

      expect(Math.abs(summaryRight - lowerRight)).toBeLessThanOrEqual(2)
      expect(Math.abs(sessionListRatio - 2 / 3)).toBeLessThanOrEqual(0.03)
      expect(Math.abs(healthRatio - 1 / 3)).toBeLessThanOrEqual(0.03)
    }).toPass()

    const breadcrumbs = page.getByLabel("面包屑")
    await expect(breadcrumbs.getByText("首页", { exact: true })).toBeVisible()
    await expect(breadcrumbs.getByText("设置", { exact: true })).toBeVisible()
    await expect(breadcrumbs.getByText("我的会话", { exact: true })).toBeVisible()
  })

  test("opens the revoke-all-other-sessions confirmation dialog", async ({ browser, page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "sessions-revoke-all")
    const otherContext = await browser.newContext()
    const otherPage = await otherContext.newPage()

    try {
      await page.goto("/sign-in")
      const baseUrl = process.env.E2E_BASE_URL ?? new URL(page.url()).origin

      await otherPage.goto(`${baseUrl}/sign-in`)
      await signInViaUi(otherPage, { email })
      await expect(otherPage).toHaveURL(/\/dashboard$/)

      await signInViaUi(page, { email })
      await expect(page).toHaveURL(/\/dashboard$/)
      await page.goto("/dashboard/settings/sessions")

      await page.getByRole("button", { name: "退出全部其他设备" }).click()
      await expect(page.getByRole("dialog", { name: "退出全部其他设备" })).toBeVisible()
      await expect(page.getByText("当前设备会保留登录状态。")).toBeVisible()
    } finally {
      await otherContext.close()
    }
  })

  test("renders the sessions page on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chrome", "Mobile sessions layout only needs the mobile browser project")

    const email = await createVerifiedUser(page, "sessions-mobile")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/settings/sessions")

    await expect(page.getByRole("heading", { name: "我的会话" })).toBeVisible()
    await expect(page.getByText("活跃会话", { exact: true })).toBeVisible()
    await expect(page.getByText("会话健康", { exact: true })).toBeVisible()
    await expect(page.getByTestId("current-session-marker-mobile")).toHaveCount(0)
    await expect(page.getByTestId("session-device-system-icon").filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByTestId("session-device-browser-icon").filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByRole("button", { name: "上一页" })).toBeDisabled()
    await expect(page.getByRole("button", { name: "下一页" })).toBeDisabled()
    await expect(page.getByText("1 / 1", { exact: true })).toBeVisible()
  })

  test("revokes another active session", async ({ browser, page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "sessions-revoke-one")
    const otherContext = await browser.newContext()
    const otherPage = await otherContext.newPage()

    try {
      await page.goto("/sign-in")
      const baseUrl = process.env.E2E_BASE_URL ?? new URL(page.url()).origin

      await otherPage.goto(`${baseUrl}/sign-in`)
      await signInViaUi(otherPage, { email })
      await expect(otherPage).toHaveURL(/\/dashboard$/)

      await signInViaUi(page, { email })
      await expect(page).toHaveURL(/\/dashboard$/)
      await page.goto("/dashboard/settings/sessions")

      const revokeButtons = page.getByRole("button", { name: "撤销" })
      await expect.poll(async () => revokeButtons.count()).toBeGreaterThan(0)
      await revokeButtons.first().click()
      await expect(page.getByRole("dialog", { name: "撤销会话" })).toBeVisible()
      await page.getByRole("button", { name: "确认撤销" }).click()
      await expect(page.getByText("会话已撤销。")).toBeVisible()
    } finally {
      await otherContext.close()
    }
  })
})
