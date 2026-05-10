import { apiKeyClient } from "@better-auth/api-key/client"
import { passkeyClient } from "@better-auth/passkey/client"
import { adminClient, organizationClient, twoFactorClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    organizationClient(),
    twoFactorClient({
      twoFactorPage: "/sign-in/2fa"
    }),
    passkeyClient(),
    apiKeyClient()
  ]
})

export type Session = typeof authClient.$Infer.Session
