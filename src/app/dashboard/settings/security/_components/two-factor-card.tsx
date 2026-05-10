"use client"

import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import QRCode from "react-qr-code"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/server/better-auth/client"
import type { RouterOutputs } from "@/trpc/react"

type TwoFactorState = RouterOutputs["security"]["getOverview"]["twoFactor"]

type TwoFactorCardProps = {
  twoFactor: TwoFactorState
}

export const TwoFactorCard = ({ twoFactor }: TwoFactorCardProps) => {
  const router = useRouter()
  const [enableOpen, setEnableOpen] = useState(false)
  const [disableOpen, setDisableOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [disablePassword, setDisablePassword] = useState("")
  const [code, setCode] = useState("")
  const [totpUri, setTotpUri] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const resetEnable = () => {
    setPassword("")
    setCode("")
    setTotpUri("")
    setBackupCodes([])
  }

  const onEnableOpenChange = (open: boolean) => {
    setEnableOpen(open)

    if (!open) {
      resetEnable()
    }
  }

  const startEnable = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    try {
      const result = await authClient.twoFactor.enable({
        password
      })

      if (result.error) {
        toast.error("开启双因素认证失败，请检查当前密码。")
        return
      }

      setTotpUri(result.data.totpURI)
      setBackupCodes(result.data.backupCodes)
    } finally {
      setLoading(false)
    }
  }

  const verifyTotp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    try {
      const result = await authClient.twoFactor.verifyTotp({
        code
      })

      if (result.error) {
        toast.error("验证码校验失败。")
        return
      }

      toast.success("双因素认证已开启。")
      setEnableOpen(false)
      resetEnable()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const disableTwoFactor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    try {
      const result = await authClient.twoFactor.disable({
        password: disablePassword
      })

      if (result.error) {
        toast.error("关闭双因素认证失败，请检查当前密码。")
        return
      }

      toast.success("双因素认证已关闭。")
      setDisableOpen(false)
      setDisablePassword("")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="gap-4 rounded-lg py-5">
        <CardHeader className="px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                {twoFactor.enabled ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}
              </span>
              <div>
                <CardTitle className="text-base">双因素认证</CardTitle>
                <p className="mt-1 text-muted-foreground text-xs">{twoFactor.enabled ? "登录时会要求输入第二验证因素。" : "开启后可显著降低账号被盗风险。"}</p>
              </div>
            </div>
            <span className="shrink-0 rounded-md bg-secondary px-2 py-1 font-medium text-xs">{twoFactor.enabled ? "已开启" : "未开启"}</span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs leading-5">建议使用认证器应用保存动态验证码。关闭 2FA 属于高风险操作，需要再次确认当前密码。</p>
          {twoFactor.enabled ? (
            <Button className="shrink-0" onClick={() => setDisableOpen(true)} type="button" variant="destructive">
              关闭 2FA
            </Button>
          ) : (
            <Button className="shrink-0" onClick={() => setEnableOpen(true)} type="button">
              开启 2FA
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog onOpenChange={onEnableOpenChange} open={enableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>开启双因素认证</DialogTitle>
            <DialogDescription>输入当前密码后，用认证器扫描二维码并填写 6 位验证码。</DialogDescription>
          </DialogHeader>
          {totpUri ? (
            <form className="space-y-4" onSubmit={verifyTotp}>
              <div className="mx-auto flex size-48 items-center justify-center rounded-lg border bg-white p-3">
                <QRCode className="size-full" value={totpUri} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="security-2fa-code">验证码</Label>
                <Input autoComplete="one-time-code" disabled={loading} id="security-2fa-code" inputMode="numeric" onChange={(event) => setCode(event.target.value)} value={code} />
              </div>
              {backupCodes.length > 0 ? (
                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="font-medium text-xs">备用恢复码</p>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-muted-foreground text-xs">
                    {backupCodes.map((backupCode) => (
                      <span key={backupCode}>{backupCode}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              <DialogFooter>
                <Button disabled={loading || code.trim().length === 0} type="submit">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                  验证并开启
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={startEnable}>
              <div className="space-y-2">
                <Label htmlFor="security-2fa-password">当前密码</Label>
                <Input
                  autoComplete="current-password"
                  disabled={loading}
                  id="security-2fa-password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </div>
              <DialogFooter>
                <Button disabled={loading || password.trim().length === 0} type="submit">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                  生成二维码
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setDisableOpen} open={disableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>关闭双因素认证</DialogTitle>
            <DialogDescription>关闭后，登录只依赖已有登录方式。请确认这是你本人的操作。</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={disableTwoFactor}>
            <div className="space-y-2">
              <Label htmlFor="security-disable-2fa-password">当前密码</Label>
              <Input
                autoComplete="current-password"
                disabled={loading}
                id="security-disable-2fa-password"
                onChange={(event) => setDisablePassword(event.target.value)}
                type="password"
                value={disablePassword}
              />
            </div>
            <DialogFooter>
              <Button disabled={loading || disablePassword.trim().length === 0} type="submit" variant="destructive">
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                确认关闭
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
