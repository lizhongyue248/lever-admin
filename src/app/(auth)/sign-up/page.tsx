import { redirect } from "next/navigation"

import { AuthCard } from "@/app/(auth)/_components/auth-card"
import { AuthLayout } from "@/app/(auth)/_components/auth-layout"
import { defaultAuthRedirect } from "@/app/(auth)/_lib/auth-redirect"
import { getOptionalSession } from "@/app/(auth)/_lib/server-session"
import { SignUpForm } from "@/app/(auth)/sign-up/_components/sign-up-form"
import { getEnabledOAuthProviderConfigs } from "@/server/api/lib/oauth-providers"

const SignUpPage = async () => {
  const session = await getOptionalSession()
  const oauthProviders = getEnabledOAuthProviderConfigs()

  if (session?.user) {
    redirect(defaultAuthRedirect)
  }

  return (
    <AuthLayout className="lg:max-w-[460px]" page="sign-up">
      <AuthCard description="创建身份管理控制台账号。" title="创建账号">
        <SignUpForm oauthProviders={oauthProviders} />
      </AuthCard>
    </AuthLayout>
  )
}

export default SignUpPage
