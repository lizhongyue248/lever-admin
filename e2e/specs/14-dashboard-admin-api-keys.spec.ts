import { expect, test } from "@playwright/test"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { createAdminUserFixture, createApiKeyFixture, createApiKeyUsageLogFixture, getUserByEmail, seedOrganizationWithDepartments, setUserRole } from "../helpers/db"

test.describe("14 dashboard admin api keys", () => {
  test("shows the platform admin permission error to non-admin users", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed auth flow only needs one browser project")

    const email = await createVerifiedUser(page, "dashboard-admin-api-keys-forbidden")

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto("/dashboard/admin/api-keys")

    await expect(page.getByRole("main").getByText("需要平台管理员权限。")).toBeVisible()
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: "需要平台管理员权限。" }).first()).toBeVisible()
  })

  test("shows platform stats and searches by user, organization, and key name", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "dashboard-admin-api-keys-admin")
    await setUserRole(adminEmail, "admin")
    const targetUser = await createAdminUserFixture({
      email: `api-key-target-${Date.now()}@example.com`,
      name: "Nora API Owner"
    })
    const orgSlug = `api-key-org-${Date.now()}`
    const org = await seedOrganizationWithDepartments({
      departmentName: "API Key Department",
      rootName: "Atlas API Org",
      rootSlug: orgSlug
    })
    const userKey = await createApiKeyFixture({
      name: "Nora Search Key",
      referenceId: targetUser.id
    })
    const orgKey = await createApiKeyFixture({
      configId: "organization",
      name: "Atlas Org Search Key",
      referenceId: org.rootId
    })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/admin/api-keys")

    await expect(page.getByRole("heading", { name: "平台 API Keys" })).toBeVisible()
    await expect(page.getByText("总数").first()).toBeVisible()
    await expect(page.getByText("启用中").first()).toBeVisible()
    await expect(page.getByText("24 小时调用").first()).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "权限范围" })).toHaveCount(0)

    await page.getByLabel("搜索平台 API Key").fill("Nora")
    await expect(page.getByTestId(`admin-api-key-row-${userKey.id}`)).toBeVisible()
    await expect(page.getByTestId(`admin-api-key-row-${userKey.id}`).getByText("Nora API Owner")).toBeVisible()

    await page.getByLabel("搜索平台 API Key").fill("Atlas API Org")
    await expect(page.getByTestId(`admin-api-key-row-${orgKey.id}`)).toBeVisible()
    await expect(page.getByTestId(`admin-api-key-row-${orgKey.id}`).getByText("Atlas Org Search Key")).toBeVisible()

    await page.getByLabel("搜索平台 API Key").fill("Nora Search Key")
    await expect(page.getByTestId(`admin-api-key-row-${userKey.id}`)).toBeVisible()
  })

  test("opens the desktop detail sheet with risk reasons and logs", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "dashboard-admin-api-keys-sheet")
    await setUserRole(adminEmail, "admin")
    const targetUser = await createAdminUserFixture({
      email: `api-key-risk-${Date.now()}@example.com`,
      name: "Risky API Owner"
    })
    const key = await createApiKeyFixture({
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      name: "Risky Sheet Key",
      referenceId: targetUser.id
    })
    await createApiKeyUsageLogFixture({
      apiKeyId: key.id,
      failureReason: "role_forbidden",
      path: "/v1/admin/risky",
      referenceId: targetUser.id,
      statusCode: 403,
      success: false,
      userAgentSummary: "Risk E2E client"
    })
    await createApiKeyUsageLogFixture({
      apiKeyId: key.id,
      path: "/v1/admin/risky",
      referenceId: targetUser.id,
      statusCode: 200,
      success: true,
      userAgentSummary: "Risk E2E client"
    })
    await createApiKeyUsageLogFixture({
      apiKeyId: key.id,
      failureReason: "rate_limited",
      path: "/v1/admin/audit",
      referenceId: targetUser.id,
      statusCode: 429,
      success: false,
      userAgentSummary: "Risk E2E client"
    })

    await page.setViewportSize({ height: 1200, width: 2048 })
    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/admin/api-keys")

    await page.getByTestId(`admin-api-key-row-${key.id}`).click()

    await expect(page.getByTestId("admin-api-key-detail-sheet")).toBeVisible()
    await expect(page.getByRole("link", { name: /完整详情页/ })).toHaveAttribute("href", `/dashboard/admin/api-keys/${key.id}`)
    await expect(page.getByTestId("admin-api-key-detail-sheet").getByText("Risky Sheet Key")).toBeVisible()
    await expect(page.getByTestId("admin-api-key-detail-sheet").getByText("权限范围")).toHaveCount(0)
    await expect(page.getByRole("tab", { name: "调用日志" })).toHaveAttribute("aria-selected", "true")
    await expect(page.getByRole("tab", { name: "图表统计" })).toBeVisible()
    await expect(page.getByTestId("admin-api-key-compact-summary")).toBeVisible()
    await expect(page.getByTestId("admin-api-key-detail-sheet").getByText("最近使用日志")).toHaveCount(0)
    await expect(page.getByTestId("admin-api-key-detail-sheet").getByText("/v1/admin/risky").first()).toBeVisible()
    await expect(page.getByTestId("admin-api-key-detail-sheet").getByText("Risk E2E client").first()).toBeVisible()
    await page.getByRole("tab", { name: "图表统计" }).click()
    await expect(page.getByTestId("admin-api-key-usage-stats")).toBeVisible()
    await expect(page.getByTestId("admin-api-key-usage-stats").getByText("7 天调用趋势")).toBeVisible()
    await expect(page.getByTestId("admin-api-key-usage-stats").getByText("风险事件").first()).toBeVisible()
    await expect(page.getByTestId("admin-api-key-usage-stats").getByText("role_forbidden")).toBeVisible()
  })

  test("exposes owner, log, disable, and delete row actions", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "dashboard-admin-api-keys-actions")
    await setUserRole(adminEmail, "admin")
    const targetUser = await createAdminUserFixture({
      email: `api-key-actions-${Date.now()}@example.com`,
      name: "Action API Owner"
    })
    const key = await createApiKeyFixture({
      name: "Action Menu Key",
      referenceId: targetUser.id
    })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/admin/api-keys")
    await page.getByLabel("搜索平台 API Key").fill("Action Menu Key")

    const row = page.getByTestId(`admin-api-key-row-${key.id}`)
    await expect(row).toBeVisible()
    await row.getByRole("button", { name: "查看平台 API Key 详情" }).click()
    await expect(page.getByTestId("admin-api-key-detail-sheet")).toBeVisible()
    await expect(page.getByRole("link", { name: "查看所属主体" })).toHaveAttribute("href", `/dashboard/admin/users/${targetUser.id}`)
    await expect(page.getByRole("tab", { name: "调用日志" })).toBeVisible()
    await page.getByRole("button", { name: "关闭平台 API Key 详情" }).click()
    await expect(page.getByTestId("admin-api-key-detail-sheet")).toBeHidden()

    await row.getByRole("button", { name: "更多平台 API Key 操作" }).click()
    await page.getByRole("menuitem", { name: "禁用" }).click()
    await expect(page.getByRole("dialog", { name: "禁用平台 API Key" })).toBeVisible()
    await expect(page.getByRole("button", { name: "确认禁用" })).toBeEnabled()
    await page.keyboard.press("Escape")

    await row.getByRole("button", { name: "更多平台 API Key 操作" }).click()
    await page.getByRole("menuitem", { name: "删除" }).click()
    await expect(page.getByRole("dialog", { name: "删除平台 API Key" })).toBeVisible()
    await expect(page.getByRole("button", { name: "永久删除" })).toBeDisabled()
    await page.getByLabel("确认删除平台 API Key").fill("Action Menu Key")
    await expect(page.getByRole("button", { name: "永久删除" })).toBeEnabled()
  })

  test("opens the full detail page directly", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "dashboard-admin-api-keys-detail")
    await setUserRole(adminEmail, "admin")
    const targetEmail = `api-key-detail-${Date.now()}@example.com`
    await createAdminUserFixture({
      email: targetEmail,
      name: "Detail API Owner"
    })
    const targetUser = await getUserByEmail(targetEmail)
    expect(targetUser).not.toBeNull()
    const key = await createApiKeyFixture({
      name: "Detail Page Key",
      referenceId: targetUser?.id ?? ""
    })
    await createApiKeyUsageLogFixture({
      apiKeyId: key.id,
      path: "/v1/detail/e2e",
      referenceId: targetUser?.id ?? ""
    })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto("/dashboard/admin/api-keys")
    await expect(page.getByTestId(`admin-api-key-row-${key.id}`)).toBeVisible()
    await page.goto(`/dashboard/admin/api-keys/${key.id}`)

    await expect(page.getByRole("heading", { name: "平台 API Key 详情" })).toBeVisible()
    await expect(page.getByText("Detail Page Key")).toBeVisible()
    await expect(page.getByText("Detail API Owner")).toBeVisible()
    await expect(page.getByText("/v1/detail/e2e")).toBeVisible()
    await page.getByRole("tab", { name: "图表统计" }).click()
    await expect(page.getByTestId("admin-api-key-usage-stats")).toBeVisible()
    await expect(page.getByTestId("admin-api-key-usage-stats").getByText("Top 路径")).toBeVisible()
  })
})
