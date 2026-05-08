# 04 重置密码页

- 路由：`/reset-password`
- 目标：用户通过邮件 token 设置新密码。

## 功能范围

重置密码页负责用户通过邮件 token 设置新密码。

## 页面布局

- 表单区：新密码、确认新密码、提交按钮。
- 异常状态：token 缺失、过期或无效。

## 用户动作

- 填写新密码并提交。
- 重置成功后跳转登录页。
- token 无效时返回忘记密码页重新发送。

## 接口与逻辑

- `authClient.resetPassword`：验证 reset token，更新密码凭据，并使 token 失效。

## 实现要点

- 从 searchParams 读取 token。
- 密码复杂度用 Zod 和 Better Auth 配置保持一致。
- 成功后清空表单并 router.replace('/sign-in')。

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
