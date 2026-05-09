"use client"

import { useState } from "react"

import { getAuthErrorMessage } from "@/app/(auth)/_lib/auth-errors"
import { Button } from "@/components/ui/button"
import { authClient } from "@/server/better-auth/client"

type Provider = "github" | "google"

export const OAuthButtons = ({ callbackURL, onError, prefix = "" }: { callbackURL: string; onError: (message: string) => void; prefix?: string }) => {
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
    <div className="grid grid-cols-2 gap-3">
      <Button disabled={pendingProvider !== null} onClick={() => signInWithProvider("github")} type="button" variant="outline">
        {pendingProvider === "github" ? "处理中..." : `${prefix}GitHub`}
      </Button>
      <Button disabled={pendingProvider !== null} onClick={() => signInWithProvider("google")} type="button" variant="outline">
        {pendingProvider === "google" ? "处理中..." : `${prefix}Google`}
      </Button>
    </div>
  )
}
