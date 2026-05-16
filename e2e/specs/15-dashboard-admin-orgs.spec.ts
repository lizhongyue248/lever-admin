import { expect, test } from "../fixtures/coverage"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import {
  addOrganizationMemberByEmail,
  createAdminUserFixture,
  createRequestLogFixture,
  getRequestLogsByRouteName,
  seedOrganizationWithDepartments,
  setUserRole
} from "../helpers/db"

test.describe("15 dashboard admin orgs", () => {
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

  test("shows real organization stats and filters the organization list", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    const email = await createVerifiedUser(page, "dashboard-admin-orgs")
    await setUserRole(email, "admin")
    await seedOrganizationWithDepartments({
      departmentName: "Engineering Department E2E",
      rootName: "Root Org E2E",
      rootSlug: "root-org-e2e"
    })

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto("/dashboard/admin/orgs")

    await expect(page.getByTestId("admin-org-card-root-org-e2e").getByText("Root Org E2E")).toBeVisible()
    await expect(page.getByText("Engineering Department E2E")).toBeHidden()
    await expect(page.getByTestId("admin-org-card-root-org-e2e").getByText("部门")).toBeVisible()
    await expect(page.getByTestId("admin-org-card-root-org-e2e").getByText("1")).toBeVisible()
    await expect(page.getByRole("button", { name: "首页" })).toBeVisible()
    await expect(page.getByRole("button", { name: "上一页" })).toBeVisible()
    await expect(page.getByRole("spinbutton", { name: "当前页" })).toBeVisible()
    await expect(page.getByRole("button", { name: "下一页" })).toBeVisible()
    await expect(page.getByRole("button", { name: "末页" })).toBeVisible()

    await page.getByLabel("搜索组织").fill("root-org-e2e")

    await expect(page.getByTestId("admin-org-card-root-org-e2e").getByText("Root Org E2E")).toBeVisible()
  })

  test("persists organization status and filters disabled organizations", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    const email = await createVerifiedUser(page, "dashboard-admin-org-status")
    await setUserRole(email, "admin")
    const { rootId } = await seedOrganizationWithDepartments({
      departmentName: "Status Department E2E",
      rootName: "Status Org E2E",
      rootSlug: "status-org-e2e"
    })

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto("/dashboard/admin/orgs")

    const card = page.getByTestId("admin-org-card-status-org-e2e")
    await expect(card.getByText("正常")).toBeVisible()

    await card.getByRole("button", { name: "停用组织 Status Org E2E" }).click()
    await page.getByRole("button", { name: "确认停用" }).click()

    await expect(card.getByText("已停用")).toBeVisible()
    await expect
      .poll(async () => {
        const logs = await getRequestLogsByRouteName("adminOrg.updateStatus")
        const log = logs.find((item) => item.organization_id === rootId && item.method === "PATCH" && item.user_email === email)

        return log?.metadata ?? null
      })
      .toContain('"previousStatus":"active"')

    await page.reload()
    await expect(page.getByTestId("admin-org-card-status-org-e2e").getByText("已停用")).toBeVisible()

    await page.getByRole("combobox", { name: "状态" }).click()
    await page.getByRole("option", { name: "已停用" }).click()

    await expect(page.getByTestId("admin-org-card-status-org-e2e").getByText("Status Org E2E")).toBeVisible()

    const disabledCard = page.getByTestId("admin-org-card-status-org-e2e")
    await disabledCard.getByRole("button", { name: "启用组织 Status Org E2E" }).click()
    await page.getByRole("button", { name: "确认启用" }).click()

    await expect(disabledCard).toBeHidden()
    await page.getByRole("combobox", { name: "状态" }).click()
    await page.getByRole("option", { name: "全部状态" }).click()

    await expect(page.getByTestId("admin-org-card-status-org-e2e").getByText("正常")).toBeVisible()
    await expect
      .poll(async () => {
        const logs = await getRequestLogsByRouteName("adminOrg.updateStatus")
        const log = logs.find((item) => item.organization_id === rootId && item.method === "PATCH" && item.user_email === email && item.metadata?.includes('"newStatus":"active"'))

        return log?.metadata ?? null
      })
      .toContain('"previousStatus":"disabled"')
  })

  test("shows real organization risk count from high risk member requests", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    const email = await createVerifiedUser(page, "dashboard-admin-org-risk")
    await setUserRole(email, "admin")
    const { rootId } = await seedOrganizationWithDepartments({
      departmentName: "Risk Department E2E",
      rootName: "Risk Org E2E",
      rootSlug: "risk-org-e2e"
    })
    const riskyUser = await createAdminUserFixture({
      email: "risk-member-admin-orgs-e2e@example.com",
      name: "Risk Member Admin Orgs E2E"
    })
    await addOrganizationMemberByEmail({ email: riskyUser.email, organizationId: rootId, role: "member" })
    await createRequestLogFixture({
      organizationId: rootId,
      organizationName: "Risk Org E2E",
      userEmail: riskyUser.email,
      userId: riskyUser.id,
      userName: riskyUser.name
    })

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto("/dashboard/admin/orgs")

    const card = page.getByTestId("admin-org-card-risk-org-e2e")
    await expect(card.getByText("Risk Org E2E")).toBeVisible()
    await expect(card.getByText("风险成员")).toBeVisible()
    await expect(card.getByTestId("admin-org-risk-count")).toHaveText("1")
  })
})
