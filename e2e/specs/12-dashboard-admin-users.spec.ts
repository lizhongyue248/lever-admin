import { expect, test } from "@playwright/test"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { createAdminUserFixture, createUserSessionFixture, setUserRole } from "../helpers/db"

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
})
