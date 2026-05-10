import { type NextRequest, NextResponse } from "next/server"

export const proxy = (request: NextRequest) => {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-current-path", `${request.nextUrl.pathname}${request.nextUrl.search}`)

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  })
}

export const config = {
  matcher: ["/dashboard/:path*"]
}
