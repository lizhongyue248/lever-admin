import { redirect } from "next/navigation"

import { AuthCard } from "@/app/(auth)/_components/auth-card"
import { AuthLayout } from "@/app/(auth)/_components/auth-layout"
import { normalizeRedirectTo } from "@/app/(auth)/_lib/auth-redirect"
import { getOptionalSession } from "@/app/(auth)/_lib/server-session"
import { TwoFactorSignInForm } from "@/app/(auth)/sign-in/2fa/_components/two-factor-sign-in-form"

type SignInTwoFactorPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const SignInTwoFactorPage = async ({ searchParams }: SignInTwoFactorPageProps) => {
  const [params, session] = await Promise.all([searchParams, getOptionalSession()])
  const redirectTo = normalizeRedirectTo(params.redirectTo)

  if (session?.user) {
    redirect(redirectTo)
  }

  return (
    <AuthLayout backHref="/sign-in" backLabel="返回登录" page="sign-in-2fa">
      <AuthCard description="输入认证器验证码，完成本次登录。" title="二次验证">
        <TwoFactorSignInForm redirectTo={redirectTo} />
      </AuthCard>
    </AuthLayout>
  )
}

export default SignInTwoFactorPage
