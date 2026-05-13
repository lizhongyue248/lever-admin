"use client"

import { Loader2, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ORGANIZATION_ROLE_ADMIN, ORGANIZATION_ROLE_MEMBER, ORGANIZATION_ROLE_OWNER, type OrganizationRole } from "@/lib/const"
import { api, type RouterOutputs } from "@/trpc/react"
import { formatDate } from "../_lib/org-format"

type InvitationData = RouterOutputs["org"]["invitation"]["list"]
type BadgeVariant = "default" | "destructive" | "ghost" | "link" | "outline" | "secondary"
type InvitationStatus = "accepted" | "canceled" | "expired" | "pending" | "rejected"

const invitationStatusMeta = {
  accepted: { label: "已接受", variant: "secondary" },
  canceled: { label: "已取消", variant: "outline" },
  expired: { label: "已过期", variant: "destructive" },
  pending: { label: "待接受", variant: "default" },
  rejected: { label: "已拒绝", variant: "secondary" }
} satisfies Record<InvitationStatus, { label: string; variant: BadgeVariant }>

const getInvitationStatusMeta = (status: string) => invitationStatusMeta[status as InvitationStatus] ?? { label: status, variant: "outline" as const }

export const OrgInviteContent = ({ initialData, slug }: { initialData: InvitationData; slug: string }) => {
  const router = useRouter()
  const utils = api.useUtils()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [departmentId, setDepartmentId] = useState("none")
  const [role, setRole] = useState<OrganizationRole>(ORGANIZATION_ROLE_MEMBER)
  const invitationListInput = { page: 1, pageSize: 10, search: "", slug, status: "all" as const }
  const invitations = api.org.invitation.list.useQuery(invitationListInput, { initialData })
  const departments = api.org.department.list.useQuery({ slug })
  const invite = api.org.invitation.invite.useMutation({
    onError: (error) => toast.error(error.message || "邀请成员失败。"),
    onSuccess: async () => {
      toast.success("邀请已创建。")
      setEmail("")
      setDepartmentId("none")
      setOpen(false)
      await Promise.all([
        invitations.refetch(),
        departments.refetch(),
        utils.notification.list.invalidate(),
        utils.notification.getUnreadCount.invalidate(),
        utils.dashboard.getShell.invalidate(),
        utils.dashboard.getHome.invalidate()
      ])
      router.refresh()
    }
  })

  return (
    <div className="space-y-5">
      <Card className="rounded-lg shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Input aria-label="搜索邮箱或邀请人" className="min-w-0 flex-1" placeholder="搜索邮箱或邀请人" />
          <Select defaultValue="all">
            <SelectTrigger aria-label="邀请状态" className="w-full sm:w-36">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待接受</SelectItem>
              <SelectItem value="expired">已过期</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger aria-label="目标部门" className="w-full sm:w-40">
              <SelectValue placeholder="全部部门" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部部门</SelectItem>
              <SelectItem value="none">未指定部门</SelectItem>
            </SelectContent>
          </Select>
          <Button aria-label="邀请成员" onClick={() => setOpen(true)} size="icon" title="邀请成员" type="button">
            <UserPlus className="size-4" />
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-lg shadow-sm">
        <CardContent className="p-5">
          <div className="hidden max-h-[560px] overflow-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>邮箱</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>目标部门</TableHead>
                  <TableHead>邀请人</TableHead>
                  <TableHead>过期时间</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.data.items.map((item) => {
                  const statusMeta = getInvitationStatusMeta(item.status)

                  return (
                    <TableRow data-invitation-id={item.id} key={item.id}>
                      <TableCell className="font-medium">{item.email}</TableCell>
                      <TableCell>{item.role}</TableCell>
                      <TableCell>{item.departmentName ?? "未指定"}</TableCell>
                      <TableCell>{item.inviterName || item.inviterEmail}</TableCell>
                      <TableCell>{formatDate(item.expiresAt)}</TableCell>
                      <TableCell>
                        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-3 md:hidden">
            {invitations.data.items.map((item) => {
              const statusMeta = getInvitationStatusMeta(item.status)

              return (
                <div className="rounded-lg border p-4" key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium">{item.email}</div>
                    <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <span>角色：{item.role}</span>
                    <span>部门：{item.departmentName ?? "未指定"}</span>
                    <span>邀请人：{item.inviterName || item.inviterEmail}</span>
                    <span>过期：{formatDate(item.expiresAt)}</span>
                  </div>
                </div>
              )
            })}
          </div>
          {invitations.data.items.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">暂无邀请。</div> : null}
          <div className="mt-4 flex items-center justify-center gap-3 text-muted-foreground">
            <Button disabled size="icon-sm" type="button" variant="outline">
              ‹
            </Button>
            <span>
              {invitations.data.page} / {invitations.data.pageCount}
            </span>
            <Button disabled size="icon-sm" type="button" variant="outline">
              ›
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>邀请成员</DialogTitle>
            <DialogDescription>邀请成员加入当前组织。接受邀请前不会创建成员记录。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">邮箱</Label>
              <Input id="invite-email" onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" value={email} />
            </div>
            <div className="space-y-2">
              <Label>角色</Label>
              <Select onValueChange={(value) => setRole(value as OrganizationRole)} value={role}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ORGANIZATION_ROLE_MEMBER}>Member</SelectItem>
                  <SelectItem value={ORGANIZATION_ROLE_ADMIN}>Admin</SelectItem>
                  <SelectItem value={ORGANIZATION_ROLE_OWNER}>Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>默认部门（可选）</Label>
              <Select onValueChange={setDepartmentId} value={departmentId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="未指定部门" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未指定部门</SelectItem>
                  {(departments.data?.nodes.filter((node) => node.type === "department") ?? []).map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={invite.isPending} onClick={() => setOpen(false)} type="button" variant="outline">
              取消
            </Button>
            <Button
              disabled={invite.isPending || !email}
              onClick={() => invite.mutate({ departmentId: departmentId === "none" ? undefined : departmentId, email, role, slug })}
              type="button"
            >
              {invite.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              发送邀请
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
