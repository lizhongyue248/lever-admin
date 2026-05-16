# 11 管理概览页

- 路由：`/dashboard/admin`
- 目标：为平台管理员提供用户、组织和 API Key 的平台级治理入口。

## 功能范围

管理概览页负责展示平台级治理摘要。它面向平台 admin/super_admin，不面向普通用户或普通组织管理员。

## 页面布局

- 整体布局继承 `06-dashboard.md` 的 DashboardLayout：
  - Sidebar、Topbar、左下角用户菜单、主题切换、面包屑与响应式行为均保持一致。
  - 本页只定义 Main 内容区域布局，不重复定义全局壳层。
- Main 内容区域：
  - 页面标题区展示「管理概览」和平台治理说明。
  - 统计卡片展示用户总数、活跃用户、平台组织数、异常会话和 API Key 数。
  - 快捷入口卡片提供用户管理、平台组织管理、平台 API Key 管理跳转。
  - 风险列表展示待处理封禁、异常登录、过期邀请和高风险 API Key。

## 用户动作

- 查看平台治理摘要。
- 跳转用户管理。
- 跳转平台组织管理。
- 跳转平台 API Key 管理：`/dashboard/admin/api-keys`，对应 `14-dashboard-admin-api-keys.md`。
- 处理平台风险事项。

## 接口与逻辑

- `admin.dashboard.getOverview`：聚合平台级用户、组织、会话、邀请和 API Key 摘要。
- `admin.dashboard.getRiskItems`：读取平台待处理风险事项。

### 管理概览真实数据口径

管理概览页不得使用示例风险、固定异常会话数或静态快捷摘要。所有统计和风险列表必须由服务端从真实表聚合。

- 用户总数、活跃用户来自 `system_user` 和最近 30 天 `system_session` / `system_request_log`。
- 平台组织数、部门数、成员数和待处理邀请来自 `system_organization`、`system_organization_department`、`system_member`、`system_invitation`。
- 异常会话沿用 `09-dashboard-settings-sessions.md` 和 `10-dashboard-orgs-slug-settings.md` 的会话风险规则，按全平台去重统计。
- API Key 数和风险 API Key 来自 `system_apikey` 与 `system_api_key_usage_log`，风险规则与 `14-dashboard-admin-api-keys.md` 保持一致。
- 风险列表只展示真实存在的待处理项；没有风险时展示空态，不展示固定“过期邀请”“异常登录”等示例条目。

## 实现要点

- 本页必须使用 adminProcedure 校验平台管理员角色。
- 普通用户和组织管理员不能访问。
- 快捷入口只展示当前管理员有权限访问的模块。
- API Key 快捷入口只进入平台级统一治理页面，不承担当前管理员个人 API Key 创建；管理员创建自己的个人 API Key 使用 `16-dashboard-settings-api-keys.md` 的 `/dashboard/settings/api-keys`。
- 平台组织统计包含公司组织数量、部门数量、成员数量、待处理邀请和停用组织摘要；部门不是独立组织。

## 通用工程约束

- Create T3 App: Next.js App Router, TypeScript, tRPC, Drizzle ORM, Tailwind CSS
- Better Auth: authentication, session, admin, organization, passkey, 2FA, API key plugins
- PostgreSQL: Better Auth tables plus optional product-specific extension tables
- shadcn/ui + Zod: forms, tables, dialogs, validation

## 公共组件使用

- 本页第一版不使用共享 `DataTable` 或 `DataPagination`，因为管理概览只展示统计卡片、快捷入口和短风险列表。
- 如风险列表扩展为可搜索、可分页表格，应使用 `98-common-components.md` 中定义的共享 `DataTable` 和 `DataPagination`。

## 验收标准

- 页面在未授权、加载、空数据、错误、成功状态下均有明确反馈。
- 所有敏感动作必须在服务端重新校验 session 和权限。
- 表单字段均有客户端和服务端校验。
- 高危操作必须二次确认。
