import { expect, test } from "@playwright/test"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"

test.describe("06 dashboard", () => {
  test("redirects anonymous users to sign in with dashboard redirect target", async ({ page }) => {
    await page.goto("/dashboard")

    await expect(page).toHaveURL(/\/sign-in\?redirectTo=%2Fdashboard/)
    await expect(page.getByRole("heading", { name: "登录" })).toBeVisible()
  })

  test("renders the authenticated dashboard shell and personal workspace", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "dashboard")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole("banner")).toBeVisible()
    await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible()
    await expect(page.getByText("Lever Admin")).toBeVisible()
    await expect(page.getByText("首页")).toBeVisible()
    await expect(page.getByLabel("面包屑").getByText("工作台")).toBeVisible()
    await expect(page.getByRole("button", { name: "切换主题" })).toBeVisible()
    await expect(page.getByRole("button", { name: /打开用户菜单/ })).toContainText(email)
    await expect(page.getByText("我的安全待办")).toBeVisible()
    await expect(page.getByRole("img", { name: "个人安全维度雷达图" })).toBeVisible()
    await expect(page.getByText("设备足迹")).toBeVisible()
    await expect(page.getByText("登录方式画像")).toBeVisible()
    await expect(page.getByText("个人 API Key 状态")).toBeVisible()
    await expect(page.getByText("最近身份事件")).toBeVisible()
    await expect(page.getByText("登录与会话趋势")).toHaveCount(0)
    await expect(page.getByText("认证方式覆盖")).toHaveCount(0)
  })

  test("toggles the dashboard theme from the topbar", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "dashboard-theme")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    const themeButton = page.getByRole("button", { name: "切换主题" })

    await page.evaluate(() => {
      localStorage.setItem("theme", "light")
      document.documentElement.classList.remove("dark")
    })
    await expect.poll(async () => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(false)

    await themeButton.click()
    await expect.poll(async () => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true)

    await themeButton.click()
    await expect.poll(async () => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(false)
  })

  test("keeps dashboard chrome fixed while only the main content scrolls", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "dashboard-scroll")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    await expect.poll(async () => page.evaluate(() => document.body.scrollHeight)).toBe(await page.evaluate(() => window.innerHeight))
    await expect.poll(async () => page.locator("main").evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)

    const sidebarTopBefore = await page.getByRole("navigation", { name: "主导航" }).boundingBox()
    await page.locator("main").evaluate((element) => {
      element.scrollTop = 600
    })
    const sidebarTopAfter = await page.getByRole("navigation", { name: "主导航" }).boundingBox()

    expect(sidebarTopAfter?.y).toBe(sidebarTopBefore?.y)
  })

  test("collapses and expands the desktop sidebar", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "dashboard-collapse")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    const sidebar = page.getByTestId("dashboard-sidebar")
    const expandedBox = await sidebar.boundingBox()

    await page.getByRole("button", { name: "折叠菜单栏" }).click()
    await expect(page.getByRole("button", { name: "展开菜单栏" })).toBeVisible()
    const collapsedBox = await sidebar.boundingBox()

    expect(collapsedBox?.width).toBeLessThan(expandedBox?.width ?? 0)
    await expect(page.getByTestId("dashboard-sidebar-label-工作台")).toBeHidden()

    await page.getByRole("button", { name: "展开菜单栏" }).click()
    await expect(page.getByRole("button", { name: "折叠菜单栏" })).toBeVisible()
    await expect(page.getByTestId("dashboard-sidebar-label-工作台")).toBeVisible()
  })

  test("keeps /app as a compatibility redirect to /dashboard", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "dashboard-app")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto("/app")

    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test("opens the sidebar drawer on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chrome", "Mobile drawer behavior only needs the mobile browser project")

    const email = await createVerifiedUser(page, "dashboard-mobile")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole("navigation", { name: "主导航" })).toBeHidden()

    await page.getByRole("button", { name: "打开侧边栏" }).click()

    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByRole("navigation", { name: "移动端主导航" })).toBeVisible()
    await expect(page.getByRole("button", { name: /打开用户菜单/ })).toContainText(email)
  })

  test("signs out from the dashboard user menu", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "dashboard-sign-out")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await page.getByRole("button", { name: /打开用户菜单/ }).click()
    await page.getByRole("menuitem", { name: "退出登录" }).click()

    await expect(page).toHaveURL(/\/sign-in$/)
  })
})
