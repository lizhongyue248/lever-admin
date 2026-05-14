"use client"

import { Copy, KeyRound, Loader2, Plus } from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api, type RouterOutputs } from "@/trpc/react"

type ApiKeyItem = RouterOutputs["apiKey"]["listMine"]["items"][number]
type DialogControlProps = {
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  open?: boolean
  trigger?: ReactNode | null
}

export type CreatedApiKeyResult = {
  key: string
  name: string
}

const expiresInDaysSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined
  }

  return value
}, z.coerce.number().int().min(1).max(365).optional())

const createSchema = z.object({
  expiresInDays: expiresInDaysSchema,
  name: z.string().trim().min(1).max(80),
  note: z.string().trim().max(200).optional()
})

const invalidateApiKeyQueries = async (utils: ReturnType<typeof api.useUtils>) => {
  await utils.apiKey.invalidate()
}

const FormField = ({ children, description, htmlFor, label }: { children: ReactNode; description?: string; htmlFor: string; label: string }) => (
  <div className="space-y-2">
    <Label className="text-[13px] text-foreground" htmlFor={htmlFor}>
      {label}
    </Label>
    {children}
    {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
  </div>
)

const getExpiresPreview = (value: string) => {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return "不填写则永久有效。"
  }

  const days = Number(trimmedValue)

  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return "请输入 1 到 365 之间的整数天数。"
  }

  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const formattedDate = new Intl.DateTimeFormat("zh-CN", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "numeric",
    year: "numeric"
  }).format(expiresAt)

  return `预计过期时间：${formattedDate}`
}

export const CreateApiKeyDialog = ({ onCreated }: { onCreated: (result: CreatedApiKeyResult) => void }) => {
  const utils = api.useUtils()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [expiresInDays, setExpiresInDays] = useState("")
  const [note, setNote] = useState("")
  const expiresPreview = getExpiresPreview(expiresInDays)
  const createApiKey = api.apiKey.createMine.useMutation({
    onSuccess: async (created) => {
      await invalidateApiKeyQueries(utils)
      onCreated({ key: created.key, name: created.item.name })
      toast.success("API Key 已创建。明文只会显示这一次。")
      setOpen(false)
      setName("")
      setExpiresInDays("")
      setNote("")
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })
  const submit = () => {
    const parsed = createSchema.safeParse({
      expiresInDays,
      name,
      note: note.trim() || undefined
    })

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "请检查 API Key 表单。")
      return
    }

    createApiKey.mutate(parsed.data)
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button aria-label="创建 API Key" size="icon" title="创建 API Key" type="button">
          <Plus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-[18px] p-6 sm:max-w-[504px]">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-lg">创建 API Key</DialogTitle>
          <DialogDescription className="text-[13px] leading-[1.45]">创建后请立即复制保存。离开或关闭结果条后，明文无法再次查看。</DialogDescription>
        </DialogHeader>
        <div className="space-y-[18px]">
          <FormField description="用于在列表和日志中识别这把 Key。" htmlFor="api-key-name" label="API Key 名称">
            <Input
              aria-label="API Key 名称"
              className="h-10 rounded-lg text-[13px]"
              id="api-key-name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Production CLI"
              value={name}
            />
          </FormField>
          <FormField description={expiresPreview} htmlFor="api-key-expires-in-days" label="有效天数">
            <Input
              aria-label="有效天数"
              className="h-10 rounded-lg text-[13px]"
              id="api-key-expires-in-days"
              inputMode="numeric"
              onChange={(event) => setExpiresInDays(event.target.value)}
              placeholder="90"
              value={expiresInDays}
            />
          </FormField>
          <FormField htmlFor="api-key-note" label="备注">
            <Textarea
              aria-label="备注"
              className="min-h-[72px] resize-none rounded-lg text-[13px]"
              id="api-key-note"
              onChange={(event) => setNote(event.target.value)}
              placeholder="可选备注，最多 200 字"
              value={note}
            />
          </FormField>
        </div>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button className="h-9 min-w-20 rounded-lg" type="button" variant="outline">
              取消
            </Button>
          </DialogClose>
          <Button className="h-9 min-w-[116px] rounded-lg" disabled={createApiKey.isPending} onClick={submit} type="button">
            {createApiKey.isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const CopyCreatedApiKeyButton = ({ value }: { value: string }) => (
  <Button
    onClick={async () => {
      try {
        await navigator.clipboard.writeText(value)
        toast.success("API Key 明文已复制。")
      } catch {
        toast.error("复制失败，请手动复制 API Key 明文。")
      }
    }}
    size="sm"
    type="button"
    variant="outline"
  >
    <Copy className="size-4" />
    复制
  </Button>
)

export const DisableApiKeyDialog = ({ apiKey, onOpenChange, onSuccess, open, trigger }: { apiKey: ApiKeyItem } & DialogControlProps) => {
  const utils = api.useUtils()
  const [internalOpen, setInternalOpen] = useState(false)
  const dialogOpen = open ?? internalOpen
  const setDialogOpen = onOpenChange ?? setInternalOpen
  const disableApiKey = api.apiKey.disableMine.useMutation({
    onSuccess: async () => {
      await invalidateApiKeyQueries(utils)
      toast.success("API Key 已禁用。")
      setDialogOpen(false)
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  return (
    <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
      {trigger === null ? null : <DialogTrigger asChild>{trigger ?? <Button variant="outline">禁用</Button>}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>禁用 API Key</DialogTitle>
          <DialogDescription>禁用后，使用 {apiKey.name} 的后续接口请求会立即失败。</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={disableApiKey.isPending} onClick={() => disableApiKey.mutate({ id: apiKey.id })} type="button" variant="destructive">
            确认禁用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const EnableApiKeyDialog = ({ apiKey, onOpenChange, onSuccess, open, trigger }: { apiKey: ApiKeyItem } & DialogControlProps) => {
  const utils = api.useUtils()
  const [internalOpen, setInternalOpen] = useState(false)
  const dialogOpen = open ?? internalOpen
  const setDialogOpen = onOpenChange ?? setInternalOpen
  const enableApiKey = api.apiKey.enableMine.useMutation({
    onSuccess: async () => {
      await invalidateApiKeyQueries(utils)
      toast.success("API Key 已启用。")
      setDialogOpen(false)
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  return (
    <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
      {trigger === null ? null : <DialogTrigger asChild>{trigger ?? <Button variant="outline">启用</Button>}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>启用 API Key</DialogTitle>
          <DialogDescription>启用后，未过期的 {apiKey.name} 可以继续用于接口请求。</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={enableApiKey.isPending} onClick={() => enableApiKey.mutate({ id: apiKey.id })} type="button">
            确认启用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const DeleteApiKeyDialog = ({ apiKey, onOpenChange, onSuccess, open, trigger }: { apiKey: ApiKeyItem } & DialogControlProps) => {
  const utils = api.useUtils()
  const [confirmValue, setConfirmValue] = useState("")
  const [internalOpen, setInternalOpen] = useState(false)
  const dialogOpen = open ?? internalOpen
  const setDialogOpen = onOpenChange ?? setInternalOpen
  const expectedValue = apiKey.name || apiKey.maskedKey
  const deleteApiKey = api.apiKey.deleteMine.useMutation({
    onSuccess: async () => {
      await invalidateApiKeyQueries(utils)
      toast.success("API Key 已删除。")
      setDialogOpen(false)
      setConfirmValue("")
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  return (
    <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
      {trigger === null ? null : <DialogTrigger asChild>{trigger ?? <Button variant="destructive">删除</Button>}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>删除 API Key</DialogTitle>
          <DialogDescription>这是不可恢复操作。请输入 API Key 名称确认：{expectedValue}</DialogDescription>
        </DialogHeader>
        <Input aria-label="确认删除 API Key" onChange={(event) => setConfirmValue(event.target.value)} value={confirmValue} />
        <DialogFooter>
          <Button disabled={confirmValue !== expectedValue || deleteApiKey.isPending} onClick={() => deleteApiKey.mutate({ id: apiKey.id })} type="button" variant="destructive">
            永久删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
