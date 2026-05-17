"use client"

import { Link2, Link2Off, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { type ReactNode, useState } from "react"
import { type SimpleIcon, siGithub, siGoogle, siWechat } from "simple-icons"
import { toast } from "sonner"

import { SimpleIconMark } from "@/components/simple-icon-mark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { type AuthOAuthProviderId, OAUTH_PROVIDER_GITHUB, OAUTH_PROVIDER_GOOGLE, OAUTH_PROVIDER_WECHAT, ROUTE_DASHBOARD_SETTINGS_SECURITY } from "@/lib/const"
import { authClient } from "@/server/better-auth/client"
import type { RouterOutputs } from "@/trpc/react"

type OAuthProviders = RouterOutputs["security"]["getOverview"]["oauthProviders"]
type OAuthProviderState = OAuthProviders[AuthOAuthProviderId]

type OAuthAccountsCardProps = {
  oauthProviders: OAuthProviders
}

type ProviderRowProps = {
  action: ReactNode
  description: string
  icon: ReactNode
  label: string
  linked: boolean
  configured: boolean
}

type ProviderView = {
  description: string
  icon: SimpleIcon
  id: AuthOAuthProviderId
  label: string
  provider: OAuthProviderState
}

type UnlinkTarget = {
  accountId: string | null
  id: AuthOAuthProviderId
  label: string
}

const ProviderRow = ({ action, configured, description, icon, label, linked }: ProviderRowProps) => (
  <div className="flex flex-col gap-3 rounded-md border bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between dark:bg-muted/20">
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-xs">{label}</p>
          <Badge className="rounded-md" variant={linked ? "default" : "secondary"}>
            {linked ? "已绑定" : configured ? "可绑定" : "未配置"}
          </Badge>
        </div>
        <p className="mt-1 text-muted-foreground text-xs leading-5">{description}</p>
      </div>
    </div>
    {action}
  </div>
)

export const OAuthAccountsCard = ({ oauthProviders }: OAuthAccountsCardProps) => {
  const router = useRouter()
  const [unlinkTarget, setUnlinkTarget] = useState<UnlinkTarget | null>(null)
  const [loading, setLoading] = useState(false)

  const linkProvider = async (providerId: AuthOAuthProviderId, label: string) => {
    setLoading(true)

    try {
      const result = await authClient.linkSocial({
        callbackURL: ROUTE_DASHBOARD_SETTINGS_SECURITY,
        provider: providerId
      })

      if (result.error) {
        toast.error(`发起 ${label} 绑定失败。`)
      }
    } finally {
      setLoading(false)
    }
  }

  const unlinkProvider = async () => {
    const target = unlinkTarget

    if (!target?.accountId) {
      toast.error(`缺少 ${target?.label ?? "第三方"} 账号标识，无法解绑。`)
      return
    }

    setLoading(true)

    try {
      const result = await authClient.unlinkAccount({
        accountId: target.accountId,
        providerId: target.id
      })

      if (result.error) {
        toast.error(`解绑 ${target.label} 失败。`)
        return
      }

      toast.success(`${target.label} 已解绑。`)
      setUnlinkTarget(null)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const providerViews: ProviderView[] = [
    {
      description: oauthProviders[OAUTH_PROVIDER_GITHUB].linked
        ? "GitHub 已作为备用登录方式。"
        : oauthProviders[OAUTH_PROVIDER_GITHUB].configured
          ? "绑定 GitHub 后可作为备用登录方式。"
          : "GitHub provider 暂未在 Better Auth 配置中启用。",
      icon: siGithub,
      id: OAUTH_PROVIDER_GITHUB,
      label: "GitHub",
      provider: oauthProviders[OAUTH_PROVIDER_GITHUB]
    },
    {
      description: oauthProviders[OAUTH_PROVIDER_WECHAT].linked
        ? "WeChat 已作为备用登录方式。"
        : oauthProviders[OAUTH_PROVIDER_WECHAT].configured
          ? "绑定 WeChat 后可使用微信扫码登录。"
          : "WeChat provider 暂未在 Better Auth 配置中启用。",
      icon: siWechat,
      id: OAUTH_PROVIDER_WECHAT,
      label: "WeChat",
      provider: oauthProviders[OAUTH_PROVIDER_WECHAT]
    },
    {
      description: oauthProviders[OAUTH_PROVIDER_GOOGLE].linked
        ? "Google 已作为备用登录方式。"
        : oauthProviders[OAUTH_PROVIDER_GOOGLE].configured
          ? "绑定 Google 后可作为备用登录方式。"
          : "Google provider 暂未在 Better Auth 配置中启用。",
      icon: siGoogle,
      id: OAUTH_PROVIDER_GOOGLE,
      label: "Google",
      provider: oauthProviders[OAUTH_PROVIDER_GOOGLE]
    }
  ]

  const renderAction = (view: ProviderView) => {
    if (view.provider.linked) {
      return (
        <Button
          className="shrink-0"
          disabled={!view.provider.canUnlink || loading}
          onClick={() => setUnlinkTarget({ accountId: view.provider.accountId, id: view.id, label: view.label })}
          size="sm"
          type="button"
          variant="destructive"
        >
          <Link2Off className="size-3.5" />
          解绑
        </Button>
      )
    }

    return (
      <Button className="shrink-0" disabled={!view.provider.configured || loading} onClick={() => linkProvider(view.id, view.label)} size="sm" type="button" variant="outline">
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
        {view.provider.configured ? `绑定 ${view.label}` : "未配置"}
      </Button>
    )
  }

  return (
    <>
      <Card className="gap-4 rounded-lg py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">第三方账号</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-5">
          {providerViews.map((view) => (
            <ProviderRow
              action={renderAction(view)}
              configured={view.provider.configured}
              description={view.description}
              icon={<SimpleIconMark icon={view.icon} />}
              key={view.id}
              label={view.label}
              linked={view.provider.linked}
            />
          ))}
          {providerViews.some((view) => view.provider.linked && !view.provider.canUnlink) ? (
            <p className="text-muted-foreground text-xs leading-5">当前第三方账号是仅有的可用登录方式之一时不能直接解绑，请先添加密码或 Passkey。</p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog onOpenChange={(open) => !open && setUnlinkTarget(null)} open={Boolean(unlinkTarget)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>解绑 {unlinkTarget?.label}</DialogTitle>
            <DialogDescription>解绑后将不能继续使用 {unlinkTarget?.label} 登录当前账号。请确认账号仍保留其他登录方式。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button disabled={loading} onClick={unlinkProvider} type="button" variant="destructive">
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              确认解绑
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
