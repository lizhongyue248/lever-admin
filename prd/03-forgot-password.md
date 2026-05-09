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
- Better Auth: authentication, session, admin, organization, team, passkey, 2FA, API key plugins
- PostgreSQL: Better Auth tables plus optional product-specific extension tables
- shadcn/ui + React Hook Form + Zod: forms, tables, dialogs, validation

## 验收标准

- 页面在未授权、加载、空数据、错误、成功状态下均有明确反馈。
- 所有敏感动作必须在服务端重新校验 session 和权限。
- 表单字段均有客户端和服务端校验。
- 高危操作必须二次确认。
