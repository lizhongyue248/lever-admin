import { REQUEST_LOG_MAX_BODY_BYTES, REQUEST_LOG_REDACTED_VALUE } from "@/lib/const"

export type RequestBodyStatus = "blocked_sensitive_route" | "not_collected" | "redacted" | "truncated"

export type SanitizedRequestBody = {
  summary: string | null
  status: RequestBodyStatus
}

type JsonPrimitive = boolean | null | number | string
type JsonObject = { [key: string]: JsonValue }
type JsonValue = JsonObject | JsonPrimitive | JsonValue[]

const sensitiveKeyPattern = /(api[-_]?key|authorization|captcha|code|cookie|credential|otp|password|secret|token)/iu
const blockedPathPattern = /\/api\/auth\/(callback|forget-password|reset-password|verify-email)|\/api\/auth\/sign-in|\/api\/auth\/sign-up/iu

const isJsonObject = (value: JsonValue): value is JsonObject => typeof value === "object" && value !== null && !Array.isArray(value)

const redactJsonValue = (value: JsonValue, path: string[] = []): JsonValue => {
  if (Array.isArray(value)) {
    return value.map((item, index) => redactJsonValue(item, [...path, String(index)]))
  }

  if (!isJsonObject(value)) {
    return value
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      const nextPath = [...path, key]
      const shouldRedact = sensitiveKeyPattern.test(key) || sensitiveKeyPattern.test(nextPath.join("."))

      return [key, shouldRedact ? REQUEST_LOG_REDACTED_VALUE : redactJsonValue(entry, nextPath)]
    })
  )
}

const isJsonContentType = (contentType: string | null) => contentType?.toLowerCase().includes("application/json") ?? false

export const summarizeUserAgent = (userAgent: string | null) => {
  if (!userAgent) {
    return null
  }

  const browser = userAgent.includes("Edg/")
    ? "Edge"
    : userAgent.includes("Chrome/")
      ? "Chrome"
      : userAgent.includes("Firefox/")
        ? "Firefox"
        : userAgent.includes("Safari/")
          ? "Safari"
          : "Unknown"
  const os = userAgent.includes("Windows")
    ? "Windows"
    : userAgent.includes("Mac OS X")
      ? "macOS"
      : userAgent.includes("Android")
        ? "Android"
        : userAgent.includes("iPhone") || userAgent.includes("iPad")
          ? "iOS"
          : userAgent.includes("Linux")
            ? "Linux"
            : "Unknown"

  return `${browser} / ${os}`
}

export const sanitizeRequestBody = ({ contentType, path, rawText }: { contentType: string | null; path: string; rawText: string | null }): SanitizedRequestBody => {
  if (!rawText) {
    return { status: "not_collected", summary: null }
  }

  if (blockedPathPattern.test(path)) {
    return { status: "blocked_sensitive_route", summary: null }
  }

  if (!isJsonContentType(contentType)) {
    return { status: "not_collected", summary: null }
  }

  if (Buffer.byteLength(rawText, "utf8") > REQUEST_LOG_MAX_BODY_BYTES) {
    return {
      status: "truncated",
      summary: JSON.stringify({ bodySize: Buffer.byteLength(rawText, "utf8"), bodyTruncated: true })
    }
  }

  try {
    const parsed = JSON.parse(rawText) as JsonValue
    const redacted = redactJsonValue(parsed)

    return {
      status: "redacted",
      summary: JSON.stringify(redacted, null, 2)
    }
  } catch {
    return { status: "not_collected", summary: null }
  }
}
