import { expect, test } from "@playwright/test"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { createAdminUserFixture, setUserRole } from "../helpers/db"

test.describe("13 dashboard admin users id", () => {
  test("opens the full user detail page directly", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "dashboard-admin-users-detail")
    await setUserRole(adminEmail, "admin")
    const target = await createAdminUserFixture({
      email: `detail-${Date.now()}@example.com`,
      name: "Detail User",
      role: "support"
    })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto(`/dashboard/admin/users/${target.id}`)

    await expect(page.getByRole("heading", { name: "用户详情" })).toBeVisible()
    await expect(page.getByText("Detail User")).toBeVisible()
    await expect(page.getByText("support")).toBeVisible()
  })

  test("requires confirmation before deleting a user", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "dashboard-admin-users-delete")
    await setUserRole(adminEmail, "admin")
    const target = await createAdminUserFixture({
      email: `delete-${Date.now()}@example.com`,
      name: "Delete Candidate",
      role: "user"
    })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto(`/dashboard/admin/users/${target.id}`)

    await page.getByRole("button", { name: "删除用户" }).click()
    await expect(page.getByRole("button", { name: "硬删除用户" })).toBeDisabled()
    await page.getByLabel("确认删除邮箱").fill(target.email)
    await expect(page.getByRole("button", { name: "硬删除用户" })).toBeEnabled()
  })
})
