# 09 我的会话页

- 路由：`/app/settings/sessions`
- 目标：让用户查看和撤销自己的登录设备。

## 功能范围

我的会话页负责让用户查看和撤销自己的登录设备。

## 页面布局

- 会话列表：当前会话置顶并标记。
- 字段：设备、浏览器、IP、创建时间、最近活跃时间、操作。
- 顶部操作：退出全部其他设备。

## 用户动作

- 查看当前和历史有效会话。
- 撤销某个非当前会话。
- 撤销所有其他会话。
- 退出当前账号。

## 接口与逻辑

- `session.listMine`：tRPC 读取当前用户的 session 列表。
- `session.revoke`：撤销指定 sessionToken，要求属于当前用户。
- `session.revokeOthers`：撤销当前 session 之外的全部 session。

## 实现要点

- 当前会话不显示普通撤销按钮，改为退出登录。
- 撤销成功后重新拉取列表。
- session token 不在前端完整展示。

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
