# 13 用户详情页

- 路由：`/dashboard/admin/users/[id]`
- 目标：查看单个用户完整身份信息，并执行管理动作。

## 功能范围

用户详情页负责查看单个用户完整身份信息，并执行管理动作。

## 页面布局

- 整体布局继承 `06-dashboard.md` 的 DashboardLayout：
  - Sidebar、Topbar、左下角用户菜单、主题切换、面包屑与响应式行为均保持一致。
  - 本页只定义 Main 内容区域布局，不重复定义全局壳层。
- Main 内容区域：
  - 顶部用户信息卡展示头像、名称、邮箱、角色、状态。
  - 操作区展示设置角色、重置密码、封禁、解封、模拟登录、删除。
  - Tabs 展示会话、组织、安全、API Keys。
  - 高危操作集中使用确认弹窗，不放入全局壳层。
- 呈现方式：
  - 直接访问 `/dashboard/admin/users/[id]` 时展示完整用户详情页。
  - 从 `/dashboard/admin/users` 桌面端列表点击用户行时，使用右侧详情抽屉呈现同一用户详情能力。
  - 移动端优先使用完整详情页，避免在窄屏中压缩复杂 Tabs 和高危操作。
  - 抽屉和完整页共享数据、权限校验、表单校验、高危确认与 mutation 反馈，仅布局容器不同。
  - 抽屉模式加载用户详情时使用骨架屏占位，不使用纯文本加载提示。
  - 设计原型需覆盖亮色和暗色主题，并分别展示桌面完整页、桌面抽屉态、移动端完整详情态。

## 用户动作

- 修改用户资料。
- 设置平台角色。
- 重置密码。
- 封禁或解封。
- 模拟登录。
- 查看并撤销会话。
- 查看用户所属组织。
- 从抽屉模式打开完整详情页。
- 从抽屉模式关闭并返回原用户列表状态。

## 接口与逻辑

- `admin.user.get`：读取用户详情和管理态字段。
- `admin.user.update`：更新用户基础资料。
- `admin.user.setRole`：设置 role 字段，禁止越权设置。
- `admin.user.setPassword`：管理员重置用户密码。
- `admin.user.impersonate`：创建模拟登录 session，并标记 impersonatedBy。
- `admin.user.listSessions`：列出该用户所有 session。
- `admin.user.revokeSession`：撤销指定 session。
- `admin.user.revokeAllSessions`：撤销该用户全部 session。

## 实现要点

- 模拟登录期间必须显示醒目提示和停止模拟按钮，具体全局呈现位置以 `06-dashboard.md` 的 DashboardLayout 实现为准。
- 用户详情内容应拆分为可复用详情容器，供完整详情页和列表右侧抽屉共同使用。
- 抽屉模式宽度建议为 640-760px；Tabs 区域在抽屉内纵向滚动，高危确认弹窗覆盖在抽屉之上。
- 抽屉模式使用 shadcn/ui `Sheet` 承载，避免自定义 drawer 基础交互。
- 详情链接必须可复制和直接访问；刷新抽屉态链接时可恢复为完整详情页或重新打开抽屉，但不得丢失用户上下文。
- 默认禁止模拟登录 admin/super_admin，除非 super_admin 明确授权。
- 封禁后立即撤销全部会话。
- 低权限管理员不可操作高权限用户。

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
- 完整详情页和列表右侧抽屉展示同一用户详情数据与管理能力，且权限、错误、空态、加载态保持一致。
