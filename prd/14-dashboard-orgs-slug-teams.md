# 14 团队管理页

- 路由：`/dashboard/orgs/[slug]/teams`
- 目标：管理组织下的团队和团队成员。

## 功能范围

团队管理页负责管理组织下的团队和团队成员。

## 页面布局

- 整体布局继承 `06-dashboard.md` 的 DashboardLayout：
  - Sidebar、Topbar、左下角用户菜单、主题切换、面包屑与响应式行为均保持一致。
  - 本页只定义 Main 内容区域布局，不重复定义全局壳层。
- Main 内容区域：
  - 页面标题区展示「团队管理」和团队协作说明。
  - 桌面端使用左右分栏：左侧团队列表，右侧团队详情和成员管理。
  - 窄屏改为上方团队列表加详情抽屉或下方详情区。
  - 团队列表展示名称、成员数、创建时间和活跃状态。
  - 操作区提供创建团队、编辑、删除、设置活跃团队。

## 用户动作

- 创建团队。
- 修改团队名称。
- 删除团队。
- 添加组织成员到团队。
- 从团队移除成员。
- 设置当前活跃团队。

## 接口与逻辑

- `org.team.list`：读取组织团队列表。
- `org.team.create`：校验 team:create 权限和团队数量限制后创建。
- `org.team.update`：校验 team:update 权限后更新名称。
- `org.team.delete`：校验 team:delete 权限后删除团队。
- `org.team.member.add`：确认用户是组织成员后加入团队。
- `org.team.member.remove`：从 teamMember 中移除用户。

## 实现要点

- 团队功能需要 Better Auth organization teams.enabled = true。
- 团队成员必须先属于组织。
- 删除团队需要二次确认。
- 可配置 maximumTeams 和 maximumMembersPerTeam。

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
