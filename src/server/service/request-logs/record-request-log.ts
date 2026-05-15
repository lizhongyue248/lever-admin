import { createHash, randomUUID } from "node:crypto"

import { db } from "@/server/db"
import { requestLog } from "@/server/db/schema"
import { buildRequestLogRisk, type RequestRiskLevel } from "./request-log-risk"
import { type RequestBodyStatus, sanitizeRequestBody, summarizeUserAgent } from "./request-log-sanitizer"

type RequestLogMetadata = Record<string, boolean | null | number | string>

export type RecordRequestLogInput = {
  apiKeyId?: string | null
  contentType?: string | null
  durationMs?: number | null
  errorCode?: string | null
  failureReason?: string | null
  headers?: Headers | null
  ipAddress?: string | null
  metadata?: RequestLogMetadata | null
  method: string
  organizationId?: string | null
  organizationName?: string | null
  path: string
  rawBodyText?: string | null
  requestId?: string | null
  routeName?: string | null
  sessionId?: string | null
  source: "api_key" | "auth" | "dashboard" | "route_handler" | "system" | "trpc"
  statusCode?: number | null
  success: boolean
  user?: {
    email?: string | null
    id?: string | null
    name?: string | null
    role?: string | null
  } | null
}

type InsertRequestLogInput = RecordRequestLogInput & {
  requestBodyStatus: RequestBodyStatus
  requestBodySummary: string | null
  riskLevel: RequestRiskLevel
  riskReasons: string[]
}

const getHeaderValue = (headers: Headers | null | undefined, key: string) => headers?.get(key) ?? null

const sha256 = (value: string | null) => (value ? createHash("sha256").update(value).digest("hex") : null)

const getIpAddress = (input: RecordRequestLogInput) => {
  if (input.ipAddress) {
    return input.ipAddress
  }

  const forwardedFor = getHeaderValue(input.headers, "x-forwarded-for")
  const realIp = getHeaderValue(input.headers, "x-real-ip")

  return forwardedFor?.split(",")[0]?.trim() || realIp || null
}

const getSafePath = (path: string) => path.split("?")[0] || path

const insertRequestLog = async (input: InsertRequestLogInput) => {
  const ipAddress = getIpAddress(input)
  const userAgentRaw = getHeaderValue(input.headers, "user-agent")
  const riskReasons = input.riskReasons.length > 0 ? JSON.stringify(input.riskReasons) : null

  await db.insert(requestLog).values({
    apiKeyId: input.apiKeyId ?? null,
    durationMs: input.durationMs ?? null,
    errorCode: input.errorCode ?? null,
    failureReason: input.failureReason ?? null,
    id: `request-log-${randomUUID()}`,
    ipAddress,
    ipHash: sha256(ipAddress),
    method: input.method.toUpperCase(),
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    organizationId: input.organizationId ?? null,
    organizationName: input.organizationName ?? null,
    path: getSafePath(input.path),
    requestBodyStatus: input.requestBodyStatus,
    requestBodySummary: input.requestBodySummary,
    requestId: input.requestId ?? `req-${randomUUID()}`,
    riskLevel: input.riskLevel,
    riskReasons,
    routeName: input.routeName ?? null,
    sessionId: input.sessionId ?? null,
    source: input.source,
    statusCode: input.statusCode ?? null,
    success: input.success,
    userAgentHash: sha256(userAgentRaw),
    userAgentRaw,
    userAgentSummary: summarizeUserAgent(userAgentRaw),
    userEmail: input.user?.email ?? null,
    userId: input.user?.id ?? null,
    userName: input.user?.name ?? null,
    userRole: input.user?.role ?? null
  })
}

export const recordRequestLog = async (input: RecordRequestLogInput) => {
  const requestBody = sanitizeRequestBody({
    contentType: input.contentType ?? getHeaderValue(input.headers, "content-type"),
    path: input.path,
    rawText: input.rawBodyText ?? null
  })
  const risk = buildRequestLogRisk({
    durationMs: input.durationMs ?? null,
    path: input.path,
    routeName: input.routeName ?? null,
    statusCode: input.statusCode ?? null,
    success: input.success
  })

  await insertRequestLog({
    ...input,
    requestBodyStatus: requestBody.status,
    requestBodySummary: requestBody.summary,
    riskLevel: risk.level,
    riskReasons: risk.reasons
  })
}

export const recordRequestLogSafely = (input: RecordRequestLogInput) => {
  recordRequestLog(input).catch((error: Error) => {
    console.error("[request-log] failed to record request", error.message)
  })
}
