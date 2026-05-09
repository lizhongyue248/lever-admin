import { expect, test } from "@playwright/test"

const desktopOnly = (projectName: string) => projectName !== "chromium"
const mobileOnly = (projectName: string) => projectName !== "mobile-chrome"

test.describe("00 auth pages design", () => {
  test("toggles html dark class on public auth pages", async ({ page }) => {
    await page.goto("/sign-in")

    const initialIsDark = await page.locator("html").evaluate((element) => element.classList.contains("dark"))

    await page.getByRole("button", { name: "切换主题" }).click()
    await expect.poll(async () => await page.locator("html").evaluate((element) => element.classList.contains("dark"))).toBe(!initialIsDark)

    await page.getByRole("button", { name: "切换主题" }).click()
    await expect.poll(async () => await page.locator("html").evaluate((element) => element.classList.contains("dark"))).toBe(initialIsDark)
  })

  test("desktop layout shows brand panel", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo.project.name), "desktop layout assertion")

    await page.goto("/sign-in")

    await expect(page.getByText("Technical identity control for modern teams")).toBeVisible()
    await expect(page.getByRole("button", { name: "切换主题" })).toBeVisible()
  })

  test("mobile layout hides brand panel and keeps page actions available", async ({ page }, testInfo) => {
    test.skip(mobileOnly(testInfo.project.name), "mobile layout assertion")

    await page.goto("/forgot-password")

    await expect(page.getByText("Technical identity control for modern teams")).toBeHidden()
    await expect(page.getByRole("link", { name: "返回登录" })).toBeVisible()
    await expect(page.getByRole("button", { name: "切换主题" })).toBeVisible()
  })
})
