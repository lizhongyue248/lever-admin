# 01 登录页

- 路由：`/sign-in`
- 目标：让用户通过邮箱密码、OAuth 或可选 Magic Link 进入系统，并处理重定向、封禁、邮箱未验证等状态。

## 功能范围

登录页负责让用户通过邮箱密码、OAuth 或可选 Magic Link 进入系统，并处理重定向、封禁、邮箱未验证等状态。

## 页面布局

- AuthLayout：桌面端左右分栏，左侧品牌与价值说明，右侧登录表单；移动端只显示表单。
- 表单区：邮箱、密码、登录按钮、OAuth 按钮、忘记密码、注册链接。
- 状态区：错误提示、加载状态、被封禁提示、邮箱验证提醒。

## 用户动作

- 输入邮箱和密码后提交登录。
- 点击 GitHub / Google OAuth 登录。
- 点击忘记密码跳转 /forgot-password。
- 点击注册跳转 /sign-up。
- 登录成功后根据 redirectTo 返回原页面，否则进入 /app。

## 接口与逻辑

- `authClient.signIn.email`：调用 Better Auth 邮箱密码登录，成功后写入 session cookie。
- `authClient.signIn.social`：发起 OAuth 登录，provider 可配置为 github/google。
- `auth.api.getSession`：服务端页面加载时检查已登录用户，已登录则重定向 /app。

## 实现要点

- 使用 Zod 校验邮箱格式和密码必填。
- 登录表单用 client component，提交时调用 Better Auth client。
- App Router 页面读取 searchParams.redirectTo，登录成功后 router.replace。
- 封禁用户错误来自 Admin plugin，应映射为清晰的中文提示。

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
