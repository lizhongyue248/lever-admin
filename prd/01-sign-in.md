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
- 登录成功后根据 redirectTo 返回原页面，否则进入 /dashboard。
- 如果邮箱密码正确但邮箱尚未验证，自动发送验证邮件并跳转 `/verify-email?status=pending&email=...`。

## 接口与逻辑

- `authClient.signIn.email`：调用 Better Auth 邮箱密码登录，成功后写入 session cookie。
  - 登录请求使用当前 `redirectTo` 作为 `callbackURL`，确保已验证账号登录成功后进入目标应用页。
  - 当 Better Auth 返回 `EMAIL_NOT_VERIFIED` 时，说明密码已通过但邮箱未验证；页面跳转邮箱验证等待页。
  - Better Auth 服务端配置 `emailVerification.sendOnSignIn=true` 时，该错误返回前会触发 `sendVerificationEmail`；邮件中的验证链接成功后回跳 `redirectTo`，默认进入 `/dashboard`。
- `authClient.signIn.social`：发起 OAuth 登录，provider 可配置为 github/google。
- `auth.api.getSession`：服务端页面加载时检查已登录用户，已登录则重定向 /dashboard。

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

## Playwright E2E 测试用例

测试环境使用 `prd/99-e2e-testing-method.md` 中定义的 Playwright + Testcontainers PostgreSQL。

| 用例 ID | 场景 | 前置数据 | 操作 | 预期结果 |
| --- | --- | --- | --- | --- |
| `auth-sign-in-001` | 未登录用户访问登录页 | 无 | 访问 `/sign-in` | 页面返回 200，显示标题“登录”、邮箱输入框、密码输入框、登录按钮、忘记密码入口、注册入口和主题切换按钮 |
| `auth-sign-in-002` | 桌面端布局 | 无 | 使用桌面 viewport 访问 `/sign-in` | 左侧品牌插画区可见，表单卡片在右侧操作区居中，主题切换按钮固定在页面右上角 |
| `auth-sign-in-003` | 移动端布局 | 无 | 使用移动 viewport 访问 `/sign-in` | 左侧品牌插画区不可见，表单卡片在 24px 横向安全边距内展示，主题切换按钮固定在页面右上角 |
| `auth-sign-in-004` | 客户端校验 | 无 | 不输入邮箱和密码直接提交 | 页面停留在 `/sign-in`，展示邮箱或密码校验提示，不产生已登录会话 |
| `auth-sign-in-005` | 登录失败 | 数据库无对应用户 | 输入不存在的邮箱和任意密码提交 | 页面展示克制的登录失败提示，不暴露账号是否存在 |
| `auth-sign-in-006` | 已验证用户登录成功 | Testcontainers DB seed 一个 `emailVerified=true` 的邮箱密码用户 | 输入正确邮箱和密码提交 | 登录成功后跳转 `/dashboard`，页面显示工作台首页，session cookie 已写入 |
| `auth-sign-in-007` | redirectTo 登录成功回跳 | seed 一个 `emailVerified=true` 的用户 | 访问 `/sign-in?redirectTo=/dashboard` 并登录 | 登录成功后进入 `/dashboard` |
| `auth-sign-in-008` | 未验证邮箱登录 | seed 一个 `emailVerified=false` 的邮箱密码用户 | 输入正确邮箱和密码提交 | 跳转 `/verify-email?status=pending&email=...`，页面展示等待验证提示；服务端日志可包含验证链接 |
| `auth-sign-in-009` | 忘记密码入口 | 无 | 点击“忘记密码” | 跳转 `/forgot-password` |
| `auth-sign-in-010` | 注册入口 | 无 | 点击“创建账号”或注册入口 | 跳转 `/sign-up` |
| `auth-sign-in-011` | 主题切换 | 无 | 点击主题切换按钮 | `html` 的 `dark` class 在 light/dark 间切换；支持 View Transition 的浏览器执行过渡，未支持时仍完成主题切换 |

## 验收标准

- 页面在未授权、加载、空数据、错误、成功状态下均有明确反馈。
- 所有敏感动作必须在服务端重新校验 session 和权限。
- 表单字段均有客户端和服务端校验。
- 高危操作必须二次确认。
