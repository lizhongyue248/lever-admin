import { expect, type Page, test } from "@playwright/test"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { addOrganizationMemberByEmail, seedOrganizationWithDepartments, setUserRole } from "../helpers/db"

const waitForDashboardReady = async (page: Page) => {
  await expect(page.getByRole("banner")).toBeVisible()
  await expect(page.getByRole("button", { name: "折叠菜单栏" })).toBeEnabled()
  await expect(page.getByRole("button", { name: "切换主题" })).toBeEnabled()
}

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
    await waitForDashboardReady(page)
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

  test("filters sidebar navigation by platform and organization roles", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Role-based sidebar only needs one browser project")

    const normalEmail = await createVerifiedUser(page, "dashboard-sidebar-normal")

    await page.goto("/sign-in")
    await signInViaUi(page, { email: normalEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await waitForDashboardReady(page)

    const normalNav = page.getByRole("navigation", { name: "主导航" })
    await expect(normalNav.getByRole("link", { name: "当前组织" })).toHaveCount(0)
    await expect(normalNav.getByRole("link", { name: "用户管理" })).toHaveCount(0)
    await expect(normalNav.getByRole("link", { name: "平台设置" })).toHaveCount(0)

    await page.context().clearCookies()
    const memberEmail = await createVerifiedUser(page, "dashboard-sidebar-member")
    const memberOrg = await seedOrganizationWithDepartments({
      departmentName: "成员部门",
      rootName: "Member Org",
      rootSlug: `member-org-${Date.now()}`
    })
    await addOrganizationMemberByEmail({ email: memberEmail, organizationId: memberOrg.rootId, role: "member" })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: memberEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await waitForDashboardReady(page)

    const memberNav = page.getByRole("navigation", { name: "主导航" })
    await expect(memberNav.getByRole("link", { name: "当前组织" })).toHaveCount(0)
    await expect(memberNav.getByRole("link", { name: "用户管理" })).toHaveCount(0)

    await page.context().clearCookies()
    const ownerEmail = await createVerifiedUser(page, "dashboard-sidebar-owner")
    const ownerOrg = await seedOrganizationWithDepartments({
      departmentName: "管理部门",
      rootName: "Owner Org",
      rootSlug: `owner-org-${Date.now()}`
    })
    await addOrganizationMemberByEmail({ email: ownerEmail, organizationId: ownerOrg.rootId, role: "owner" })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: ownerEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await waitForDashboardReady(page)

    const ownerNav = page.getByRole("navigation", { name: "主导航" })
    await expect(ownerNav.getByRole("link", { name: "当前组织" })).toHaveAttribute("href", `/dashboard/orgs/${ownerOrg.rootId.replace(/^org-/, "")}`)
    await expect(ownerNav.getByRole("link", { name: "用户管理" })).toHaveCount(0)
  })

  test("limits platform management sidebar items by admin level", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Role-based sidebar only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "dashboard-sidebar-admin")
    await setUserRole(adminEmail, "admin")

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await waitForDashboardReady(page)

    const adminNav = page.getByRole("navigation", { name: "主导航" })
    await expect(adminNav.getByRole("link", { name: "用户管理" })).toBeVisible()
    await expect(adminNav.getByRole("link", { name: "平台组织" })).toBeVisible()
    await expect(adminNav.getByRole("link", { name: "平台 API Key" })).toBeVisible()
    await expect(adminNav.getByRole("link", { name: "请求日志" })).toHaveCount(0)
    await expect(adminNav.getByRole("link", { name: "平台设置" })).toHaveCount(0)

    await page.context().clearCookies()
    const superAdminEmail = await createVerifiedUser(page, "dashboard-sidebar-super-admin")
    await setUserRole(superAdminEmail, "super_admin")

    await page.goto("/sign-in")
    await signInViaUi(page, { email: superAdminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await waitForDashboardReady(page)

    const superAdminNav = page.getByRole("navigation", { name: "主导航" })
    await expect(superAdminNav.getByRole("link", { name: "用户管理" })).toBeVisible()
    await expect(superAdminNav.getByRole("link", { name: "平台组织" })).toBeVisible()
    await expect(superAdminNav.getByRole("link", { name: "平台 API Key" })).toBeVisible()
    await expect(superAdminNav.getByRole("link", { name: "请求日志" })).toBeVisible()
    await expect(superAdminNav.getByRole("link", { name: "平台设置" })).toBeVisible()
  })

  test("toggles the dashboard theme from the topbar", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "dashboard-theme")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await waitForDashboardReady(page)

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
    await waitForDashboardReady(page)

    const viewportHeight = await page.evaluate(() => window.innerHeight)

    await expect.poll(async () => page.locator("body").evaluate((element) => element.scrollHeight)).toBe(viewportHeight)
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
    await waitForDashboardReady(page)

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
    await waitForDashboardReady(page)

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
    await expect(page).toHaveURL(/\/dashboard$/)
    await waitForDashboardReady(page)
    await page.getByRole("button", { name: /打开用户菜单/ }).click()
    await page.getByRole("menuitem", { name: "退出登录" }).click()

    await expect(page).toHaveURL(/\/sign-in$/)
  })
})
