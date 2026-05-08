# 05 邮箱验证页

- 路由：`/verify-email`
- 目标：处理邮箱验证链接和未验证提醒。

## 功能范围

邮箱验证页负责处理邮箱验证链接和未验证提醒。

## 页面布局

- 结果卡片：验证中、成功、失败、待验证四种状态。
- 操作区：进入应用、重新发送验证邮件、返回登录。

## 用户动作

- 打开验证链接后自动验证 token。
- 验证失败后重新发送验证邮件。
- 验证成功后进入 /app。

## 接口与逻辑

- `authClient.verifyEmail`：验证邮件 token，更新 user.emailVerified。
- `authClient.sendVerificationEmail`：重新发送验证邮件。
- `auth.api.getSession`：读取当前用户邮箱验证状态。

## 实现要点

- 页面可根据 token 参数决定自动验证，或根据 status=pending 展示待验证。
- 重新发送按钮增加冷却时间。
- 邮箱验证成功后刷新 session 数据。

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
