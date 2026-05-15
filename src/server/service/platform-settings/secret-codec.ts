import "server-only"

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

import { env } from "@/env"

const algorithm = "aes-256-gcm"
const encryptedPrefix = "enc:v1:"

const getKey = () =>
  createHash("sha256")
    .update(env.BETTER_AUTH_SECRET ?? "lever-admin-development-platform-settings")
    .digest()

export const encryptSecret = (value: string): string => {
  const iv = randomBytes(12)
  const cipher = createCipheriv(algorithm, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${encryptedPrefix}${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`
}

export const decryptSecret = (value: string): string => {
  if (!value.startsWith(encryptedPrefix)) {
    return value
  }

  const [ivValue, tagValue, encryptedValue] = value.slice(encryptedPrefix.length).split(":")

  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Invalid encrypted platform setting format.")
  }

  const decipher = createDecipheriv(algorithm, getKey(), Buffer.from(ivValue, "base64url"))
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"))

  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8")
}
