import { createAuthClient } from "better-auth/react"
// Enable these client plugins after the matching server plugins and Drizzle schema are ready.
// import { adminClient, magicLinkClient, organizationClient, twoFactorClient } from "better-auth/client/plugins"
// import { apiKeyClient } from "@better-auth/api-key/client"
// import { passkeyClient } from "@better-auth/passkey/client"

export const authClient = createAuthClient({
  // plugins: [
  //   adminClient(),
  //   organizationClient(),
  //   twoFactorClient({
  //     twoFactorPage: "/sign-in/2fa"
  //   }),
  //   magicLinkClient(),
  //   passkeyClient(),
  //   apiKeyClient()
  // ]
})

export type Session = typeof authClient.$Infer.Session
