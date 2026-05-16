"use client"

import { Building2, Loader2, Power, PowerOff, Search, Users } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { DataPagination } from "@/components/data-pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api, type RouterInputs, type RouterOutputs } from "@/trpc/react"
import { CreateOrganizationDialog } from "./create-organization-dialog"

type Overview = RouterOutputs["adminOrg"]["getOverview"]
type Organizations = RouterOutputs["adminOrg"]["list"]
type OrganizationItem = Organizations["items"][number]
type OrganizationStatusFilter = RouterInputs["adminOrg"]["list"]["status"]

const OrganizationStatusDialog = ({ organization }: { organization: OrganizationItem }) => {
  const [open, setOpen] = useState(false)
  const utils = api.useUtils()
  const targetStatus = organization.status === "disabled" ? "active" : "disabled"
  const actionLabel = targetStatus === "disabled" ? "停用" : "启用"
  const Icon = targetStatus === "disabled" ? PowerOff : Power
  const updateStatus = api.adminOrg.updateStatus.useMutation({
    onError: (error) => toast.error(error.message || "组织状态更新失败。"),
    onSuccess: async () => {
      await Promise.all([utils.adminOrg.getOverview.invalidate(), utils.adminOrg.list.invalidate()])
      toast.success(targetStatus === "disabled" ? "组织已停用。" : "组织已启用。")
      setOpen(false)
    }
  })

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button aria-label={`${actionLabel}组织 ${organization.name}`} className="w-full" type="button" variant={targetStatus === "disabled" ? "destructive" : "outline"}>
          <Icon className="size-4" />
          {actionLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{actionLabel}组织</DialogTitle>
          <DialogDescription>
            {targetStatus === "disabled" ? `停用 ${organization.name} 后，普通组织成员将无法继续访问该组织。` : `启用 ${organization.name} 后，组织成员可恢复访问。`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={updateStatus.isPending} onClick={() => setOpen(false)} type="button" variant="outline">
            取消
          </Button>
          <Button
            disabled={updateStatus.isPending}
            onClick={() => updateStatus.mutate({ organizationId: organization.id, status: targetStatus })}
            type="button"
            variant={targetStatus === "disabled" ? "destructive" : "default"}
          >
            {updateStatus.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            确认{actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const AdminOrgsContent = ({ initialOrganizations, overview }: { initialOrganizations: Organizations; overview: Overview }) => {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<OrganizationStatusFilter>("all")
  const [page, setPage] = useState(1)
  const organizations = api.adminOrg.list.useQuery(
    { page, pageSize: 12, search, status },
    {
      initialData: page === 1 && search === "" && status === "all" ? initialOrganizations : undefined,
      placeholderData: (previousData) => previousData
    }
  )
  const data = organizations.data ?? initialOrganizations
  const stats = [
    { icon: Building2, label: "组织总数", value: overview.organizationCount },
    { icon: Building2, label: "部门总数", value: overview.departmentCount },
    { icon: Users, label: "成员总数", value: overview.memberCount },
    { icon: Users, label: "待处理邀请", value: overview.pendingInvitationCount }
  ]

  return (
    <div className="space-y-5 text-[13px]">
      <Card className="rounded-lg shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="搜索组织"
              className="pl-9"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="搜索组织名称或 slug"
              value={search}
            />
          </div>
          <Select
            onValueChange={(value) => {
              setStatus(value as OrganizationStatusFilter)
              setPage(1)
            }}
            value={status}
          >
            <SelectTrigger aria-label="状态" className="w-full sm:w-36">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">正常</SelectItem>
              <SelectItem value="disabled">已停用</SelectItem>
            </SelectContent>
          </Select>
          <CreateOrganizationDialog />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon

          return (
            <Card className="rounded-lg shadow-sm" key={item.label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-muted-foreground text-xs">{item.label}</p>
                  <p className="mt-1 font-semibold text-3xl text-primary">{item.value}</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {data.items.map((item) => (
          <Card className="rounded-lg shadow-sm" data-testid={`admin-org-card-${item.slug}`} key={item.id}>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-base">{item.name}</h2>
                  <p className="text-muted-foreground text-xs">{item.slug}</p>
                </div>
                <Badge variant={item.status === "disabled" ? "destructive" : "secondary"}>{item.status === "disabled" ? "已停用" : "正常"}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted/60 p-3">
                  <div className="font-semibold">{item.memberCount}</div>
                  <div className="text-muted-foreground text-xs">成员</div>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <div className="font-semibold">{item.departmentCount}</div>
                  <div className="text-muted-foreground text-xs">部门</div>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <div className="font-semibold">{item.pendingInvitationCount}</div>
                  <div className="text-muted-foreground text-xs">待邀请</div>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <div className="font-semibold">{item.activeSessionCount}</div>
                  <div className="text-muted-foreground text-xs">活跃会话</div>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <div className="font-semibold" data-testid="admin-org-risk-count">
                    {item.riskCount}
                  </div>
                  <div className="text-muted-foreground text-xs">风险成员</div>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <OrganizationStatusDialog organization={item} />
                <Button asChild className="w-full" type="button" variant="outline">
                  <Link href={`/dashboard/orgs/${item.slug}`}>进入详情</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.items.length === 0 ? <Card className="rounded-lg border-dashed p-8 text-center text-muted-foreground text-sm">暂无组织。</Card> : null}
      <DataPagination
        disabled={organizations.isFetching}
        itemCount={data.items.length}
        onPageChange={setPage}
        page={data.page}
        pageCount={data.pageCount}
        pageSize={12}
        total={data.total}
      />
    </div>
  )
}
