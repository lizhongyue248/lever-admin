# 04 重置密码页

- 路由：`/reset-password`
- 目标：用户通过邮件 token 设置新密码。

## 功能范围

重置密码页负责用户通过邮件 token 设置新密码。

## 页面布局

- 表单区：新密码、确认新密码、提交按钮。
- 异常状态：token 缺失、过期或无效。
- 返回登录按钮使用纯图标按钮，固定在右侧操作区域左上角，与右上角主题切换按钮同高、同尺寸，不占用卡片内容空间。
- 移动端：隐藏左侧品牌插画栏，返回图标按钮固定在页面左上角，主题切换按钮固定在页面右上角；表单卡片在 24px 横向安全边距内居中展示。

## 用户动作

- 填写新密码并提交。
- 重置成功后跳转登录页。
- token 无效时返回忘记密码页重新发送。
- 打开控制台输出的重置链接后，Better Auth 先验证链接中的临时 token，再回跳到 `/reset-password?token=...`。

## 接口与逻辑

- `authClient.resetPassword`：验证 reset token，更新密码凭据，并使 token 失效。
- `emailAndPassword.revokeSessionsOnPasswordReset=true`：密码重置成功后撤销其它会话，降低旧会话继续使用的风险。

## 实现要点

- 从 searchParams 读取 token。
- 密码复杂度用 Zod 和 Better Auth 配置保持一致。
- 成功后清空表单并 router.replace('/sign-in')。
- 无 token 时展示链接无效状态，并提供返回忘记密码页重新发送入口。

## 通用工程约束

- Create T3 App: Next.js App Router, TypeScript, tRPC, Prisma, Tailwind CSS
- Better Auth: authentication, session, admin, organization, passkey, 2FA, API key plugins
- PostgreSQL: Better Auth tables plus optional product-specific extension tables
- shadcn/ui + React Hook Form + Zod: forms, tables, dialogs, validation

## Playwright E2E 测试用例

测试环境使用 `prd/99-e2e-testing-method.md` 中定义的 Playwright + Testcontainers PostgreSQL。

| 用例 ID | 场景 | 前置数据 | 操作 | 预期结果 |
| --- | --- | --- | --- | --- |
| `auth-reset-password-001` | 无 token 访问重置密码页 | 无 | 访问 `/reset-password` | 页面返回 200，展示“链接无效”状态和重新发送重置邮件入口 |
| `auth-reset-password-002` | 桌面端布局 | 无 | 使用桌面 viewport 访问 `/reset-password` | 左侧品牌插画区可见，返回图标按钮固定在右侧操作区左上角，主题切换按钮固定在右上角 |
| `auth-reset-password-003` | 移动端布局 | 无 | 使用移动 viewport 访问 `/reset-password` | 左侧品牌插画区不可见，返回图标按钮位于页面左上角，主题切换按钮位于页面右上角，卡片不横向溢出 |
| `auth-reset-password-004` | 无 token 时重新发送入口 | 无 | 在无 token 状态点击“重新发送重置邮件” | 跳转 `/forgot-password` |
| `auth-reset-password-005` | 新密码必填校验 | 准备有效 reset token | 访问 `/reset-password?token=...` 后空表单提交 | 页面展示新密码或确认密码校验提示，不更新密码 |
| `auth-reset-password-006` | 密码确认不一致 | 准备有效 reset token | 输入不同的新密码和确认密码提交 | 页面展示确认密码不一致提示，不更新密码 |
| `auth-reset-password-007` | 有效 token 重置成功 | seed 邮箱密码用户并生成有效 reset token | 输入符合规则的新密码并提交 | 密码更新成功，跳转 `/sign-in`；旧密码无法登录，新密码可以登录 |
| `auth-reset-password-008` | 无效或过期 token | 准备无效 token | 访问 `/reset-password?token=invalid` 并提交新密码 | 页面展示重置失败提示或保持错误状态，不更新密码 |
| `auth-reset-password-009` | 返回登录 | 无 | 点击左上角返回图标按钮 | 跳转 `/sign-in` |
| `auth-reset-password-010` | 主题切换 | 无 | 点击主题切换按钮 | `html` 的 `dark` class 在 light/dark 间切换 |

### 自动化落地

- 对应测试文件：`e2e/specs/04-reset-password.spec.ts`。
- DB-backed 流程只在 Chromium 项目执行，移动端项目跳过同一套数据库写入/密码更新断言。
- 已覆盖：无 token 状态、重新发送入口、客户端校验、密码确认校验、无效 token、Better Auth reset callback、有效 token 重置成功、旧密码失效、新密码登录、返回登录、主题切换。

## 验收标准

- 页面在未授权、加载、空数据、错误、成功状态下均有明确反馈。
- 所有敏感动作必须在服务端重新校验 session 和权限。
- 表单字段均有客户端和服务端校验。
- 高危操作必须二次确认。
