import { expect, test } from "@playwright/test"

import { createVerifiedUser, fillSignUpForm, signInViaUi, signUpViaUi } from "../helpers/auth-flows"
import { countUsersByEmail, getUserByEmail, markEmailVerified } from "../helpers/db"
import { e2ePassword, uniqueEmail } from "../helpers/test-data"

test.describe("02 sign up", () => {
  test("exposes the expected public controls", async ({ page }) => {
    await page.goto("/sign-up")

    await expect(page.getByRole("heading", { name: "创建账号" })).toBeVisible()
    await expect(page.getByLabel("名称")).toBeVisible()
    await expect(page.getByLabel("邮箱")).toBeVisible()
    await expect(page.getByLabel("密码", { exact: true })).toBeVisible()
    await expect(page.getByLabel("确认密码")).toBeVisible()
    await expect(page.getByRole("button", { name: "创建账号" })).toBeVisible()
    await expect(page.getByRole("link", { name: "返回登录" })).toBeVisible()
  })

  test("validates required fields before submitting", async ({ page }) => {
    await page.goto("/sign-up")
    await page.getByRole("button", { name: "创建账号" }).click()

    await expect(page).toHaveURL(/\/sign-up$/)
    await expect(page.getByText("请输入名称。")).toBeVisible()
    await expect(page.getByText("请输入邮箱。")).toBeVisible()
    await expect(page.getByText("密码至少需要 8 位。").first()).toBeVisible()
  })

  test("validates email format", async ({ page }) => {
    await page.goto("/sign-up")
    await page.getByLabel("名称").fill("Invalid Email E2E")
    await page.getByLabel("邮箱").fill("invalid-email")
    await page.getByLabel("密码", { exact: true }).fill(e2ePassword)
    await page.getByLabel("确认密码").fill(e2ePassword)
    await page.getByRole("button", { name: "创建账号" }).click()

    await expect(page).toHaveURL(/\/sign-up$/)
    await expect(page.getByText("请输入有效的邮箱地址。")).toBeVisible()
  })

  test("validates password confirmation", async ({ page }) => {
    await page.goto("/sign-up")
    await page.getByLabel("名称").fill("Mismatch E2E")
    await page.getByLabel("邮箱").fill("mismatch@example.com")
    await page.getByLabel("密码", { exact: true }).fill(e2ePassword)
    await page.getByLabel("确认密码").fill("Different-password-12345")
    await page.getByRole("button", { name: "创建账号" }).click()

    await expect(page).toHaveURL(/\/sign-up$/)
    await expect(page.getByText("两次输入的密码不一致。")).toBeVisible()
  })

  test("creates an unverified user after successful sign up", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = uniqueEmail("signup")

    await signUpViaUi(page, {
      email,
      name: "Sign Up E2E"
    })

    await expect(page.getByLabel("邮箱")).toHaveValue(email)
    await expect(page.getByLabel("邮箱")).toBeDisabled()

    const user = await getUserByEmail(email)
    expect(user).toMatchObject({
      email,
      email_verified: false,
      name: "Sign Up E2E"
    })
  })

  test("shows an error and avoids duplicate users when signing up with an existing email", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = uniqueEmail("duplicate")

    await signUpViaUi(page, {
      email,
      name: "Original E2E"
    })
    await markEmailVerified(email)
    await page.context().clearCookies()

    await page.goto("/sign-up")
    await fillSignUpForm(page, {
      email,
      name: "Duplicate E2E"
    })
    await page.getByRole("button", { name: "创建账号" }).click()

    await expect(page).toHaveURL(/\/sign-up$/)
    await expect(page.getByText("该邮箱已注册，请直接登录。")).toBeVisible()
    await expect.poll(async () => await countUsersByEmail(email)).toBe(1)
  })

  test("redirects an already signed-in user away from sign up", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "signed-in")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto("/sign-up")
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test("back link returns to sign in", async ({ page }) => {
    await page.goto("/sign-up")
    await page.getByRole("link", { name: "返回登录" }).click()

    await expect(page).toHaveURL(/\/sign-in$/)
  })
})
