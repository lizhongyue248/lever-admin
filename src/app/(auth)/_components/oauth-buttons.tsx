"use client"

import { useState } from "react"
import { type SimpleIcon, siGithub, siGoogle, siWechat } from "simple-icons"

import { getAuthErrorMessage } from "@/app/(auth)/_lib/auth-errors"
import { SimpleIconMark } from "@/components/simple-icon-mark"
import { Button } from "@/components/ui/button"
import { type AuthOAuthProvider, type AuthOAuthProviderId, OAUTH_PROVIDER_GITHUB, OAUTH_PROVIDER_GOOGLE, OAUTH_PROVIDER_WECHAT } from "@/lib/const"
import { cn } from "@/lib/utils"
import { authClient } from "@/server/better-auth/client"

type Provider = AuthOAuthProviderId

const providerIconById = {
  [OAUTH_PROVIDER_GITHUB]: siGithub,
  [OAUTH_PROVIDER_GOOGLE]: siGoogle,
  [OAUTH_PROVIDER_WECHAT]: siWechat
} satisfies Record<AuthOAuthProviderId, SimpleIcon>

export const OAuthButtons = ({
  callbackURL,
  onError,
  prefix = "",
  providers
}: {
  callbackURL: string
  onError: (message: string) => void
  prefix?: string
  providers: AuthOAuthProvider[]
}) => {
  const [pendingProvider, setPendingProvider] = useState<Provider | null>(null)

  const signInWithProvider = async (provider: Provider) => {
    setPendingProvider(provider)
    onError("")

    const { error } = await authClient.signIn.social({
      callbackURL,
      provider
    })

    if (error) {
      onError(getAuthErrorMessage(error, "OAuth 登录暂时不可用，请稍后重试。"))
      setPendingProvider(null)
    }
  }

  return (
    <div className={cn("grid gap-3", providers.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
      {providers.map((provider) => {
        const icon = providerIconById[provider.id]

        return (
          <Button disabled={pendingProvider !== null} key={provider.id} onClick={() => signInWithProvider(provider.id)} type="button" variant="outline">
            <SimpleIconMark icon={icon} />
            {pendingProvider === provider.id ? "处理中..." : `${prefix}${provider.label}`}
          </Button>
        )
      })}
    </div>
  )
}
