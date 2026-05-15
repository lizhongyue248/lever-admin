# 12 用户管理页

- 路由：`/dashboard/admin/users`
- 目标：平台管理员查询和管理所有用户。

## 功能范围

用户管理页负责平台管理员查询和管理所有用户。

## 页面布局

- 整体布局继承 `06-dashboard.md` 的 DashboardLayout：
  - Sidebar、Topbar、左下角用户菜单、主题切换、面包屑与响应式行为均保持一致。
  - 本页只定义 Main 内容区域布局，不重复定义全局壳层。
- Main 内容区域：
  - 页面标题区展示「用户管理」和平台用户治理说明，标题区位于内容区域顶部，不放入表格卡片内。
  - 表格卡片内顶部展示搜索、角色筛选、状态筛选、创建用户按钮。
- 表格卡片内展示头像、名称、邮箱、角色、状态、邮箱验证、创建时间、操作。
- 桌面表格使用共享 `DataTable`，基于 TanStack Table 渲染表头、行和单元格。
- 分页控件使用共享 `DataPagination`；首页、上一页、下一页、末页为图标按钮，页码输入框支持输入后按 Enter 跳转。
- 操作列使用 shadcn/ui `DropdownMenu`，提供设置角色、重置密码、封禁/解封、删除入口，并复用对应确认弹窗。
- 桌面端点击表格行打开右侧用户详情抽屉，抽屉内容复用 `13-dashboard-admin-users-id.md` 的用户详情核心信息和管理动作。
- 详情抽屉打开时，列表筛选、分页和滚动位置保持不变；关闭抽屉后回到当前列表状态。
- 详情抽屉宽度建议为 640-760px，并支持直接跳转到完整详情页。
- 详情抽屉拉取用户详情时使用骨架屏展示用户信息、操作区和 Tabs 内容占位，不使用纯文本加载提示。
- 弹窗承载创建用户、封禁原因、删除确认。
  - 移动端表格可切换为用户卡片列表；点击用户卡片优先进入完整详情页，保留筛选和高危操作确认。
  - 设计原型需覆盖亮色和暗色主题，并分别展示桌面列表、桌面详情抽屉、移动端列表、移动端详情状态。

## 用户动作

- 搜索用户。
- 按角色、状态筛选。
- 创建用户。
- 点击表格行或用户卡片进入用户详情；桌面端默认从右侧打开详情抽屉，移动端默认进入完整详情页。
- 从详情抽屉跳转到完整用户详情页。
- 封禁或解封用户。
- 删除用户。

## 接口与逻辑

- `admin.user.list`：封装 authClient.admin.listUsers，支持搜索、分页、排序、筛选。
- `admin.user.create`：创建用户并设置初始角色。
- `admin.user.ban`：封禁用户并撤销全部会话。
- `admin.user.unban`：解除用户封禁。
- `admin.user.remove`：硬删除用户，高危操作。

## 实现要点

- 默认按 createdAt 倒序。
- 桌面端详情抽屉应与 `/dashboard/admin/users/[id]` 保持同一数据来源和权限逻辑，不在列表页复制详情业务逻辑。
- 桌面端详情抽屉使用 shadcn/ui `Sheet` 承载，不手写 fixed overlay/drawer 基础组件。
- 详情抽屉打开时可同步浅层路由或查询参数，确保刷新、复制链接或直接访问时能够回到对应用户详情。
- 管理员不能删除自己。
- support 不可封禁或删除 admin/super_admin。
- 所有 destructive action 需要确认弹窗。

## 通用工程约束

- Create T3 App: Next.js App Router, TypeScript, tRPC, Drizzle ORM, Tailwind CSS
- Better Auth: authentication, session, admin, organization, passkey, 2FA, API key plugins
- PostgreSQL: Better Auth tables plus optional product-specific extension tables
- Existing component patterns + @tanstack/react-form where forms are introduced + Zod: forms, tables, dialogs, validation

## 验收标准

- 页面在未授权、加载、空数据、错误、成功状态下均有明确反馈。
- 所有敏感动作必须在服务端重新校验 session 和权限。
- 表单字段均有客户端和服务端校验。
- 高危操作必须二次确认。
- 桌面端从列表打开详情抽屉时，列表状态不丢失；直接访问详情链接时仍可进入完整详情页。
