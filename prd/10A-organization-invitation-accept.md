# 10A 组织邀请接受页

- 路由：`/invite/[id]`
- 目标：让被邀请用户查看组织邀请详情，并完成接受或拒绝邀请。

## 功能范围

组织邀请接受页负责邀请闭环中的被邀请人确认环节。管理员在 `/dashboard/orgs/[slug]/invite` 发送邀请后，被邀请人可以通过邮件链接或 Dashboard Topbar 通知面板进入本页。

本页只处理组织邀请接受和拒绝，不提供组织管理、成员管理或邀请创建能力。

邀请可以附带默认部门。默认部门只表示用户接受邀请后在公司内部的初始归属，不表示用户被邀请加入另一个独立组织；页面和通知面板必须同时展示公司与部门，避免把部门误解为 Better Auth organization。

## 页面布局

- 未登录访问：
  - 保存当前邀请链接作为 `redirectTo`。
  - 跳转到 `/sign-in`。
  - 登录成功后回到当前邀请页。
- 已登录访问：
  - 使用 auth-focused 简洁布局或 dashboard 内轻量确认布局，视觉风格与已有 auth/dashboard 卡片保持一致。
  - 页面中心展示邀请确认卡片。
  - 卡片展示组织名称、邀请角色、邀请人、邀请邮箱、默认所属部门（可选）、过期时间和状态说明。
  - 默认部门存在时使用较轻的辅助信息行展示，例如「默认部门：产品研发部」；组织名称仍是卡片的主信息。
  - 操作区提供「接受邀请」主按钮和「拒绝邀请」次按钮。
  - 邀请不存在、已过期、已接受、已拒绝、已取消或当前登录邮箱不是邀请邮箱时，展示明确错误状态和返回工作台按钮。
- 全局通知入口：
  - DashboardLayout 的 Topbar 右侧展示通知图标按钮，位于主题切换按钮左侧。
  - 存在 pending 组织邀请时，通知图标展示待处理数量 badge。
  - 点击通知图标打开通知面板，组织邀请作为「邀请」类型通知展示。
  - 邀请通知项可直接触发接受或拒绝。
  - 邀请通知项包含组织名称、默认部门（可选）、邀请角色、邀请人、过期时间和状态说明。
  - 邀请通知项也提供「查看详情」入口跳转 `/invite/[id]`，用于用户需要确认更多信息或处理错误状态。
  - 多个邀请按即将过期时间升序排列；即将过期邀请使用 warning 语义 badge。
- 设计稿：
  - 全局通知面板放在 `prd/dashboard-org-design.pen`，包含桌面明亮、桌面暗黑、移动明亮、移动暗黑四个画板。
  - 邀请详情页如后续单独设计，可继续补充 `/invite/[id]` 的详情确认画板；第一版通知面板必须先覆盖用户可获知邀请并直接处理邀请的主流程。

## 用户动作

- 通过邮件链接打开邀请页。
- 登录或注册后回到邀请页。
- 查看邀请详情。
- 在 Topbar 通知面板中直接接受或拒绝邀请。
- 接受邀请。
- 拒绝邀请。
- 邀请无效时返回工作台。

## 接口与逻辑

- `org.invitation.getMine` 或 Better Auth `organization/get-invitation`：读取指定 invitation id 的详情，服务端校验当前登录用户邮箱必须等于邀请邮箱，并返回默认部门信息（如有）。
- `org.invitation.accept` 或 Better Auth `organization/accept-invitation`：接受邀请，创建成员关系，更新邀请状态为 `accepted`，并将组织设为 active organization；如果邀请指定默认部门，则额外创建部门成员归属。
- `org.invitation.reject` 或 Better Auth `organization/reject-invitation`：拒绝邀请，更新邀请状态为 `rejected`。
- Better Auth `organization.sendInvitationEmail`：组织邀请邮件发送函数。
  - 调用 `src/server/service/email` 中统一邮件发送服务，不直接在 Better Auth 配置中拼接邮件或调用第三方 SDK。
  - 组织邀请邮件模板独立放在 `src/server/service/email/templates/organization-invitation.ts`，模板返回 `subject`、`html` 和 `text`。
  - 模板输入至少包含邀请邮箱、组织名称、邀请人姓名/邮箱、角色、接受链接和过期时间；存在默认部门时在邮件信息区展示默认部门，但主语仍然是组织（公司）。
  - 邮件服务通过 `EMAIL_PROVIDER` 在 `console`、`resend`、`smtp` 之间切换；开发默认可使用 console provider 输出收件人、标题和邀请链接。
  - Resend 和 SMTP provider 共享同一套模板输入输出，不影响 Better Auth organization 调用方。
- `notification.list`：读取当前登录用户通知列表，组织邀请通知从当前用户邮箱对应的 pending invitation 聚合生成；返回字段包含 notification id、type、status、invitation id、组织名称、组织 slug、默认部门名称（可选）、邀请角色、邀请人、过期时间和状态。
- `notification.invitation.accept` / `notification.invitation.reject`：通知面板使用的快捷处理接口，内部复用本页的接受/拒绝校验与状态更新逻辑。
- 接受成功后跳转 `/dashboard/orgs/[slug]`；如果无法解析 slug，则跳转 `/dashboard`。
- 拒绝成功后跳转 `/dashboard`，并展示成功 toast。

## 实现要点

- 优先使用 Better Auth organization plugin 的邀请接口，避免自行复制邀请校验逻辑。
- 邀请只能由邀请邮箱对应的登录用户接受或拒绝。
- 如果用户未验证邮箱且 Better Auth 配置要求验证后才能接受邀请，应展示引导去验证邮箱的状态。
- 接受邀请后需要刷新 dashboard shell 数据，使 Sidebar 的「当前组织」和用户菜单组织列表立即包含新组织。
- 接受邀请后用户加入的是组织（公司）；默认部门只是公司内部归属，不改变 activeOrganizationId。
- 通知面板和 `/invite/[id]` 不能各自实现两套状态机；接受、拒绝、过期、邮箱校验、部门归属写入必须使用同一个服务端 helper 或同一组 Better Auth 封装。
- `/invite/[id]` 的接受/拒绝按钮在客户端完成挂载前保持禁用，避免 SSR 页面水合前的点击被浏览器丢失。
- 接受成功后通知面板应立即移除该邀请；拒绝成功后也应移除该邀请，并可展示轻量 toast。
- 邮件链接开发环境可以通过统一 email service 的 console provider 输出；生产环境必须使用 Resend 或 SMTP provider 发送，接受链接仍指向同一路由。
- 邮件模板视觉以 `prd/email-template-design.pen` 为准，与邮箱验证和密码重置模板保持统一品牌、按钮、页脚和安全提示样式。
- 不在邀请链接中暴露 session token 或其他敏感信息。

## 通用工程约束

- Create T3 App: Next.js App Router, TypeScript, tRPC, Drizzle ORM, Tailwind CSS
- Better Auth: organization invitation、session、email verification
- shadcn/ui + Zod: 状态卡片、确认按钮、错误展示

## 验收标准

- 未登录用户打开邀请链接会跳转登录，并在登录后回到邀请页。
- 被邀请邮箱对应的登录用户可以看到邀请详情。
- 非邀请邮箱用户不能查看或接受该邀请。
- pending 邀请可以接受，接受后创建 member，并在存在默认部门时建立部门归属，然后跳转组织概览页。
- pending 邀请可以拒绝，拒绝后状态变为 rejected 并跳转工作台。
- Topbar 通知面板可以直接接受或拒绝 pending 邀请，处理结果与 `/invite/[id]` 页面一致。
- 邀请包含默认部门时，通知面板和邀请接受页都展示默认部门，但主语始终是组织（公司）。
- expired、accepted、rejected、canceled 邀请不能重复接受。
- 管理员邀请列表能在刷新后看到 accepted 或 rejected 状态 badge。
