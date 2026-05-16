import { expect, test } from "../fixtures/coverage"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"

test.describe("07 dashboard settings profile", () => {
  test("redirects anonymous users to sign in with profile redirect target", async ({ page }) => {
    await page.goto("/dashboard/settings/profile")

    await expect(page).toHaveURL(/\/sign-in\?redirectTo=%2Fdashboard%2Fsettings%2Fprofile/)
  })

  test("renders the authenticated profile page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "profile")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto("/dashboard/settings/profile")

    await expect(page.getByRole("heading", { name: "个人资料" })).toBeVisible()
    await expect(page.getByText("账号档案")).toBeVisible()
    await expect(page.getByLabel("邮箱")).toHaveValue(email)
    await expect(page.getByTestId("dashboard-sidebar-label-个人资料")).toBeVisible()
    await expect(page.getByLabel("面包屑").getByText("首页")).toBeVisible()
    await expect(page.getByLabel("面包屑").getByText("设置")).toBeVisible()
    await expect(page.getByLabel("面包屑").getByText("个人资料")).toBeVisible()
  })

  test("updates the profile name and avatar url", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "profile-update")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/settings/profile")

    await expect(page.getByText("70%")).toBeVisible()
    await page.getByLabel("名称").fill("李明 E2E")
    await page.getByLabel("头像 URL").fill("https://example.com/avatar.png")
    await page.getByRole("button", { name: "保存资料" }).click()

    await expect(page.getByText("个人资料已更新。")).toBeVisible()
    await expect(page.getByText("100%")).toBeVisible()

    await page.reload()

    await expect(page.getByLabel("名称")).toHaveValue("李明 E2E")
    await expect(page.getByLabel("头像 URL")).toHaveValue("https://example.com/avatar.png")
  })

  test("uploads an avatar and saves the returned avatar url", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "profile-avatar-upload")
    const avatarBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="red"/></svg>')

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/settings/profile")

    await page.getByLabel("上传头像").setInputFiles({
      buffer: avatarBuffer,
      mimeType: "image/svg+xml",
      name: "avatar.svg"
    })

    await expect(page.getByText("头像已上传。")).toBeVisible()
    await page.getByRole("button", { name: "保存资料" }).click()

    await expect(page.getByText("个人资料已更新。")).toBeVisible()
    await expect(page.getByLabel("头像 URL")).toHaveValue(/\/avatars\//)

    await page.reload()

    await expect(page.getByLabel("头像 URL")).toHaveValue(/\/avatars\//)
  })

  test("validates profile name length", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "profile-validation")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/settings/profile")

    await page.getByLabel("名称").fill("A")
    await page.getByRole("button", { name: "保存资料" }).click()

    await expect(page.getByText("名称至少 2 个字符。")).toBeVisible()
  })

  test("renders the profile page on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chrome", "Mobile profile layout only needs the mobile browser project")

    const email = await createVerifiedUser(page, "profile-mobile")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/settings/profile")

    await expect(page.getByRole("heading", { name: "个人资料" })).toBeVisible()
    await expect(page.getByText("账号档案")).toBeVisible()
    await expect(page.getByText("资料完整度")).toBeVisible()
  })
})
