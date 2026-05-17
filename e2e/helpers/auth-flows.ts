import { expect, type Page } from "@playwright/test"

import { markEmailVerified } from "./db"
import { e2ePassword, uniqueEmail } from "./test-data"

export const fillSignUpForm = async (page: Page, { email, name, password = e2ePassword }: { email: string; name: string; password?: string }) => {
  await page.getByLabel("名称").fill(name)
  await page.getByLabel("邮箱").fill(email)
  await page.getByLabel("密码", { exact: true }).fill(password)
  await page.getByLabel("确认密码").fill(password)
}

export const signUpViaUi = async (page: Page, { email, name }: { email: string; name: string }) => {
  await page.goto("/sign-up")
  await fillSignUpForm(page, { email, name })
  await page.getByRole("button", { name: "创建账号" }).click()
  await expect(page).toHaveURL(/\/verify-email\?(?=.*email=)(?=.*status=pending)/, { timeout: 15_000 })
}

export const signInViaUi = async (page: Page, { email, password = e2ePassword }: { email: string; password?: string }) => {
  await page.getByLabel("邮箱").fill(email)
  await page.getByLabel("密码", { exact: true }).fill(password)
  await page.getByRole("button", { name: "登录并进入应用" }).click()
}

export const createVerifiedUser = async (page: Page, prefix: string) => {
  const email = uniqueEmail(prefix)

  await signUpViaUi(page, {
    email,
    name: "Verified E2E"
  })
  await markEmailVerified(email)
  await page.context().clearCookies()

  return email
}

export const createVerifiedUserViaApi = async (page: Page, prefix: string) => {
  const email = uniqueEmail(prefix)
  const response = await page.request.post("/api/auth/sign-up/email", {
    data: {
      callbackURL: "/dashboard",
      email,
      name: "Verified E2E",
      password: e2ePassword
    }
  })

  expect(response.ok()).toBe(true)
  await markEmailVerified(email)
  await page.context().clearCookies()

  return email
}
