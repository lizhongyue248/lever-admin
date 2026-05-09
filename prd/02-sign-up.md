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

## Playwright E2E 测试用例

测试环境使用 `prd/99-e2e-testing-method.md` 中定义的 Playwright + Testcontainers PostgreSQL。

| 用例 ID | 场景 | 前置数据 | 操作 | 预期结果 |
| --- | --- | --- | --- | --- |
| `auth-sign-up-001` | 未登录用户访问注册页 | 无 | 访问 `/sign-up` | 页面返回 200，显示标题“创建账号”、名称、邮箱、密码、确认密码、创建账号按钮、OAuth 注册按钮和登录入口 |
| `auth-sign-up-002` | 桌面端布局 | 无 | 使用桌面 viewport 访问 `/sign-up` | 左侧品牌插画区可见，表单卡片在右侧操作区居中，主题切换按钮固定在页面右上角 |
| `auth-sign-up-003` | 移动端布局 | 无 | 使用移动 viewport 访问 `/sign-up` | 左侧品牌插画区不可见，注册表单在 24px 横向安全边距内展示，主要字段和创建账号按钮可见且不横向溢出 |
| `auth-sign-up-004` | 必填校验 | 无 | 空表单提交 | 页面停留在 `/sign-up`，展示名称、邮箱或密码相关校验提示，不创建用户 |
| `auth-sign-up-005` | 邮箱格式校验 | 无 | 输入非法邮箱并提交 | 页面展示邮箱格式错误提示，不创建用户 |
| `auth-sign-up-006` | 密码确认不一致 | 无 | 输入不同的密码和确认密码后提交 | 页面展示确认密码不一致提示，不创建用户 |
| `auth-sign-up-007` | 注册成功进入待验证 | 数据库无同邮箱用户 | 输入有效名称、唯一邮箱和符合规则的密码提交 | Better Auth 创建用户，页面跳转 `/verify-email?status=pending`，数据库用户 `emailVerified=false` |
| `auth-sign-up-008` | 重复邮箱注册 | seed 一个相同邮箱用户 | 使用相同邮箱提交注册 | 页面停留在 `/sign-up`，展示“该邮箱已注册，请直接登录。”，不创建重复用户 |
| `auth-sign-up-009` | 已登录用户访问注册页 | seed 已验证用户并通过登录 helper 建立会话 | 访问 `/sign-up` | 服务端重定向 `/app` |
| `auth-sign-up-010` | 返回登录入口 | 无 | 点击“返回登录”入口 | 跳转 `/sign-in` |
| `auth-sign-up-011` | 主题切换 | 无 | 点击主题切换按钮 | `html` 的 `dark` class 在 light/dark 间切换，移动端和桌面端均可点击 |

## 验收标准

- 页面在未授权、加载、空数据、错误、成功状态下均有明确反馈。
- 所有敏感动作必须在服务端重新校验 session 和权限。
- 表单字段均有客户端和服务端校验。
- 高危操作必须二次确认。
