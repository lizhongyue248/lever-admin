import { expect, test } from "../fixtures/coverage"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { createResetPasswordToken } from "../helpers/db"
import { e2eNewPassword, e2ePassword, uniqueToken } from "../helpers/test-data"

test.describe("04 reset password", () => {
  test("without token shows invalid link state", async ({ page }) => {
    await page.goto("/reset-password")

    await expect(page.getByRole("heading", { name: "重置密码" })).toBeVisible()
    await expect(page.getByText("链接无效")).toBeVisible()
    await expect(page.getByRole("link", { name: "重新发送重置邮件" })).toBeVisible()
  })

  test("without token can navigate to forgot password", async ({ page }) => {
    await page.goto("/reset-password")
    await page.getByRole("link", { name: "重新发送重置邮件" }).click()

    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test("validates required fields before submitting", async ({ page }) => {
    await page.goto("/reset-password?token=client-validation-token")
    await page.getByRole("button", { name: "更新密码" }).click()

    await expect(page).toHaveURL(/\/reset-password\?token=client-validation-token$/)
    await expect(page.getByText("密码至少需要 8 位。").first()).toBeVisible()
  })

  test("validates matching password confirmation", async ({ page }) => {
    await page.goto("/reset-password?token=client-validation-token")
    await page.getByLabel("新密码", { exact: true }).fill(e2eNewPassword)
    await page.getByLabel("确认新密码").fill("Different-new-password-12345")
    await page.getByRole("button", { name: "更新密码" }).click()

    await expect(page).toHaveURL(/\/reset-password\?token=client-validation-token$/)
    await expect(page.getByText("两次输入的新密码不一致。")).toBeVisible()
  })

  test("shows an error for an invalid token", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    await page.goto("/reset-password?token=invalid-reset-token")
    await page.getByLabel("新密码", { exact: true }).fill(e2eNewPassword)
    await page.getByLabel("确认新密码").fill(e2eNewPassword)
    await page.getByRole("button", { name: "更新密码" }).click()

    await expect(page).toHaveURL(/\/reset-password\?token=invalid-reset-token$/)
    await expect(page.getByText("验证链接无效或已过期")).toBeVisible()
  })

  test("Better Auth reset callback redirects to the reset form with token", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "reset-callback")
    const token = uniqueToken("reset-callback")
    await createResetPasswordToken(email, token)

    await page.goto(`/api/auth/reset-password/${token}?callbackURL=/reset-password`)

    await expect(page).toHaveURL(new RegExp(`/reset-password\\?token=${token}$`))
    await expect(page.getByRole("button", { name: "更新密码" })).toBeVisible()
  })

  test("resets password with a valid token", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "reset-success")
    const token = uniqueToken("reset-success")
    await createResetPasswordToken(email, token)

    await page.goto(`/reset-password?token=${token}`)
    await page.getByLabel("新密码", { exact: true }).fill(e2eNewPassword)
    await page.getByLabel("确认新密码").fill(e2eNewPassword)
    await page.getByRole("button", { name: "更新密码" }).click()

    await expect(page).toHaveURL(/\/sign-in$/)

    await signInViaUi(page, { email, password: e2ePassword })
    await expect(page.getByText("邮箱或密码不正确。")).toBeVisible()

    await page.goto("/sign-in")
    await signInViaUi(page, { email, password: e2eNewPassword })
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test("back button returns to sign in", async ({ page }) => {
    await page.goto("/reset-password")
    await page.getByRole("link", { name: "返回登录" }).click()

    await expect(page).toHaveURL(/\/sign-in$/)
  })

  test("theme toggle switches the page theme", async ({ page }) => {
    await page.goto("/reset-password")

    const initialIsDark = await page.locator("html").evaluate((element) => element.classList.contains("dark"))
    await page.getByRole("button", { name: "切换主题" }).click()

    await expect.poll(async () => await page.locator("html").evaluate((element) => element.classList.contains("dark"))).toBe(!initialIsDark)
  })
})
