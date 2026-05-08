# 10 我的组织页

- 路由：`/app/orgs`
- 目标：展示当前用户加入的组织和待处理邀请。

## 功能范围

我的组织页负责展示当前用户加入的组织和待处理邀请。

## 页面布局

- 组织列表：名称、slug、当前角色、成员数、是否活跃。
- 待处理邀请区：组织、邀请人、角色、过期时间。
- 主按钮：创建组织。

## 用户动作

- 查看组织列表。
- 切换活跃组织。
- 进入组织设置。
- 接受或拒绝邀请。
- 创建组织。

## 接口与逻辑

- `org.listMine`：tRPC 调用 Better Auth organization list 并补充成员数量。
- `org.setActive`：设置 activeOrganizationId。
- `org.invitation.accept`：接受邀请并创建 member 记录。
- `org.invitation.reject`：拒绝邀请并更新 invitation 状态。

## 实现要点

- 活跃组织在 Topbar 和列表中保持一致。
- 邀请过期时禁用接受按钮。
- 无组织时展示空状态和创建入口。

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
