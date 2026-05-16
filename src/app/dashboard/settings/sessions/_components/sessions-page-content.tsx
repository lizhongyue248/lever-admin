"use client"

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ROUTE_SIGN_IN } from "@/lib/const"
import { authClient } from "@/server/better-auth/client"
import { api, type RouterOutputs } from "@/trpc/react"
import { SessionHealthCard } from "./session-health-card"
import { SessionList } from "./session-list"

type SessionsData = RouterOutputs["session"]["listMine"]
type SessionItem = SessionsData["sessions"][number]

type SessionsPageContentProps = {
  data: SessionsData
}

export const SessionsPageContent = ({ data }: SessionsPageContentProps) => {
  const router = useRouter()
  const [revokeTarget, setRevokeTarget] = useState<SessionItem | null>(null)
  const [revokeOthersOpen, setRevokeOthersOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const revokeSession = api.session.revoke.useMutation({
    onError: () => {
      toast.error("会话撤销失败，请稍后重试。")
    },
    onSuccess: () => {
      toast.success("会话已撤销。")
      setRevokeTarget(null)
      router.refresh()
    }
  })

  const revokeOthers = api.session.revokeOthers.useMutation({
    onError: () => {
      toast.error("其他设备退出失败，请稍后重试。")
    },
    onSuccess: ({ revokedCount }) => {
      toast.success(revokedCount > 0 ? "其他设备已退出。" : "没有其他设备需要退出。")
      setRevokeOthersOpen(false)
      router.refresh()
    }
  })

  const handleSignOut = async () => {
    if (isSigningOut) {
      return
    }

    setIsSigningOut(true)
    try {
      const result = await authClient.signOut()

      if (result.error) {
        toast.error("退出登录失败，请稍后重试。")
        setIsSigningOut(false)
        return
      }

      router.replace(ROUTE_SIGN_IN)
      router.refresh()
    } catch {
      toast.error("退出登录失败，请稍后重试。")
      setIsSigningOut(false)
    }
  }

  return (
    <div className="space-y-5 text-[13px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-normal">我的会话</h1>
          <p className="max-w-2xl text-muted-foreground text-sm">查看当前登录设备，撤销不再使用或可疑的会话。</p>
        </div>
        <Button disabled={data.health.revocableCount === 0} onClick={() => setRevokeOthersOpen(true)} type="button" variant="destructive">
          退出全部其他设备
        </Button>
      </div>

      <Card className="gap-4 rounded-lg py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">会话概览</CardTitle>
          <p className="text-muted-foreground text-xs">当前会话会保留；撤销其他会话后，对应设备需要重新登录。</p>
        </CardHeader>
        <CardContent className="grid gap-3 px-5 sm:grid-cols-3">
          <div>
            <p className="font-semibold text-3xl text-primary">{data.health.activeCount}</p>
            <p className="mt-1 text-muted-foreground text-xs">活跃会话</p>
          </div>
          <div>
            <p className="font-semibold text-3xl text-primary">{data.health.currentCount}</p>
            <p className="mt-1 text-muted-foreground text-xs">当前设备</p>
          </div>
          <div>
            <p className="font-semibold text-3xl text-primary">{data.health.revocableCount}</p>
            <p className="mt-1 text-muted-foreground text-xs">可撤销</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="order-2 xl:order-1">
          <SessionList isSigningOut={isSigningOut} onOpenRevoke={setRevokeTarget} onSignOut={handleSignOut} sessions={data.sessions} />
        </div>
        <div className="order-1 xl:order-2">
          <SessionHealthCard health={data.health} />
        </div>
      </div>

      <Dialog onOpenChange={(open) => !open && setRevokeTarget(null)} open={Boolean(revokeTarget)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>撤销会话</DialogTitle>
            <DialogDescription>该设备会立即退出登录，并需要重新完成身份验证。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button disabled={revokeSession.isPending} onClick={() => setRevokeTarget(null)} type="button" variant="outline">
              取消
            </Button>
            <Button
              disabled={revokeSession.isPending || !revokeTarget}
              onClick={() => revokeTarget && revokeSession.mutate({ sessionId: revokeTarget.id })}
              type="button"
              variant="destructive"
            >
              {revokeSession.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              确认撤销
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setRevokeOthersOpen} open={revokeOthersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>退出全部其他设备</DialogTitle>
            <DialogDescription>当前设备会保留登录状态。其他设备会立即退出，并需要重新登录。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button disabled={revokeOthers.isPending} onClick={() => setRevokeOthersOpen(false)} type="button" variant="outline">
              取消
            </Button>
            <Button disabled={revokeOthers.isPending} onClick={() => revokeOthers.mutate()} type="button" variant="destructive">
              {revokeOthers.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              确认退出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
