import "server-only"

import { Buffer } from "node:buffer"
import { randomUUID } from "node:crypto"

import { TRPCError } from "@trpc/server"

import { STORAGE_PROVIDER_LOCAL, STORAGE_PROVIDER_S3, UPLOAD_IMAGE_MIME_TYPES, UPLOAD_MAX_IMAGE_BYTES, UPLOAD_PURPOSE_PLATFORM_TEST, type UploadImageMimeType } from "@/lib/const"
import { db } from "@/server/db"
import { getEffectiveStorageProviderConfig } from "@/server/service/platform-settings/storage-settings"
import { createLocalStorageProvider, readLocalStorageObject } from "./providers/local"
import { createS3StorageProvider } from "./providers/s3"
import type { StorageProvider, StorageUploadInput } from "./types"

const imageExtensionByMimeType: Record<UploadImageMimeType, "jpg" | "png" | "svg" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp"
}

const imageContentTypeByExtension: Record<"jpg" | "png" | "svg" | "webp", UploadImageMimeType> = {
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp"
}

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const isUploadImageMimeType = (contentType: string): contentType is UploadImageMimeType => UPLOAD_IMAGE_MIME_TYPES.some((mimeType) => mimeType === contentType)

const hasPngSignature = (body: Buffer) => body.length >= pngSignature.length && body.subarray(0, pngSignature.length).equals(pngSignature)

const hasJpegSignature = (body: Buffer) => body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff

const hasWebpSignature = (body: Buffer) => body.length >= 12 && body.toString("ascii", 0, 4) === "RIFF" && body.toString("ascii", 8, 12) === "WEBP"

const hasSafeSvgContent = (body: Buffer) => {
  const content = body.toString("utf8").trimStart()
  const normalizedHead = content.slice(0, 4096).toLowerCase()
  const hasSvgRoot = normalizedHead.startsWith("<svg") || (normalizedHead.startsWith("<?xml") && normalizedHead.includes("<svg"))
  const hasActiveContent =
    /<script\b/i.test(content) ||
    /\son[a-z]+\s*=/i.test(content) ||
    /\bjavascript\s*:/i.test(content) ||
    /<foreignobject\b/i.test(content) ||
    /<(?:iframe|object|embed|link|style)\b/i.test(content) ||
    /(?:<!doctype|<!entity|<!\[cdata\[)/i.test(content) ||
    /@import\b/i.test(content) ||
    /\s(?:href|xlink:href)\s*=\s*["'](?!#)[^"']+["']/i.test(content) ||
    /\s(?:src|srcset)\s*=/i.test(content)

  return hasSvgRoot && !hasActiveContent
}

const assertImageContentMatchesMimeType = ({ body, contentType }: { body: Buffer; contentType: string }) => {
  const matches =
    (contentType === "image/png" && hasPngSignature(body)) ||
    (contentType === "image/jpeg" && hasJpegSignature(body)) ||
    (contentType === "image/webp" && hasWebpSignature(body)) ||
    (contentType === "image/svg+xml" && hasSafeSvgContent(body))

  if (!matches) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "图片内容与文件类型不匹配。" })
  }
}

const sanitizeFilenamePrefix = (value: string) => {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)

  return sanitized || "upload"
}

const getImageContentTypeFromKey = (key: string) => {
  const extension = key.split(".").at(-1)?.toLowerCase()

  if (extension === "jpg" || extension === "png" || extension === "svg" || extension === "webp") {
    return imageContentTypeByExtension[extension]
  }

  throw new TRPCError({ code: "BAD_REQUEST", message: "不支持的文件类型。" })
}

const getCompleteS3Config = (config: Awaited<ReturnType<typeof getEffectiveStorageProviderConfig>>["s3"]) => {
  if (!config.bucket) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "S3 存储需要配置 Bucket。" })
  }

  if (!config.accessKeyId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "S3 存储需要配置 Access Key ID。" })
  }

  if (!config.secretAccessKey) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "S3 存储需要配置 Secret Access Key。" })
  }

  if (!config.endpoint && (!config.region || config.region === "auto")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "S3 存储需要配置 Region 或 Endpoint。" })
  }

  return {
    ...config,
    accessKeyId: config.accessKeyId,
    bucket: config.bucket,
    secretAccessKey: config.secretAccessKey
  }
}

const createStorageProvider = async (): Promise<StorageProvider> => {
  const config = await getEffectiveStorageProviderConfig(db)

  if (config.provider === STORAGE_PROVIDER_LOCAL) {
    return createLocalStorageProvider({
      localPath: config.local.path,
      publicBaseUrl: config.publicBaseUrl
    })
  }

  if (config.provider === STORAGE_PROVIDER_S3) {
    const s3Config = getCompleteS3Config(config.s3)

    return createS3StorageProvider({
      accessKeyId: s3Config.accessKeyId,
      bucket: s3Config.bucket,
      endpoint: s3Config.endpoint || undefined,
      forcePathStyle: s3Config.forcePathStyle,
      publicBaseUrl: config.publicBaseUrl,
      region: s3Config.region || "auto",
      secretAccessKey: s3Config.secretAccessKey
    })
  }

  throw new TRPCError({ code: "BAD_REQUEST", message: "不支持的存储方式。" })
}

export const assertAllowedImageUpload = ({ contentType, size }: { contentType: string; size: number }) => {
  if (!isUploadImageMimeType(contentType)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "仅支持 PNG、JPG、WebP 或 SVG 图片。" })
  }

  if (size > UPLOAD_MAX_IMAGE_BYTES) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "图片大小不能超过 2 MB。" })
  }

  return imageExtensionByMimeType[contentType]
}

export const uploadObject = async (input: StorageUploadInput) => {
  const provider = await createStorageProvider()
  const expectedExtension = assertAllowedImageUpload({ contentType: input.contentType, size: input.body.byteLength })
  assertImageContentMatchesMimeType({ body: input.body, contentType: input.contentType })

  if (input.extension !== expectedExtension) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "文件扩展名与图片类型不匹配。" })
  }

  const key = `${input.purpose}/${sanitizeFilenamePrefix(input.filenamePrefix)}-${randomUUID()}.${expectedExtension}`

  return provider.putObject({
    body: input.body,
    contentType: input.contentType,
    key
  })
}

export const testStorageUpload = async () => {
  const provider = await createStorageProvider()
  const key = `${UPLOAD_PURPOSE_PLATFORM_TEST}/test-${randomUUID()}.txt`

  const result = await provider.putObject({
    body: Buffer.from("lever-admin storage test", "utf8"),
    contentType: "text/plain",
    key
  })
  await provider.deleteObject(key)

  return result
}

export const readLocalUploadedObject = async (key: string) => {
  const config = await getEffectiveStorageProviderConfig(db)
  const body = await readLocalStorageObject({ key, localPath: config.local.path })
  const contentType = getImageContentTypeFromKey(key)
  assertImageContentMatchesMimeType({ body, contentType })

  return {
    body,
    contentType
  }
}
