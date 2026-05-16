"use client"

import { Bell, Check, ExternalLink, Loader2, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  FILTER_ALL,
  INVITATION_STATUS_PENDING,
  NOTIFICATION_TYPE_INVITATION,
  NOTIFICATION_TYPE_SECURITY,
  type NotificationTypeFilter
} from "@/lib/const"
import { api, type RouterOutputs } from "@/trpc/react"

type NotificationType = NotificationTypeFilter
type NotificationCounts = RouterOutputs["notification"]["getUnreadCount"]
type NotificationList = RouterOutputs["notification"]["list"]
type NotificationItem = NotificationList["items"][number]

type DashboardNotificationMenuProps = {
  disabled?: boolean
  initialCounts: NotificationCounts
}

const filters: { label: string; value: NotificationType }[] = [
  { label: "全部", value: FILTER_ALL },
  { label: "邀请", value: NOTIFICATION_TYPE_INVITATION },
  { label: "安全", value: NOTIFICATION_TYPE_SECURITY }
]

const formatCount = (count: number) => (count > 99 ? "99+" : count.toString())

export const DashboardNotificationMenu = ({ disabled = false, initialCounts }: DashboardNotificationMenuProps) => {
  const [hydrated, setHydrated] = useState(false)
  const [type, setType] = useState<NotificationType>(FILTER_ALL)
  const [mobileOpen, setMobileOpen] = useState(false)
  const counts = api.notification.getUnreadCount.useQuery(undefined, { initialData: initialCounts })
  const list = api.notification.list.useQuery({ page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE, type })
  const count = counts.data.pendingCount || counts.data.unreadCount

  useEffect(() => {
    setHydrated(true)
  }, [])

  const renderTrigger = () => (
    <Button aria-label={count > 0 ? `通知，${count} 个待处理` : "通知"} className="relative" disabled={disabled || !hydrated} size="icon" type="button" variant="ghost">
      <Bell className="size-5" />
      {count > 0 ? (
        <span className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-medium text-[10px] text-destructive-foreground leading-4">
          {formatCount(count)}
        </span>
      ) : null}
    </Button>
  )

  return (
    <>
      <div className="hidden md:block">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{renderTrigger()}</DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[380px] p-0" sideOffset={10}>
            <NotificationPanel items={list.data?.items ?? []} loading={list.isLoading} onFilterChange={setType} selectedType={type} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="md:hidden">
        <Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
          <SheetTrigger asChild>{renderTrigger()}</SheetTrigger>
          <SheetContent className="max-h-[86dvh] rounded-t-2xl p-0" side="bottom">
            <SheetHeader className="sr-only">
              <SheetTitle>通知</SheetTitle>
              <SheetDescription>查看和处理账号通知</SheetDescription>
            </SheetHeader>
            <NotificationPanel items={list.data?.items ?? []} loading={list.isLoading} onActionComplete={() => setMobileOpen(false)} onFilterChange={setType} selectedType={type} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

const NotificationPanel = ({
  items,
  loading,
  onActionComplete,
  onFilterChange,
  selectedType
}: {
  items: NotificationItem[]
  loading: boolean
  onActionComplete?: () => void
  onFilterChange: (type: NotificationType) => void
  selectedType: NotificationType
}) => {
  return (
    <div className="flex max-h-[520px] flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <div className="font-semibold text-sm">通知</div>
          <div className="text-muted-foreground text-xs">处理邀请、安全和系统提醒</div>
        </div>
      </div>
      <div className="flex gap-2 border-b px-4 py-3">
        {filters.map((filter) => (
          <Button
            className="h-7 rounded-full px-3 text-xs"
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            size="sm"
            type="button"
            variant={selectedType === filter.value ? "default" : "outline"}
          >
            {filter.label}
          </Button>
        ))}
      </div>
      <div className="min-h-48 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
            <Loader2 className="mr-2 size-4 animate-spin" />
            加载通知中
          </div>
        ) : null}
        {!loading && items.length === 0 ? <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground text-sm">暂无通知。</div> : null}
        <div className="space-y-2">
          {items.map((item) => (
            <NotificationListItem item={item} key={item.id} onActionComplete={onActionComplete} />
          ))}
        </div>
      </div>
    </div>
  )
}

const NotificationListItem = ({ item, onActionComplete }: { item: NotificationItem; onActionComplete?: () => void }) => {
  const router = useRouter()
  const utils = api.useUtils()
  const accept = api.notification.invitation.accept.useMutation({
    onSuccess: async (result) => {
      toast.success("已接受组织邀请。")
      await Promise.all([
        utils.notification.list.invalidate(),
        utils.notification.getUnreadCount.invalidate(),
        utils.dashboard.getShell.invalidate(),
        utils.dashboard.getHome.invalidate(),
        utils.org.invitation.list.invalidate()
      ])
      onActionComplete?.()
      router.push(`/dashboard/orgs/${result.organizationSlug}`)
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
        utils.dashboard.getHome.invalidate(),
        utils.org.invitation.list.invalidate()
      ])
      onActionComplete?.()
    }
  })

  const isInvitation = item.source.kind === "organizationInvitation"
  const invitation = isInvitation ? item.invitation : null

  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary text-sm">
          {item.type === NOTIFICATION_TYPE_INVITATION ? "邀" : "通"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate font-medium text-sm">{item.title}</div>
            <Badge variant={item.status === INVITATION_STATUS_PENDING ? "secondary" : "outline"}>{item.status === INVITATION_STATUS_PENDING ? "待处理" : "已读"}</Badge>
          </div>
          <div className="mt-1 text-muted-foreground text-xs">{item.description}</div>
          {invitation?.expiresAt ? <div className="mt-1 text-amber-600 text-xs dark:text-amber-400">{new Date(invitation.expiresAt).toLocaleDateString()} 前处理</div> : null}
        </div>
      </div>
      {invitation ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button disabled={accept.isPending || reject.isPending} onClick={() => accept.mutate({ invitationId: invitation.id })} size="sm" type="button">
            <Check className="size-4" />
            接受
          </Button>
          <Button disabled={accept.isPending || reject.isPending} onClick={() => reject.mutate({ invitationId: invitation.id })} size="sm" type="button" variant="outline">
            <X className="size-4" />
            拒绝
          </Button>
          <Button asChild size="sm" type="button" variant="outline">
            <Link href={item.detailHref}>
              <ExternalLink className="size-4" />
              详情
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
