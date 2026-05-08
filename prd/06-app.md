# 06 工作台首页

- 路由：`/app`
- 目标：登录后的默认入口，提供账号、组织、团队、会话和邀请的概览。

## 功能范围

工作台首页负责登录后的默认入口，提供账号、组织、团队、会话和邀请的概览。

## 页面布局

- AppLayout：Topbar + Sidebar + Main。
- 顶部：页面标题、当前组织切换器、用户菜单。
- 内容：统计卡片、当前组织卡片、待处理邀请、快捷入口。

## 用户动作

- 查看当前账号状态。
- 切换活跃组织。
- 进入组织、成员、安全、会话等页面。
- 接受或拒绝邀请。

## 接口与逻辑

- `dashboard.getOverview`：tRPC 聚合当前用户、活跃组织、组织数、团队数、会话数、邀请数。
- `auth.api.getSession`：服务端验证登录态并取得当前 session。
- `authClient.organization.setActive`：切换当前 session 的 activeOrganizationId。

## 实现要点

- 该页使用 Server Component 获取初始数据。
- 未登录 redirect('/sign-in')。
- 无组织时展示创建组织引导。
- 邮箱未验证时在页面顶部展示提醒条。

## 通用工程约束

- Create T3 App: Next.js App Router, TypeScript, tRPC, Prisma, Tailwind CSS
- Better Auth: authentication, session, admin, organization, team, passkey, 2FA, API key plugins
- PostgreSQL: Better Auth tables plus optional product-specific extension tables
- shadcn/ui + React Hook Form + Zod: forms, tables, dialogs, validation

## 验收标准

- 页面在未授权、加载、空数据、错误、成功状态下均有明确反馈。
- 所有敏感动作必须在服务端重新校验 session 和权限。
- 表单字段均有客户端和服务端校验。
- 高危操作必须二次确认。
