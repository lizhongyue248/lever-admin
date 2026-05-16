# 08 安全设置页

- 路由：`/dashboard/settings/security`
- 目标：集中管理密码、双因素认证、Passkey 和第三方账号绑定。

## 功能范围

安全设置页负责集中管理密码、双因素认证、Passkey 和第三方账号绑定。

## 页面布局

- 整体布局继承 `06-dashboard.md` 的 DashboardLayout：
  - Sidebar、Topbar、左下角用户菜单、主题切换、面包屑与响应式行为均保持一致。
  - 本页只定义 Main 内容区域布局，不重复定义全局壳层。
- Main 内容区域：
  - 页面标题区展示「安全设置」和账号安全说明。
  - 分区卡片依次展示密码、双因素认证、Passkey、第三方账号、最近登录方式。
  - 每个分区使用独立操作按钮，避免一个大表单混杂高危动作。
  - 高危动作通过独立确认弹窗承载，不挤入全局导航区域。

## 用户动作

- 修改密码。
- 开启或关闭 2FA。
- 新增或删除 Passkey。
- 绑定或解绑 GitHub / Google。
- 查看最近登录方式。

## 接口与逻辑

- `security.getOverview`：tRPC 聚合 2FA 状态、Passkey 列表、OAuth 账号列表。
- `authClient.twoFactor.*`：开启、验证、关闭双因素认证。
- `authClient.passkey.*`：注册、列出和删除 WebAuthn Passkey。
- `authClient.changePassword`：校验旧密码后更新密码。

### 安全状态真实数据口径

安全设置页不得使用固定 OAuth 状态或无法解释的安全分。页面展示的每个 provider、分数和状态都必须来自服务端配置或真实账号绑定记录。

账号安全维度：

- 密码：来自 `system_account` 中 credential/email provider 记录或 `password is not null` 的账号记录。
- 2FA：来自 `system_user.two_factor_enabled` 和 `system_two_factor.verified`。
- Passkey：来自 `system_passkey` 当前用户记录数。
- OAuth：来自 `system_account.provider_id` 中非 credential provider 的绑定记录。
- 会话风险：来自 `system_session` 和 `system_request_log`，与 `09-dashboard-settings-sessions.md` 的会话风险口径保持一致。

安全分规则：

- 每个维度由服务端计算 `value`，前端只展示。
- 二值能力如密码、2FA、Passkey 已启用为 `100`，未启用为 `0`，不要使用没有说明的固定 `35`。
- 会话维度按当前用户风险会话数计算：无风险为 `100`，存在中风险为 `70`，存在高风险为 `40`，同时存在多个高风险最低为 `20`。
- 总分为各维度平均值，四舍五入。

OAuth provider 配置：

- `security.getOverview` 必须根据服务端可用 provider registry 返回 provider 列表。
- 第一版 provider registry 至少包含 GitHub；Google 只有在 Better Auth 服务端和客户端均配置完成时才显示为可绑定。
- 未配置 provider 可以显示为“未配置”但必须来自配置检测结果，不能在接口中固定 `configured: false`。
- 已绑定状态来自 `system_account.provider_id`，解绑操作必须校验当前账号仍保留至少一种可用登录方式。

## 实现要点

- 关闭 2FA、删除 Passkey、解绑最后登录方式必须二次确认。
- Passkey 注册必须在客户端组件中调用浏览器 WebAuthn API。
- 所有安全操作完成后显示 toast 并刷新当前分区。
- 首版 GitHub 绑定使用现有 Better Auth GitHub provider；Google provider 仅在服务端 provider registry 检测到完整配置时展示可绑定，否则展示为「未配置」且按钮禁用。
- 自动化测试不直接完成 WebAuthn 设备注册和真实 TOTP 校验，只覆盖入口、弹窗、校验提示和可用状态；真实浏览器能力由 Better Auth 客户端 API 承接。
- 页面聚合接口只返回展示所需字段，不返回 session token、OAuth token、Passkey public key / credential ID、2FA secret 或 backup codes。

## 通用工程约束

- Create T3 App: Next.js App Router, TypeScript, tRPC, Drizzle ORM, Tailwind CSS
- Better Auth: authentication, session, admin, organization, passkey, 2FA, API key plugins
- PostgreSQL: Better Auth tables plus optional product-specific extension tables
- shadcn/ui + React Hook Form + Zod: forms, tables, dialogs, validation

## 公共组件使用

- 本页不使用共享 `DataTable` 或 `DataPagination`，因为安全设置第一版以独立安全能力卡片和确认弹窗为主，没有标准分页表格。
- 如后续 Passkey、OAuth 账号或安全事件扩展为分页列表，应优先评估 `98-common-components.md` 中定义的共享表格和分页组件。

## 验收标准

- 页面在未授权、加载、空数据、错误、成功状态下均有明确反馈。
- 所有敏感动作必须在服务端重新校验 session 和权限。
- 表单字段均有客户端和服务端校验。
- 高危操作必须二次确认。
