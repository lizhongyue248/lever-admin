import { expect, test } from "@playwright/test"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { seedOrganizationWithDepartments, setUserRole } from "../helpers/db"
import { uniqueEmail } from "../helpers/test-data"

test.describe("dashboard organization invitations", () => {
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
