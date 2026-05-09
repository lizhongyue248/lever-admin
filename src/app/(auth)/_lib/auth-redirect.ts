export const defaultAuthRedirect = "/app"

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
