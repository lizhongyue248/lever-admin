import { expect, test } from "@playwright/test"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { seedOrganizationWithDepartments, setUserRole } from "../helpers/db"

test.describe("dashboard admin organizations", () => {
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

    await page.getByLabel("搜索组织").fill("root-org-e2e")

    await expect(page.getByTestId("admin-org-card-root-org-e2e").getByText("Root Org E2E")).toBeVisible()
  })
})
