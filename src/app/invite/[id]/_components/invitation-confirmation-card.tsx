"use client"

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { api, type RouterOutputs } from "@/trpc/react"

type InvitationDetail = RouterOutputs["notification"]["invitation"]["getMine"]

const formatInvitationDateTime = (date: Date | null) => {
  if (!date) {
    return "未设置"
  }

  return date.toISOString().replace("T", " ").slice(0, 16)
}

export const InvitationConfirmationCard = ({ invitation }: { invitation: InvitationDetail }) => {
  const router = useRouter()
  const utils = api.useUtils()
  const disabled = invitation.effectiveStatus !== "pending"
  const accept = api.notification.invitation.accept.useMutation({
    onSuccess: async (result) => {
      toast.success("已接受组织邀请。")
      await Promise.all([
        utils.notification.list.invalidate(),
        utils.notification.getUnreadCount.invalidate(),
        utils.dashboard.getShell.invalidate(),
        utils.dashboard.getHome.invalidate()
      ])
      router.replace(`/dashboard/orgs/${result.organizationSlug}`)
      router.refresh()
    }
  })
  const reject = api.notification.invitation.reject.useMutation({
    onSuccess: async () => {
      toast.success("已拒绝组织邀请。")
      await Promise.all([
        utils.notification.list.invalidate(),
        utils.notification.getUnreadCount.invalidate(),
        utils.dashboard.getShell.invalidate(),
        utils.dashboard.getHome.invalidate()
      ])
      router.replace("/dashboard")
      router.refresh()
    }
  })

  return (
    <Card className="w-full max-w-lg shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>组织邀请</CardTitle>
          <Badge variant={disabled ? "secondary" : "default"}>{disabled ? "不可处理" : "待处理"}</Badge>
        </div>
        <CardDescription>{invitation.organizationName} 邀请你加入公司。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <InfoRow label="组织" value={invitation.organizationName} />
        <InfoRow label="默认部门" value={invitation.departmentName ?? "未指定"} />
        <InfoRow label="角色" value={invitation.role} />
        <InfoRow label="邀请人" value={invitation.inviterName || invitation.inviterEmail} />
        <InfoRow label="接收邮箱" value={invitation.email} />
        <InfoRow label="过期时间" value={formatInvitationDateTime(invitation.expiresAt)} />
      </CardContent>
      <CardFooter className="flex flex-col gap-2 sm:flex-row">
        <Button className="w-full" disabled={disabled || accept.isPending || reject.isPending} onClick={() => accept.mutate({ invitationId: invitation.id })} type="button">
          {accept.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          接受邀请
        </Button>
        <Button
          className="w-full"
          disabled={disabled || accept.isPending || reject.isPending}
          onClick={() => reject.mutate({ invitationId: invitation.id })}
          type="button"
          variant="outline"
        >
          拒绝邀请
        </Button>
      </CardFooter>
    </Card>
  )
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/60 px-3 py-2">
    <span className="text-muted-foreground">{label}</span>
    <span className="min-w-0 truncate font-medium">{value}</span>
  </div>
)
