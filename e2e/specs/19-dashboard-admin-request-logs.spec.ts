import { expect, type Page, test } from "@playwright/test"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { createRequestLogFixture, getUserByEmail, setUserRole } from "../helpers/db"

const signInAsAdmin = async (page: Page, prefix: string) => {
  const email = await createVerifiedUser(page, prefix)
  await setUserRole(email, "admin")
  const user = await getUserByEmail(email)

  if (!user) {
    throw new Error(`Missing E2E user ${email}`)
  }

  await page.goto("/sign-in")
  await signInViaUi(page, { email })
  await expect(page).toHaveURL(/\/dashboard$/)

  return user
}

test.describe("19 dashboard admin request logs", () => {
  test("shows seeded request log and detail snapshot", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    const user = await signInAsAdmin(page, "dashboard-request-logs")
    const log = await createRequestLogFixture({
      userEmail: user.email,
      userId: user.id,
      userName: user.name
    })

    await page.goto("/dashboard/admin/request-logs")

    await expect(page.getByRole("heading", { name: "系统请求日志" })).toBeVisible()
    const row = page.getByTestId(`request-log-row-${log.id}`)
    await expect(row.getByText("203.0.113.42")).toBeVisible()
    await expect(row.getByText("Chrome / Windows")).toBeVisible()
    await row.click()

    await expect(page.getByRole("dialog", { name: "请求详情" })).toBeVisible()
    await expect(page.getByText(log.requestId)).toBeVisible()
    await expect(page.getByText("Mozilla/5.0")).toBeVisible()
    await expect(page.getByText("[REDACTED]")).toBeVisible()
  })

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

  test("defaults to 10 rows per page and switches page size", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    const user = await signInAsAdmin(page, "dashboard-request-log-pagination")
    const targetEmail = `request-log-page-size-${Date.now()}@example.com`

    for (let index = 0; index < 25; index += 1) {
      await createRequestLogFixture({
        createdAt: new Date(Date.now() - index * 1000),
        path: `/api/trpc/requestLog.pagination.${index}`,
        requestId: `req-page-size-${Date.now()}-${index}`,
        routeName: `requestLog.pagination.${index}`,
        userEmail: targetEmail,
        userId: user.id,
        userName: "Paged Logs E2E"
      })
    }

    await page.goto("/dashboard/admin/request-logs")
    await page.getByLabel("搜索请求日志").fill(targetEmail)

    await expect(page.locator('[data-testid^="request-log-row-"]')).toHaveCount(10)
    await expect(page.getByText("显示 10 / 25")).toBeVisible()

    await page.getByRole("button", { name: "每页条数：10 条" }).click()
    await expect(page.getByRole("menuitem", { name: "每页 10 条" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "每页 20 条" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "每页 50 条" })).toBeVisible()
    await page.getByRole("menuitem", { name: "每页 50 条" }).click()

    await expect(page.locator('[data-testid^="request-log-row-"]')).toHaveCount(25)
    await expect(page.getByText("显示 25 / 25")).toBeVisible()
    await expect(page.getByRole("button", { name: "每页条数：50 条" })).toBeVisible()
    const fullPageScroll = page.getByTestId("data-table-scroll")
    await expect(fullPageScroll).toBeVisible()
    const fullPageScrollMetrics = await fullPageScroll.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight
    }))
    expect(fullPageScrollMetrics.scrollHeight).toBeGreaterThan(fullPageScrollMetrics.clientHeight)
    expect(fullPageScrollMetrics.clientHeight).toBeLessThanOrEqual(580)
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

    const listScroll = page.getByTestId("data-table-scroll")
    await expect(listScroll).toBeVisible()
    const scrollMetrics = await listScroll.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight
    }))
    expect(scrollMetrics.clientHeight).toBeLessThanOrEqual(580)

    const tableViewport = page.getByTestId("request-log-table-viewport")
    await expect(tableViewport).toBeVisible()
    const tableMetrics = await listScroll.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth
    }))
    expect(tableMetrics.scrollWidth).toBeGreaterThan(tableMetrics.clientWidth)

    const headerPosition = await page.getByTestId("request-log-table-header").evaluate((element) => window.getComputedStyle(element).position)
    expect(headerPosition).toBe("sticky")
  })
})
