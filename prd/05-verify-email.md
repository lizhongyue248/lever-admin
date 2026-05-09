# 05 邮箱验证页

- 路由：`/verify-email`
- 目标：处理邮箱验证链接和未验证提醒。

## 功能范围

邮箱验证页负责处理邮箱验证链接和未验证提醒。

## 页面布局

- 结果卡片：验证中、成功、失败、待验证四种状态。
- 成功状态页：仅用于手动 token 验证或异常回退；正常邮件链接验证完成后直接进入 /app。
- 失败状态页：展示“验证失败”，主动作重新发送验证邮件，次动作返回登录。
- 操作区：进入应用、重新发送验证邮件、返回登录。
- 返回登录按钮使用纯图标按钮，固定在右侧操作区域左上角，与右上角主题切换按钮同高、同尺寸，不占用卡片内容空间。
- 移动端：隐藏左侧品牌插画栏，返回图标按钮固定在页面左上角，主题切换按钮固定在页面右上角；验证中、待验证、成功、失败状态卡片均在 24px 横向安全边距内居中展示。

## 用户动作

- 打开验证链接后自动验证 token。
- 打开 Better Auth 生成的 `/api/auth/verify-email?token=...&callbackURL=...` 链接后，由 Better Auth 服务端验证 token 并按 callbackURL 回跳。
- 验证失败后重新发送验证邮件。
- 验证成功后进入 /app，不停留在 /verify-email。

## 接口与逻辑

- `authClient.verifyEmail`：验证邮件 token，更新 user.emailVerified。
- `authClient.sendVerificationEmail`：重新发送验证邮件。
  - 重新发送时使用 `callbackURL=/app`，确保用户点击新验证链接并成功验证后直接进入应用。
- 登录页因 `EMAIL_NOT_VERIFIED` 跳转过来时，URL 可携带 `email` 参数，用于预填重新发送验证邮件的邮箱输入框。
- `auth.api.getSession`：读取当前用户邮箱验证状态。
  - Better Auth 服务端启用 `emailVerification.autoSignInAfterVerification=true`，确保邮件链接验证成功后可以直接访问 /app。

## 实现要点

- 页面可根据 token 参数决定自动验证，或根据 status=pending/status=success/status=failed 展示对应状态。
- 已登录且邮箱已验证的用户访问 /verify-email 时直接重定向 /app，除非当前 URL 是失败状态。
- 如果 Better Auth 回跳携带 error 参数，例如 token 无效或过期，页面展示验证失败状态。
- `email` search param 仅作为表单预填，不作为授权依据；真正发送验证邮件仍由 Better Auth 服务端按邮箱和账号状态判断。
- 重新发送按钮增加冷却时间。
- 邮箱验证成功后刷新 session 数据。

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
