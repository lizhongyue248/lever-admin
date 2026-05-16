import { env } from "@/env"

export type OAuthProviderId = "github" | "google"

export type OAuthProviderConfig = {
  configured: boolean
  id: OAuthProviderId
  label: string
}

export const getOAuthProviderConfigs = (): OAuthProviderConfig[] => [
  {
    configured: Boolean(env.BETTER_AUTH_GITHUB_CLIENT_ID && env.BETTER_AUTH_GITHUB_CLIENT_SECRET),
    id: "github",
    label: "GitHub"
  },
  {
    configured: false,
    id: "google",
    label: "Google"
  }
]
