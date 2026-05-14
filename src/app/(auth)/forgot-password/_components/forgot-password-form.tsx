"use client"

import { useForm } from "@tanstack/react-form"
import { useEffect, useState } from "react"

import { AuthMessage } from "@/app/(auth)/_components/auth-message"
import { FormField } from "@/app/(auth)/_components/form-field"
import { type FieldErrors, type ForgotPasswordValues, forgotPasswordSchema, getZodFieldErrors } from "@/app/(auth)/_lib/auth-validation"
import { getRecaptchaFetchOptions } from "@/app/(auth)/_lib/recaptcha"
import { Button } from "@/components/ui/button"
import { authClient } from "@/server/better-auth/client"

const cooldownSeconds = 60
const successMessage = "如果该邮箱存在，我们已发送重置链接。请检查收件箱或垃圾邮件。"

export const ForgotPasswordForm = () => {
  const [errors, setErrors] = useState<FieldErrors<keyof ForgotPasswordValues & string>>({})
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) {
      return
    }

    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000)

    return () => window.clearTimeout(timer)
  }, [cooldown])

  const form = useForm({
    defaultValues: {
      email: ""
    } satisfies ForgotPasswordValues,
    onSubmit: async ({ value }) => {
      const parsed = forgotPasswordSchema.safeParse(value)

      if (!parsed.success) {
        setErrors(getZodFieldErrors(parsed.error))
        return
      }

      setErrors({})
      setPending(true)

      try {
        const fetchOptions = await getRecaptchaFetchOptions("forgot_password")
        await authClient.requestPasswordReset({
          email: parsed.data.email,
          fetchOptions,
          redirectTo: "/reset-password"
        })
      } catch {
        // 为避免邮箱枚举，接口异常也给出统一成功文案；服务端日志负责排查真实失败。
      } finally {
        setMessage(successMessage)
        setCooldown(cooldownSeconds)
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
      {message ? <AuthMessage message={message} title="请求已受理" tone="success" /> : null}

      <form.Field name="email">
        {(field) => (
          <FormField
            autoComplete="email"
            autoFocus
            disabled={pending || cooldown > 0}
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

      <Button className="h-10 w-full" disabled={pending || cooldown > 0} type="submit">
        {pending ? "发送中..." : cooldown > 0 ? `${cooldown} 秒后可重新发送` : "发送重置链接"}
      </Button>
    </form>
  )
}
