import { expect, test } from "../fixtures/coverage"

import { createVerifiedUser, signInViaUi, signUpViaUi } from "../helpers/auth-flows"
import { uniqueEmail } from "../helpers/test-data"

test.describe("01 sign in", () => {
  test("exposes the expected public controls", async ({ page }) => {
    await page.goto("/sign-in")

    await expect(page.getByRole("heading", { name: "登录" })).toBeVisible()
    await expect(page.getByLabel("邮箱")).toBeVisible()
    await expect(page.getByLabel("密码", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "登录并进入应用" })).toBeVisible()
    await expect(page.getByRole("link", { name: "忘记密码？" })).toBeVisible()
    await expect(page.getByRole("link", { name: "创建账号" })).toBeVisible()
    await expect(page.getByRole("button", { name: "切换主题" })).toBeVisible()
  })

  test("validates required fields before submitting", async ({ page }) => {
    await page.goto("/sign-in")
    await page.getByRole("button", { name: "登录并进入应用" }).click()

    await expect(page).toHaveURL(/\/sign-in$/)
    await expect(page.getByText("请输入邮箱。")).toBeVisible()
    await expect(page.getByText("请输入密码。")).toBeVisible()
  })

  test("shows a generic error for an unknown email-password login", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    await page.goto("/sign-in")
    await signInViaUi(page, {
      email: uniqueEmail("missing")
    })

    await expect(page).toHaveURL(/\/sign-in$/)
    await expect(page.getByText("邮箱或密码不正确。")).toBeVisible()
  })

  test("signs in a verified email-password user", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "verified")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByText("我的安全待办")).toBeVisible()
    await expect(page.getByText(email)).toBeVisible()
  })

  test("returns to redirectTo after a verified email-password login", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "redirect")

    await page.goto("/sign-in?redirectTo=/dashboard")
    await signInViaUi(page, { email })

    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test("redirects an unverified email-password user to verify email", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = uniqueEmail("unverified")

    await signUpViaUi(page, {
      email,
      name: "Unverified E2E"
    })

    await page.context().clearCookies()
    await page.goto("/sign-in")
    await signInViaUi(page, { email })

    await expect(page).toHaveURL(/\/verify-email\?email=.*&status=pending/)
    await expect(page.getByText("等待验证")).toBeVisible()
    await expect(page.getByLabel("邮箱")).toHaveValue(email)
    await expect(page.getByLabel("邮箱")).toBeDisabled()
  })

  test("secondary links navigate to forgot password and sign up", async ({ page }) => {
    await page.goto("/sign-in")
    await page.getByRole("link", { name: "忘记密码？" }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)

    await page.goto("/sign-in")
    await page.getByRole("link", { name: "创建账号" }).click()
    await expect(page).toHaveURL(/\/sign-up$/)
  })
})
