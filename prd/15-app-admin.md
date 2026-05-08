# 15 管理概览页

- 路由：`/app/admin`
- 目标：平台管理员查看身份系统运营概览。

## 功能范围

管理概览页负责平台管理员查看身份系统运营概览。

## 页面布局

- 统计卡片：用户总数、新增用户、组织总数、活跃会话、封禁用户、待处理邀请。
- 列表区：最近注册用户、最近封禁用户。
- 快捷入口：用户管理、API Key 管理。

## 用户动作

- 查看平台身份系统关键指标。
- 跳转用户管理。
- 跳转 API Key 管理。

## 接口与逻辑

- `admin.dashboard.getOverview`：tRPC 聚合 user、organization、session、invitation 等统计。

## 实现要点

- adminProcedure 校验平台管理员角色。
- 统计可直接实时查询，数据大后再加缓存。
- support 可只读访问，普通 user 返回 403。

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
