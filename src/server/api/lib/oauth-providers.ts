import "server-only"

import { env } from "@/env"
import { type AuthOAuthProviderId, OAUTH_PROVIDER_GITHUB, OAUTH_PROVIDER_GOOGLE, OAUTH_PROVIDER_WECHAT } from "@/lib/const"

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
    configured: Boolean(env.BETTER_AUTH_GOOGLE_CLIENT_ID && env.BETTER_AUTH_GOOGLE_CLIENT_SECRET),
    id: OAUTH_PROVIDER_GOOGLE,
    label: "Google"
  },
  {
    configured: Boolean(env.BETTER_AUTH_WECHAT_CLIENT_ID && env.BETTER_AUTH_WECHAT_CLIENT_SECRET),
    id: OAUTH_PROVIDER_WECHAT,
    label: "WeChat"
  }
]

export const getEnabledOAuthProviderConfigs = () => getOAuthProviderConfigs().filter((provider) => provider.configured)

type BetterAuthSocialProviders = {
  github?: {
    clientId: string
    clientSecret: string
    redirectURI: string
  }
  google?: {
    clientId: string
    clientSecret: string
    redirectURI: string
  }
  wechat?: {
    clientId: string
    clientSecret: string
    lang: "cn"
    redirectURI: string
    scope: string[]
  }
}

export const getBetterAuthSocialProviders = (authBaseUrl: string): BetterAuthSocialProviders => {
  const providers: BetterAuthSocialProviders = {}

  if (env.BETTER_AUTH_GITHUB_CLIENT_ID && env.BETTER_AUTH_GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
      redirectURI: `${authBaseUrl}/api/auth/callback/github`
    }
  }

  if (env.BETTER_AUTH_GOOGLE_CLIENT_ID && env.BETTER_AUTH_GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
      redirectURI: `${authBaseUrl}/api/auth/callback/google`
    }
  }

  if (env.BETTER_AUTH_WECHAT_CLIENT_ID && env.BETTER_AUTH_WECHAT_CLIENT_SECRET) {
    providers.wechat = {
      clientId: env.BETTER_AUTH_WECHAT_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_WECHAT_CLIENT_SECRET,
      lang: "cn",
      redirectURI: `${authBaseUrl}/api/auth/callback/wechat`,
      scope: ["snsapi_login"]
    }
  }

  return providers
}
