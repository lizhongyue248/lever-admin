import { toNextJsHandler } from "better-auth/next-js"
import type { NextRequest } from "next/server"

import { auth } from "@/server/better-auth"
import { recordRequestLogSafely } from "@/server/service/request-logs"

const authHandler = toNextJsHandler(auth.handler)

const getRequestBodyText = async (request: NextRequest) => {
  if (request.method !== "POST" && request.method !== "PUT" && request.method !== "PATCH") {
    return null
  }

  try {
    return await request.clone().text()
  } catch {
    return null
  }
}

const getFailureReason = (statusCode: number) => {
  if (statusCode === 401) {
    return "unauthorized"
  }

  if (statusCode === 403) {
    return "forbidden"
  }

  if (statusCode >= 400 && statusCode < 500) {
    return "validation_failed"
  }

  if (statusCode >= 500) {
    return "server_error"
  }

  return null
}

const handleAuthRequest = async (request: NextRequest, methodHandler: (request: NextRequest) => Promise<Response>) => {
  const start = Date.now()
  const bodyTextPromise = getRequestBodyText(request)

  try {
    const response = await methodHandler(request)
    const statusCode = response.status

    recordRequestLogSafely({
      contentType: request.headers.get("content-type"),
      durationMs: Date.now() - start,
      failureReason: getFailureReason(statusCode),
      headers: request.headers,
      method: request.method,
      path: request.nextUrl.pathname,
      rawBodyText: await bodyTextPromise,
      requestId: request.headers.get("x-request-id"),
      routeName: request.nextUrl.pathname.replace(/^\/api\/auth\/?/u, "") || null,
      source: "auth",
      statusCode,
      success: response.ok,
      user: null
    })

    return response
  } catch (error) {
    recordRequestLogSafely({
      contentType: request.headers.get("content-type"),
      durationMs: Date.now() - start,
      errorCode: error instanceof Error ? error.name : "unknown_error",
      failureReason: "server_error",
      headers: request.headers,
      method: request.method,
      path: request.nextUrl.pathname,
      rawBodyText: await bodyTextPromise,
      requestId: request.headers.get("x-request-id"),
      routeName: request.nextUrl.pathname.replace(/^\/api\/auth\/?/u, "") || null,
      source: "auth",
      statusCode: 500,
      success: false,
      user: null
    })

    throw error
  }
}

export const GET = (request: NextRequest) => handleAuthRequest(request, authHandler.GET)
export const POST = (request: NextRequest) => handleAuthRequest(request, authHandler.POST)
