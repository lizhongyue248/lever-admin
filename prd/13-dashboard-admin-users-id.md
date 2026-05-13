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

## 用户动作

- 修改用户资料。
- 设置平台角色。
- 重置密码。
- 封禁或解封。
- 模拟登录。
- 查看并撤销会话。
- 查看用户所属组织。

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
- 默认禁止模拟登录 admin/super_admin，除非 super_admin 明确授权。
- 封禁后立即撤销全部会话。
- 低权限管理员不可操作高权限用户。

## 通用工程约束

- Create T3 App: Next.js App Router, TypeScript, tRPC, Prisma, Tailwind CSS
- Better Auth: authentication, session, admin, organization, passkey, 2FA, API key plugins
- PostgreSQL: Better Auth tables plus optional product-specific extension tables
- shadcn/ui + React Hook Form + Zod: forms, tables, dialogs, validation

## 验收标准

- 页面在未授权、加载、空数据、错误、成功状态下均有明确反馈。
- 所有敏感动作必须在服务端重新校验 session 和权限。
- 表单字段均有客户端和服务端校验。
- 高危操作必须二次确认。
