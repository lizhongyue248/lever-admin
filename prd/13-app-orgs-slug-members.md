# 13 组织成员页

- 路由：`/app/orgs/[slug]/members`
- 目标：管理组织成员、角色和邀请。

## 功能范围

组织成员页负责管理组织成员、角色和邀请。

## 页面布局

- 顶部：邀请成员按钮。
- 成员表格：用户、邮箱、角色、加入时间、操作。
- 邀请列表：邮箱、角色、邀请人、状态、过期时间、操作。

## 用户动作

- 邀请成员。
- 修改成员角色。
- 移除成员。
- 取消待处理邀请。
- 重新邀请，可选。

## 接口与逻辑

- `org.member.list`：读取组织成员和用户基础信息。
- `org.member.invite`：创建 invitation，并触发邀请邮件。
- `org.member.updateRole`：校验权限后更新 member.role。
- `org.member.remove`：移除 member，禁止移除最后 owner。
- `org.invitation.cancel`：取消 pending invitation。

## 实现要点

- 组织成员管理要求 owner/admin。
- 不能降级或移除最后一个 owner。
- 被邀请邮箱格式必须合法。
- 邀请邮件可通过 Better Auth organization sendInvitationEmail 配置。

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
