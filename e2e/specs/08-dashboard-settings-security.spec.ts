import { expect, test } from "../fixtures/coverage"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { e2eNewPassword, e2ePassword } from "../helpers/test-data"

test.describe("08 dashboard settings security", () => {
  test("redirects anonymous users to sign in with security redirect target", async ({ page }) => {
    await page.goto("/dashboard/settings/security")

    await expect(page).toHaveURL(/\/sign-in\?redirectTo=%2Fdashboard%2Fsettings%2Fsecurity/)
  })

  test("renders the authenticated security page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "security")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/settings/security")

    await expect(page.getByRole("heading", { name: "安全设置" })).toBeVisible()
    const cardTitles = page.locator('[data-slot="card-title"]')
    await expect(cardTitles.filter({ hasText: /^修改密码$/ })).toBeVisible()
    await expect(cardTitles.filter({ hasText: /^双因素认证$/ })).toBeVisible()
    await expect(cardTitles.filter({ hasText: /^Passkey$/ })).toBeVisible()
    await expect(cardTitles.filter({ hasText: /^第三方账号$/ })).toBeVisible()
    await expect(cardTitles.filter({ hasText: /^安全雷达$/ })).toBeVisible()
    await expect(page.getByTestId("dashboard-sidebar-label-安全设置")).toBeVisible()
    const breadcrumbs = page.getByLabel("面包屑")
    await expect(breadcrumbs.getByText("首页", { exact: true })).toBeVisible()
    await expect(breadcrumbs.getByText("设置", { exact: true })).toBeVisible()
    await expect(breadcrumbs.getByText("安全设置", { exact: true })).toBeVisible()

    const scoreCard = page.getByText("安全雷达", { exact: true }).locator("xpath=ancestor::div[contains(@class, 'rounded-lg')][1]")
    await expect(scoreCard.getByText("35", { exact: true })).toHaveCount(0)
  })

  test("validates password confirmation", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "security-password-validation")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/settings/security")

    await page.getByLabel("当前密码").fill(e2ePassword)
    await page.getByLabel("新密码", { exact: true }).fill(e2eNewPassword)
    await page.getByLabel("确认新密码").fill(`${e2eNewPassword}-mismatch`)
    await page.getByRole("button", { name: "更新密码" }).click()

    await expect(page.getByText("两次输入的新密码不一致。")).toBeVisible()
  })

  test("changes the password and allows signing in with the new password", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "security-password-change")
    const newPassword = `${e2eNewPassword}-${Date.now()}`

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/settings/security")

    await page.getByLabel("当前密码").fill(e2ePassword)
    await page.getByLabel("新密码", { exact: true }).fill(newPassword)
    await page.getByLabel("确认新密码").fill(newPassword)
    await page.getByRole("button", { name: "更新密码" }).click()

    await expect(page.getByText("密码已更新。")).toBeVisible()

    await page.context().clearCookies()
    await page.goto("/sign-in")
    await signInViaUi(page, { email, password: newPassword })

    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test("opens 2fa and passkey setup dialogs", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "security-dialogs")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/settings/security")

    await page.getByRole("button", { name: "开启 2FA" }).click()
    const twoFactorDialog = page.getByRole("dialog", { name: "开启双因素认证" })
    await expect(twoFactorDialog).toBeVisible()
    await expect(twoFactorDialog.getByLabel("当前密码")).toBeVisible()
    await page.keyboard.press("Escape")

    await page.getByRole("button", { name: "添加 Passkey" }).click()
    const passkeyDialog = page.getByRole("dialog", { name: "添加 Passkey" })
    await expect(passkeyDialog).toBeVisible()
    await expect(passkeyDialog.getByLabel("Passkey 名称")).toBeVisible()
  })

  test("renders the security page on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chrome", "Mobile security layout only needs the mobile browser project")

    const email = await createVerifiedUser(page, "security-mobile")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/settings/security")

    await expect(page.getByRole("heading", { name: "安全设置" })).toBeVisible()
    await expect(page.getByText("修改密码", { exact: true })).toBeVisible()
    await expect(page.getByText("双因素认证", { exact: true })).toBeVisible()
    await expect(page.getByText("最近登录方式", { exact: true })).toBeVisible()
  })
})
