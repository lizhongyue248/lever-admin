import Link from "next/link"

import { AuthCard } from "@/app/(auth)/_components/auth-card"
import { AuthLayout } from "@/app/(auth)/_components/auth-layout"
import { AuthMessage } from "@/app/(auth)/_components/auth-message"
import { ResetPasswordForm } from "@/app/(auth)/reset-password/_components/reset-password-form"
import { Button } from "@/components/ui/button"
import { ROUTE_SIGN_IN } from "@/lib/const"

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const getSingleParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

const ResetPasswordPage = async ({ searchParams }: ResetPasswordPageProps) => {
  const params = await searchParams
  const token = getSingleParam(params.token)

  return (
    <AuthLayout backHref={ROUTE_SIGN_IN} page="reset-password">
      <AuthCard description="设置一个新的登录密码。" title="重置密码">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="space-y-5">
            <AuthMessage message="当前链接缺少重置凭证，可能复制不完整或已经失效。" title="链接无效" tone="error" />
            <Button asChild className="h-10 w-full" variant="outline">
              <Link href="/forgot-password">重新发送重置邮件</Link>
            </Button>
          </div>
        )}
      </AuthCard>
    </AuthLayout>
  )
}

export default ResetPasswordPage
