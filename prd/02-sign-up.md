# 02 注册页

- 路由：`/sign-up`
- 目标：让新用户创建账号，并根据邮箱验证策略进入待验证或应用首页。

## 功能范围

注册页负责让新用户创建账号，并根据邮箱验证策略进入待验证或应用首页。

## 页面布局

- AuthLayout：与登录页一致，保持品牌和表单视觉一致。
- 表单区：名称、邮箱、密码、确认密码、注册按钮、OAuth 注册按钮。
- 底部：已有账号登录入口和服务条款提示。
- 移动端：隐藏左侧品牌插画栏，表单卡片在 24px 横向安全边距内居中展示；注册页卡片内边距和间距比桌面端更紧凑，确保主要字段在小屏内可用；主题切换按钮固定在页面右上角。

## 用户动作

- 提交邮箱密码注册。
- 使用 OAuth 创建账号或登录已有账号。
- 注册成功后提示验证邮箱。
- 跳转登录页。

## 接口与逻辑

- `authClient.signUp.email`：创建 Better Auth user/account 记录，按配置触发验证邮件。
  - 注册请求提交时传入 `callbackURL=/app`，用于用户点击邮件验证链接后的成功回跳。
  - 注册接口成功返回后，页面跳转 `/verify-email?status=pending`，提示用户前往邮箱点击验证链接。
- `authClient.signIn.social`：OAuth 首次登录时创建用户，后续登录复用账号。
- `auth.api.getSession`：已登录用户访问注册页时跳转 /app。

## 实现要点

- 密码和确认密码必须一致。
- 如果 requireEmailVerification 为 true，注册后跳转 /verify-email?status=pending。
- 邮箱验证链接成功验证后直接进入 /app，不继续显示等待验证状态。
- 避免暴露邮箱是否已注册的过多细节，错误提示保持克制。
- 新用户默认平台角色为 user。

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
