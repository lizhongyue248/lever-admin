# 17 邮件发送服务与模板

- 范围：服务端邮件发送抽象与认证相关邮件模板。
- 目标：为 Better Auth 邮箱验证、密码重置和组织邀请提供统一、可替换、可测试的邮件发送能力。
- 设计稿：`prd/email-template-design.pen`

## 功能范围

第一版只覆盖认证和身份治理闭环中必须发送的三类事务邮件：

- 邮箱验证邮件：用户注册、登录未验证账号或手动重新发送验证时触发。
- 密码重置邮件：用户在忘记密码页请求重置时触发。
- 组织邀请邮件：组织管理员邀请成员加入公司时触发。

邮件发送服务只负责发送邮件与渲染模板，不负责用户注册、token 生成、邀请状态机或权限校验；这些仍由 Better Auth 和现有 tRPC 服务负责。

## 服务设计

- 统一服务目录：`src/server/service/email/`。
- 统一发送入口：`sendEmail({ to, subject, html, text })`。
- Provider 配置由平台设置服务解析：优先读取数据库 `system_platform_setting`，数据库为空时回退环境变量。
- 环境变量仍用于本地开发、E2E 和首次部署兜底；后台设置页保存后以数据库配置为准。
- Provider 支持：
  - `console`：开发默认值，仅输出收件人、标题和关键链接，不发送真实邮件。
  - `resend`：使用 Resend API 发送生产或预发邮件。
  - `smtp`：使用 SMTP 发送生产或企业私有邮箱服务邮件。
- 所有 provider 共享同一套模板输出，不允许在 provider 中拼接业务内容。
- 发送失败必须记录服务端日志；认证流程前端仍展示当前流程约定的安全文案，避免泄露账号存在性。
- 生产环境不允许使用最终解析后的 `console` provider；如果数据库或环境变量最终解析为 console，服务端必须拒绝发送，避免动作链接进入日志但邮件未真实送达。
- 第一版使用同步发送并让调用方感知 provider 配置错误；组织邀请的数据库写入事务只包裹邀请状态更新和插入，邮件发送在事务提交后触发，避免外部 provider 调用长时间占用数据库事务。
- 后续如需要完全非阻塞发送，应引入 outbox/队列、平台 `waitUntil` 或可观测的后台发送策略，并记录发送状态与失败重试。

## 模板设计

模板文件独立存放：

- `src/server/service/email/templates/verify-email.ts`
- `src/server/service/email/templates/reset-password.ts`
- `src/server/service/email/templates/organization-invitation.ts`

每个模板返回：

- `subject`：邮件标题。
- `html`：邮件 HTML。
- `text`：纯文本兜底内容。

模板视觉规范：

- 视觉来源以 `prd/email-template-design.pen` 为准。
- 三个模板共用同一品牌页头、内容宽度、主按钮、链接兜底、安全提示和页脚样式。
- 邮件宽度以 640px 左右为主，内容在移动邮箱客户端中可自然收缩。
- 设计稿必须同时包含桌面端和手机端邮件预览，并同时覆盖亮色和暗色主题；手机端以窄屏邮箱客户端可读性为准。
- 模板正文不使用不同状态的图标 badge，避免邮箱验证、密码重置、组织邀请形成三套不一致的视觉状态；模板类型可通过文案和轻量文字标签区分。
- 邮件无法读取 Lever Admin Web 应用内的 `next-themes` 用户主题设置；暗色适配应使用邮件客户端支持的 `color-scheme`、`supported-color-schemes` 和 `@media (prefers-color-scheme: dark)` 做渐进增强。
- 邮件模板顶部品牌标识使用与 Web 端一致的 Identity Mesh 图形意象，并在邮件 CSS 的 `prefers-color-scheme: dark` 中切换内部填充与节点颜色，不再使用旧的单字母 `L` 标记。
- 亮色内联样式是默认兼容基准；暗色样式只作为支持暗色模式邮件客户端的覆盖层，不允许让不支持 media query 的客户端出现低对比度内容。
- 暗色配色参考 `prd/dashboard-admin-design.pen`：页面背景使用 `#141414`，邮件卡片使用 `#262626`，辅助区块使用 `#1F1F1F`，边框使用 `#3A3A3A`，主文字使用 `#FFFFFF`，次文字使用 `#A3A3A3`，主按钮仍使用 `#2563EB`。
- CTA 链接必须同时以按钮和明文链接展示，避免邮件客户端禁用按钮样式后无法操作。
- 不在邮件中展示 session token、完整认证 token 或其他敏感凭据；链接只展示由 Better Auth 生成或当前业务路由允许公开访问的短期动作链接。

## 环境变量

环境变量是邮件配置表为空时的兜底来源。第一版仍保留这些变量，方便本地开发、E2E 和首次部署；平台设置页保存配置后，运行时以数据库配置为准。

```env
EMAIL_PROVIDER="console"
EMAIL_FROM="Lever Admin <no-reply@example.com>"

RESEND_API_KEY=""

SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_SECURE="false"
```

## Better Auth 集成点

- `emailVerification.sendVerificationEmail` 调用 `verify-email` 模板和统一发送服务。
- `emailAndPassword.sendResetPassword` 调用 `reset-password` 模板和统一发送服务。
- `organization.sendInvitationEmail` 调用 `organization-invitation` 模板和统一发送服务。
- Better Auth 仍负责 token、验证链接、重置链接、邀请记录和核心状态变更。

## 验收标准

- 三类邮件都通过 `src/server/service/email` 发送，不在 Better Auth 配置中直接调用 provider SDK。
- 数据库配置为空且 `EMAIL_PROVIDER=console` 时，本地开发可看到收件人、标题和动作链接。
- 数据库配置或环境变量解析为 `resend`、`smtp` 时，使用相同模板内容，仅发送通道不同。
- 每个模板都有 HTML 和纯文本版本。
- 邮箱验证、密码重置和组织邀请邮件在视觉上保持统一，并与 `prd/email-template-design.pen` 一致。
- 邮件发送失败可在服务端日志中定位，但不会在忘记密码等敏感流程中暴露账号存在性。
