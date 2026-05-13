"use client"

import { ChevronLeft, ChevronRight, ExternalLink, MoreHorizontal, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { api, type RouterInputs, type RouterOutputs } from "@/trpc/react"
import { AdminUserDetailContent } from "./admin-user-detail-content"
import { BanUserDialog, CreateUserDialog, RemoveUserDialog, SetPasswordDialog, SetRoleDialog, UnbanUserDialog } from "./admin-user-dialogs"
import { AdminUserEmptyState, AdminUserErrorState } from "./admin-user-status"

type Users = RouterOutputs["adminUser"]["list"]
type UserRow = Users["items"][number]
type UserDetail = RouterOutputs["adminUser"]["get"]
type RoleFilter = RouterInputs["adminUser"]["list"]["role"]
type StatusFilter = RouterInputs["adminUser"]["list"]["status"]
type RowAction = "ban" | "delete" | "password" | "role" | null

const roleLabel = (role: string) => {
  const labels: Record<string, string> = { admin: "admin", support: "support", super_admin: "super_admin", user: "user" }

  return labels[role] ?? role
}

const formatDate = (date: Date) => new Intl.DateTimeFormat("zh-CN").format(date)

export const AdminUsersContent = ({
  initialSelectedUser,
  initialUsers,
  selectedUserId
}: {
  initialSelectedUser: UserDetail | null
  initialUsers: Users
  selectedUserId: string | null
}) => {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [role, setRole] = useState<RoleFilter>("all")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [drawerUserId, setDrawerUserId] = useState<string | null>(selectedUserId)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)")
    const updateDesktopState = () => setIsDesktop(mediaQuery.matches)

    updateDesktopState()
    mediaQuery.addEventListener("change", updateDesktopState)

    return () => mediaQuery.removeEventListener("change", updateDesktopState)
  }, [])

  const users = api.adminUser.list.useQuery(
    { page, pageSize: 20, role, search, status },
    {
      initialData: page === 1 && role === "all" && search === "" && status === "all" ? initialUsers : undefined,
      placeholderData: (previousData) => previousData
    }
  )
  const drawerUser = api.adminUser.get.useQuery(
    { userId: drawerUserId ?? "" },
    {
      enabled: Boolean(drawerUserId),
      initialData: drawerUserId && initialSelectedUser?.id === drawerUserId ? initialSelectedUser : undefined
    }
  )
  const data = users.data ?? initialUsers

  const openDrawer = (userId: string) => {
    setDrawerUserId(userId)
    router.replace(`/dashboard/admin/users?userId=${encodeURIComponent(userId)}`, { scroll: false })
  }

  const closeDrawer = () => {
    setDrawerUserId(null)
    router.replace("/dashboard/admin/users", { scroll: false })
  }

  return (
    <div className="space-y-5 text-[13px]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl tracking-normal">平台用户</h1>
          <p className="mt-2 text-muted-foreground text-xs">查询、筛选并治理平台用户。点击用户行可在右侧查看完整身份与安全详情。</p>
        </div>
      </div>

      <Card className="rounded-lg shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="搜索用户"
                className="pl-9"
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="搜索用户名称或邮箱"
                value={search}
              />
            </div>
            <Select
              onValueChange={(value) => {
                setRole(value as RoleFilter)
                setPage(1)
              }}
              value={role}
            >
              <SelectTrigger className="w-full lg:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部角色</SelectItem>
                <SelectItem value="user">user</SelectItem>
                <SelectItem value="support">support</SelectItem>
                <SelectItem value="admin">admin</SelectItem>
                <SelectItem value="super_admin">super_admin</SelectItem>
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) => {
                setStatus(value as StatusFilter)
                setPage(1)
              }}
              value={status}
            >
              <SelectTrigger className="w-full lg:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">正常</SelectItem>
                <SelectItem value="banned">已封禁</SelectItem>
              </SelectContent>
            </Select>
            <CreateUserDialog />
          </div>

          {users.error ? (
            <AdminUserErrorState message="用户列表加载失败。" />
          ) : data.items.length === 0 ? (
            <AdminUserEmptyState />
          ) : (
            <AdminUsersTable items={data.items} onOpen={openDrawer} />
          )}

          <div className="flex items-center justify-between text-muted-foreground">
            <span>
              显示 {data.items.length} / {data.total}
            </span>
            <div className="flex items-center gap-2">
              <Button disabled={users.isFetching || data.page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} size="icon-sm" type="button" variant="outline">
                <ChevronLeft className="size-4" />
              </Button>
              <span>
                {data.page} / {data.pageCount}
              </span>
              <Button
                disabled={users.isFetching || data.page >= data.pageCount}
                onClick={() => setPage((current) => Math.min(data.pageCount, current + 1))}
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet
        onOpenChange={(open) => {
          if (!open) {
            closeDrawer()
          }
        }}
        open={Boolean(drawerUserId) && isDesktop}
      >
        <SheetContent className="w-[680px] max-w-[calc(100vw-18rem)] gap-0 overflow-hidden p-0 sm:max-w-none" data-testid="admin-user-detail-drawer" showCloseButton={false}>
          <SheetHeader className="flex-row items-center justify-between gap-3 border-b p-4 text-left">
            <div className="min-w-0">
              <SheetTitle>用户详情</SheetTitle>
              <SheetDescription className="sr-only">平台用户身份、安全、组织、会话和 API Key 详情。</SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              {drawerUserId ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/admin/users/${drawerUserId}`}>
                    <ExternalLink className="size-4" />
                    完整页
                  </Link>
                </Button>
              ) : null}
              <Button aria-label="关闭用户详情" onClick={closeDrawer} size="sm" type="button" variant="ghost">
                关闭
              </Button>
            </div>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {drawerUser.data ? <AdminUserDetailContent mode="drawer" user={drawerUser.data} /> : <AdminUserDetailSheetSkeleton />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

const AdminUserDetailSheetSkeleton = () => (
  <div className="space-y-4" data-testid="admin-user-detail-skeleton">
    <Card className="rounded-lg shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-6 w-40 max-w-full" />
            <Skeleton className="h-3 w-56 max-w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-5 w-14" />
            </div>
          </div>
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </CardContent>
    </Card>
    <Card className="rounded-lg shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="grid grid-cols-4 gap-2">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </CardContent>
    </Card>
  </div>
)

const AdminUsersTable = ({ items, onOpen }: { items: UserRow[]; onOpen: (userId: string) => void }) => (
  <>
    <div className="hidden overflow-hidden rounded-lg border lg:block">
      <table className="w-full text-left">
        <thead className="bg-muted/50 text-muted-foreground text-xs">
          <tr>
            <th className="px-4 py-3">用户</th>
            <th className="px-4 py-3">角色</th>
            <th className="px-4 py-3">状态</th>
            <th className="px-4 py-3">邮箱验证</th>
            <th className="px-4 py-3">创建时间</th>
            <th className="px-4 py-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr className="cursor-pointer border-t hover:bg-muted/40" data-testid={`admin-user-row-${item.id}`} key={item.id} onClick={() => onOpen(item.id)}>
              <td className="px-4 py-3">
                <div className="font-medium">{item.name}</div>
                <div className="text-muted-foreground text-xs">{item.email}</div>
              </td>
              <td className="px-4 py-3">{roleLabel(item.role)}</td>
              <td className="px-4 py-3">
                <Badge variant={item.status === "banned" ? "destructive" : "secondary"}>{item.status === "banned" ? "已封禁" : "正常"}</Badge>
              </td>
              <td className="px-4 py-3">{item.emailVerified ? "已验证" : "未验证"}</td>
              <td className="px-4 py-3">{formatDate(item.createdAt)}</td>
              <td className="px-4 py-3 text-right">
                <AdminUserRowActions user={item} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="grid gap-3 lg:hidden">
      {items.map((item) => (
        <Link className="rounded-lg border bg-card p-4 shadow-sm" data-testid={`admin-user-card-${item.id}`} href={`/dashboard/admin/users/${item.id}`} key={item.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">{item.name}</div>
              <div className="text-muted-foreground text-xs">{item.email}</div>
            </div>
            <Badge variant={item.status === "banned" ? "destructive" : "secondary"}>{item.status === "banned" ? "已封禁" : "正常"}</Badge>
          </div>
          <div className="mt-3 text-muted-foreground text-xs">
            {roleLabel(item.role)} · {item.emailVerified ? "已验证" : "未验证"}
          </div>
        </Link>
      ))}
    </div>
  </>
)

const AdminUserRowActions = ({ user }: { user: UserRow }) => {
  const [activeAction, setActiveAction] = useState<RowAction>(null)

  return (
    <div
      className="flex justify-end"
      onClick={(event) => {
        event.stopPropagation()
      }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label="更多用户操作" size="icon-sm" type="button" variant="ghost">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onSelect={() => setActiveAction("role")}>设置角色</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setActiveAction("password")}>重置密码</DropdownMenuItem>
          <DropdownMenuSeparator />
          {user.status === "banned" ? (
            <DropdownMenuItem asChild>
              <UnbanUserDialog userId={user.id} />
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setActiveAction("ban")} variant="destructive">
              封禁用户
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setActiveAction("delete")} variant="destructive">
            删除用户
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SetRoleDialog currentRole={user.role} onOpenChange={(open) => setActiveAction(open ? "role" : null)} open={activeAction === "role"} trigger={null} userId={user.id} />
      <SetPasswordDialog onOpenChange={(open) => setActiveAction(open ? "password" : null)} open={activeAction === "password"} trigger={null} userId={user.id} />
      <BanUserDialog onOpenChange={(open) => setActiveAction(open ? "ban" : null)} open={activeAction === "ban"} trigger={null} userId={user.id} userName={user.name} />
      <RemoveUserDialog email={user.email} onOpenChange={(open) => setActiveAction(open ? "delete" : null)} open={activeAction === "delete"} trigger={null} userId={user.id} />
    </div>
  )
}
