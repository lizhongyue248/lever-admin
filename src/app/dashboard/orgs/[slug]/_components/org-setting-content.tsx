"use client"

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { RouterOutputs } from "@/trpc/react"
import { api } from "@/trpc/react"
import { formatDate } from "../_lib/org-format"

const orgSettingsSchema = z.object({
  logo: z.string().url("请输入有效的 logo URL。").optional().or(z.literal("")),
  name: z.string().min(1, "请输入组织名称。"),
  slug: z
    .string()
    .min(1, "请输入 slug。")
    .regex(/^[a-z0-9-]+$/, "slug 只能包含小写字母、数字和连字符。")
})

type OrgData = RouterOutputs["org"]["getBySlug"]
type DangerAction = "delete" | "disable"

export const OrgSettingContent = ({ data, slug }: { data: OrgData; slug: string }) => {
  const router = useRouter()
  const [name, setName] = useState(data.organization.name)
  const [targetSlug, setTargetSlug] = useState(data.organization.slug)
  const [logo, setLogo] = useState(data.organization.logo ?? "")
  const [confirmSlug, setConfirmSlug] = useState("")
  const [dangerAction, setDangerAction] = useState<DangerAction | null>(null)
  const update = api.org.update.useMutation({
    onError: (error) => toast.error(error.message || "保存组织信息失败。"),
    onSuccess: (result) => {
      toast.success("组织信息已保存。")
      router.replace(`/dashboard/orgs/${result.organization?.slug ?? targetSlug}/setting`)
      router.refresh()
    }
  })
  const deleteOrg = api.org.delete.useMutation({
    onError: (error) => toast.error(error.message || "删除组织失败。"),
    onSuccess: () => {
      toast.success("组织已删除。")
      router.replace("/dashboard")
      router.refresh()
    }
  })

  const reset = () => {
    setName(data.organization.name)
    setTargetSlug(data.organization.slug)
    setLogo(data.organization.logo ?? "")
  }

  const save = () => {
    const parsed = orgSettingsSchema.safeParse({ logo, name, slug: targetSlug })

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "请检查表单。")
      return
    }

    update.mutate({ logo: parsed.data.logo, name: parsed.data.name, slug, targetSlug: parsed.data.slug })
  }

  const dangerRows = [
    { action: "disable" as const, button: "停用", description: "暂停成员继续进入该组织，保留成员和历史记录。", title: "停用组织" },
    { action: "delete" as const, button: "删除", description: "删除会影响部门、成员、邀请和会话，需要输入 slug 确认。", title: "删除组织" }
  ]

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">组织信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="org-name">组织名称</Label>
              <Input id="org-name" onChange={(event) => setName(event.target.value)} value={name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">Slug</Label>
              <Input id="org-slug" onChange={(event) => setTargetSlug(event.target.value)} value={targetSlug} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-logo">Logo URL</Label>
              <Input id="org-logo" onChange={(event) => setLogo(event.target.value)} placeholder="https://example.com/logo.png" value={logo} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-id">组织 ID</Label>
              <Input id="org-id" readOnly value={data.organization.id} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-created">创建时间</Label>
              <Input id="org-created" readOnly value={formatDate(data.organization.createdAt)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-departments">部门数量</Label>
              <Input id="org-departments" readOnly value={`${data.departmentCount}`} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button disabled={update.isPending} onClick={reset} type="button" variant="outline">
              重置
            </Button>
            <Button disabled={update.isPending} onClick={save} type="button">
              {update.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              保存
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-destructive/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-destructive">危险区域</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {dangerRows.map((row) => (
            <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0" key={row.action}>
              <div className="space-y-1">
                <div className="font-medium">{row.title}</div>
                <p className="text-muted-foreground text-xs">{row.description}</p>
              </div>
              <Button onClick={() => setDangerAction(row.action)} type="button" variant="destructive">
                {row.button}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setDangerAction(null)
            setConfirmSlug("")
          }
        }}
        open={Boolean(dangerAction)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dangerAction === "delete" ? "删除组织" : "停用组织"}</DialogTitle>
            <DialogDescription>
              {dangerAction === "delete" ? "删除会影响部门、成员、邀请和会话。请输入组织 slug 确认。" : "停用会阻止成员继续进入该组织，当前先保留确认入口。"}
            </DialogDescription>
          </DialogHeader>
          {dangerAction === "delete" ? (
            <div className="space-y-2">
              <Label htmlFor="confirm-slug">确认 slug</Label>
              <Input id="confirm-slug" onChange={(event) => setConfirmSlug(event.target.value)} value={confirmSlug} />
            </div>
          ) : null}
          <DialogFooter>
            <Button disabled={deleteOrg.isPending} onClick={() => setDangerAction(null)} type="button" variant="outline">
              取消
            </Button>
            <Button
              disabled={deleteOrg.isPending || (dangerAction === "delete" && confirmSlug !== data.organization.slug)}
              onClick={() => {
                if (dangerAction === "delete") {
                  deleteOrg.mutate({ confirmSlug, slug })
                } else {
                  toast.info("该危险操作将在策略确认后启用。")
                  setDangerAction(null)
                }
              }}
              type="button"
              variant="destructive"
            >
              {deleteOrg.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
