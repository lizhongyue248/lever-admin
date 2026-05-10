# 12 组织设置页

- 路由：`/dashboard/orgs/[slug]/settings`
- 目标：维护组织基础信息和删除组织。

## 功能范围

组织设置页负责维护组织基础信息和删除组织。

## 页面布局

- 整体布局继承 `06-dashboard.md` 的 DashboardLayout：
  - Sidebar、Topbar、左下角用户菜单、主题切换、面包屑与响应式行为均保持一致。
  - 本页只定义 Main 内容区域布局，不重复定义全局壳层。
- Main 内容区域：
  - 页面标题区展示当前组织名称和设置说明。
  - 基础信息卡片展示名称、slug、logo、组织 ID、创建时间。
  - 权限不足时基础信息卡片切换为只读状态。
  - 危险区单独展示删除组织操作，视觉上与基础信息分离。

## 用户动作

- 修改组织名称。
- 修改 logo。
- 修改 slug，可选。
- 删除组织。

## 接口与逻辑

- `org.getBySlug`：读取组织详情，并校验当前用户为组织成员。
- `org.update`：校验 owner/admin 权限后更新 organization。
- `org.delete`：校验 owner 权限，二次确认后删除组织。

## 实现要点

- 非 owner/admin 只读。
- 删除组织前要求输入 slug。
- 删除最后一个组织后跳转 /dashboard/orgs。
- slug 改动后需要同步路由。

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
