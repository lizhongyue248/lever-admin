"use client"

import { useForm } from "@tanstack/react-form"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { AuthMessage } from "@/app/(auth)/_components/auth-message"
import { FormField } from "@/app/(auth)/_components/form-field"
import { getAuthErrorMessage } from "@/app/(auth)/_lib/auth-errors"
import { type FieldErrors, getZodFieldErrors, type ResetPasswordValues, resetPasswordSchema } from "@/app/(auth)/_lib/auth-validation"
import { Button } from "@/components/ui/button"
import { ROUTE_SIGN_IN } from "@/lib/const"
import { authClient } from "@/server/better-auth/client"

export const ResetPasswordForm = ({ token }: { token: string }) => {
  const router = useRouter()
  const [errors, setErrors] = useState<FieldErrors<keyof ResetPasswordValues & string>>({})
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)

  const form = useForm({
    defaultValues: {
      confirmPassword: "",
      password: ""
    } satisfies ResetPasswordValues,
    onSubmit: async ({ value }) => {
      const parsed = resetPasswordSchema.safeParse(value)

      if (!parsed.success) {
        setErrors(getZodFieldErrors(parsed.error))
        return
      }

      setErrors({})
      setMessage("")
      setPending(true)

      try {
        const { error } = await authClient.resetPassword({
          newPassword: parsed.data.password,
          token
        })

        if (error) {
          setMessage(getAuthErrorMessage(error, "重置链接无效或已过期，请重新发送邮件。"))
          return
        }

        router.replace(ROUTE_SIGN_IN)
        router.refresh()
      } catch {
        setMessage("密码重置服务暂时不可用，请稍后重试。")
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
      {message ? <AuthMessage message={message} title="重置未完成" tone="error" /> : null}

      <form.Field name="password">
        {(field) => (
          <FormField
            autoComplete="new-password"
            autoFocus
            disabled={pending}
            error={errors.password}
            id={field.name}
            label="新密码"
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
            label="确认新密码"
            onBlur={field.handleBlur}
            onChange={field.handleChange}
            placeholder="再次输入新密码"
            type="password"
            value={field.state.value}
          />
        )}
      </form.Field>

      <Button className="h-10 w-full" disabled={pending} type="submit">
        {pending ? "更新中..." : "更新密码"}
      </Button>

      <p className="text-center text-muted-foreground text-sm">
        链接无效？{" "}
        <Link className="font-medium text-primary hover:underline" href="/forgot-password">
          重新发送重置邮件
        </Link>
      </p>
    </form>
  )
}
