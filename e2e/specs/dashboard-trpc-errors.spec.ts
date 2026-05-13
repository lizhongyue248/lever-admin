import { expect, test } from "@playwright/test"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"

test.describe("dashboard tRPC errors", () => {
  test("shows the platform admin permission error to non-admin users", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "dashboard-trpc-error")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto("/dashboard/admin/orgs")

    await expect(page.getByRole("main").getByText("需要平台管理员权限。")).toBeVisible()
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: "需要平台管理员权限。" }).first()).toBeVisible()
  })
})
