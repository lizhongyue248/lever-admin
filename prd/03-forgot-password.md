# 03 忘记密码页

- 路由：`/forgot-password`
- 目标：发送重置密码邮件，同时避免邮箱枚举风险。

## 功能范围

忘记密码页负责发送重置密码邮件，同时避免邮箱枚举风险。

## 页面布局

- 单列表单：邮箱输入、发送按钮、返回登录链接。
- 成功状态：展示统一提示和重新发送入口。

## 用户动作

- 输入邮箱并请求重置密码邮件。
- 返回登录页。
- 在冷却时间后重新发送。

## 接口与逻辑

- `authClient.forgetPassword`：生成重置 token 并调用邮件发送能力。
- `auth.api.forgetPassword`：服务端同等能力，可在需要自定义邮件模板时封装。

## 实现要点

- 提交后无论邮箱是否存在，都显示“如果该邮箱存在，我们已发送重置链接”。
- 按钮提交期间禁用，防止重复请求。
- 可在服务端增加 rate limit，防止滥用。

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
