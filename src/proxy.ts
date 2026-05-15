import { type NextRequest, NextResponse } from "next/server"

export const proxy = (request: NextRequest) => {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-current-path", `${request.nextUrl.pathname}${request.nextUrl.search}`)
  requestHeaders.set("x-request-id", request.headers.get("x-request-id") ?? crypto.randomUUID())

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  })
}

export const config = {
  matcher: ["/api/auth/:path*", "/api/trpc/:path*", "/dashboard/:path*", "/invite/:path*"]
}
