"use client"

import { useForm } from "@tanstack/react-form"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { AuthMessage } from "@/app/(auth)/_components/auth-message"
import { FormField } from "@/app/(auth)/_components/form-field"
import { getAuthErrorMessage } from "@/app/(auth)/_lib/auth-errors"
import { defaultAuthRedirect } from "@/app/(auth)/_lib/auth-redirect"
import { type FieldErrors, getZodFieldErrors, type VerifyEmailValues, verifyEmailSchema } from "@/app/(auth)/_lib/auth-validation"
import { Button } from "@/components/ui/button"
import { authClient } from "@/server/better-auth/client"

type VerifyState = "failed" | "pending" | "success" | "verifying"

const cooldownSeconds = 60

const getInitialState = ({ error, status, token }: { error?: string; status?: string; token?: string }): VerifyState => {
  if (token) {
    return "verifying"
  }

  if (error || status === "failed") {
    return "failed"
  }

  if (status === "success") {
    return "success"
  }

  return "pending"
}

const getInitialMessage = ({ error, status }: { error?: string; status?: string }) => {
  if (error) {
    return "验证链接无效或已过期，请重新发送验证邮件。"
  }

  if (status === "success") {
    return "邮箱已经完成验证，你可以继续进入控制台。"
  }

  if (status === "failed") {
    return "验证链接无效或已过期，请重新发送验证邮件。"
  }

  return ""
}

export const VerifyEmailState = ({
  error,
  initialEmail,
  lockEmail,
  status,
  token
}: {
  error?: string
  initialEmail: string
  lockEmail: boolean
  status?: string
  token?: string
}) => {
  const router = useRouter()
  const [state, setState] = useState<VerifyState>(() => getInitialState({ error, status, token }))
  const [errors, setErrors] = useState<FieldErrors<keyof VerifyEmailValues & string>>({})
  const [message, setMessage] = useState(() => getInitialMessage({ error, status }))
  const [pending, setPending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (!token) {
      return
    }

    let canceled = false

    const verifyEmail = async () => {
      setState("verifying")
      setMessage("")

      try {
        const { error } = await authClient.verifyEmail({
          query: {
            token
          }
        })

        if (canceled) {
          return
        }

        if (error) {
          setState("failed")
          setMessage(getAuthErrorMessage(error, "验证链接无效或已过期。"))
          return
        }

        setState("success")
        router.refresh()
      } catch {
        if (!canceled) {
          setState("failed")
          setMessage("邮箱验证服务暂时不可用，请稍后重试。")
        }
      }
    }

    void verifyEmail()

    return () => {
      canceled = true
    }
  }, [router, token])

  useEffect(() => {
    if (cooldown <= 0) {
      return
    }

    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000)

    return () => window.clearTimeout(timer)
  }, [cooldown])

  const form = useForm({
    defaultValues: {
      email: initialEmail
    } satisfies VerifyEmailValues,
    onSubmit: async ({ value }) => {
      const parsed = verifyEmailSchema.safeParse(value)

      if (!parsed.success) {
        setErrors(getZodFieldErrors(parsed.error))
        return
      }

      setErrors({})
      setMessage("")
      setPending(true)

      try {
        const { error } = await authClient.sendVerificationEmail({
          callbackURL: defaultAuthRedirect,
          email: parsed.data.email
        })

        if (error) {
          setMessage(getAuthErrorMessage(error, "验证邮件暂时无法发送，请稍后重试。"))
          setState("failed")
          return
        }

        setMessage("验证邮件已发送，请检查收件箱。")
        setState("pending")
        setCooldown(cooldownSeconds)
      } catch {
        setMessage("验证邮件服务暂时不可用，请稍后重试。")
        setState("failed")
      } finally {
        setPending(false)
      }
    }
  })

  return (
    <div className="space-y-5">
      {state === "verifying" ? <AuthMessage message="正在确认验证链接，请稍候。" title="验证中" tone="info" /> : null}
      {state === "success" ? <AuthMessage message="邮箱已经完成验证，你可以继续进入控制台。" title="验证成功" tone="success" /> : null}
      {state === "pending" ? <AuthMessage message={message || "请打开邮箱中的验证链接完成账号确认。"} title="等待验证" tone="info" /> : null}
      {state === "failed" ? <AuthMessage message={message || "验证链接无效或已过期，请重新发送验证邮件。"} title="验证失败" tone="error" /> : null}

      {state === "success" ? (
        <div className="space-y-3">
          <Button asChild className="h-10 w-full">
            <Link href={defaultAuthRedirect}>进入应用</Link>
          </Button>
          <Button asChild className="h-10 w-full" variant="outline">
            <Link href="/sign-in">返回登录</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void form.handleSubmit()
            }}
          >
            <form.Field name="email">
              {(field) => (
                <FormField
                  autoComplete="email"
                  disabled={lockEmail || pending || cooldown > 0 || state === "verifying"}
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

            <Button className="h-10 w-full" disabled={pending || cooldown > 0 || state === "verifying"} type="submit" variant={state === "failed" ? "default" : "outline"}>
              {pending ? "发送中..." : cooldown > 0 ? `${cooldown} 秒后可重新发送` : "重新发送验证邮件"}
            </Button>
          </form>
          <Button asChild className="h-10 w-full" variant="outline">
            <Link href="/sign-in">返回登录</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
