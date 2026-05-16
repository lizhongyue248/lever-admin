import { ROUTE_DASHBOARD } from "@/lib/const"

export const defaultAuthRedirect = ROUTE_DASHBOARD

export const normalizeRedirectTo = (value: string | string[] | undefined, fallback = defaultAuthRedirect) => {
  const redirectTo = Array.isArray(value) ? value[0] : value

  if (!redirectTo) {
    return fallback
  }

  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return fallback
  }

  return redirectTo
}
