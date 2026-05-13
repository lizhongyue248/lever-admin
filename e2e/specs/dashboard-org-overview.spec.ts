import { expect, test } from "@playwright/test"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { addOrganizationMemberByEmail, seedOrganizationWithDepartments } from "../helpers/db"

const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1, 12)

const formatMonthLabel = (date: Date) => `${date.getMonth() + 1}月`

test.describe("dashboard organization overview", () => {
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
})
