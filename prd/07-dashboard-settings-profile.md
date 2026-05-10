# 07 个人资料页

- 路由：`/dashboard/settings/profile`
- 目标：让用户查看和维护自己的基础资料。

## 功能范围

个人资料页负责让用户查看和维护自己的基础资料。

## 页面布局

- 整体布局继承 `06-dashboard.md` 的 DashboardLayout：
  - Sidebar、Topbar、左下角用户菜单、主题切换、面包屑与响应式行为均保持一致。
  - 本页只定义 Main 内容区域布局，不重复定义全局壳层。
- Main 内容区域：
  - 页面标题区展示「个人资料」和简短说明。
  - 表单卡片展示头像、名称、邮箱、用户 ID、创建时间。
  - 底部操作区展示保存、取消按钮。
  - 保存成功后在内容区显示 toast 或成功状态反馈。

## 用户动作

- 修改名称。
- 修改头像 URL；文件上传后置，不在第一版实现。
- 查看邮箱和用户 ID。
- 保存资料。

## 接口与逻辑

- `profile.get`：tRPC 读取当前 session user 和扩展 profile。
- `profile.update`：校验当前用户身份后更新 name/image 等字段。
- 本页通过服务端 tRPC procedure 更新 Better Auth 的 `system_user` 基础字段，不开放 email、role 等敏感字段修改。

## 实现要点

- 邮箱第一版建议只读，换邮箱作为后续增强。
- 保存前做名称长度校验。
- 保存成功后刷新 session 或重新拉取 user。
- 本页路由文件为 `src/app/dashboard/settings/profile/page.tsx`。
- 客户端表单位于 `src/app/dashboard/settings/profile/_components/profile-form.tsx`。
- API 位于 `src/server/api/routers/profile.ts`，包含 `profile.get` 与 `profile.update`。
- 资料完整度统计来源：
  - 基础分：固定 50。
  - 邮箱验证：来自 `system_user.email_verified`。
  - 名称完整：来自 `system_user.name`。
  - 头像 URL：来自 `system_user.image`。
- 页面右侧统计来源：
  - 所属组织：统计 `system_member` 中当前用户的成员关系数量。
  - 活跃会话：统计 `system_session` 中当前用户的会话数量。
- Pencil 原型包含四个画板：
  - `07 / Profile / Light / Desktop`
  - `07 / Profile / Dark / Desktop`
  - `07 / Profile / Light / Mobile`
  - `07 / Profile / Dark / Mobile`

## 通用工程约束

- Create T3 App: Next.js App Router, TypeScript, tRPC, Drizzle ORM, Tailwind CSS
- Better Auth: authentication, session, admin, organization, team, passkey, 2FA, API key plugins
- PostgreSQL: Better Auth tables plus optional product-specific extension tables
- shadcn/ui + React Hook Form + Zod: forms, tables, dialogs, validation

## 验收标准

- 页面在未授权、加载、空数据、错误、成功状态下均有明确反馈。
- 所有敏感动作必须在服务端重新校验 session 和权限。
- 表单字段均有客户端和服务端校验。
- 高危操作必须二次确认。
