import "server-only"

import { getSession } from "@/server/better-auth/server"

export const getOptionalSession = async () => {
  try {
    return await getSession()
  } catch {
    return null
  }
}
