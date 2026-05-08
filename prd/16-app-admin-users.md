# 16 用户管理页

- 路由：`/app/admin/users`
- 目标：平台管理员查询和管理所有用户。

## 功能范围

用户管理页负责平台管理员查询和管理所有用户。

## 页面布局

- 顶部：搜索、角色筛选、状态筛选、创建用户按钮。
- 表格：头像、名称、邮箱、角色、状态、邮箱验证、创建时间、操作。
- 弹窗：创建用户、封禁原因、删除确认。

## 用户动作

- 搜索用户。
- 按角色、状态筛选。
- 创建用户。
- 进入用户详情。
- 封禁或解封用户。
- 删除用户。

## 接口与逻辑

- `admin.user.list`：封装 authClient.admin.listUsers，支持搜索、分页、排序、筛选。
- `admin.user.create`：创建用户并设置初始角色。
- `admin.user.ban`：封禁用户并撤销全部会话。
- `admin.user.unban`：解除用户封禁。
- `admin.user.remove`：硬删除用户，高危操作。

## 实现要点

- 默认按 createdAt 倒序。
- 管理员不能删除自己。
- support 不可封禁或删除 admin/super_admin。
- 所有 destructive action 需要确认弹窗。

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
