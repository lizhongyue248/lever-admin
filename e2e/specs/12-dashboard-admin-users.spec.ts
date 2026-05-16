import { expect, test } from "../fixtures/coverage"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { createAdminUserFixture, createUserSessionFixture, getSessionById, getUserAdminStateByEmail, setUserRole } from "../helpers/db"

test.describe("12 dashboard admin users", () => {
  test("searches users and opens the desktop detail drawer", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "dashboard-admin-users-admin")
    await setUserRole(adminEmail, "admin")
    const target = await createAdminUserFixture({
      email: `maya-${Date.now()}@example.com`,
      name: "Maya Chen",
      role: "admin"
    })
    await createUserSessionFixture({ email: target.email })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/admin/users")

    await expect(page.getByRole("heading", { name: "平台用户" })).toBeVisible()
    await expect(page.getByRole("navigation", { name: "主导航" }).getByRole("link", { name: "用户管理" })).toHaveAttribute("href", "/dashboard/admin/users")
    await page.getByLabel("搜索用户").fill("Maya")
    await expect(page.getByTestId(`admin-user-row-${target.id}`)).toBeVisible()
    await expect(page.getByTestId("data-table-scroll")).toBeVisible()
    await expect(page.getByRole("button", { name: "首页" })).toBeVisible()
    await expect(page.getByRole("button", { name: "上一页" })).toBeVisible()
    await expect(page.getByRole("spinbutton", { name: "当前页" })).toHaveValue("1")
    await expect(page.getByRole("button", { name: "下一页" })).toBeVisible()
    await expect(page.getByRole("button", { name: "末页" })).toBeVisible()

    await page.getByTestId(`admin-user-row-${target.id}`).getByRole("button", { name: "更多用户操作" }).click()
    await expect(page.getByRole("menuitem", { name: "设置角色" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "重置密码" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "封禁用户" })).toBeVisible()
    await page.getByRole("menuitem", { name: "删除用户" }).click()
    await expect(page.getByRole("button", { name: "硬删除用户" })).toBeDisabled()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("button", { name: "硬删除用户" })).toBeHidden()

    await page.route("**/api/trpc/adminUser.get?**", async (route) => {
      await page.waitForTimeout(500)
      await route.continue()
    })
    await page.getByTestId(`admin-user-row-${target.id}`).click()
    await expect(page.getByTestId("admin-user-detail-drawer")).toBeVisible()
    await expect(page.getByTestId("admin-user-detail-skeleton")).toBeVisible()
    await expect(page.getByTestId("admin-user-detail-drawer").getByText("Maya Chen")).toBeVisible()
    await expect(page.getByRole("link", { name: "完整页" })).toHaveAttribute("href", `/dashboard/admin/users/${target.id}`)

    await page.getByRole("button", { name: "关闭用户详情" }).click()
    await expect(page.getByTestId("admin-user-detail-drawer")).toBeHidden()
    await expect(page.getByTestId(`admin-user-row-${target.id}`)).toBeVisible()
  })

  test("uses card navigation on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    await page.setViewportSize({ height: 844, width: 390 })
    const adminEmail = await createVerifiedUser(page, "dashboard-admin-users-mobile")
    await setUserRole(adminEmail, "admin")
    const target = await createAdminUserFixture({
      email: `mobile-${Date.now()}@example.com`,
      name: "Mobile User",
      role: "user"
    })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/admin/users")
    await page.getByLabel("搜索用户").fill("Mobile User")
    await page.getByTestId(`admin-user-card-${target.id}`).click()

    await expect(page).toHaveURL(new RegExp(`/dashboard/admin/users/${target.id}$`))
    await expect(page.getByRole("heading", { name: "用户详情" })).toBeVisible()
  })

  test("persists role changes and banning revokes active sessions", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "dashboard-admin-users-mutations")
    await setUserRole(adminEmail, "admin")
    const target = await createAdminUserFixture({
      email: `mutable-user-${Date.now()}@example.com`,
      name: "Mutable User",
      role: "user"
    })
    const targetSession = await createUserSessionFixture({ email: target.email })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/admin/users")
    await page.getByLabel("搜索用户").fill("Mutable User")

    const row = page.getByTestId(`admin-user-row-${target.id}`)
    await expect(row).toBeVisible()
    await row.getByRole("button", { name: "更多用户操作" }).click()
    await page.getByRole("menuitem", { name: "设置角色" }).click()
    const roleDialog = page.getByRole("dialog", { name: "设置平台角色" })
    await expect(roleDialog).toBeVisible()
    await roleDialog.getByRole("combobox", { name: "平台角色" }).click()
    await page.getByRole("option", { name: "support" }).click()
    await page.getByRole("button", { name: "保存角色" }).click()
    await expect.poll(async () => (await getUserAdminStateByEmail(target.email))?.role).toBe("support")

    await row.getByRole("button", { name: "更多用户操作" }).click()
    await page.getByRole("menuitem", { name: "封禁用户" }).click()
    await expect(page.getByRole("dialog", { name: "封禁 Mutable User" })).toBeVisible()
    await expect(page.getByRole("button", { name: "确认封禁" })).toBeDisabled()
    await page.getByLabel("封禁原因").fill("E2E policy violation")
    await page.getByRole("button", { name: "确认封禁" }).click()
    await expect.poll(async () => (await getUserAdminStateByEmail(target.email))?.banned).toBe(true)
    await expect.poll(() => getSessionById(targetSession.id)).toBeNull()
  })
})
