"use client"

import { Loader2 } from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { api, type RouterOutputs } from "@/trpc/react"

type AdminApiKeyItem = RouterOutputs["adminApiKey"]["list"]["items"][number]
type AdminApiKeyDetail = RouterOutputs["adminApiKey"]["get"]
type AdminApiKeyTarget = Pick<AdminApiKeyItem, "enabled" | "id" | "maskedKey" | "name"> & {
  canMutate?: AdminApiKeyDetail["canMutate"]
}
type DialogControlProps = {
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  open?: boolean
  trigger?: ReactNode | null
}

const invalidateAdminApiKeyQueries = async (utils: ReturnType<typeof api.useUtils>) => {
  await utils.adminApiKey.invalidate()
}

const useDialogOpen = ({ onOpenChange, open }: Pick<DialogControlProps, "onOpenChange" | "open">) => {
  const [internalOpen, setInternalOpen] = useState(false)

  return {
    dialogOpen: open ?? internalOpen,
    setDialogOpen: onOpenChange ?? setInternalOpen
  }
}

export const DisableAdminApiKeyDialog = ({ apiKey, onOpenChange, onSuccess, open, trigger }: { apiKey: AdminApiKeyTarget } & DialogControlProps) => {
  const utils = api.useUtils()
  const { dialogOpen, setDialogOpen } = useDialogOpen({ onOpenChange, open })
  const canMutate = apiKey.canMutate !== false
  const disableApiKey = api.adminApiKey.disable.useMutation({
    onSuccess: async () => {
      await invalidateAdminApiKeyQueries(utils)
      toast.success("平台 API Key 已禁用。")
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
          <DialogTitle>禁用平台 API Key</DialogTitle>
          <DialogDescription>禁用后，使用 {apiKey.name} 的后续接口请求会立即失败。</DialogDescription>
        </DialogHeader>
        {canMutate ? null : <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive text-sm">当前角色不能修改此平台 API Key。</p>}
        <DialogFooter>
          <Button disabled={!canMutate || disableApiKey.isPending} onClick={() => disableApiKey.mutate({ id: apiKey.id })} type="button" variant="destructive">
            {disableApiKey.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            确认禁用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const EnableAdminApiKeyDialog = ({ apiKey, onOpenChange, onSuccess, open, trigger }: { apiKey: AdminApiKeyTarget } & DialogControlProps) => {
  const utils = api.useUtils()
  const { dialogOpen, setDialogOpen } = useDialogOpen({ onOpenChange, open })
  const canMutate = apiKey.canMutate !== false
  const enableApiKey = api.adminApiKey.enable.useMutation({
    onSuccess: async () => {
      await invalidateAdminApiKeyQueries(utils)
      toast.success("平台 API Key 已启用。")
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
          <DialogTitle>启用平台 API Key</DialogTitle>
          <DialogDescription>启用后，未过期的 {apiKey.name} 可以继续用于接口请求。</DialogDescription>
        </DialogHeader>
        {canMutate ? null : <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive text-sm">当前角色不能修改此平台 API Key。</p>}
        <DialogFooter>
          <Button disabled={!canMutate || enableApiKey.isPending} onClick={() => enableApiKey.mutate({ id: apiKey.id })} type="button">
            {enableApiKey.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            确认启用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const DeleteAdminApiKeyDialog = ({ apiKey, onOpenChange, onSuccess, open, trigger }: { apiKey: AdminApiKeyTarget } & DialogControlProps) => {
  const utils = api.useUtils()
  const [confirmValue, setConfirmValue] = useState("")
  const { dialogOpen, setDialogOpen } = useDialogOpen({ onOpenChange, open })
  const canMutate = apiKey.canMutate !== false
  const expectedValue = apiKey.name || apiKey.maskedKey
  const deleteApiKey = api.adminApiKey.delete.useMutation({
    onSuccess: async () => {
      await invalidateAdminApiKeyQueries(utils)
      toast.success("平台 API Key 已删除。")
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
          <DialogTitle>删除平台 API Key</DialogTitle>
          <DialogDescription>这是不可恢复操作。请输入 API Key 名称确认：{expectedValue}</DialogDescription>
        </DialogHeader>
        {canMutate ? null : <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive text-sm">当前角色不能删除此平台 API Key。</p>}
        <Input aria-label="确认删除平台 API Key" disabled={!canMutate} onChange={(event) => setConfirmValue(event.target.value)} value={confirmValue} />
        <DialogFooter>
          <Button
            disabled={!canMutate || confirmValue !== expectedValue || deleteApiKey.isPending}
            onClick={() => deleteApiKey.mutate({ id: apiKey.id })}
            type="button"
            variant="destructive"
          >
            {deleteApiKey.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            永久删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
