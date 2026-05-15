"use client"

import { useForm } from "@tanstack/react-form"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { AuthMessage } from "@/app/(auth)/_components/auth-message"
import { FormField } from "@/app/(auth)/_components/form-field"
import { OAuthButtons } from "@/app/(auth)/_components/oauth-buttons"
import { getAuthErrorMessage } from "@/app/(auth)/_lib/auth-errors"
import { defaultAuthRedirect } from "@/app/(auth)/_lib/auth-redirect"
import { type FieldErrors, getZodFieldErrors, type SignUpValues, signUpSchema } from "@/app/(auth)/_lib/auth-validation"
import { getRecaptchaFetchOptions } from "@/app/(auth)/_lib/recaptcha"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { authClient } from "@/server/better-auth/client"

const getEmailVerificationPendingTarget = (email: string) => {
  const params = new URLSearchParams({
    email,
    status: "pending"
  })

  return `/verify-email?${params.toString()}`
}

const emailVerificationPendingTarget = "/verify-email?status=pending"

export const SignUpForm = () => {
  const router = useRouter()
  const [errors, setErrors] = useState<FieldErrors<keyof SignUpValues & string>>({})
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)

  const form = useForm({
    defaultValues: {
      confirmPassword: "",
      email: "",
      name: "",
      password: ""
    } satisfies SignUpValues,
    onSubmit: async ({ value }) => {
      const parsed = signUpSchema.safeParse(value)

      if (!parsed.success) {
        setErrors(getZodFieldErrors(parsed.error))
        return
      }

      setErrors({})
      setMessage("")
      setPending(true)

      try {
        const fetchOptions = await getRecaptchaFetchOptions("sign_up")
        const { error } = await authClient.signUp.email({
          callbackURL: defaultAuthRedirect,
          email: parsed.data.email,
          name: parsed.data.name,
          password: parsed.data.password,
          fetchOptions
        })

        if (error) {
          setMessage(getAuthErrorMessage(error, "注册请求未完成，请检查填写信息后重试。"))
          return
        }

        router.replace(getEmailVerificationPendingTarget(parsed.data.email))
        router.refresh()
      } catch {
        setMessage("注册服务暂时不可用，请稍后重试。")
      } finally {
        setPending(false)
      }
    }
  })

  return (
    <form
      className="space-y-4 sm:space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      {message ? <AuthMessage message={message} title="注册未完成" tone="error" /> : null}

      <form.Field name="name">
        {(field) => (
          <FormField
            autoComplete="name"
            autoFocus
            disabled={pending}
            error={errors.name}
            id={field.name}
            label="名称"
            onBlur={field.handleBlur}
            onChange={field.handleChange}
            placeholder="你的名称"
            value={field.state.value}
          />
        )}
      </form.Field>

      <form.Field name="email">
        {(field) => (
          <FormField
            autoComplete="email"
            disabled={pending}
            error={errors.email}
            id={field.name}
            inputMode="email"
            label="邮箱"
            onBlur={field.handleBlur}
            onChange={field.handleChange}
            placeholder="name@example.com"
            value={field.state.value}
          />
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <FormField
            autoComplete="new-password"
            disabled={pending}
            error={errors.password}
            id={field.name}
            label="密码"
            onBlur={field.handleBlur}
            onChange={field.handleChange}
            placeholder="至少 8 位"
            type="password"
            value={field.state.value}
          />
        )}
      </form.Field>

      <form.Field name="confirmPassword">
        {(field) => (
          <FormField
            autoComplete="new-password"
            disabled={pending}
            error={errors.confirmPassword}
            id={field.name}
            label="确认密码"
            onBlur={field.handleBlur}
            onChange={field.handleChange}
            placeholder="再次输入密码"
            type="password"
            value={field.state.value}
          />
        )}
      </form.Field>

      <p className="text-muted-foreground text-xs leading-5">创建账号即表示你同意平台的服务条款与安全策略。</p>

      <Button className="h-10 w-full" disabled={pending} type="submit">
        {pending ? "创建中..." : "创建账号"}
      </Button>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">或使用 OAuth</span>
        <Separator className="flex-1" />
      </div>

      <OAuthButtons callbackURL={emailVerificationPendingTarget} onError={setMessage} prefix="使用 " />

      <p className="text-center text-muted-foreground text-sm">
        已有账号？{" "}
        <Link className="font-medium text-primary hover:underline" href="/sign-in">
          返回登录
        </Link>
      </p>
    </form>
  )
}
