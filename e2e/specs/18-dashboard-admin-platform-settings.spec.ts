import { expect, type Page, test } from "../fixtures/coverage"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { deletePlatformSettings, getPlatformSettingValue, setUserRole, upsertPlatformSetting } from "../helpers/db"
import { localUploadObjectExists } from "../helpers/files"

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

const selectProvider = async (page: Page, providerName: "Console" | "Resend" | "SMTP") => {
  await page.getByLabel("Provider").click()
  await page.getByRole("option", { name: providerName }).click()
}

const selectStorageProvider = async (page: Page, providerName: "Local" | "S3") => {
  await page.getByLabel("存储方式").click()
  await page.getByRole("option", { name: providerName }).click()
}

const toastWithText = (page: Page, text: string) => page.locator("[data-sonner-toast]").filter({ hasText: text }).first()

const saveEmailSettings = async (page: Page) => {
  const responsePromise = page.waitForResponse((response) => response.url().includes("adminPlatformSetting.updateEmailSettings"))
  await page.locator("form").first().evaluate((form) => {
    ;(form as HTMLFormElement).requestSubmit()
  })
  await responsePromise
}

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
    await expect(page.getByRole("main").getByText("邮件服务", { exact: true })).toBeVisible()
    await page.getByLabel("发件人").fill("Lever Admin <ops@example.com>")
    await saveEmailSettings(page)

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
    await saveEmailSettings(page)

    await expect.poll(() => getPlatformSettingValue("email.provider")).toBe("smtp")
    await expect(page.getByLabel("SMTP Password")).toHaveValue("")
    await expect
      .poll(async () => {
        const value = await getPlatformSettingValue("email.smtp.password")

        return value?.startsWith("enc:v1:")
      })
      .toBe(true)

    await selectProvider(page, "Console")
    await saveEmailSettings(page)
    await expect.poll(() => getPlatformSettingValue("email.provider")).toBe("console")
    await page.getByLabel("测试收件人").fill("ops@example.io")
    await page.getByRole("button", { name: "发送测试邮件" }).click()

    await expect(toastWithText(page, "测试邮件已通过 console 发送。")).toBeVisible()
  })

  test("saves resend provider with encrypted api key and supports clearing it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    await deletePlatformSettings()
    await signInAsRole(page, "dashboard-admin-settings-resend", "super_admin")

    await page.goto("/dashboard/admin/settings")
    await selectProvider(page, "Resend")
    await page.getByLabel("发件人").fill("Lever Admin <resend@example.com>")
    await page.getByLabel("Resend API Key").fill("re_test_secret")
    await saveEmailSettings(page)

    await expect.poll(() => getPlatformSettingValue("email.provider")).toBe("resend")
    await expect
      .poll(async () => {
        const value = await getPlatformSettingValue("email.resend.apiKey")

        return value?.startsWith("enc:v1:")
      })
      .toBe(true)
    await expect(page.getByLabel("Resend API Key")).toHaveValue("")

    await page.getByRole("button", { name: "清除已保存 Key" }).click()
    await saveEmailSettings(page)
    await expect(page.getByText("Resend 模式需要配置 API Key。")).toBeVisible()
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

    await expect(page.getByRole("main").getByText("文件存储", { exact: true })).toBeVisible()
    await expect(page.getByLabel("本地上传路径")).toHaveValue("./uploads")
    await page.getByLabel("本地上传路径").fill("./uploads")
    await page.getByRole("button", { name: "保存文件存储配置" }).click()

    await expect(toastWithText(page, "文件存储配置已保存。")).toBeVisible()
    await expect.poll(() => getPlatformSettingValue("storage.provider")).toBe("local")
    await expect.poll(() => getPlatformSettingValue("storage.local.path")).toBe("./uploads")
  })

  test("validates and saves s3 storage secrets without exposing them", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed admin flow only needs one browser project")

    await deletePlatformSettings()
    await signInAsRole(page, "dashboard-admin-storage-s3", "super_admin")

    await page.goto("/dashboard/admin/settings")
    await selectStorageProvider(page, "S3")
    await page.getByRole("button", { name: "保存文件存储配置" }).click()

    await expect(page.getByText("S3 Bucket 不能为空。")).toBeVisible()
    await expect(page.getByText("S3 Region 或 S3 Endpoint 至少填写一项。")).toBeVisible()
    await expect(page.getByText("S3 Access Key 不能为空。")).toBeVisible()
    await expect(page.getByText("S3 Secret Key 不能为空。")).toBeVisible()

    await page.getByLabel("S3 Endpoint").fill("https://tos-s3-cn-beijing.volces.com")
    await page.getByLabel("S3 Region").fill("cn-beijing")
    await page.getByLabel("S3 Bucket").fill("lever-admin-e2e")
    await page.getByLabel("S3 Access Key").fill("AKLT_TEST")
    await page.getByLabel("S3 Secret Key").fill("SECRET_TEST")
    await page.getByLabel("forcePathStyle").click()
    await page.getByRole("button", { name: "保存文件存储配置" }).click()

    await expect(toastWithText(page, "文件存储配置已保存。")).toBeVisible()
    await expect.poll(() => getPlatformSettingValue("storage.provider")).toBe("s3")
    await expect.poll(() => getPlatformSettingValue("storage.s3.endpoint")).toBe("https://tos-s3-cn-beijing.volces.com")
    await expect.poll(() => getPlatformSettingValue("storage.s3.region")).toBe("cn-beijing")
    await expect.poll(() => getPlatformSettingValue("storage.s3.bucket")).toBe("lever-admin-e2e")
    await expect.poll(() => getPlatformSettingValue("storage.s3.forcePathStyle")).toBe("true")
    await expect
      .poll(async () => {
        const value = await getPlatformSettingValue("storage.s3.accessKeyId")

        return value?.startsWith("enc:v1:")
      })
      .toBe(true)
    await expect
      .poll(async () => {
        const value = await getPlatformSettingValue("storage.s3.secretAccessKey")

        return value?.startsWith("enc:v1:")
      })
      .toBe(true)
    await expect(page.getByLabel("S3 Access Key")).toHaveValue("")
    await expect(page.getByLabel("S3 Secret Key")).toHaveValue("")
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
    const successText = await page.getByText(/platform-settings\/test-.*\.txt/u).textContent()
    const key = successText?.match(/platform-settings\/test-[a-f0-9-]+\.txt/u)?.[0]
    expect(key).toBeTruthy()
    await expect.poll(() => localUploadObjectExists({ key: key ?? "" })).toBe(false)
  })
})
