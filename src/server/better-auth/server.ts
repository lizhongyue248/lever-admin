import { headers } from "next/headers"

import { auth } from "."

export const getSession = async () =>
  auth.api.getSession({
    query: {
      disableCookieCache: true
    },
    headers: await headers()
  })
