# 05 邮箱验证页

- 路由：`/verify-email`
- 目标：处理邮箱验证链接和未验证提醒。

## 功能范围

邮箱验证页负责处理邮箱验证链接和未验证提醒。

## 页面布局

- 结果卡片：验证中、成功、失败、待验证四种状态。
- 成功状态页：仅用于手动 token 验证或异常回退；正常邮件链接验证完成后直接进入 /dashboard。
- 失败状态页：展示“验证失败”，主动作重新发送验证邮件，次动作返回登录。
- 操作区：进入应用、重新发送验证邮件、返回登录。
- 返回登录按钮使用纯图标按钮，固定在右侧操作区域左上角，与右上角主题切换按钮同高、同尺寸，不占用卡片内容空间。
- 移动端：隐藏左侧品牌插画栏，返回图标按钮固定在页面左上角，主题切换按钮固定在页面右上角；验证中、待验证、成功、失败状态卡片均在 24px 横向安全边距内居中展示。

## 用户动作

- 打开验证链接后自动验证 token。
- 打开 Better Auth 生成的 `/api/auth/verify-email?token=...&callbackURL=...` 链接后，由 Better Auth 服务端验证 token 并按 callbackURL 回跳。
- 验证失败后重新发送验证邮件。
- 验证成功后进入 /dashboard，不停留在 /verify-email。

## 接口与逻辑

- `authClient.verifyEmail`：验证邮件 token，更新 user.emailVerified。
- `authClient.sendVerificationEmail`：重新发送验证邮件。
  - 重新发送时使用 `callbackURL=/dashboard`，确保用户点击新验证链接并成功验证后直接进入应用。
- `emailVerification.sendVerificationEmail`：Better Auth 服务端邮件发送函数。
  - 调用 `src/server/service/email` 中统一邮件发送服务，不直接在 Better Auth 配置中拼接邮件或调用第三方 SDK。
  - 邮箱验证邮件模板独立放在 `src/server/service/email/templates/verify-email.ts`，模板返回 `subject`、`html` 和 `text`。
  - 邮件服务通过 `EMAIL_PROVIDER` 在 `console`、`resend`、`smtp` 之间切换；开发默认可使用 console provider 输出收件人、标题和验证链接。
  - Resend 和 SMTP provider 共享同一套模板输入输出，不影响 Better Auth 调用方。
- 注册成功或登录页因 `EMAIL_NOT_VERIFIED` 跳转过来时，URL 可携带 `email` 参数；验证页必须展示该待验证邮箱并锁定邮箱输入，用户不能改成其他邮箱。
- `auth.api.getSession`：读取当前用户邮箱验证状态。
  - Better Auth 服务端启用 `emailVerification.autoSignInAfterVerification=true`，确保邮件链接验证成功后可以直接访问 /dashboard。

## 实现要点

- 页面可根据 token 参数决定自动验证，或根据 status=pending/status=success/status=failed 展示对应状态。
- 已登录且邮箱已验证的用户访问 /verify-email 时直接重定向 /dashboard，除非当前 URL 是失败状态。
- 如果 Better Auth 回跳携带 error 参数，例如 token 无效或过期，页面展示验证失败状态。
- `email` search param 仅作为待验证邮箱展示和重新发送验证邮件的默认目标，不作为授权依据；真正发送验证邮件仍由 Better Auth 服务端按邮箱和账号状态判断。
- 当页面没有可用的当前待验证邮箱时，才展示可编辑邮箱输入框供用户手动重新发送验证邮件。
- 重新发送按钮增加冷却时间。
- 邮箱验证成功后刷新 session 数据。
- 邮件模板视觉以 `prd/email-template-design.pen` 为准，与密码重置和组织邀请模板保持统一品牌、按钮、页脚和安全提示样式。

## 通用工程约束

- Create T3 App: Next.js App Router, TypeScript, tRPC, Prisma, Tailwind CSS
- Better Auth: authentication, session, admin, organization, passkey, 2FA, API key plugins
- PostgreSQL: Better Auth tables plus optional product-specific extension tables
- shadcn/ui + React Hook Form + Zod: forms, tables, dialogs, validation

## Playwright E2E 测试用例

测试环境使用 `prd/99-e2e-testing-method.md` 中定义的 Playwright + Testcontainers PostgreSQL。

| 用例 ID | 场景 | 前置数据 | 操作 | 预期结果 |
| --- | --- | --- | --- | --- |
| `auth-verify-email-001` | 待验证状态 | 无 | 访问 `/verify-email?status=pending` | 页面返回 200，展示“等待验证”提示、邮箱输入框、重新发送验证邮件按钮、返回登录按钮和主题切换按钮 |
| `auth-verify-email-002` | 失败状态 | 无 | 访问 `/verify-email?status=failed` | 页面展示“验证失败”提示，主动作是重新发送验证邮件 |
| `auth-verify-email-003` | error 参数状态 | 无 | 访问 `/verify-email?error=invalid_token` | 页面展示验证失败提示，不进入 `/dashboard` |
| `auth-verify-email-004` | 成功状态展示 | 无 | 访问 `/verify-email?status=success` | 页面展示“验证成功”提示和进入应用按钮；如果当前已有已验证 session，可按实现重定向 `/dashboard` |
| `auth-verify-email-005` | 已验证登录用户访问 | seed 已验证用户并建立 session | 访问 `/verify-email` | 服务端重定向 `/dashboard` |
| `auth-verify-email-006` | 重新发送验证邮件校验 | 无 | 待验证状态下空邮箱或非法邮箱提交 | 页面展示邮箱校验提示，不发送请求 |
| `auth-verify-email-007` | 重新发送验证邮件成功 | seed 未验证用户 | 在待验证状态输入该邮箱并提交 | 页面展示验证邮件已发送提示，按钮进入冷却状态；服务端日志可包含验证链接 |
| `auth-verify-email-007A` | 当前待验证邮箱锁定 | URL 携带 `email` 参数 | 访问 `/verify-email?email=...&status=pending` | 邮箱输入框展示该邮箱且不可编辑，重新发送使用该邮箱 |
| `auth-verify-email-008` | 有效 token 验证成功 | seed 未验证用户并生成有效 email verification token | 访问 `/verify-email?token=...` | 页面进入验证中后验证成功，刷新 session；正常 Better Auth 邮件链接应最终进入 `/dashboard` |
| `auth-verify-email-009` | 无效 token 验证失败 | 准备无效 token | 访问 `/verify-email?token=invalid` | 页面展示验证失败提示，不更新用户 `emailVerified` |
| `auth-verify-email-010` | 桌面端布局 | 无 | 使用桌面 viewport 访问 `/verify-email?status=pending` | 左侧品牌插画区可见，返回图标按钮固定在右侧操作区左上角，主题切换按钮固定在右上角 |
| `auth-verify-email-011` | 移动端布局 | 无 | 使用移动 viewport 访问 `/verify-email?status=pending` | 左侧品牌插画区不可见，返回图标按钮位于页面左上角，主题切换按钮位于页面右上角，状态卡片不横向溢出 |
| `auth-verify-email-012` | 返回登录 | 无 | 点击左上角返回图标按钮 | 跳转 `/sign-in` |
| `auth-verify-email-013` | 主题切换 | 无 | 点击主题切换按钮 | `html` 的 `dark` class 在 light/dark 间切换 |

### 自动化落地

- 对应测试文件：`e2e/specs/05-verify-email.spec.ts`。
- DB-backed 流程只在 Chromium 项目执行，移动端项目跳过同一套数据库写入/邮箱验证断言。
- 已覆盖：pending/failed/error/success 状态、重新发送邮箱校验、重新发送成功与冷却、已验证用户访问重定向 `/dashboard`、页面 token 验证、Better Auth 邮件验证链接进入 `/dashboard`、无效 token 不更新 `emailVerified`、返回登录、主题切换。

## 验收标准

- 页面在未授权、加载、空数据、错误、成功状态下均有明确反馈。
- 所有敏感动作必须在服务端重新校验 session 和权限。
- 表单字段均有客户端和服务端校验。
- 高危操作必须二次确认。
