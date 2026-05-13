"use client"

import { useForm } from "@tanstack/react-form"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { AuthMessage } from "@/app/(auth)/_components/auth-message"
import { FormField } from "@/app/(auth)/_components/form-field"
import { OAuthButtons } from "@/app/(auth)/_components/oauth-buttons"
import { getAuthErrorMessage } from "@/app/(auth)/_lib/auth-errors"
import { type FieldErrors, getZodFieldErrors, type SignInValues, signInSchema } from "@/app/(auth)/_lib/auth-validation"
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

const getTwoFactorTarget = (redirectTo: string) => {
  const params = new URLSearchParams({
    redirectTo
  })

  return `/sign-in/2fa?${params.toString()}`
}

const hasTwoFactorRedirect = (value: object | null | undefined): value is { twoFactorRedirect: boolean } => {
  return Boolean(value && "twoFactorRedirect" in value && value.twoFactorRedirect)
}

export const SignInForm = ({ redirectTo }: { redirectTo: string }) => {
  const router = useRouter()
  const [errors, setErrors] = useState<FieldErrors<keyof SignInValues & string>>({})
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)

  const form = useForm({
    defaultValues: {
      email: "",
      password: ""
    } satisfies SignInValues,
    onSubmit: async ({ value }) => {
      const parsed = signInSchema.safeParse(value)

      if (!parsed.success) {
        setErrors(getZodFieldErrors(parsed.error))
        return
      }

      setErrors({})
      setMessage("")
      setPending(true)

      try {
        const { data, error } = await authClient.signIn.email({
          callbackURL: redirectTo,
          email: parsed.data.email,
          password: parsed.data.password
        })

        if (error) {
          if (error.code === "EMAIL_NOT_VERIFIED") {
            router.replace(getEmailVerificationPendingTarget(parsed.data.email))
            router.refresh()
            return
          }

          setMessage(getAuthErrorMessage(error, "登录失败，请检查邮箱和密码后重试。"))
          return
        }

        if (hasTwoFactorRedirect(data)) {
          router.replace(getTwoFactorTarget(redirectTo))
          return
        }

        router.replace(redirectTo)
        router.refresh()
      } catch {
        setMessage("登录服务暂时不可用，请稍后重试。")
      } finally {
        setPending(false)
      }
    }
  })

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      {message ? <AuthMessage message={message} title="登录未完成" tone="error" /> : null}

      <form.Field name="email">
        {(field) => (
          <FormField
            autoComplete="email"
            autoFocus
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
            autoComplete="current-password"
            disabled={pending}
            error={errors.password}
            id={field.name}
            label="密码"
            onBlur={field.handleBlur}
            onChange={field.handleChange}
            placeholder="请输入密码"
            type="password"
            value={field.state.value}
          >
            <Link className="font-medium text-primary text-xs hover:underline" href="/forgot-password">
              忘记密码？
            </Link>
          </FormField>
        )}
      </form.Field>

      <Button className="h-10 w-full" disabled={pending} type="submit">
        {pending ? "登录中..." : "登录并进入应用"}
      </Button>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">或使用 OAuth</span>
        <Separator className="flex-1" />
      </div>

      <OAuthButtons callbackURL={redirectTo} onError={setMessage} />

      <p className="text-center text-muted-foreground text-sm">
        还没有账号？{" "}
        <Link className="font-medium text-primary hover:underline" href="/sign-up">
          创建账号
        </Link>
      </p>
    </form>
  )
}
