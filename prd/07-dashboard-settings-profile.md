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
- 修改头像：
  - 支持上传头像文件，上传走 `18-dashboard-admin-platform-settings.md` 中定义的统一文件存储配置。
  - 上传成功后把返回 URL 写入 `auth_user.image`。
  - 保留头像 URL 输入作为可选高级方式，便于使用外部公开图片。
- 查看邮箱和用户 ID。
- 保存资料。

## 接口与逻辑

- `profile.get`：tRPC 读取当前 session user 和扩展 profile。
- `profile.update`：校验当前用户身份后更新 name/image 等字段。
- `profile.uploadAvatar` 或受控上传接口：校验当前用户身份后上传头像文件，只允许图片 MIME 类型，成功后返回 URL 或对象引用，再由资料保存流程写入 `auth_user.image`。
- 本页通过服务端 tRPC procedure 更新 Better Auth 的 `auth_user` 基础字段，不开放 email、role 等敏感字段修改。

## 实现要点

- 邮箱第一版建议只读，换邮箱作为后续增强。
- 保存前做名称长度校验。
- 保存成功后刷新 session 或重新拉取 user。
- 本页路由文件为 `src/app/dashboard/settings/profile/page.tsx`。
- 客户端表单位于 `src/app/dashboard/settings/profile/_components/profile-form.tsx`。
- API 位于 `src/server/api/routers/profile.ts`，包含 `profile.get` 与 `profile.update`。
- 资料完整度统计来源：
  - 资料完整度由服务端按字段权重计算，不使用固定基础分。
  - 名称完整：来自 `auth_user.name`，名称长度满足校验规则记 35 分。
  - 邮箱验证：来自 `auth_user.email_verified`，已验证记 35 分。
  - 头像 URL：来自 `auth_user.image`，存在有效头像 URL 记 30 分。
  - 总分为上述真实字段得分之和，范围为 0-100；未设置头像或未验证邮箱时按实际缺失扣分。
- 页面右侧统计来源：
  - 所属组织：统计 `auth_member` 中当前用户的成员关系数量。
  - 活跃会话：统计 `auth_session` 中当前用户未过期会话数量。
- Pencil 原型包含四个画板：
  - `07 / Profile / Light / Desktop`
  - `07 / Profile / Dark / Desktop`
  - `07 / Profile / Light / Mobile`
  - `07 / Profile / Dark / Mobile`

## 通用工程约束

- Create T3 App: Next.js App Router, TypeScript, tRPC, Drizzle ORM, Tailwind CSS
- Better Auth: authentication, session, admin, organization, passkey, 2FA, API key plugins
- PostgreSQL: Better Auth tables plus optional product-specific extension tables
- shadcn/ui + React Hook Form + Zod: forms, tables, dialogs, validation

## 公共组件使用

- 本页不使用共享 `DataTable` 或 `DataPagination`，因为个人资料第一版只有单个资料表单和统计摘要。
- 本页头像上传使用平台文件存储配置，相关 provider、路径、S3 凭据和上传测试由 `18-dashboard-admin-platform-settings.md` 统一管理。
- 如后续增加登录记录、组织列表或资料变更审计列表，应优先使用 `98-common-components.md` 中定义的共享表格和分页组件。

## 验收标准

- 页面在未授权、加载、空数据、错误、成功状态下均有明确反馈。
- 所有敏感动作必须在服务端重新校验 session 和权限。
- 表单字段均有客户端和服务端校验。
- 高危操作必须二次确认。
