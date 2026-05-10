"use client"

import { Link2, Link2Off, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { authClient } from "@/server/better-auth/client"
import type { RouterOutputs } from "@/trpc/react"

type OAuthProviders = RouterOutputs["security"]["getOverview"]["oauthProviders"]
type GitHubProvider = OAuthProviders["github"]
type GoogleProvider = OAuthProviders["google"]

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
  const [unlinkTarget, setUnlinkTarget] = useState<GitHubProvider | null>(null)
  const [loading, setLoading] = useState(false)

  const linkGitHub = async () => {
    setLoading(true)

    try {
      const result = await authClient.linkSocial({
        callbackURL: "/dashboard/settings/security",
        provider: "github"
      })

      if (result.error) {
        toast.error("发起 GitHub 绑定失败。")
      }
    } finally {
      setLoading(false)
    }
  }

  const unlinkGitHub = async () => {
    const target = unlinkTarget

    if (!target?.accountId) {
      toast.error("缺少 GitHub 账号标识，无法解绑。")
      return
    }

    setLoading(true)

    try {
      const result = await authClient.unlinkAccount({
        accountId: target.accountId,
        providerId: "github"
      })

      if (result.error) {
        toast.error("解绑 GitHub 失败。")
        return
      }

      toast.success("GitHub 已解绑。")
      setUnlinkTarget(null)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const githubAction = oauthProviders.github.linked ? (
    <Button className="shrink-0" disabled={!oauthProviders.github.canUnlink} onClick={() => setUnlinkTarget(oauthProviders.github)} size="sm" type="button" variant="destructive">
      <Link2Off className="size-3.5" />
      解绑
    </Button>
  ) : (
    <Button className="shrink-0" disabled={!oauthProviders.github.configured || loading} onClick={linkGitHub} size="sm" type="button" variant="outline">
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
      绑定 GitHub
    </Button>
  )

  const google: GoogleProvider = oauthProviders.google

  return (
    <>
      <Card className="gap-4 rounded-lg py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">第三方账号</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-5">
          <ProviderRow
            action={githubAction}
            configured={oauthProviders.github.configured}
            description={oauthProviders.github.linked ? "GitHub 已作为备用登录方式。" : "绑定 GitHub 后可作为备用登录方式。"}
            icon={<span className="font-semibold text-xs">GH</span>}
            label="GitHub"
            linked={oauthProviders.github.linked}
          />
          <ProviderRow
            action={
              <Button className="shrink-0" disabled size="sm" type="button" variant="outline">
                未配置
              </Button>
            }
            configured={google.configured}
            description="Google provider 暂未在 Better Auth 配置中启用。"
            icon={<span className="font-semibold text-sm">G</span>}
            label="Google"
            linked={google.linked}
          />
          {oauthProviders.github.linked && !oauthProviders.github.canUnlink ? (
            <p className="text-muted-foreground text-xs leading-5">GitHub 是当前账号仅有的可用登录方式之一时不能直接解绑，请先添加密码或 Passkey。</p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog onOpenChange={(open) => !open && setUnlinkTarget(null)} open={Boolean(unlinkTarget)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>解绑 GitHub</DialogTitle>
            <DialogDescription>解绑后将不能继续使用 GitHub 登录当前账号。请确认账号仍保留其他登录方式。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button disabled={loading} onClick={unlinkGitHub} type="button" variant="destructive">
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              确认解绑
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
