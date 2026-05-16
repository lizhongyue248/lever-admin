# 15 平台组织管理页

- 路由：`/dashboard/admin/orgs`
- 目标：为平台超级管理员管理所有平台组织，并进入单个组织的完整治理页面。

## 功能范围

平台组织管理页负责平台级组织治理。它面向平台 super_admin/admin，不面向普通组织成员。

本页进入后直接展示当前平台的所有组织信息，支持搜索、筛选、创建组织和进入组织治理详情。单个组织的概览、邀请、组织架构、登录情况和设置使用 `10-dashboard-orgs-slug-settings.md` 定义的同一组页面；平台管理员进入后拥有额外的删除、停用和跨组织治理权限。

## 页面布局

- 整体布局继承 `06-dashboard.md` 的 DashboardLayout：
  - Sidebar、Topbar、左下角用户菜单、主题切换、面包屑与响应式行为均保持一致。
  - 本页只定义 Main 内容区域布局，不重复定义全局壳层。
- Main 内容区域：
  - 内容区不额外展示页面标题和子标题，当前位置由 Topbar 面包屑表达。
  - 顶部先展示搜索、筛选和创建组织工具条。
  - 统计区展示四个卡片：组织总数、部门总数、成员总数和待处理邀请数，避免桌面端统计卡片换行。
  - 工具栏展示搜索、状态筛选、成员规模筛选、创建时间排序和创建组织入口。
  - 创建组织入口打开创建组织弹窗，不跳转独立创建组织页面。
- 组织列表可使用卡片或表格，第一版优先使用卡片网格，展示组织名称、slug、owner、成员数、部门数、待处理邀请数、活跃会话数、创建时间、状态和风险提示。状态和风险提示必须来自数据库或服务端计算，不允许固定显示正常或固定风险为 0。
  - 列表分页控件使用共享 `DataPagination`；首页、上一页、下一页、末页为图标按钮，页码输入框支持输入后按 Enter 跳转。
  - 点击组织卡片或列表项进入 `/dashboard/orgs/[slug]`，复用当前组织管理页面和五个 tab。
  - 卡片操作区提供进入详情、停用或删除组织入口；删除等高危操作只对 super_admin 展示。
  - 移动端组织列表切换为单列卡片，筛选区折叠为抽屉或可换行工具栏。

## 用户动作

- 搜索和筛选所有组织。
- 查看组织基础信息、成员数、部门数和风险摘要。
- 进入单个组织的概览、邀请、组织架构、登录情况和设置页面。
- 查看或忽略平台风险提示。
- 通过弹窗创建组织。
- 封禁或停用组织，可选。
- 删除组织，可选，高危操作。

## 接口与逻辑

- `admin.org.list`：分页查询所有组织，支持搜索、状态筛选和分页，返回成员数、部门数、待处理邀请数、活跃会话数、状态、总数和页数。
- `admin.org.getOverview`：聚合平台组织数量、部门数量、成员数量、待处理邀请数量和异常会话数量。
- `org.create` 或 `admin.org.create`：按当前权限创建组织，并返回新组织 slug。
- `admin.org.updateStatus`：校验平台管理员权限后更新组织状态，可选。
- `admin.org.delete`：校验 super_admin 权限，二次确认后删除组织，可选。

### 平台组织真实数据口径

平台组织管理页不得使用静态状态、静态风险或空操作。

组织列表数据来源：

- 组织基础信息来自 `auth_organization`。
- 成员数来自 `auth_member` 按 `organization_id` 去重统计。
- 部门数来自 `system_organization_department`。
- 待处理邀请数来自 `auth_invitation` 中 `status='pending'` 且未过期的记录。
- 活跃会话数来自组织成员对应 `auth_session` 中未过期记录。
- owner 信息来自 `auth_member.role='owner'` 关联 `auth_user`，第一版最多展示 2 个 owner，更多显示 `+N`。
- 风险数 `riskCount` 使用 `10-dashboard-orgs-slug-settings.md` 中定义的组织风险口径，按组织成员最近 30 天高风险请求、超量活跃会话和长期会话风险计算。
- 平台总览 `riskySessionCount` 为所有组织范围内满足会话风险规则的未过期会话数；同一个会话只计一次。

组织状态设计：

- 第一版必须新增或使用可持久化状态字段，推荐在 `auth_organization` 增加 `status`，取值为 `active`、`disabled`。
- 如短期内不增加字段，则页面不得展示“状态筛选”“停用组织”和“已停用”状态；只能展示真实可用的组织列表。
- `admin.org.updateStatus` 必须落库更新组织状态，并写入系统请求日志或审计事件；不能只返回 `{ organizationId, status }`。
- `status='disabled'` 的组织：
  - 普通组织成员不能进入该组织治理页。
  - 平台管理员仍可进入查看和恢复。
  - 该组织不能继续发送新邀请。
  - 已有活跃会话不因停用组织自动删除，但组织相关操作应被服务端拒绝。

风险与状态展示处理：

- 风险为 0 时展示“暂无风险”或隐藏风险 badge；风险为正数时展示风险 badge，并可跳转该组织登录情况页或组织架构页的风险筛选。
- 状态筛选必须在服务端查询中生效，不能先分页后在内存中过滤，否则会导致总数和分页错误。
- 删除、停用、恢复组织均属于高危或准高危操作，必须二次确认并记录到 `system_request_log`。

## 实现要点

- 本页必须使用 adminProcedure 校验平台管理员角色。
- support 角色如存在，只允许只读访问，不允许封禁、停用或删除组织。
- 创建组织使用共享弹窗表单，字段保持名称、slug 和可选 logo，不单独提供 `/dashboard/orgs/new` 页面。
- 平台管理员可查看所有组织的摘要信息，但不暴露完整 session token。
- 组织删除、停用、封禁等高危操作必须二次确认，并记录审计事件。
- 单个组织详情入口跳转到 `/dashboard/orgs/[slug]`，并沿用概览、邀请、组织架构、登录情况和设置 tab。
- 平台管理员在单个组织治理页可看到额外平台级操作；组织 owner/admin 仍只能看到当前组织权限范围内的操作。

## 通用工程约束

- Create T3 App: Next.js App Router, TypeScript, tRPC, Drizzle ORM, Tailwind CSS
- Better Auth: authentication, session, admin, organization, passkey, 2FA, API key plugins
- PostgreSQL: Better Auth tables plus optional product-specific extension tables
- shadcn/ui + Zod: forms, tables, dialogs, validation

## 公共组件使用

- 组织列表第一版优先使用卡片网格，不使用共享 `DataTable`；如果后续切换为表格视图，必须使用 `src/components/data-table.tsx` 的共享 `DataTable`。
- 分页控件使用 `src/components/data-pagination.tsx` 的共享 `DataPagination`，页面负责维护 `page`、筛选条件和刷新状态。
- 创建组织、停用、恢复和删除弹窗属于页面业务组件，不放入公共组件。

## 验收标准

- 页面在未授权、加载、空数据、错误、成功状态下均有明确反馈。
- 进入页面后直接展示平台组织列表或卡片，不要求先选择组织。
- 每个组织项都展示成员数、部门数、状态和风险摘要。
- 点击组织项可以进入 `/dashboard/orgs/[slug]` 的同一套组织治理页面。
- 创建组织使用弹窗完成，不跳转独立创建页面。
- 所有敏感动作必须在服务端重新校验 session 和权限。
- 表单字段均有客户端和服务端校验。
- 高危操作必须二次确认。
