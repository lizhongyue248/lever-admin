import { createHmac } from "node:crypto"

export const e2ePassword = "E2e-password-12345"
export const e2eNewPassword = "E2e-new-password-12345"

export const uniqueEmail = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`

const base64Url = (value: Buffer | string) => Buffer.from(value).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "")

export const uniqueToken = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`

export const createEmailVerificationToken = (email: string, expiresInSeconds = 3600) => {
  const secret = process.env.BETTER_AUTH_SECRET ?? "e2e-secret-at-least-32-characters-long"
  const now = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: "HS256" }))
  const payload = base64Url(
    JSON.stringify({
      email: email.toLowerCase(),
      exp: now + expiresInSeconds,
      iat: now
    })
  )
  const signature = base64Url(createHmac("sha256", secret).update(`${header}.${payload}`).digest())

  return `${header}.${payload}.${signature}`
}
