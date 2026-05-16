"use client"

import { KeyRound, Monitor, Shield, Smartphone } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { USER_STATUS_BANNED } from "@/lib/const"
import { api, type RouterOutputs } from "@/trpc/react"
import { BanUserDialog, RemoveUserDialog, RevokeAllSessionsDialog, RevokeSessionDialog, SetPasswordDialog, SetRoleDialog, UnbanUserDialog } from "./admin-user-dialogs"

type UserDetail = RouterOutputs["adminUser"]["get"]

const formatDate = (date: Date | null | undefined) => (date ? new Intl.DateTimeFormat("zh-CN").format(date) : "未知")

export const AdminUserDetailContent = ({ mode, user }: { mode: "drawer" | "page"; user: UserDetail }) => (
  <div className={mode === "page" ? "grid gap-5 lg:grid-cols-[350px_1fr]" : "space-y-4"}>
    <Card className="rounded-lg shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">{user.name.slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0">
            <h2 className="truncate font-bold text-xl">{user.name}</h2>
            <p className="text-muted-foreground text-xs">{user.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">{user.role}</Badge>
              <Badge variant={user.status === USER_STATUS_BANNED ? "destructive" : "secondary"}>{user.status === USER_STATUS_BANNED ? "已封禁" : "正常"}</Badge>
              <Badge variant="outline">{user.emailVerified ? "已验证" : "未验证"}</Badge>
            </div>
          </div>
        </div>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">创建时间</dt>
            <dd>{formatDate(user.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">双因素</dt>
            <dd>{user.twoFactorEnabled ? "已启用" : "未启用"}</dd>
          </div>
          {user.banReason ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">封禁原因</dt>
              <dd className="text-right">{user.banReason}</dd>
            </div>
          ) : null}
        </dl>
        <div className="grid gap-2">
          <SetRoleDialog currentRole={user.role} userId={user.id} />
          <SetPasswordDialog userId={user.id} />
          {user.status === USER_STATUS_BANNED ? <UnbanUserDialog userId={user.id} /> : <BanUserDialog userId={user.id} userName={user.name} />}
          <RemoveUserDialog email={user.email} userId={user.id} />
        </div>
      </CardContent>
    </Card>

    <Card className="rounded-lg shadow-sm">
      <CardContent className="p-5">
        <Tabs defaultValue="sessions">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sessions">会话</TabsTrigger>
            <TabsTrigger value="orgs">组织</TabsTrigger>
            <TabsTrigger value="security">安全</TabsTrigger>
            <TabsTrigger value="keys">API Keys</TabsTrigger>
          </TabsList>
          <TabsContent className="mt-4 space-y-3" value="sessions">
            <UserSessions userId={user.id} />
          </TabsContent>
          <TabsContent className="mt-4 space-y-3" value="orgs">
            {user.organizations.length === 0 ? (
              <p className="text-muted-foreground text-sm">该用户暂未加入组织。</p>
            ) : (
              user.organizations.map((org) => (
                <Link className="block rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50" href={`/dashboard/orgs/${org.slug}`} key={org.id}>
                  <div className="font-medium">{org.name}</div>
                  <div className="text-muted-foreground text-xs">{org.role}</div>
                </Link>
              ))
            )}
          </TabsContent>
          <TabsContent className="mt-4" value="security">
            <div className="grid gap-3 text-sm">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Shield className="size-4 text-muted-foreground" />
                <span>双因素认证：{user.twoFactorEnabled ? "已启用" : "未启用"}</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <KeyRound className="size-4 text-muted-foreground" />
                <span>密码重置由管理员确认弹窗执行。</span>
              </div>
            </div>
          </TabsContent>
          <TabsContent className="mt-4 space-y-3" value="keys">
            {user.apiKeys.length === 0 ? (
              <p className="text-muted-foreground text-sm">暂无 API Key。</p>
            ) : (
              user.apiKeys.map((key) => (
                <div className="rounded-lg border p-3 text-sm" key={key.id}>
                  <div className="font-medium">{key.name ?? "未命名密钥"}</div>
                  <div className="text-muted-foreground text-xs">
                    {key.enabled ? "启用" : "停用"} · {key.prefix ?? key.start ?? "masked"}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  </div>
)

const UserSessions = ({ userId }: { userId: string }) => {
  const sessions = api.adminUser.listSessions.useQuery({ userId })
  const items = sessions.data ?? []

  if (sessions.isLoading) {
    return <p className="text-muted-foreground text-sm">正在加载会话...</p>
  }

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">暂无活动会话。</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <RevokeAllSessionsDialog userId={userId} />
      </div>
      {items.map((item) => {
        const Icon = item.userAgent?.toLowerCase().includes("iphone") ? Smartphone : Monitor

        return (
          <div className="flex items-center gap-3 rounded-lg border p-3" key={item.id}>
            <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-sm">{item.userAgent ?? "Unknown device"}</div>
              <div className="text-muted-foreground text-xs">
                {item.ipAddress ?? "Unknown IP"} · expires {formatDate(item.expiresAt)}
              </div>
            </div>
            <RevokeSessionDialog sessionId={item.id} />
          </div>
        )
      })}
    </div>
  )
}
