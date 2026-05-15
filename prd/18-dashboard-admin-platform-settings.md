# 18 平台设置页

- 路由：`/dashboard/admin/settings`
- 目标：为平台超级管理员提供平台级运行配置入口，第一版聚焦邮件服务配置和测试邮件发送。
- 设计稿：`prd/dashboard-platform-settings-design.pen`

## 功能范围

平台设置页负责管理会影响整个平台运行行为的配置。第一版只开放邮件服务配置，后续可在同一页面追加安全策略、登录策略、通知策略等平台级设置。

第一版包含：

- 邮件服务 provider 配置：`console`、`resend`、`smtp`。
- 发件人配置：邮件 From 显示名称和邮箱。
- Resend API Key 配置。
- SMTP 主机、端口、用户名、密码、TLS/SSL 配置。
- 保存配置。
- 发送测试邮件。

第一版不包含：

- 任意 key/value 可视化编辑器。
- 邮件发送日志列表。
- 邮件模板编辑器。
- 多租户或组织级邮件配置。
- 队列、重试、投递状态追踪和 webhook 回执。

## 页面布局

- 整体布局继承 `06-dashboard.md` 的 DashboardLayout：
  - Sidebar、Topbar、左下角用户菜单、主题切换、面包屑与响应式行为均保持一致。
  - 本页只定义 Main 内容区域布局，不重复定义全局壳层。
- Sidebar 管理分组新增「平台设置」入口，位于「平台 API Key」之后。
- Main 内容区域：
  - 页面标题区展示「平台设置」和说明文案。
  - 当前版本只展示一个「邮件服务」设置卡片。
  - 邮件服务卡片内包含 provider、发件人、Resend、SMTP、测试邮件和安全提示。
  - 保存配置按钮位于邮件配置表单底部，测试邮件操作位于同一卡片的测试区域。
  - 后续平台设置按同一页面继续追加独立设置卡片，不在当前版本做统计区或平台概览区。
  - 桌面端卡片内部可使用左右布局组织表单与测试邮件；移动端卡片内部改为单列。

## 用户动作

- 查看当前邮件服务配置状态。
- 切换邮件 provider。
- 填写或更新邮件服务配置。
- 保存邮件服务配置。
- 向指定邮箱发送测试邮件。
- 在保存失败、配置缺失或测试发送失败时查看明确但不泄露敏感值的错误提示。

## 权限与安全

- 页面仅面向平台级配置管理。
- `super_admin` 可以访问、保存配置和发送测试邮件。
- `admin` 不允许修改邮件服务配置；第一版可直接禁止访问本页并返回 forbidden 状态。
- 普通用户、support、组织管理员不能访问。
- 所有查询和修改必须使用服务端 tRPC procedure 重新校验平台角色，不能依赖隐藏 UI。
- 敏感字段包括：
  - `email.resend.apiKey`
  - `email.smtp.password`
- 敏感字段保存后不向客户端回显明文，只返回 `configured: true/false`。
- 敏感字段表单使用密码输入框；留空提交表示不覆盖已有敏感值，显式点击「清除」才删除。
- 测试邮件不能展示完整 provider 密钥、SMTP 密码、session token 或认证链接。
- 生产环境不允许使用 `console` provider 作为真实邮件通道；保存为 `console` 时服务端应阻止，或至少在生产环境发送时拒绝并返回配置错误。

## 数据模型

新增通用平台配置表 `system_platform_setting`，采用受控 key/value 模型。页面不提供任意 key 编辑能力，只通过受控 schema 读写邮件配置 key。

表字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `key` | text primary key | 配置键，例如 `email.provider` |
| `value` | text | 配置值；敏感值可存加密后的字符串 |
| `updatedBy` | text nullable | 最后修改人 user id |
| `createdAt` | timestamp | 创建时间 |
| `updatedAt` | timestamp | 更新时间 |

第一版邮件配置 key：

| Key | 类型 | 示例 | 说明 |
| --- | --- | --- | --- |
| `email.provider` | enum | `console` | `console`、`resend`、`smtp` |
| `email.from` | string | `Lever Admin <no-reply@example.com>` | 发件人 |
| `email.resend.apiKey` | secret string | masked | Resend API Key |
| `email.smtp.host` | string | `smtp.gmail.com` | SMTP host |
| `email.smtp.port` | number | `587` | SMTP port |
| `email.smtp.user` | string | `user@example.com` | SMTP 用户名 |
| `email.smtp.password` | secret string | masked | SMTP 密码 |
| `email.smtp.secure` | boolean | `false` | 是否使用 secure SMTP |

## 配置读取优先级

- 邮件服务运行时优先读取数据库配置。
- 数据库没有配置时，允许回退到当前环境变量，确保本地开发、E2E 和首次部署不会因为配置表为空而无法启动。
- 保存过数据库邮件配置后，运行时使用数据库值作为最终配置。
- `.env.example` 仍保留邮件相关变量作为启动兜底和首次迁移说明；设置页不单独展示环境变量兜底卡片。

## 接口与逻辑

- `adminPlatformSetting.getEmailSettings`
  - `super_admin` 查询当前邮件配置。
  - 返回 provider、from、非敏感字段和敏感字段是否已配置。
- `adminPlatformSetting.updateEmailSettings`
  - `super_admin` 保存邮件配置。
  - 使用 Zod 校验 provider 对应必填项：
    - `console`：需要 `email.from`；生产环境不可启用。
    - `resend`：需要 `email.from` 和已配置的 Resend API Key。
    - `smtp`：需要 `email.from`、host、port、user、password。
  - 敏感字段留空时保留原值。
  - 敏感字段显式清除时删除对应 key。
- `adminPlatformSetting.sendTestEmail`
  - `super_admin` 输入测试收件人邮箱后发送测试邮件。
  - 使用当前已保存配置发送，不使用未保存的表单状态。
  - 测试邮件 subject 包含「Lever Admin 测试邮件」。
  - 测试邮件正文说明 provider、发送时间和操作者邮箱，不包含密钥或内部 token。

## 邮件服务集成

- `src/server/service/email` 的统一发送入口继续为所有认证和组织邀请邮件提供服务。
- 邮箱验证、密码重置和组织邀请仍调用统一 `sendEmail({ to, subject, html, text })`。
- `sendEmail` 内部从平台配置服务获取邮件 provider 配置。
- Provider 实现仍然只负责发送，不拼接业务模板。
- 如果数据库配置不完整，发送入口应返回可定位的服务端错误；忘记密码等敏感流程前端仍保持原有防枚举文案。
- `prd/17-email-service.md` 需要在实现时同步更新为「数据库配置优先，环境变量兜底」。

## 表单校验与反馈

- Provider 使用分段控制或选择器。
- `from` 必填，必须符合邮件 From 语义；第一版可用字符串校验，至少不能为空。
- Resend 模式下 API Key 必须已配置。
- SMTP 模式下 host、port、user、password 必须已配置。
- port 必须为正整数。
- secure 使用开关。
- 保存成功显示 toast。
- 保存失败显示错误提示，不暴露密钥明文。
- 发送测试邮件成功显示 toast，并可在邮件服务卡片内展示本次操作反馈。
- 发送测试邮件失败显示 provider 和错误类型的安全文案，例如「SMTP 连接失败，请检查主机、端口和凭据」。

## 页面状态

- Loading：展示设置页骨架屏。
- Empty：配置表为空时展示邮件服务表单默认值和未配置敏感字段状态。
- Error：配置读取失败时展示错误卡片和重试入口。
- Forbidden：非 `super_admin` 访问时展示无权限状态或服务端重定向到 `/dashboard`。
- Success：展示当前配置和已配置敏感字段状态。

## 实现要点

- 新增 `src/server/api/routers/admin-platform-setting.ts`，使用 `adminProcedure` 后再校验 `role === "super_admin"`。
- 新增 `src/server/service/platform-settings/`，封装受控 key/value 读取、写入、默认值和邮件配置解析。
- 新增或扩展 `src/server/service/email`，让 provider 配置从平台设置服务解析得到。
- 新增页面路径 `src/app/dashboard/admin/settings/page.tsx`。
- 页面客户端组件放在 `src/app/dashboard/admin/settings/_components/`。
- 新增 PRD 对应的 E2E 文件 `e2e/specs/18-dashboard-admin-platform-settings.spec.ts`。
- 不提供任意 key/value 管理 UI；所有 key 必须由服务端 schema 显式允许。
- 不运行 `pnpm db:generate`、`pnpm db:migrate` 或 `pnpm db:push`，除非用户明确要求执行数据库迁移命令。

## Playwright E2E 测试用例

测试环境使用 `prd/99-e2e-testing-method.md` 中定义的 Playwright + Testcontainers PostgreSQL。

| 用例 ID | 场景 | 前置数据 | 操作 | 预期结果 |
| --- | --- | --- | --- | --- |
| `admin-platform-settings-001` | 非登录访问 | 无 session | 访问 `/dashboard/admin/settings` | 重定向 `/sign-in?redirectTo=%2Fdashboard%2Fadmin%2Fsettings` |
| `admin-platform-settings-002` | 非 super_admin 访问 | 建立普通 admin 或 user session | 访问 `/dashboard/admin/settings` | 展示 forbidden 或跳转 `/dashboard` |
| `admin-platform-settings-003` | super_admin 查看空配置 | 建立 super_admin session，配置表为空 | 访问页面 | 展示邮件服务表单默认值和未配置敏感字段状态 |
| `admin-platform-settings-004` | 保存 console 配置 | super_admin session，测试环境 | 选择 `console`，填写 From，保存 | `system_platform_setting` 写入 `email.provider` 和 `email.from`，页面显示保存成功 |
| `admin-platform-settings-005` | 保存 resend 配置 | super_admin session | 选择 `resend`，填写 From 和 API Key，保存 | 数据库写入 provider/from/apiKey，API Key 不回显明文，仅显示已配置 |
| `admin-platform-settings-006` | 保存 smtp 配置 | super_admin session | 选择 `smtp`，填写 host、port、user、password、secure，保存 | 数据库写入 SMTP 配置，password 不回显明文，仅显示已配置 |
| `admin-platform-settings-007` | 敏感字段留空不覆盖 | 已有 Resend API Key | 保存 Resend 配置但 API Key 留空 | 原 API Key 保留，页面仍显示已配置 |
| `admin-platform-settings-008` | 发送测试邮件成功 | 已保存 console provider | 输入测试收件人并发送 | 页面提示测试邮件已发送，服务端日志包含测试邮件元数据 |
| `admin-platform-settings-009` | 发送测试邮件校验 | super_admin session | 测试收件人为空或格式错误后提交 | 页面展示校验错误，不发送请求 |
| `admin-platform-settings-010` | 配置不完整时测试失败 | provider 为 smtp 但缺少 host 或 password | 发送测试邮件 | 页面展示安全错误文案，不暴露敏感值 |

## 验收标准

- 平台设置页有独立 PRD 和 pencli 设计确认后再编码。
- Sidebar 管理分组包含平台设置入口。
- 页面只能由 `super_admin` 修改邮件配置和发送测试邮件。
- 新增配置表采用受控 key/value 模型，不暴露任意 key 编辑能力。
- 邮件服务运行时优先读取数据库配置，数据库为空时回退环境变量。
- 敏感配置保存后不向客户端回显明文。
- 测试邮件使用已保存配置发送，并有成功、失败、校验和 loading 状态。
- 认证邮件、密码重置邮件和组织邀请邮件继续通过统一邮件服务发送。
- 页面在 loading、empty、error、forbidden、success 状态下均有明确反馈。
- 所有敏感动作必须在服务端重新校验 session 和权限。
- 表单字段均有客户端和服务端校验。
