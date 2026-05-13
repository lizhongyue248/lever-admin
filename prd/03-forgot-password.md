# 03 忘记密码页

- 路由：`/forgot-password`
- 目标：发送重置密码邮件，同时避免邮箱枚举风险。

## 功能范围

忘记密码页负责发送重置密码邮件，同时避免邮箱枚举风险。

## 页面布局

- 单列表单：邮箱输入、发送按钮、返回登录链接。
- 返回登录按钮使用纯图标按钮，固定在右侧操作区域左上角，与右上角主题切换按钮同高、同尺寸，不占用卡片内容空间。
- 成功状态：展示统一提示和重新发送入口。
- 移动端：隐藏左侧品牌插画栏，返回图标按钮固定在页面左上角，主题切换按钮固定在页面右上角；表单卡片在 24px 横向安全边距内居中展示。

## 用户动作

- 输入邮箱并请求重置密码邮件。
- 返回登录页。
- 在冷却时间后重新发送。

## 接口与逻辑

- `authClient.requestPasswordReset`：提交邮箱并请求 Better Auth 生成重置 token。
  - 请求体使用 `redirectTo=/reset-password`，用户打开 Better Auth 生成的重置链接后会被回跳到 `/reset-password?token=...`。
- `emailAndPassword.sendResetPassword`：Better Auth 服务端邮件发送函数。
  - 当前开发阶段使用 `console.info("[auth:reset-password]", { to, url })` 输出重置链接到服务端控制台。
  - 后续接入真实邮件服务时，将该函数替换为 Resend/SMTP/邮件推送服务调用。

## 实现要点

- 提交后无论邮箱是否存在，都显示“如果该邮箱存在，我们已发送重置链接”。
- 按钮提交期间禁用，防止重复请求。
- 当前版本不暴露邮箱是否存在；即使接口异常，前端也展示统一成功文案，真实失败由服务端日志排查。
- 可在服务端增加 rate limit，防止滥用。

## 通用工程约束

- Create T3 App: Next.js App Router, TypeScript, tRPC, Prisma, Tailwind CSS
- Better Auth: authentication, session, admin, organization, passkey, 2FA, API key plugins
- PostgreSQL: Better Auth tables plus optional product-specific extension tables
- shadcn/ui + React Hook Form + Zod: forms, tables, dialogs, validation

## Playwright E2E 测试用例

测试环境使用 `prd/99-e2e-testing-method.md` 中定义的 Playwright + Testcontainers PostgreSQL。

| 用例 ID | 场景 | 前置数据 | 操作 | 预期结果 |
| --- | --- | --- | --- | --- |
| `auth-forgot-password-001` | 未登录用户访问忘记密码页 | 无 | 访问 `/forgot-password` | 页面返回 200，显示标题“忘记密码”、邮箱输入框、发送重置链接按钮、返回登录图标按钮和主题切换按钮 |
| `auth-forgot-password-002` | 桌面端布局 | 无 | 使用桌面 viewport 访问 `/forgot-password` | 左侧品牌插画区可见，返回图标按钮固定在右侧操作区左上角，主题切换按钮固定在右上角 |
| `auth-forgot-password-003` | 移动端布局 | 无 | 使用移动 viewport 访问 `/forgot-password` | 左侧品牌插画区不可见，返回图标按钮位于页面左上角，主题切换按钮位于页面右上角，表单卡片不横向溢出 |
| `auth-forgot-password-004` | 邮箱必填或格式校验 | 无 | 空邮箱或非法邮箱提交 | 页面停留在 `/forgot-password`，展示邮箱校验提示，不调用重置请求 |
| `auth-forgot-password-005` | 存在邮箱请求重置 | seed 一个邮箱密码用户 | 输入该邮箱并提交 | 页面展示统一成功提示，按钮进入冷却状态；服务端日志可包含重置链接 |
| `auth-forgot-password-006` | 不存在邮箱请求重置 | 数据库无对应邮箱 | 输入不存在邮箱并提交 | 页面仍展示统一成功提示，不暴露邮箱是否存在 |
| `auth-forgot-password-007` | 冷却状态防重复提交 | 任意邮箱 | 成功提交后立即再次点击发送按钮 | 发送按钮禁用或展示冷却倒计时，不重复发起请求 |
| `auth-forgot-password-008` | 返回登录 | 无 | 点击左上角返回图标按钮 | 跳转 `/sign-in` |
| `auth-forgot-password-009` | 主题切换 | 无 | 点击主题切换按钮 | `html` 的 `dark` class 在 light/dark 间切换 |

## 验收标准

- 页面在未授权、加载、空数据、错误、成功状态下均有明确反馈。
- 所有敏感动作必须在服务端重新校验 session 和权限。
- 表单字段均有客户端和服务端校验。
- 高危操作必须二次确认。
