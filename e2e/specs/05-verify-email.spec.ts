import { expect, test } from "@playwright/test"

import { createVerifiedUser, signInViaUi, signUpViaUi } from "../helpers/auth-flows"
import { getUserByEmail } from "../helpers/db"
import { createEmailVerificationToken, uniqueEmail } from "../helpers/test-data"

test.describe("05 verify email", () => {
  test("pending and failed states render", async ({ page }) => {
    await page.goto("/verify-email?status=pending")
    await expect(page.getByRole("heading", { name: "邮箱验证" })).toBeVisible()
    await expect(page.getByText("等待验证")).toBeVisible()

    await page.goto("/verify-email?status=failed")
    await expect(page.getByText("验证失败")).toBeVisible()
  })

  test("error and success states render", async ({ page }) => {
    await page.goto("/verify-email?error=invalid_token")
    await expect(page.getByText("验证失败")).toBeVisible()
    await expect(page.getByText("验证链接无效或已过期")).toBeVisible()

    await page.goto("/verify-email?status=success")
    await expect(page.getByText("验证成功")).toBeVisible()
    await expect(page.getByRole("link", { name: "进入应用" })).toBeVisible()
  })

  test("validates resend email before submitting", async ({ page }) => {
    await page.goto("/verify-email?status=pending")
    await page.getByRole("button", { name: "重新发送验证邮件" }).click()
    await expect(page.getByText("请输入邮箱。")).toBeVisible()

    await page.getByLabel("邮箱").fill("invalid-email")
    await page.getByRole("button", { name: "重新发送验证邮件" }).click()
    await expect(page.getByText("请输入有效的邮箱地址。")).toBeVisible()
  })

  test("resends verification email and starts cooldown", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = uniqueEmail("verify-resend")

    await signUpViaUi(page, {
      email,
      name: "Verify Resend E2E"
    })

    await page.getByLabel("邮箱").fill(email)
    await page.getByRole("button", { name: "重新发送验证邮件" }).click()

    await expect(page.getByText("验证邮件已发送，请检查收件箱。")).toBeVisible()
    await expect(page.getByRole("button", { name: /秒后可重新发送/u })).toBeDisabled()
  })

  test("redirects a verified signed-in user to app", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "verify-redirect")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/app$/)

    await page.goto("/verify-email")
    await expect(page).toHaveURL(/\/app$/)
  })

  test("verifies a valid token from the page flow", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = uniqueEmail("verify-token")
    await signUpViaUi(page, {
      email,
      name: "Verify Token E2E"
    })
    await page.context().clearCookies()

    const token = createEmailVerificationToken(email)
    await page.goto(`/verify-email?token=${token}`)

    await expect(page.getByText("验证成功")).toBeVisible()
    await expect.poll(async () => (await getUserByEmail(email))?.email_verified).toBe(true)
  })

  test("Better Auth verification link enters the app after success", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = uniqueEmail("verify-api")
    await signUpViaUi(page, {
      email,
      name: "Verify API E2E"
    })
    await page.context().clearCookies()

    const token = createEmailVerificationToken(email)
    await page.goto(`/api/auth/verify-email?token=${token}&callbackURL=/app`)

    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByText(email)).toBeVisible()
    await expect.poll(async () => (await getUserByEmail(email))?.email_verified).toBe(true)
  })

  test("shows failure for an invalid token and leaves the user unverified", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = uniqueEmail("verify-invalid")
    await signUpViaUi(page, {
      email,
      name: "Verify Invalid E2E"
    })
    await page.context().clearCookies()

    await page.goto("/verify-email?token=invalid-token")

    await expect(page.getByText("验证失败")).toBeVisible()
    await expect.poll(async () => (await getUserByEmail(email))?.email_verified).toBe(false)
  })

  test("back button returns to sign in", async ({ page }) => {
    await page.goto("/verify-email?status=pending")
    await page.locator('a[aria-label="返回登录"]').click()

    await expect(page).toHaveURL(/\/sign-in$/)
  })

  test("theme toggle switches the page theme", async ({ page }) => {
    await page.goto("/verify-email?status=pending")

    const initialIsDark = await page.locator("html").evaluate((element) => element.classList.contains("dark"))
    await page.getByRole("button", { name: "切换主题" }).click()

    await expect.poll(async () => await page.locator("html").evaluate((element) => element.classList.contains("dark"))).toBe(!initialIsDark)
  })
})
