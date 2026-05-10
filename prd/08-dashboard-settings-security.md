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

## 实现要点

- 关闭 2FA、删除 Passkey、解绑最后登录方式必须二次确认。
- Passkey 注册必须在客户端组件中调用浏览器 WebAuthn API。
- 所有安全操作完成后显示 toast 并刷新当前分区。

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
