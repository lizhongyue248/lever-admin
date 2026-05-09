import { redirect } from "next/navigation"

import { AuthCard } from "@/app/(auth)/_components/auth-card"
import { AuthLayout } from "@/app/(auth)/_components/auth-layout"
import { normalizeRedirectTo } from "@/app/(auth)/_lib/auth-redirect"
import { getOptionalSession } from "@/app/(auth)/_lib/server-session"
import { SignInForm } from "@/app/(auth)/sign-in/_components/sign-in-form"

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const SignInPage = async ({ searchParams }: SignInPageProps) => {
  const [params, session] = await Promise.all([searchParams, getOptionalSession()])
  const redirectTo = normalizeRedirectTo(params.redirectTo)

  if (session?.user) {
    redirect(redirectTo)
  }

  return (
    <AuthLayout page="sign-in">
      <AuthCard description="使用邮箱密码或 OAuth 进入控制台。" title="登录">
        <SignInForm redirectTo={redirectTo} />
      </AuthCard>
    </AuthLayout>
  )
}

export default SignInPage
