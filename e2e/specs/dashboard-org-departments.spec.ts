import { expect, test } from "@playwright/test"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { createUserRecord, getDepartmentByName, getDepartmentMembershipByEmail, getMemberByEmailAndOrganization, seedOrganizationWithDepartments, setUserRole } from "../helpers/db"
import { uniqueEmail } from "../helpers/test-data"

test.describe("dashboard organization departments", () => {
  test("creates a department from the organization architecture tab", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed organization flow only needs one browser project")

    const email = await createVerifiedUser(page, "dashboard-org-departments")
    await setUserRole(email, "admin")
    await seedOrganizationWithDepartments({
      departmentName: "Existing Department E2E",
      rootName: "Department Root Org E2E",
      rootSlug: "department-root-org-e2e"
    })

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto("/dashboard/orgs/department-root-org-e2e/information")
    await expect(page.getByRole("tree")).toContainText("Existing Department E2E")

    await page.getByRole("button", { name: "添加部门" }).click()
    await page.getByRole("dialog", { name: "添加部门" }).getByLabel("部门名称").fill("Growth Department E2E")
    await page.getByRole("button", { name: "确认添加" }).click()

    await expect(page.getByRole("tree")).toContainText("Growth Department E2E")
  })

  test("renames and deletes a department from the tree context menu", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed organization flow only needs one browser project")

    const email = await createVerifiedUser(page, "dashboard-org-departments-context")
    await setUserRole(email, "admin")
    const { rootId } = await seedOrganizationWithDepartments({
      departmentName: "Context Department E2E",
      rootName: "Department Context Root E2E",
      rootSlug: "department-context-root-e2e"
    })

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto("/dashboard/orgs/department-context-root-e2e/information")
    await page.getByRole("tree").getByText("Context Department E2E").click({ button: "right" })
    await page.getByRole("menuitem", { name: "重命名部门" }).click()
    await page.getByRole("dialog", { name: "重命名部门" }).getByLabel("新名称").fill("Renamed Department E2E")
    await page.getByRole("button", { name: "保存名称" }).click()

    await expect(page.getByRole("tree")).toContainText("Renamed Department E2E")
    await expect.poll(async () => getDepartmentByName({ name: "Renamed Department E2E", organizationId: rootId })).not.toBeNull()

    await page.getByRole("tree").getByText("Renamed Department E2E").click({ button: "right" })
    await page.getByRole("menuitem", { name: "删除部门" }).click()
    await page.getByRole("dialog", { name: "删除部门" }).getByRole("button", { name: "删除部门" }).click()

    await expect(page.getByRole("tree")).not.toContainText("Renamed Department E2E")
    await expect.poll(async () => getDepartmentByName({ name: "Renamed Department E2E", organizationId: rootId })).toBeNull()
  })

  test("adds, assigns, and removes organization members from the information page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed organization flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "dashboard-org-members-admin")
    await setUserRole(adminEmail, "super_admin")
    const existingMemberEmail = uniqueEmail("dashboard-org-existing-member")
    await createUserRecord({ email: existingMemberEmail, name: "Existing Member E2E" })
    const { rootId } = await seedOrganizationWithDepartments({
      departmentName: "Member Target Department E2E",
      rootName: "Department Member Root E2E",
      rootSlug: "department-member-root-e2e"
    })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto("/dashboard/orgs/department-member-root-e2e/information")
    await page.getByRole("button", { name: "新增用户" }).click()
    await page.getByRole("dialog", { name: "新增用户到当前组织" }).getByLabel("邮箱").fill(existingMemberEmail)
    await page.getByRole("button", { name: "加入组织" }).click()

    await expect(page.getByRole("table").getByText("Existing Member E2E", { exact: true })).toBeVisible()
    await expect.poll(async () => getMemberByEmailAndOrganization({ email: existingMemberEmail, organizationId: rootId })).not.toBeNull()

    await page.getByRole("button", { name: "分配 Existing Member E2E 到部门" }).click()
    await page.getByRole("dialog", { name: "分配部门" }).getByLabel("目标部门").selectOption({ label: "Member Target Department E2E" })
    await page.getByRole("button", { name: "确认分配" }).click()

    await expect
      .poll(async () => getDepartmentMembershipByEmail({ email: existingMemberEmail, organizationId: rootId }))
      .toMatchObject({ department_name: "Member Target Department E2E" })

    await page.getByRole("button", { name: "从组织移除 Existing Member E2E" }).click()
    await page.getByRole("dialog", { name: "移除成员" }).getByRole("button", { name: "确认移除" }).click()

    await expect.poll(async () => getMemberByEmailAndOrganization({ email: existingMemberEmail, organizationId: rootId })).toBeNull()
    await expect(page.getByRole("table").getByText("Existing Member E2E", { exact: true })).not.toBeVisible()
  })
})
