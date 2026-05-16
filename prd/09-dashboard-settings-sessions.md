# 09 我的会话页

- 路由：`/dashboard/settings/sessions`
- 目标：让用户查看和撤销自己的登录设备。

## 功能范围

我的会话页负责让用户查看和撤销自己的登录设备。

## 页面布局

- 整体布局继承 `06-dashboard.md` 的 DashboardLayout：
  - Sidebar、Topbar、左下角用户菜单、主题切换、面包屑与响应式行为均保持一致。
  - 本页只定义 Main 内容区域布局，不重复定义全局壳层。
- Main 内容区域：
  - 页面标题区展示「我的会话」和设备登录说明。
  - 顶部操作区展示「退出全部其他设备」按钮。
  - 会话列表中当前会话置顶并整行高亮，不再使用右上角盾牌符号或行内文字 badge。
  - 列表字段包含设备、浏览器、IP、创建时间、最近活跃时间、操作。
  - 桌面端「登录设备」与「会话健康」两张下方卡片总宽度应与上方「会话概览」保持一致，宽度比例约为 2:1。
  - 登录设备列表有最大高度，超过可视区域后在列表内部滚动。
  - 登录设备列表始终显示分页控件；只有一页时首页/上一页/下一页/末页按钮为禁用状态。
  - 列表分页控件使用共享 `DataPagination`；首页、上一页、下一页、末页为图标按钮，页码输入框支持输入后按 Enter 跳转。
  - 移动端展示会话概览、会话健康、会话卡片和分页控件，当前会话仅通过卡片高亮表达。

## 用户动作

- 查看当前和历史有效会话。
- 撤销某个非当前会话。
- 撤销所有其他会话。
- 通过左下角用户菜单退出当前账号。

## 接口与逻辑

- `session.listMine`：tRPC 读取当前用户的 session 列表。
- `session.revoke`：撤销指定 sessionId，服务端要求该会话属于当前用户。
- `session.revokeOthers`：撤销当前 session 之外的全部 session。

### 会话健康真实数据口径

我的会话页不得固定返回 `highRiskCount: 0`。会话健康由服务端基于当前用户真实 session 和请求日志计算。

第一版会话风险来源：

- `auth_session`：
  - 只统计当前用户未过期会话。
  - 同一用户活跃会话数超过 5 个时，超出阈值的非当前会话标记为风险。
  - 会话缺少 IP 或 User-Agent 时标记为中风险。
  - 会话创建超过 30 天且最近活跃时间早于 30 天前时标记为长期会话风险。
- `system_request_log`：
  - 统计当前用户最近 30 天 `risk_level='high'` 的请求。
  - 如果高风险请求能关联到当前 session，则对应 session 标记为高风险。
  - 无法关联具体 session 时，只进入页面健康摘要，不错误标记某个具体设备。

返回字段要求：

- `sessions[]` 每项返回 `riskLevel`、`riskReasons` 和 `isCurrent`。
- `health.highRiskCount` 为高风险 session 数；没有高风险时返回真实计算后的 `0`。
- `health.latestActivityLabel` 和 `health.longestOnlineLabel` 来自真实 `updatedAt`、`createdAt`。
- 页面没有任何会话时展示空态；不得展示示例设备。

风险展示处理：

- 当前会话如被判定为风险，只展示风险原因和“退出当前账号”引导，不展示普通撤销按钮。
- 非当前风险会话可使用撤销操作。
- 撤销会话后重新计算健康摘要和风险数量。

## 实现要点

- 当前会话不显示普通撤销按钮，改为退出登录。
- 撤销成功后重新拉取列表。
- session token 不在前端完整展示。
- 会话列表可展示设备、浏览器、IP、创建时间和最近活跃时间，但不得向客户端返回完整 session token。
- 右侧信息块使用「会话健康」，展示高风险会话、最近活跃和最长在线摘要。
- 设备图标按 user agent 推断并组合展示系统图标与浏览器图标；未知浏览器使用通用浏览器图标。
- 页面级 `loading.tsx` 和 `error.tsx` 提供加载中与失败重试反馈。

## 通用工程约束

- Create T3 App: Next.js App Router, TypeScript, tRPC, Drizzle ORM, Tailwind CSS
- Better Auth: authentication, session, admin, organization, passkey, 2FA, API key plugins
- PostgreSQL: Better Auth tables plus optional product-specific extension tables
- shadcn/ui + Zod: forms, tables, dialogs, validation

## 公共组件使用

- 会话列表分页使用 `src/components/data-pagination.tsx` 的共享 `DataPagination`，页面负责维护页码和刷新状态。
- 第一版会话列表可使用页面专属设备列表布局；如改为桌面标准表格，应使用 `src/components/data-table.tsx` 的共享 `DataTable`，页面只负责定义会话字段、风险 badge 和撤销操作。

## 验收标准

- 页面在未授权、加载、空数据、错误、成功状态下均有明确反馈。
- 所有敏感动作必须在服务端重新校验 session 和权限。
- 表单字段均有客户端和服务端校验。
- 高危操作必须二次确认。
