"use client"

import type { RouterOutputs } from "@/trpc/react"
import { OAuthAccountsCard } from "./oauth-accounts-card"
import { PasskeyCard } from "./passkey-card"
import { PasswordChangeCard } from "./password-change-card"
import { RecentLoginCard } from "./recent-login-card"
import { SecurityScoreCard } from "./security-score-card"
import { TwoFactorCard } from "./two-factor-card"

type SecurityPageData = RouterOutputs["security"]["getOverview"]

type SecurityPageContentProps = {
  data: SecurityPageData
}

export const SecurityPageContent = ({ data }: SecurityPageContentProps) => (
  <div className="space-y-5 text-[13px]">
    <div className="space-y-1">
      <h1 className="font-semibold text-2xl tracking-normal">安全设置</h1>
      <p className="max-w-2xl text-muted-foreground text-sm">集中管理密码、双因素认证、Passkey 与第三方登录方式。</p>
    </div>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,720px)_340px]">
      <div className="space-y-5">
        <PasswordChangeCard hasPassword={data.password.hasPassword} />
        <TwoFactorCard twoFactor={data.twoFactor} />
        <PasskeyCard passkeys={data.passkeys} />
        <OAuthAccountsCard oauthProviders={data.oauthProviders} />
      </div>

      <div className="space-y-5">
        <SecurityScoreCard score={data.score} />
        <RecentLoginCard methods={data.recentLoginMethods} sessions={data.sessions} />
      </div>
    </div>
  </div>
)
