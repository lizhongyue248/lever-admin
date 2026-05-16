import { expect, test } from "../fixtures/coverage"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { addOrganizationMemberByEmail, getInvitationByEmail, getInvitationStatusByEmail, getMemberByEmailAndOrganization, seedOrganizationWithDepartments } from "../helpers/db"

test.describe("10A organization invitation accept", () => {
  test("invited user can see and accept an organization invitation from the Topbar notification menu", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed organization flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "notification-admin")
    const invitedEmail = await createVerifiedUser(page, "notification-invited")
    const slug = `notification-org-${Date.now()}`
    const { rootId } = await seedOrganizationWithDepartments({
      departmentName: "通知产品部",
      rootName: "Notification Org E2E",
      rootSlug: slug
    })
    await addOrganizationMemberByEmail({ email: adminEmail, organizationId: rootId, role: "owner" })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto(`/dashboard/orgs/${slug}/invite`)
    await page.getByRole("button", { name: "邀请成员" }).click()
    await page.getByRole("dialog", { name: "邀请成员" }).getByLabel("邮箱").fill(invitedEmail)
    await page.getByRole("button", { name: "发送邀请" }).click()
    await expect(page.getByRole("row").filter({ hasText: invitedEmail }).getByText("待接受")).toBeVisible()
    await expect.poll(() => getInvitationStatusByEmail({ email: invitedEmail, organizationId: rootId })).toBe("pending")

    await page.context().clearCookies()
    await page.goto("/sign-in")
    await signInViaUi(page, { email: invitedEmail })
    await expect(page).toHaveURL(/\/dashboard$/)

    const notificationButton = page.getByRole("button", { name: /通知/ })

    await expect(notificationButton).toBeEnabled()
    await notificationButton.click()
    await expect(page.getByText("Notification Org E2E 邀请你加入")).toBeVisible()
    await expect(page.getByRole("button", { name: "全部标为已读" })).toHaveCount(0)
    await page.getByRole("button", { name: "接受" }).click()
    await expect(page).toHaveURL(new RegExp(`/dashboard/orgs/${slug}`), { timeout: 15_000 })

    await expect.poll(() => getInvitationStatusByEmail({ email: invitedEmail, organizationId: rootId })).toBe("accepted")
    await expect.poll(() => getMemberByEmailAndOrganization({ email: invitedEmail, organizationId: rootId })).not.toBeNull()
  })

  test("invitation detail page redirects unauthenticated users and lets invited users reject", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed organization flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "invite-detail-admin")
    const invitedEmail = await createVerifiedUser(page, "invite-detail-target")
    const slug = `invite-detail-org-${Date.now()}`
    const { rootId } = await seedOrganizationWithDepartments({
      departmentName: "详情产品部",
      rootName: "Invite Detail Org E2E",
      rootSlug: slug
    })
    await addOrganizationMemberByEmail({ email: adminEmail, organizationId: rootId, role: "owner" })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto(`/dashboard/orgs/${slug}/invite`)
    await page.getByRole("button", { name: "邀请成员" }).click()
    await page.getByRole("dialog", { name: "邀请成员" }).getByLabel("邮箱").fill(invitedEmail)
    await page.getByRole("button", { name: "发送邀请" }).click()

    const invitationRow = page.getByRole("row").filter({ hasText: invitedEmail })
    await expect(invitationRow.getByText("待接受")).toBeVisible()
    const invitation = await getInvitationByEmail({ email: invitedEmail, organizationId: rootId })
    if (!invitation) {
      throw new Error(`Expected pending invitation for ${invitedEmail}`)
    }

    await page.context().clearCookies()
    await page.goto(`/invite/${invitation.id}`)
    await expect(page).toHaveURL(/\/sign-in\?redirectTo=/)
    await signInViaUi(page, { email: invitedEmail })
    await expect(page).toHaveURL(new RegExp(`/invite/${invitation.id}`))
    await page.getByRole("button", { name: "拒绝邀请" }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect.poll(() => getInvitationStatusByEmail({ email: invitedEmail, organizationId: rootId })).toBe("rejected")
  })
})
