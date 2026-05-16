import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import type { NextRequest } from "next/server"

import { env } from "@/env"
import { REQUEST_LOG_SOURCE_TRPC } from "@/lib/const"
import { appRouter } from "@/server/api/root"
import { createTRPCContext } from "@/server/api/trpc"
import { recordRequestLogSafely } from "@/server/service/request-logs"

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers
  })
}

type SessionUser = NonNullable<Awaited<ReturnType<typeof createContext>>["session"]>["user"]

const getPlatformRole = (user: SessionUser) => {
  if ("role" in user && (typeof user.role === "string" || user.role === null || user.role === undefined)) {
    return user.role ?? null
  }

  return null
}

const getRouteName = (req: NextRequest) => decodeURIComponent(req.nextUrl.pathname.replace(/^\/api\/trpc\/?/u, "")) || null

const getFailureReason = (statusCode: number) => {
  if (statusCode === 401) {
    return "unauthorized"
  }

  if (statusCode === 403) {
    return "forbidden"
  }

  if (statusCode === 429) {
    return "rate_limited"
  }

  if (statusCode >= 400 && statusCode < 500) {
    return "validation_failed"
  }

  if (statusCode >= 500) {
    return "server_error"
  }

  return null
}

const getRequestBodyText = async (req: NextRequest) => {
  if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") {
    return null
  }

  try {
    return await req.clone().text()
  } catch {
    return null
  }
}

const handler = async (req: NextRequest) => {
  const start = Date.now()
  const context = await createContext(req)
  const routeName = getRouteName(req)
  const bodyTextPromise = getRequestBodyText(req)

  try {
    const response = await fetchRequestHandler({
      endpoint: "/api/trpc",
      req,
      router: appRouter,
      createContext: () => context,
      onError:
        env.NODE_ENV === "development"
          ? ({ path, error }) => {
              console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`)
            }
          : undefined
    })
    const bodyText = await bodyTextPromise
    const statusCode = response.status

    recordRequestLogSafely({
      contentType: req.headers.get("content-type"),
      durationMs: Date.now() - start,
      failureReason: getFailureReason(statusCode),
      headers: req.headers,
      method: req.method,
      path: req.nextUrl.pathname,
      rawBodyText: bodyText,
      requestId: req.headers.get("x-request-id"),
      routeName,
      source: REQUEST_LOG_SOURCE_TRPC,
      statusCode,
      success: response.ok,
      user: context.session?.user
        ? {
            email: context.session.user.email,
            id: context.session.user.id,
            name: context.session.user.name,
            role: getPlatformRole(context.session.user)
          }
        : null
    })

    return response
  } catch (error) {
    const bodyText = await bodyTextPromise

    recordRequestLogSafely({
      contentType: req.headers.get("content-type"),
      durationMs: Date.now() - start,
      errorCode: error instanceof Error ? error.name : "unknown_error",
      failureReason: "server_error",
      headers: req.headers,
      method: req.method,
      path: req.nextUrl.pathname,
      rawBodyText: bodyText,
      requestId: req.headers.get("x-request-id"),
      routeName,
      source: REQUEST_LOG_SOURCE_TRPC,
      statusCode: 500,
      success: false,
      user: context.session?.user
        ? {
            email: context.session.user.email,
            id: context.session.user.id,
            name: context.session.user.name,
            role: getPlatformRole(context.session.user)
          }
        : null
    })

    throw error
  }
}

export { handler as GET, handler as POST }
