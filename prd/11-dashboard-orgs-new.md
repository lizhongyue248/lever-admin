# 11 创建组织页

- 路由：`/dashboard/orgs/new`
- 目标：让有权限的用户创建新组织，并进入该组织工作区。

## 功能范围

创建组织页负责让有权限的用户创建新组织，并进入该组织工作区。

## 页面布局

- 整体布局继承 `06-dashboard.md` 的 DashboardLayout：
  - Sidebar、Topbar、左下角用户菜单、主题切换、面包屑与响应式行为均保持一致。
  - 本页只定义 Main 内容区域布局，不重复定义全局壳层。
- Main 内容区域：
  - 页面标题区展示「创建组织」和创建后权限说明。
  - 简单表单包含组织名称、slug、logo URL。
  - slug 输入旁展示可用性状态、校验中状态和错误说明。
  - 底部操作区展示创建、取消按钮。
  - 创建成功后进入新组织设置页。

## 用户动作

- 输入组织名称并自动生成 slug。
- 检查 slug 是否可用。
- 创建组织。
- 取消返回组织列表。

## 接口与逻辑

- `org.checkSlug`：调用 Better Auth checkOrganizationSlug 检查唯一性。
- `org.create`：创建 organization，当前用户成为 owner，并设置活跃组织。

## 实现要点

- slug 使用小写字母、数字、短横线。
- 创建权限通过 organization.allowUserToCreateOrganization 或 tRPC 中间件限制。
- 创建成功后 router.replace('/dashboard/orgs/[slug]/settings')。

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
