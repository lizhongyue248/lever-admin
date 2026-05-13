"use client"

import { Loader2, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/trpc/react"

export const CreateOrganizationDialog = () => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [logo, setLogo] = useState("")
  const create = api.adminOrg.create.useMutation({
    onError: (error) => toast.error(error.message || "创建组织失败。"),
    onSuccess: (result) => {
      toast.success("组织已创建。")
      setOpen(false)
      router.push(`/dashboard/orgs/${result.slug}`)
      router.refresh()
    }
  })

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button aria-label="创建组织" size="icon" title="创建组织" type="button">
          <Plus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建组织</DialogTitle>
          <DialogDescription>创建顶级组织后可进入组织治理页面继续维护层级结构。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-org-name">组织名称</Label>
            <Input id="admin-org-name" onChange={(event) => setName(event.target.value)} value={name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-org-slug">Slug</Label>
            <Input id="admin-org-slug" onChange={(event) => setSlug(event.target.value)} value={slug} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-org-logo">Logo URL</Label>
            <Input id="admin-org-logo" onChange={(event) => setLogo(event.target.value)} value={logo} />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={create.isPending} onClick={() => setOpen(false)} type="button" variant="outline">
            取消
          </Button>
          <Button disabled={create.isPending || !name || !slug} onClick={() => create.mutate({ logo, name, slug })} type="button">
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
