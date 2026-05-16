import { env } from "@/env"
import { type AuthOAuthProviderId, OAUTH_PROVIDER_GITHUB, OAUTH_PROVIDER_GOOGLE } from "@/lib/const"

export type OAuthProviderConfig = {
  configured: boolean
  id: AuthOAuthProviderId
  label: string
}

export const getOAuthProviderConfigs = (): OAuthProviderConfig[] => [
  {
    configured: Boolean(env.BETTER_AUTH_GITHUB_CLIENT_ID && env.BETTER_AUTH_GITHUB_CLIENT_SECRET),
    id: OAUTH_PROVIDER_GITHUB,
    label: "GitHub"
  },
  {
    configured: false,
    id: OAUTH_PROVIDER_GOOGLE,
    label: "Google"
  }
]
