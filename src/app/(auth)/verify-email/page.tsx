import { redirect } from "next/navigation"

import { AuthCard } from "@/app/(auth)/_components/auth-card"
import { AuthLayout } from "@/app/(auth)/_components/auth-layout"
import { defaultAuthRedirect } from "@/app/(auth)/_lib/auth-redirect"
import { getOptionalSession } from "@/app/(auth)/_lib/server-session"
import { VerifyEmailState } from "@/app/(auth)/verify-email/_components/verify-email-state"
import { EMAIL_VERIFICATION_STATUS_FAILED, ROUTE_SIGN_IN } from "@/lib/const"

type VerifyEmailPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const getSingleParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

const VerifyEmailPage = async ({ searchParams }: VerifyEmailPageProps) => {
  const [params, session] = await Promise.all([searchParams, getOptionalSession()])
  const email = getSingleParam(params.email)
  const error = getSingleParam(params.error)
  const token = getSingleParam(params.token)
  const status = getSingleParam(params.status)

  if (session?.user.emailVerified && !error && !token && status !== EMAIL_VERIFICATION_STATUS_FAILED) {
    redirect(defaultAuthRedirect)
  }

  return (
    <AuthLayout backHref={ROUTE_SIGN_IN} className="lg:max-w-[480px]" page="verify-email">
      <AuthCard description="处理验证链接、待验证提醒和重新发送。" title="邮箱验证">
        <VerifyEmailState error={error} initialEmail={session?.user.email ?? email ?? ""} lockEmail={Boolean(session?.user.email ?? email)} status={status} token={token} />
      </AuthCard>
    </AuthLayout>
  )
}

export default VerifyEmailPage
