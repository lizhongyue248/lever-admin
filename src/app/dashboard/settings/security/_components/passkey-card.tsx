"use client"

import { Fingerprint, Loader2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/server/better-auth/client"
import type { RouterOutputs } from "@/trpc/react"

type Passkeys = RouterOutputs["security"]["getOverview"]["passkeys"]
type PasskeyItem = Passkeys[number]

type PasskeyCardProps = {
  passkeys: Passkeys
}

const formatDate = (date: Date | null) => {
  if (!date) {
    return "未知时间"
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date)
}

const deletePasskey = async (id: string) => {
  const response = await fetch("/api/auth/passkey/delete-passkey", {
    body: JSON.stringify({ id }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  })

  return response.ok
}

export const PasskeyCard = ({ passkeys }: PasskeyCardProps) => {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PasskeyItem | null>(null)
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

  const addPasskey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    try {
      const result = await authClient.passkey.addPasskey({
        name: name.trim() || "我的 Passkey"
      })

      if (result.error) {
        toast.error("添加 Passkey 失败，可能是浏览器或设备取消了注册。")
        return
      }

      toast.success("Passkey 已添加。")
      setAddOpen(false)
      setName("")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setLoading(true)

    try {
      const ok = await deletePasskey(deleteTarget.id)

      if (!ok) {
        toast.error("删除 Passkey 失败。")
        return
      }

      toast.success("Passkey 已删除。")
      setDeleteTarget(null)
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
                <Fingerprint className="size-4" />
              </span>
              <div>
                <CardTitle className="text-base">Passkey</CardTitle>
                <p className="mt-1 text-muted-foreground text-xs">使用设备生物识别或安全密钥登录。</p>
              </div>
            </div>
            <Button onClick={() => setAddOpen(true)} type="button">
              添加 Passkey
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-5">
          {passkeys.length === 0 ? (
            <div className="rounded-md border bg-background/60 p-4 text-muted-foreground text-xs dark:bg-muted/20">还没有 Passkey。添加后可使用设备生物识别或安全密钥登录。</div>
          ) : (
            passkeys.map((item) => (
              <div className="flex flex-col gap-3 rounded-md border bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between dark:bg-muted/20" key={item.id}>
                <div>
                  <p className="font-medium text-xs">{item.name}</p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {item.deviceType} · {item.backedUp ? "已备份" : "未备份"} · {formatDate(item.createdAt)}
                  </p>
                </div>
                <Button className="shrink-0" onClick={() => setDeleteTarget(item)} size="sm" type="button" variant="destructive">
                  <Trash2 className="size-3.5" />
                  删除
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog onOpenChange={setAddOpen} open={addOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加 Passkey</DialogTitle>
            <DialogDescription>系统会调用当前浏览器的 WebAuthn 能力完成注册。</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={addPasskey}>
            <div className="space-y-2">
              <Label htmlFor="security-passkey-name">Passkey 名称</Label>
              <Input disabled={loading} id="security-passkey-name" onChange={(event) => setName(event.target.value)} placeholder="例如：MacBook Touch ID" value={name} />
            </div>
            <DialogFooter>
              <Button disabled={loading} type="submit">
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                添加 Passkey
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(open) => !open && setDeleteTarget(null)} open={Boolean(deleteTarget)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除 Passkey</DialogTitle>
            <DialogDescription>删除后，该设备或安全密钥将无法再用于当前账号登录。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button disabled={loading} onClick={confirmDelete} type="button" variant="destructive">
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
