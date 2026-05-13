import { expect, test } from "@playwright/test"

test("2FA sign-in page renders without an authenticated session", async ({ page }) => {
  await page.goto("/sign-in/2fa")

  await expect(page.getByRole("heading", { name: "二次验证" })).toBeVisible()
  await expect(page.getByText("需要二次验证")).toBeVisible()
  await expect(page.getByLabel("验证码")).toBeVisible()
})
