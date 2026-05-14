import { expect, test } from "@playwright/test"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { createAdminUserFixture, createApiKeyFixture, createApiKeyUsageLogFixture, getUserByEmail } from "../helpers/db"

test.describe("16 dashboard settings api keys", () => {
  test("redirects anonymous users to sign in with api keys redirect target", async ({ page }) => {
    await page.goto("/dashboard/settings/api-keys")

    await expect(page).toHaveURL(/\/sign-in\?redirectTo=%2Fdashboard%2Fsettings%2Fapi-keys/)
  })

  test("shows the sidebar api keys link and only the current user's keys", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed api key flow only needs one browser project")

    const email = await createVerifiedUser(page, "settings-api-keys-owner")
    const user = await getUserByEmail(email)
    expect(user).not.toBeNull()

    const otherUser = await createAdminUserFixture({
      email: `settings-api-keys-other-${Date.now()}@example.com`,
      name: "Other Key Owner"
    })
    const ownKey = await createApiKeyFixture({
      name: "Personal CLI E2E",
      referenceId: user?.id ?? ""
    })
    const otherKey = await createApiKeyFixture({
      name: "Other User Hidden Key",
      referenceId: otherUser.id
    })

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/settings/api-keys")

    await expect(page.getByRole("heading", { name: "API Keys" })).toBeVisible()
    await expect(page.getByRole("navigation", { name: "主导航" }).getByRole("link", { name: "API Keys" })).toHaveAttribute("href", "/dashboard/settings/api-keys")
    await expect(page.getByTestId(`api-key-row-${ownKey.id}`)).toBeVisible()
    await expect(page.getByTestId(`api-key-row-${ownKey.id}`).getByText("Personal CLI E2E")).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "权限范围" })).toHaveCount(0)
    await expect(page.getByTestId(`api-key-row-${ownKey.id}`).getByText("未声明")).toHaveCount(0)
    await expect(page.getByTestId(`api-key-row-${otherKey.id}`)).toHaveCount(0)
    await expect(page.getByText("Other User Hidden Key")).toHaveCount(0)
  })

  test("opens the desktop detail sheet with a skeleton and full detail link", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed api key flow only needs one browser project")

    const email = await createVerifiedUser(page, "settings-api-keys-sheet")
    const user = await getUserByEmail(email)
    expect(user).not.toBeNull()

    const key = await createApiKeyFixture({
      name: "Sheet Personal Key",
      referenceId: user?.id ?? ""
    })
    await createApiKeyUsageLogFixture({
      apiKeyId: key.id,
      path: "/v1/settings/e2e",
      referenceId: user?.id ?? "",
      userAgentSummary: "Settings E2E client"
    })
    await createApiKeyUsageLogFixture({
      apiKeyId: key.id,
      failureReason: "role_forbidden",
      path: "/v1/settings/e2e",
      referenceId: user?.id ?? "",
      statusCode: 403,
      success: false,
      userAgentSummary: "Settings E2E client"
    })
    await createApiKeyUsageLogFixture({
      apiKeyId: key.id,
      path: "/v1/settings/profile",
      referenceId: user?.id ?? "",
      statusCode: 200,
      success: true,
      userAgentSummary: "Settings E2E client"
    })

    await page.setViewportSize({ height: 1200, width: 2048 })
    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/settings/api-keys")

    await page.route("**/api/trpc/apiKey.getMine?**", async (route) => {
      await page.waitForTimeout(500)
      await route.continue()
    })
    await page.getByTestId(`api-key-row-${key.id}`).click()

    await expect(page.getByTestId("api-key-detail-sheet")).toBeVisible()
    await expect(page.getByTestId("api-key-detail-skeleton")).toBeVisible()
    await expect(page.getByRole("link", { name: /完整详情页/ })).toHaveAttribute("href", `/dashboard/settings/api-keys/${key.id}`)
    await expect(page.getByTestId("api-key-detail-sheet").getByText("Sheet Personal Key")).toBeVisible()
    await expect(page.getByTestId("api-key-detail-sheet").getByText("权限范围")).toHaveCount(0)
    await expect(page.getByRole("tab", { name: "调用日志" })).toHaveAttribute("aria-selected", "true")
    await expect(page.getByRole("tab", { name: "图表统计" })).toBeVisible()
    await expect(page.getByTestId("api-key-compact-summary")).toBeVisible()
    await expect(page.getByTestId("api-key-detail-sheet").getByText("最近使用日志")).toHaveCount(0)
    await expect(page.getByTestId("api-key-detail-sheet").getByText("/v1/settings/e2e").first()).toBeVisible()

    await page.getByRole("tab", { name: "图表统计" }).click()
    await expect(page.getByTestId("api-key-usage-stats")).toBeVisible()
    await expect(page.getByText("7 天调用趋势")).toBeVisible()
    await expect(page.getByText("结果分布")).toBeVisible()
    await expect(page.getByText("Top 路径")).toBeVisible()
    await expect(page.getByTestId("api-key-usage-stats").getByText("/v1/settings/e2e").first()).toBeVisible()
  })

  test("uses card navigation on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed api key flow only needs one browser project")

    await page.setViewportSize({ height: 844, width: 390 })
    const email = await createVerifiedUser(page, "settings-api-keys-mobile")
    const user = await getUserByEmail(email)
    expect(user).not.toBeNull()

    const key = await createApiKeyFixture({
      name: "Mobile Personal Key",
      referenceId: user?.id ?? ""
    })

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/settings/api-keys")
    await page.getByTestId(`api-key-card-${key.id}`).click()

    await expect(page).toHaveURL(new RegExp(`/dashboard/settings/api-keys/${key.id}$`))
    await expect(page.getByRole("heading", { name: "API Key 详情" })).toBeVisible()
    await expect(page.getByText("Mobile Personal Key")).toBeVisible()
  })

  test("creates an api key and shows the plaintext result only in the one-time bar", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed api key flow only needs one browser project")

    const email = await createVerifiedUser(page, "settings-api-keys-create")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/settings/api-keys")

    await page.getByRole("button", { name: "创建 API Key" }).click()
    await expect(page.getByRole("dialog", { name: "创建 API Key" })).toBeVisible()
    await expect(page.getByText("创建后请立即复制保存。离开或关闭结果条后，明文无法再次查看。")).toBeVisible()
    await page.getByLabel("API Key 名称").fill("Created Plaintext Key")
    await page.getByLabel("有效天数").fill("")
    await expect(page.getByText("不填写则永久有效。")).toBeVisible()
    await page.getByLabel("有效天数").fill("30")
    await expect(page.getByText(/预计过期时间：\d{4}\/\d{1,2}\/\d{1,2}/)).toBeVisible()
    await page.getByLabel("有效天数").fill("")
    await expect(page.getByText("不填写则永久有效。")).toBeVisible()
    await expect(page.getByLabel("权限范围")).toHaveCount(0)
    await page.getByLabel("备注").fill("Created by E2E")
    await page.getByRole("button", { name: "创建", exact: true }).click()

    await expect(page.getByTestId("created-api-key-result")).toBeVisible()
    await expect(page.getByTestId("created-api-key-result").getByText("刚创建的 API Key：Created Plaintext Key")).toBeVisible()
    await expect(page.getByTestId("created-api-key-result").getByText("仅显示一次，请立即复制并保存到安全位置。")).toBeVisible()
    await expect(page.getByTestId("created-api-key-plaintext")).toContainText("lev_live")
    await expect(page.locator("table").getByText("Created Plaintext Key")).toBeVisible()
    await expect(page.locator("tr").filter({ hasText: "Created Plaintext Key" }).getByText("不过期")).toBeVisible()

    await page.getByTestId("created-api-key-result").getByRole("button", { name: "关闭" }).click()
    await expect(page.getByTestId("created-api-key-result")).toHaveCount(0)
  })
})
