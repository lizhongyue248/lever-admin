# 01 登录页

- 路由：`/sign-in`
- 目标：让用户通过邮箱密码、OAuth 或可选 Magic Link 进入系统，并处理重定向、封禁、邮箱未验证等状态。

## 功能范围

登录页负责让用户通过邮箱密码、OAuth 或可选 Magic Link 进入系统，并处理重定向、封禁、邮箱未验证等状态。

## 页面布局

- AuthLayout：桌面端左右分栏，左侧品牌与价值说明，右侧登录表单；移动端只显示表单。
- 表单区：邮箱、密码、登录按钮、OAuth 按钮、忘记密码、注册链接。
- 状态区：错误提示、加载状态、被封禁提示、邮箱验证提醒。
- 移动端：隐藏左侧品牌插画栏，表单卡片在 24px 横向安全边距内居中展示；主题切换按钮固定在页面右上角，不进入卡片内部。

## 用户动作

- 输入邮箱和密码后提交登录。
- 点击 GitHub / Google OAuth 登录。
- 点击忘记密码跳转 /forgot-password。
- 点击注册跳转 /sign-up。
- 登录成功后根据 redirectTo 返回原页面，否则进入 /app。
- 如果邮箱密码正确但邮箱尚未验证，自动发送验证邮件并跳转 `/verify-email?status=pending&email=...`。

## 接口与逻辑

- `authClient.signIn.email`：调用 Better Auth 邮箱密码登录，成功后写入 session cookie。
  - 登录请求使用当前 `redirectTo` 作为 `callbackURL`，确保已验证账号登录成功后进入目标应用页。
  - 当 Better Auth 返回 `EMAIL_NOT_VERIFIED` 时，说明密码已通过但邮箱未验证；页面跳转邮箱验证等待页。
  - Better Auth 服务端配置 `emailVerification.sendOnSignIn=true` 时，该错误返回前会触发 `sendVerificationEmail`；邮件中的验证链接成功后回跳 `redirectTo`，默认进入 `/app`。
- `authClient.signIn.social`：发起 OAuth 登录，provider 可配置为 github/google。
- `auth.api.getSession`：服务端页面加载时检查已登录用户，已登录则重定向 /app。

## 实现要点

- 使用 Zod 校验邮箱格式和密码必填。
- 登录表单用 client component，提交时调用 Better Auth client。
- App Router 页面读取 searchParams.redirectTo，登录成功后 router.replace。
- 邮箱未验证不展示普通错误停留在登录页，而是进入邮箱验证等待页，并预填当前登录邮箱用于重新发送；用户完成邮箱验证后直接进入应用目标页。
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
