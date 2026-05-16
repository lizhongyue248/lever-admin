import { expect, test } from "../fixtures/coverage"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import {
  addOrganizationMemberByEmail,
  assignOrganizationMemberToDepartmentByEmail,
  createRequestLogFixture,
  createUserRecord,
  createUserSessionFixture,
  getDepartmentByName,
  getDepartmentMembershipByEmail,
  getMemberByEmailAndOrganization,
  getSessionById,
  seedOrganizationWithDepartments,
  setUserRole
} from "../helpers/db"
import { uniqueEmail } from "../helpers/test-data"

const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1, 12)

const formatMonthLabel = (date: Date) => `${date.getMonth() + 1}月`

test.describe("10 dashboard orgs slug settings", () => {
  test("renders member growth from real organization member join dates", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed organization flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "org-overview-admin")
    const memberOneEmail = await createVerifiedUser(page, "org-overview-member-one")
    const memberTwoEmail = await createVerifiedUser(page, "org-overview-member-two")
    const slug = `org-overview-${Date.now()}`
    const { rootId } = await seedOrganizationWithDepartments({
      departmentName: "概览产品部",
      rootName: "Overview Growth Org E2E",
      rootSlug: slug
    })
    const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12)
    const monthStarts = Array.from({ length: 6 }, (_, index) => addMonths(currentMonth, index - 5))

    await addOrganizationMemberByEmail({ createdAt: monthStarts[0], email: adminEmail, organizationId: rootId, role: "owner" })
    await addOrganizationMemberByEmail({ createdAt: monthStarts[3], email: memberOneEmail, organizationId: rootId, role: "member" })
    await addOrganizationMemberByEmail({ createdAt: monthStarts[5], email: memberTwoEmail, organizationId: rootId, role: "member" })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto(`/dashboard/orgs/${slug}`)

    const expectedDescription = `成员增长趋势，${monthStarts.map((monthStart, index) => `${formatMonthLabel(monthStart)} ${index < 3 ? 1 : index < 5 ? 2 : 3} 名成员`).join("，")}`

    await expect(page.getByRole("img", { name: expectedDescription })).toBeVisible()
  })

  test("uploads an organization logo and saves the returned logo url", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed organization flow only needs one browser project")

    const email = await createVerifiedUser(page, "dashboard-org-logo-upload")
    const slug = `org-logo-upload-${Date.now()}`
    const logoBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="green"/></svg>')
    const { rootId } = await seedOrganizationWithDepartments({
      departmentName: "Logo Upload Department E2E",
      rootName: "Logo Upload Org E2E",
      rootSlug: slug
    })

    await addOrganizationMemberByEmail({ email, organizationId: rootId, role: "owner" })

    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto(`/dashboard/orgs/${slug}/setting`)
    await page.getByLabel("上传 Logo").setInputFiles({
      buffer: logoBuffer,
      mimeType: "image/svg+xml",
      name: "organization-logo.svg"
    })

    await expect(page.getByText("Logo 已上传。")).toBeVisible()
    await page.getByRole("button", { name: "保存" }).click()

    await expect(page.getByText("组织信息已保存。")).toBeVisible()
    await expect(page.getByLabel("Logo URL")).toHaveValue(/\/organization-logos\//)

    await page.reload()

    await expect(page.getByLabel("Logo URL")).toHaveValue(/\/organization-logos\//)
  })

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

  test("shows organization member risk from high-risk request logs", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed organization flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "dashboard-org-risk-admin")
    const riskyMemberEmail = uniqueEmail("dashboard-org-risk-member")
    const slug = `department-risk-root-${Date.now()}`
    const rootName = `Department Risk Root ${Date.now()} E2E`
    const departmentName = `Risk Department ${Date.now()} E2E`
    const { departmentId, rootId } = await seedOrganizationWithDepartments({
      departmentName,
      rootName,
      rootSlug: slug
    })
    const riskyUser = await createUserRecord({ email: riskyMemberEmail, name: "Risky Member E2E" })

    await addOrganizationMemberByEmail({ email: adminEmail, organizationId: rootId, role: "owner" })
    await addOrganizationMemberByEmail({ email: riskyMemberEmail, organizationId: rootId, role: "member" })
    await assignOrganizationMemberToDepartmentByEmail({ departmentId, email: riskyMemberEmail, organizationId: rootId })
    await createRequestLogFixture({
      organizationId: rootId,
      organizationName: rootName,
      userEmail: riskyMemberEmail,
      userId: riskyUser.id,
      userName: "Risky Member E2E",
      userRole: "member"
    })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto(`/dashboard/orgs/${slug}`)
    const riskySessionCard = page.locator(".rounded-lg").filter({ hasText: "登录风险" }).first()

    await expect(riskySessionCard.getByText("0", { exact: true })).toBeVisible()

    await page.goto(`/dashboard/orgs/${slug}/information`)

    await expect(page.getByText(/1 异常登录/)).toBeVisible()
    await expect(page.getByRole("table").getByText("Risky Member E2E")).toBeVisible()
    await expect(page.getByRole("table").getByText("风险")).toBeVisible()
  })

  test("does not revoke sessions outside the current organization", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed organization flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "dashboard-org-revoke-admin")
    const outsiderEmail = await createVerifiedUser(page, "dashboard-org-revoke-outsider")
    const slug = `session-revoke-root-${Date.now()}`
    const otherSlug = `session-revoke-other-${Date.now()}`
    const { rootId } = await seedOrganizationWithDepartments({
      departmentName: `Revoke Department ${Date.now()} E2E`,
      rootName: `Session Revoke Root ${Date.now()} E2E`,
      rootSlug: slug
    })
    const { rootId: otherRootId } = await seedOrganizationWithDepartments({
      departmentName: `Other Revoke Department ${Date.now()} E2E`,
      rootName: `Other Session Revoke Root ${Date.now()} E2E`,
      rootSlug: otherSlug
    })
    const outsiderSession = await createUserSessionFixture({ email: outsiderEmail, userAgent: "E2E Chrome Cross Org" })

    await addOrganizationMemberByEmail({ email: adminEmail, organizationId: rootId, role: "owner" })
    await addOrganizationMemberByEmail({ email: outsiderEmail, organizationId: otherRootId, role: "member" })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)

    const response = await page.request.post("/api/trpc/org.session.revoke?batch=1", {
      data: {
        0: {
          json: {
            sessionId: outsiderSession.id,
            slug
          }
        }
      }
    })

    expect(response.ok()).toBe(false)
    await expect.poll(async () => getSessionById(outsiderSession.id)).not.toBeNull()
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

  test("refreshes the invitation table and shows a status badge after inviting a member", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed organization flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "dashboard-org-invite-admin")
    const invitedEmail = uniqueEmail("dashboard-org-invite-target")
    await setUserRole(adminEmail, "admin")
    await seedOrganizationWithDepartments({
      departmentName: "Invite Department E2E",
      rootName: "Invite Root Org E2E",
      rootSlug: "invite-root-org-e2e"
    })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto("/dashboard/orgs/invite-root-org-e2e/invite")
    await page.getByRole("button", { name: "邀请成员" }).click()
    await page.getByRole("dialog", { name: "邀请成员" }).getByLabel("邮箱").fill(invitedEmail)
    await page.getByRole("button", { name: "发送邀请" }).click()

    const invitationRow = page.getByRole("row").filter({ hasText: invitedEmail })
    await expect(invitationRow).toBeVisible()
    await expect(invitationRow.getByText("待接受")).toBeVisible()
  })
})
