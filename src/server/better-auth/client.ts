import { apiKeyClient } from "@better-auth/api-key/client"
import { passkeyClient } from "@better-auth/passkey/client"
import { adminClient, organizationClient, twoFactorClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

import { ROUTE_SIGN_IN_2FA } from "@/lib/const"

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    organizationClient(),
    twoFactorClient({
      twoFactorPage: ROUTE_SIGN_IN_2FA
    }),
    passkeyClient(),
    apiKeyClient()
  ]
})

export type Session = typeof authClient.$Infer.Session
