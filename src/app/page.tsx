import Link from "next/link"

const Home = () => {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col justify-center gap-10">
        <div className="max-w-2xl space-y-5">
          <p className="font-medium text-muted-foreground text-sm">Lever Admin</p>
          <h1 className="font-semibold text-4xl tracking-tight sm:text-5xl">首页访问测试成功</h1>
          <p className="text-lg text-muted-foreground">如果你能看到这个页面，说明 Next.js 16 应用已经可以正常启动并访问。这里暂时不读取认证或数据库状态，专门用于验证基础路由。</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5 text-card-foreground">
            <p className="font-medium text-sm">App Router</p>
            <p className="mt-2 text-muted-foreground text-sm">根路由 / 已正常渲染。</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 text-card-foreground">
            <p className="font-medium text-sm">Next.js</p>
            <p className="mt-2 text-muted-foreground text-sm">已升级到 16.x，dev/build 默认使用 Turbopack。</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 text-card-foreground">
            <p className="font-medium text-sm">Better Auth</p>
            <p className="mt-2 text-muted-foreground text-sm">认证页面后续按 PRD 接入。</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm" href="/sign-in">
            打开登录页
          </Link>
          <Link className="rounded-md border border-border px-4 py-2 font-medium text-sm" href="/sign-up">
            打开注册页
          </Link>
        </div>
      </section>
    </main>
  )
}

export default Home
