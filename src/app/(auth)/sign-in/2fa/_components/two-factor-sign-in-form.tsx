"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, useId, useState } from "react"

import { AuthMessage } from "@/app/(auth)/_components/auth-message"
import { getAuthErrorMessage } from "@/app/(auth)/_lib/auth-errors"
import { twoFactorBackupCodeSchema, twoFactorTotpSchema } from "@/app/(auth)/_lib/auth-validation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ROUTE_SIGN_IN } from "@/lib/const"
import { cn } from "@/lib/utils"
import { authClient } from "@/server/better-auth/client"

type TwoFactorMode = "totp" | "backup"

const normalizeBackupCode = (value: string) => value.trim().replace(/\s+/g, "")

export const TwoFactorSignInForm = ({ redirectTo }: { redirectTo: string }) => {
  const router = useRouter()
  const trustDeviceId = useId()
  const [mode, setMode] = useState<TwoFactorMode>("totp")
  const [code, setCode] = useState("")
  const [trustDevice, setTrustDevice] = useState(false)
  const [message, setMessage] = useState("")
  const [fieldError, setFieldError] = useState("")
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage("")
    setFieldError("")

    const parsed = mode === "totp" ? twoFactorTotpSchema.safeParse({ code, trustDevice }) : twoFactorBackupCodeSchema.safeParse({ code: normalizeBackupCode(code), trustDevice })

    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "请输入验证码。")
      return
    }

    setPending(true)

    try {
      const result =
        mode === "totp"
          ? await authClient.twoFactor.verifyTotp({
              code: parsed.data.code,
              trustDevice: parsed.data.trustDevice
            })
          : await authClient.twoFactor.verifyBackupCode({
              code: parsed.data.code,
              trustDevice: parsed.data.trustDevice
            })

      if (result.error) {
        setMessage(getAuthErrorMessage(result.error, mode === "totp" ? "验证码无效，请重新输入。" : "备用恢复码无效或已被使用。"))
        return
      }

      router.replace(redirectTo)
      router.refresh()
    } catch {
      setMessage("二次验证服务暂时不可用，请稍后重试。")
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      {message ? (
        <AuthMessage message={message} title={message.includes("过期") ? "验证会话已过期" : "验证未完成"} tone="error" />
      ) : (
        <AuthMessage message="账号密码已通过，请继续完成二次验证。" title="需要二次验证" tone="info" />
      )}

      <div className="space-y-3">
        <Label htmlFor="two-factor-code">{mode === "totp" ? "验证码" : "备用恢复码"}</Label>
        {mode === "totp" ? (
          <Input
            autoComplete="one-time-code"
            autoFocus
            className={cn("h-12 text-center font-semibold text-lg tracking-[0.4em]", fieldError && "border-destructive")}
            disabled={pending}
            id="two-factor-code"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            value={code}
          />
        ) : (
          <Input
            autoComplete="one-time-code"
            autoFocus
            className={cn(fieldError && "border-destructive")}
            disabled={pending}
            id="two-factor-code"
            onChange={(event) => setCode(event.target.value)}
            placeholder="输入备用恢复码"
            value={code}
          />
        )}
        {fieldError ? <p className="text-destructive text-xs">{fieldError}</p> : null}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox checked={trustDevice} disabled={pending} id={trustDeviceId} onCheckedChange={(checked) => setTrustDevice(checked === true)} />
        <Label className="font-normal text-muted-foreground text-sm" htmlFor={trustDeviceId}>
          信任此设备 30 天
        </Label>
      </div>

      <Button className="h-10 w-full" disabled={pending} type="submit">
        {pending ? "验证中..." : "验证并进入应用"}
      </Button>

      <div className="space-y-2 text-center text-sm">
        <button
          className="font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"
          disabled={pending}
          onClick={() => {
            setMode(mode === "totp" ? "backup" : "totp")
            setCode("")
            setFieldError("")
            setMessage("")
          }}
          type="button"
        >
          {mode === "totp" ? "无法使用认证器？使用备用恢复码" : "返回认证器验证码"}
        </button>
        <p className="text-muted-foreground">
          需要重新输入账号密码？{" "}
          <Link className="font-medium text-primary hover:underline" href={ROUTE_SIGN_IN}>
            返回登录
          </Link>
        </p>
      </div>
    </form>
  )
}
