# 18 API Key 管理页

- 路由：`/app/admin/api-keys`
- 目标：管理 API Key，用于服务端、CLI 或开放接口鉴权。

## 功能范围

API Key 管理页负责管理 API Key，用于服务端、CLI 或开放接口鉴权。

## 页面布局

- 顶部：创建 API Key 按钮、搜索和状态筛选。
- 表格：名称、所属用户、权限范围、过期时间、最后使用时间、状态、操作。
- 创建弹窗：名称、所属用户、过期时间、权限范围。

## 用户动作

- 创建 API Key。
- 复制新生成的 Key。
- 禁用或撤销 API Key。
- 删除 API Key。
- 按用户或状态筛选。

## 接口与逻辑

- `apiKey.list`：列出当前用户或管理员可见的 API Key。
- `apiKey.create`：调用 Better Auth API Key plugin 创建 key，明文只返回一次。
- `apiKey.revoke`：禁用指定 API Key。
- `apiKey.delete`：删除指定 API Key 记录。
- `Bearer/JWT auth`：服务端请求通过 API Key 或 Bearer Token 完成鉴权。

## 实现要点

- API Key 明文只在创建成功后展示一次。
- 列表中只展示 key 前缀或 masked key。
- 普通用户只能管理自己的 Key，管理员可管理全部。
- 删除和撤销都需要确认。

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
