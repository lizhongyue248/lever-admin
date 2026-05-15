import { expect, test } from "@playwright/test"

import { createVerifiedUser } from "../helpers/auth-flows"

test.describe("03 forgot password", () => {
  test("accepts reset requests without exposing account existence", async ({ page }) => {
    await page.goto("/forgot-password")

    await expect(page.getByRole("heading", { name: "忘记密码" })).toBeVisible()
    await page.getByLabel("邮箱").fill("missing@example.com")
    await page.getByRole("button", { name: "发送重置链接" }).click()

    await expect(page.getByText("如果该邮箱存在，我们已发送重置链接。")).toBeVisible()
    await expect(page.getByRole("button", { name: /秒后可重新发送/ })).toBeVisible()
  })

  test("validates email before submitting", async ({ page }) => {
    await page.goto("/forgot-password")
    await page.getByRole("button", { name: "发送重置链接" }).click()
    await expect(page.getByText("请输入邮箱。")).toBeVisible()

    await page.getByLabel("邮箱").fill("invalid-email")
    await page.getByRole("button", { name: "发送重置链接" }).click()
    await expect(page.getByText("请输入有效的邮箱地址。")).toBeVisible()
  })

  // This also exercises the Better Auth sendResetPassword callback through the console email provider in E2E.
  test("accepts reset requests for an existing email without exposing account details", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "forgot")

    await page.goto("/forgot-password")
    await page.getByLabel("邮箱").fill(email)
    await page.getByRole("button", { name: "发送重置链接" }).click()

    await expect(page.getByText("如果该邮箱存在，我们已发送重置链接。")).toBeVisible()
    await expect(page.getByRole("button", { name: /秒后可重新发送/ })).toBeVisible()
  })

  test("back button returns to sign in", async ({ page }) => {
    await page.goto("/forgot-password")
    await page.getByRole("link", { name: "返回登录" }).click()

    await expect(page).toHaveURL(/\/sign-in$/)
  })
})
