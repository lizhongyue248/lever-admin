# 01A 登录二次验证页

- 路由：`/sign-in/2fa`
- 目标：处理 Better Auth 邮箱密码登录后的二次验证步骤，让已开启 2FA 的用户输入认证器验证码或备用恢复码后进入系统。

## 功能范围

登录二次验证页只负责登录过程中的二次验证，不负责开启、关闭或重置 2FA。用户必须先在 `/sign-in` 完成邮箱密码校验，并由 Better Auth 写入临时 2FA cookie 后才能完成本页验证。

## 页面布局

- AuthLayout：复用公开认证页左右分栏布局；桌面端左侧展示二次验证主题插画，右侧展示验证卡片；移动端只显示验证卡片。
- 表单区：页面标题、说明文案、状态提示、6 位认证器验证码输入、信任此设备选项、提交按钮、备用恢复码入口。
- 备用恢复码模式：在同一卡片内切换为单个恢复码输入框，并提供返回认证器验证码模式的入口。
- 状态区：加载中、验证失败、临时 2FA 会话过期、恢复码已使用或无效等提示。
- 移动端：隐藏左侧品牌插画栏，卡片在 24px 横向安全边距内居中展示；主题切换按钮固定在页面右上角。

## 用户动作

- 输入认证器应用中的 6 位验证码并提交。
- 勾选“信任此设备 30 天”，验证成功后将当前设备加入可信设备。
- 点击“使用备用恢复码”切换到恢复码验证模式。
- 在恢复码模式下输入备用恢复码并提交。
- 点击返回登录，放弃当前二次验证流程并回到 `/sign-in`。

## 接口与逻辑

- `/sign-in` 调用 `authClient.signIn.email` 时，如果 Better Auth 返回 `twoFactorRedirect=true`，客户端跳转到 `/sign-in/2fa`。
- `authClient.twoFactor.verifyTotp`：提交 6 位 TOTP 验证码。
  - 入参：`code`、`trustDevice`。
  - 成功后 Better Auth 写入正式 session cookie。
- `authClient.twoFactor.verifyBackupCode`：提交备用恢复码。
  - 入参：`code`、`trustDevice`。
  - 备用恢复码单次使用，成功后进入系统。
- `auth.api.getSession`：服务端页面加载时检查是否已经登录；已登录用户直接重定向 `/dashboard`。
- 临时 2FA cookie 缺失或过期时，页面展示“验证会话已过期”，并提供返回登录按钮。

## 实现要点

- 使用 Zod 校验 TOTP 验证码为 6 位数字。
- 备用恢复码输入允许包含短横线或空格，提交前按 Better Auth 客户端要求规整。
- 表单使用 client component，提交期间禁用输入和按钮。
- 验证成功后优先回到原始 `redirectTo`，没有 `redirectTo` 时进入 `/dashboard`。
- 错误提示保持克制，不暴露账号、密钥或备用码的内部状态。
- `trustDevice` 默认不勾选，由用户主动选择。

## 通用工程约束

- Create T3 App: Next.js App Router, TypeScript, tRPC, Drizzle, Tailwind CSS
- Better Auth: authentication, session, admin, organization, passkey, 2FA, API key plugins
- PostgreSQL: Better Auth tables plus optional product-specific extension tables
- shadcn/ui + TanStack Form + Zod: forms, validation, dialogs

## Playwright E2E 测试用例

测试环境使用 `prd/99-e2e-testing-method.md` 中定义的 Playwright + Testcontainers PostgreSQL。

| 用例 ID | 场景 | 前置数据 | 操作 | 预期结果 |
| --- | --- | --- | --- | --- |
| `auth-sign-in-2fa-001` | 直接访问二次验证页 | 无临时 2FA cookie | 访问 `/sign-in/2fa` | 页面展示验证会话已过期提示，并提供返回登录入口 |
| `auth-sign-in-2fa-002` | 已登录用户访问 | 已存在有效 session | 访问 `/sign-in/2fa` | 服务端重定向 `/dashboard` |
| `auth-sign-in-2fa-003` | TOTP 校验失败 | 已完成邮箱密码校验并存在临时 2FA cookie | 输入错误验证码提交 | 页面停留在 `/sign-in/2fa`，展示验证码无效提示 |
| `auth-sign-in-2fa-004` | TOTP 校验成功 | seed 一个已开启 2FA 的用户 | 登录后进入 `/sign-in/2fa`，输入正确验证码提交 | 写入正式 session cookie，并跳转 `/dashboard` 或 `redirectTo` |
| `auth-sign-in-2fa-005` | 信任设备 | seed 一个已开启 2FA 的用户 | 勾选信任此设备并输入正确验证码 | 验证成功，后续在可信期限内登录不再要求 2FA |
| `auth-sign-in-2fa-006` | 使用备用恢复码 | seed 一个已开启 2FA 且有备用码的用户 | 切换备用恢复码模式，输入有效备用码 | 登录成功，备用码被消费 |
| `auth-sign-in-2fa-007` | 移动端布局 | 无 | 使用移动 viewport 访问 `/sign-in/2fa` | 左侧插画区不可见，验证码卡片在安全边距内展示，主题切换按钮固定在右上角 |
| `auth-sign-in-2fa-008` | 主题切换 | 无 | 点击主题切换按钮 | `html` 的 `dark` class 在 light/dark 间切换 |

## 验收标准

- `/sign-in` 遇到 Better Auth `twoFactorRedirect=true` 时能够跳转到 `/sign-in/2fa`。
- 二次验证页覆盖 TOTP、备用恢复码、信任设备、过期、错误和成功状态。
- 未持有临时 2FA cookie 的用户不能绕过邮箱密码步骤完成验证。
- 验证成功后不暴露任何 TOTP secret、备用码明文或 session token。
- 桌面端、移动端、亮色和暗色主题均与公开认证页风格一致。
