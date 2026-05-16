import { AuthCard } from "@/app/(auth)/_components/auth-card"
import { AuthLayout } from "@/app/(auth)/_components/auth-layout"
import { ForgotPasswordForm } from "@/app/(auth)/forgot-password/_components/forgot-password-form"
import { ROUTE_SIGN_IN } from "@/lib/const"

const ForgotPasswordPage = () => {
  return (
    <AuthLayout backHref={ROUTE_SIGN_IN} page="forgot-password">
      <AuthCard description="输入邮箱后，我们会发送重置链接。" title="忘记密码">
        <ForgotPasswordForm />
      </AuthCard>
    </AuthLayout>
  )
}

export default ForgotPasswordPage
