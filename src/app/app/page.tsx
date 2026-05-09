import { redirect } from "next/navigation"

import { SignOutButton } from "@/app/app/_components/sign-out-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSession } from "@/server/better-auth/server"

const AppPage = async () => {
  const session = await getSession()

  if (!session?.user) {
    redirect("/sign-in")
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-4xl flex-col justify-center gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="font-medium text-muted-foreground text-sm">Lever Admin</p>
            <h1 className="font-semibold text-3xl tracking-tight">工作台测试页</h1>
            <p className="max-w-2xl text-muted-foreground text-sm">这是临时 /app 页面，用于验证登录后的重定向、session 读取和退出登录流程。</p>
          </div>
          <SignOutButton />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>当前登录账号</CardTitle>
            <CardDescription>服务端通过 Better Auth session 读取。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 rounded-md border border-border p-4">
              <p className="text-muted-foreground text-xs">名称</p>
              <p className="font-medium text-sm">{session.user.name || "未设置"}</p>
            </div>
            <div className="space-y-1 rounded-md border border-border p-4">
              <p className="text-muted-foreground text-xs">邮箱</p>
              <p className="font-medium text-sm">{session.user.email}</p>
            </div>
            <div className="space-y-1 rounded-md border border-border p-4">
              <p className="text-muted-foreground text-xs">邮箱状态</p>
              <Badge variant={session.user.emailVerified ? "default" : "secondary"}>{session.user.emailVerified ? "已验证" : "未验证"}</Badge>
            </div>
            <div className="space-y-1 rounded-md border border-border p-4">
              <p className="text-muted-foreground text-xs">用户 ID</p>
              <p className="break-all font-mono text-xs">{session.user.id}</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

export default AppPage
