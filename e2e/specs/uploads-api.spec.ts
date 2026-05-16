import { Buffer } from "node:buffer"

import { expect, test } from "../fixtures/coverage"
import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { deletePlatformSettings, upsertPlatformSetting } from "../helpers/db"

const safeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="red"/></svg>'

const svgFile = {
  buffer: Buffer.from(safeSvg),
  mimeType: "image/svg+xml",
  name: "upload.svg"
}

test.describe("upload api routes", () => {
  test("rejects avatar upload when unauthenticated", async ({ request }) => {
    const response = await request.post("/api/uploads/avatar", {
      multipart: {
        file: svgFile
      }
    })

    expect(response.status()).toBe(401)
  })

  test("rejects non-image avatar uploads", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed upload flow only needs one browser project")

    const email = await createVerifiedUser(page, "upload-api-non-image")
    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    const result = await page.evaluate(async () => {
      const form = new FormData()
      form.append("file", new File(["not an image"], "not-image.txt", { type: "text/plain" }))
      const response = await fetch("/api/uploads/avatar", { body: form, method: "POST" })

      return { status: response.status, text: await response.text() }
    })

    expect(result.status).toBe(400)
    expect(result.text).toContain("仅支持 PNG、JPG、WebP 或 SVG 图片。")
  })

  test("uploads an avatar and reads it back from the local upload route", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed upload flow only needs one browser project")

    await deletePlatformSettings()
    await upsertPlatformSetting({ key: "storage.provider", value: "local" })
    await upsertPlatformSetting({ key: "storage.local.path", value: "./uploads" })
    const email = await createVerifiedUser(page, "upload-api-avatar")
    await page.goto("/sign-in")
    await signInViaUi(page, { email })
    await expect(page).toHaveURL(/\/dashboard$/)

    const result = await page.evaluate(async (svgContent) => {
      const form = new FormData()
      form.append("file", new File([svgContent], "upload.svg", { type: "image/svg+xml" }))
      const response = await fetch("/api/uploads/avatar", { body: form, method: "POST" })

      return { body: await response.text(), status: response.status }
    }, safeSvg)

    expect(result.status).toBe(200)
    const uploaded = JSON.parse(result.body) as { key: string; url: string }
    expect(uploaded.key).toMatch(/^avatars\/[a-z0-9_-]+-[a-f0-9-]+\.svg$/u)

    const readResponse = await request.get(uploaded.url)
    expect(readResponse.status()).toBe(200)
    expect(readResponse.headers()["content-type"]).toContain("image/svg+xml")
  })

  test("returns 404 for a missing local uploaded object", async ({ request }) => {
    const response = await request.get("/api/uploads/local/avatars/missing-file.svg")

    expect(response.status()).toBe(404)
  })
})
