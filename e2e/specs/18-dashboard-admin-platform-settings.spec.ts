import { expect, type Page, test } from "@playwright/test"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { deletePlatformSettings, getPlatformSettingValue, setUserRole, upsertPlatformSetting } from "../helpers/db"

const resetEmailSettings = async () => {
  await deletePlatformSettings()
  await upsertPlatformSetting({ key: "email.provider", value: "console" })
  await upsertPlatformSetting({ key: "email.from", value: "Lever Admin <no-reply@example.com>" })
}

const signInAsRole = async (page: Page, prefix: string, role: "admin" | "super_admin") => {
  const email = await createVerifiedUser(page, prefix)
  await setUserRole(email, role)

  await page.goto("/sign-in")
  await signInViaUi(page, { email })
  await expect(page).toHaveURL(/\/dashboard$/)

  return email
}

const selectProvider = async (page: Page, providerName: "Console" | "SMTP") => {
  await page.getByLabel("Provider").click()
  await page.getByRole("option", { name: providerName }).click()
}

const toastWithText = (page: Page, text: string) => page.locator("[data-sonner-toast]").filter({ hasText: text }).first()

test.describe("18 dashboard admin platform settings", () => {
  test.afterEach(async ({ page: _page }, testInfo) => {
    if (testInfo.project.name !== "chromium") {
      return
    }

    await resetEmailSettings()
  })

  test("shows permission error to non-super-admin users", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    await signInAsRole(page, "dashboard-admin-settings-forbidden", "admin")

    await page.goto("/dashboard/admin/settings")

    await expect(page.getByRole("main").getByText("需要超级管理员权限。")).toBeVisible()
  })

  test("shows empty email settings and saves console provider", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    await deletePlatformSettings()
    await signInAsRole(page, "dashboard-admin-settings-console", "super_admin")

    await page.goto("/dashboard/admin/settings")

    await expect(page.getByRole("heading", { name: "平台设置" })).toBeVisible()
    await expect(page.getByRole("main").getByText("邮件服务")).toBeVisible()
    await page.getByLabel("发件人").fill("Lever Admin <ops@example.com>")
    await page.getByRole("button", { name: "保存配置" }).click()

    await expect(toastWithText(page, "邮件服务配置已保存。")).toBeVisible()
    await expect.poll(() => getPlatformSettingValue("email.provider")).toBe("console")
    await expect.poll(() => getPlatformSettingValue("email.from")).toBe("Lever Admin <ops@example.com>")
  })

  test("saves smtp without exposing password and sends test email", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    await deletePlatformSettings()
    await signInAsRole(page, "dashboard-admin-settings-smtp", "super_admin")

    await page.goto("/dashboard/admin/settings")

    await selectProvider(page, "SMTP")
    await page.getByLabel("发件人").fill("Lever Admin <smtp@example.com>")
    await page.getByLabel("SMTP Host").fill("smtp.example.com")
    await page.getByLabel("Port").fill("587")
    await page.getByLabel("SMTP Username").fill("smtp-user@example.com")
    await page.getByLabel("SMTP Password").fill("secret-password")
    await page.getByRole("button", { name: "保存配置" }).click()

    await expect(toastWithText(page, "邮件服务配置已保存。")).toBeVisible()
    await expect(page.getByLabel("SMTP Password")).toHaveValue("")
    await expect.poll(() => getPlatformSettingValue("email.provider")).toBe("smtp")
    await expect
      .poll(async () => {
        const value = await getPlatformSettingValue("email.smtp.password")

        return value?.startsWith("enc:v1:")
      })
      .toBe(true)

    await selectProvider(page, "Console")
    await page.getByRole("button", { name: "保存配置" }).click()
    await expect(toastWithText(page, "邮件服务配置已保存。")).toBeVisible()
    await expect.poll(() => getPlatformSettingValue("email.provider")).toBe("console")
    await page.getByLabel("测试收件人").fill("ops@example.io")
    await page.getByRole("button", { name: "发送测试邮件" }).click()

    await expect(toastWithText(page, "测试邮件已通过 console 发送。")).toBeVisible()
  })

  test("validates test email recipient", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    await resetEmailSettings()
    await signInAsRole(page, "dashboard-admin-settings-test-validation", "super_admin")

    await page.goto("/dashboard/admin/settings")

    await page.getByLabel("测试收件人").fill("bad-email")
    await page.getByRole("button", { name: "发送测试邮件" }).click()

    await expect(page.getByText("请输入有效的测试收件人邮箱。")).toBeVisible()
  })

  test("shows default storage settings and saves local provider", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    await deletePlatformSettings()
    await signInAsRole(page, "dashboard-admin-storage-local", "super_admin")

    await page.goto("/dashboard/admin/settings")

    await expect(page.getByRole("main").getByText("文件存储")).toBeVisible()
    await expect(page.getByLabel("本地上传路径")).toHaveValue("./uploads")
    await page.getByLabel("本地上传路径").fill("./uploads")
    await page.getByRole("button", { name: "保存文件存储配置" }).click()

    await expect(toastWithText(page, "文件存储配置已保存。")).toBeVisible()
    await expect.poll(() => getPlatformSettingValue("storage.provider")).toBe("local")
    await expect.poll(() => getPlatformSettingValue("storage.local.path")).toBe("./uploads")
  })

  test("runs storage upload test with saved local provider", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    await deletePlatformSettings()
    await upsertPlatformSetting({ key: "storage.provider", value: "local" })
    await upsertPlatformSetting({ key: "storage.local.path", value: "./uploads" })
    await signInAsRole(page, "dashboard-admin-storage-test", "super_admin")

    await page.goto("/dashboard/admin/settings")
    await page.getByRole("button", { name: "执行上传测试" }).click()

    await expect(toastWithText(page, "上传测试已通过 local 完成。")).toBeVisible()
    await expect(page.getByText("最近上传测试成功")).toBeVisible()
  })
})
