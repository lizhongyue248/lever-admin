# 19 系统请求日志页

- 路由：`/dashboard/admin/request-logs`
- 目标：为平台管理员提供系统级请求审计入口，收集并查询用户在平台内发起的关键请求情况，用于安全审计、问题排查、风险评估和合规留痕。
- 设计稿：`prd/dashboard-logs-design.pen`，基于 `prd/dashboard-admin-design.pen` 的 Dashboard 管理页视觉风格新增，包含浅色/暗色桌面列表、桌面详情抽屉和移动端列表。

## 评估结论

当前产品已经有 API Key 调用日志，用于审计机器凭据和开放接口调用；但缺少面向 Dashboard、tRPC、Route Handler 和认证相关请求的统一审计视角。系统请求日志应作为平台级审计底座，记录“谁在什么时间，从什么 IP 和设备上下文，对哪个系统入口发起了什么请求，结果如何”。日志可以记录完整 IP 和完整 User-Agent，但不能记录 cookie、Authorization header、session token、API Key、OAuth token 或其它 secret。

推荐第一版采用“受控采集 + 后台查询”的方式：

- 采集层只覆盖身份治理产品内的关键请求，不追求全量静态资源或前端资源请求。
- 数据模型独立为 `system_request_log`，与现有 `system_api_key_usage_log` 分工清晰。
- API Key 调用日志继续服务机器凭据治理；系统请求日志服务用户行为、后台操作和认证链路审计。
- 两类日志通过 `requestId`、`userId`、`path`、`createdAt` 等字段交叉排查。

不建议第一版做完整 SIEM、实时风控、告警规则引擎或全链路 tracing。这些能力需要更重的事件管道、采样、索引、归档和告警策略，超出当前轻量身份管理后台的第一版范围。

## 功能范围

第一版包含：

- 请求日志列表查询。
- 关键请求详情查看。
- 完整 IP 和完整 User-Agent 查看。
- 脱敏请求体快照查看。
- 按时间、用户、组织、请求来源、方法、路径、结果、状态码、风险等级筛选。
- 按用户名称、邮箱、请求 ID、路径、完整 IP、User-Agent 摘要或完整 User-Agent 片段搜索。
- 展示请求基础信息、调用结果、耗时、操作者、组织上下文、会话上下文和风险原因。
- 导出当前筛选结果的 CSV，仅 `super_admin` 可用。
- 请求日志保留策略说明。

第一版不包含：

- 原始未脱敏请求体全文查看。
- 完整 cookie、Authorization header、session token、API Key 明文或 hash 展示。
- 实时告警规则配置。
- 日志回放。
- 分布式 tracing 时间线。
- 任意日志字段自定义采集。
- 对静态资源、图片、字体、CSS、JS chunk 的全量请求记录。
- 替代 API Key 调用日志；API Key 调用细节仍以 `14-dashboard-admin-api-keys.md` 定义的使用日志为准。

## 页面布局

- 整体布局继承 `06-dashboard.md` 的 DashboardLayout：
  - Sidebar、Topbar、左下角用户菜单、主题切换、面包屑与响应式行为均保持一致。
  - 本页只定义 Main 内容区域布局，不重复定义全局壳层。
- Sidebar 管理分组新增「请求日志」入口，建议位于「平台 API Key」之后、「平台设置」之前或之后，具体顺序在设计稿中确认。
- Main 内容区域：
  - 页面标题区展示「系统请求日志」和说明文案。
  - 顶部摘要区展示最近 24 小时请求数、失败请求数、慢请求数、高风险请求数。摘要只用于审计态势，不做复杂运营分析。
  - 筛选区位于列表上方，包含：
    - 时间范围：最近 1 小时、24 小时、7 天、30 天、自定义。
    - 结果：全部、成功、失败。
    - 风险：全部、低、中、高。
    - 来源：Dashboard、tRPC、Auth、Route Handler、API Key、系统。
    - 方法：GET、POST、PUT、PATCH、DELETE。
    - 搜索框：用户名称/邮箱、路径、requestId、完整 IP、User-Agent 摘要或完整 User-Agent 片段。
    - 搜索框末尾提供立即刷新图标按钮和定时刷新图标按钮；定时刷新通过 DropdownMenu 选择关闭、每 10 秒、每 30 秒、每 1 分钟、每 5 分钟。
  - 日志表格展示时间、操作者、来源、方法、路径、结果、状态码、耗时、风险、完整 IP、User-Agent 摘要、操作。
  - 桌面日志表格使用 TanStack Table 管理列定义和行模型，避免手写表头/表体结构漂移。
  - 日志表格 / 移动端日志列表设置最大高度，超出后在表格或列表区域内部滚动，避免每页 20 或 50 条数据时撑长整个页面；分页区始终保留在列表卡片底部。
  - 桌面表格使用单一滚动视口承载纵向和横向滚动；表头固定在滚动视口顶部，横向滚动条保留在表格视口底部且不被分页区遮挡。
  - 分页区使用共享 `DataPagination`，展示当前页数量、总数、首页、上一页、下一页、末页和页码输入框，并提供每页条数下拉选项：10、20、50；默认每页 10 条，最大每页 50 条。
  - 分页操作区的首页、上一页、下一页、末页均为图标按钮且提供可访问名称；用户可在页码数字输入框输入目标页，按 Enter 后跳转，越界页码按有效范围纠正。
  - 点击行或详情按钮打开右侧 Sheet 查看请求详情。
  - 移动端使用响应式日志卡片列表，点击进入完整详情页或底部 Sheet；不压缩复杂表格。

## 用户动作

- 查看系统请求日志。
- 按时间范围筛选请求。
- 按用户、组织、来源、路径、结果、状态码、风险等级筛选。
- 搜索 requestId、路径、用户邮箱、用户名称、完整 IP、User-Agent 摘要和完整 User-Agent 片段。
- 打开请求详情 Sheet。
- 从请求详情跳转到用户详情页。
- 从请求详情跳转到组织详情页。
- 复制 requestId。
- 导出当前筛选结果 CSV。
- 点击刷新图标立即重新拉取当前筛选条件下的日志列表、概览和已打开详情。
- 点击定时刷新图标打开 DropdownMenu，选择关闭或自动刷新间隔；启用后按当前筛选条件定时刷新列表和概览。
- 在分页区切换每页条数：10、20、50；切换后回到第一页并按当前筛选条件重新加载。

## 权限与安全

- 页面仅面向平台级审计。
- `admin` 和 `super_admin` 可以访问日志列表和详情。
- `super_admin` 可以导出当前筛选结果。
- 普通用户、组织管理员和未登录用户不能访问。
- 所有查询和导出必须在服务端重新校验平台角色，不能依赖隐藏 UI。
- 日志展示必须默认脱敏：
  - 列表展示完整 IP，同时保留 IP 国家/区域用于辅助判断。
  - 列表默认展示归一化 User-Agent 摘要，例如 `Chrome / Windows`；详情页展示完整 User-Agent。
  - query string 默认不展示；如展示，必须经过 allowlist 或脱敏。
  - 请求体只允许记录脱敏快照，不允许记录原始全文。
  - 不记录或展示 cookie、Authorization header、session token、API Key、OAuth token、验证码 token、密码、重置 token、邮箱验证 token。
- 导出 CSV 仅 `super_admin` 可用，默认包含完整 IP 和完整 User-Agent，但不包含请求体快照；如后续需要导出请求体快照，必须单独设计二次确认和审计记录。

### 请求体查看策略

不能无条件记录和查看原始请求体，原因是请求体经常包含密码、验证码、邮箱验证 token、密码重置 token、OAuth code、API Key、个人资料、组织邀请信息或未来业务敏感数据。一旦原文写入日志，日志系统会变成第二个敏感数据仓库，带来更高的泄露、越权查看和合规风险。

第一版采用“脱敏请求体快照”：

- 只采集 JSON 请求，且大小不超过 16 KB；超过大小只记录 `bodySize` 和 `bodyTruncated=true`。
- 只记录 allowlist 字段；默认字段包括非敏感筛选条件、分页参数、资源 ID、操作类型和布尔开关。
- 敏感字段必须按 key 名和路径统一脱敏，例如 `password`、`token`、`secret`、`authorization`、`cookie`、`apiKey`、`credential`、`code`、`otp`、`captcha`。
- 文件上传、二进制请求、表单密码请求和 OAuth callback 请求不记录请求体快照。
- 请求体快照仅在详情页展示，列表和 CSV 导出不展示。
- 请求体快照必须标明脱敏状态：`not_collected`、`redacted`、`truncated`、`blocked_sensitive_route`。
- 日志写入失败不能阻断用户原请求；仅记录服务端错误。

## 数据模型

新增产品扩展表 `system_request_log`。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | text primary key | 日志 ID |
| `requestId` | text unique | 请求链路 ID，用于跨日志关联 |
| `source` | text | `dashboard`、`trpc`、`auth`、`route_handler`、`api_key`、`system` |
| `method` | text | HTTP 方法 |
| `path` | text | 路径，不包含敏感 query |
| `routeName` | text nullable | 业务路由名或 tRPC procedure 名 |
| `statusCode` | integer nullable | 响应状态码 |
| `success` | boolean | 是否成功 |
| `errorCode` | text nullable | 业务或系统错误码 |
| `failureReason` | text nullable | 安全的失败原因，例如 `unauthorized`、`forbidden`、`validation_failed`、`rate_limited` |
| `durationMs` | integer nullable | 请求耗时 |
| `userId` | text nullable | 当前登录用户 ID |
| `userEmail` | text nullable | 用户邮箱快照，便于用户删除后审计 |
| `userName` | text nullable | 用户名称快照 |
| `userRole` | text nullable | 平台角色快照 |
| `organizationId` | text nullable | 当前组织 ID |
| `organizationName` | text nullable | 当前组织名称快照 |
| `sessionId` | text nullable | 会话 ID 或会话摘要，不保存 token |
| `impersonatedBy` | text nullable | 模拟登录操作者 ID |
| `apiKeyId` | text nullable | 如果由 API Key 触发，关联 API Key |
| `requestQuerySummary` | text nullable | 经过 allowlist 或脱敏的 query 摘要 |
| `requestBodySummary` | text nullable | 经过 allowlist 和脱敏后的请求体快照 JSON |
| `requestBodyStatus` | text | `not_collected`、`redacted`、`truncated`、`blocked_sensitive_route` |
| `ipHash` | text nullable | IP hash |
| `ipAddress` | text nullable | 完整 IP，列表、详情页和授权导出可用 |
| `ipCountry` | text nullable | IP 国家 |
| `ipRegion` | text nullable | IP 区域 |
| `userAgentHash` | text nullable | User-Agent hash |
| `userAgentRaw` | text nullable | 完整 User-Agent，仅详情页和授权导出可用 |
| `userAgentSummary` | text nullable | User-Agent 摘要 |
| `riskLevel` | text | `low`、`medium`、`high` |
| `riskReasons` | text nullable | JSON 字符串，保存风险原因数组 |
| `metadata` | text nullable | 安全扩展信息 JSON，不保存敏感值 |
| `createdBy` | text nullable | 创建人 user id；系统采集可为空 |
| `updatedBy` | text nullable | 最后修改人 user id；日志正常不更新 |
| `deletedAt` | timestamp nullable | 软删除时间；审计查询默认排除已软删除记录 |
| `deletedBy` | text nullable | 软删除操作者 user id |
| `createdAt` | timestamp | 请求时间 |
| `updatedAt` | timestamp | 更新时间；日志正常与创建时间一致 |

建议索引：

- `system_request_log_created_at_idx`：`createdAt desc`
- `system_request_log_user_created_at_idx`：`userId, createdAt desc`
- `system_request_log_request_id_idx`：`requestId`
- `system_request_log_path_created_at_idx`：`path, createdAt desc`
- `system_request_log_success_created_at_idx`：`success, createdAt desc`
- `system_request_log_risk_created_at_idx`：`riskLevel, createdAt desc`

## 采集范围与写入逻辑

第一版采集以下请求：

- Dashboard 页面请求：
  - `/dashboard/**`
  - `/invite/**`
- tRPC 请求：
  - `/api/trpc/**`
  - 记录 procedure path 作为 `routeName`。
- Better Auth 关键请求：
  - `/api/auth/sign-in/**`
  - `/api/auth/sign-up/**`
  - `/api/auth/verify-email/**`
  - `/api/auth/forget-password/**` 或当前 Better Auth 版本对应的密码重置 endpoint。
- 产品 Route Handler：
  - `/api/**` 中非 auth、非 trpc 的产品接口。
- API Key 请求：
  - 第一版不重复 API Key 使用日志的细节；如同一请求进入 `system_api_key_usage_log`，系统请求日志只保留 `apiKeyId`、`requestId` 和摘要。

不采集：

- `/_next/**`
- `/favicon.ico`
- 图片、字体、CSS、JS chunk。
- 健康检查和纯静态资源请求，除非后续明确加入审计范围。

写入链路建议：

- 在 `proxy.ts` 生成或透传 `x-request-id`，并写入请求头，保证后续 tRPC、Route Handler、服务端组件可读取。
- 在 tRPC middleware 中记录 procedure 请求结果、耗时、错误类型和当前 session。
- 在关键 Route Handler 或 Better Auth hook 周边使用统一 helper 记录认证请求结果。
- Dashboard Server Component 页面请求可先记录访问事件和权限结果；第一版不强求捕捉每个 React Server Component 子请求。
- 写入使用 `recordRequestLog(input)` 服务端 helper，集中执行 IP/User-Agent 标准化、请求体快照脱敏、风险等级计算和数据库插入。
- 日志写入采用非阻塞策略：优先异步写入；失败时只输出服务端错误日志，不影响原请求响应。

## 风险评估规则

第一版风险等级由服务端统一计算，前端只展示结果。

低风险：

- 正常成功请求。
- 常规页面访问和查询。

中风险：

- 4xx 失败，例如 validation failed、not found、unauthorized。
- 同一用户短时间内多次访问不存在资源。
- 请求耗时超过 2 秒。

高风险：

- forbidden 或角色不足。
- 模拟登录期间的高敏操作。
- 账号封禁、删除、禁用后仍尝试访问。
- 同一用户或完整 IP 短时间内大量失败请求。
- 高危路由失败，例如禁用 2FA、删除用户、删除组织、删除 API Key、平台设置修改失败。
- 请求耗时超过 10 秒或疑似异常资源消耗。

## 接口与逻辑

- `adminRequestLog.getOverview`
  - 平台管理员查询最近 24 小时请求总数、失败数、慢请求数、高风险数。
- `adminRequestLog.list`
  - 平台管理员分页查询请求日志。
  - 默认 `pageSize=10`，服务端最大允许 `pageSize=50`。
  - 支持时间范围、用户、组织、来源、方法、结果、状态码、风险等级、路径和搜索。
  - 默认按 `createdAt desc` 排序。
- `adminRequestLog.get`
  - 平台管理员读取单条请求详情。
  - 返回完整 IP、完整 User-Agent、脱敏请求体快照、风险原因、用户/组织快照和可跳转的关联 ID。
- `adminRequestLog.exportCsv`
  - 仅 `super_admin` 可导出当前筛选结果。
  - 最大导出 10,000 行；超过时要求缩小筛选范围。
- `recordRequestLog`
  - 服务端内部 helper，不暴露给客户端。
  - 负责标准化、请求体脱敏、计算风险等级并写入 `system_request_log`。
  - 当日志存在当前用户上下文时，写入 `createdBy` 和 `updatedBy` 为当前用户 ID；系统请求或匿名请求没有用户上下文时允许为空。
  - 请求日志列表、详情、概览、导出、会话风险和 Dashboard 聚合默认只查询 `deletedAt is null` 的记录。

## 页面状态

- Loading：展示标题、筛选区和表格骨架屏。
- Empty：当前筛选范围内没有请求日志，展示空态和重置筛选入口。
- Error：请求日志加载失败，展示错误卡片和重试入口。
- Forbidden：非平台管理员访问时展示无权限状态或跳转 `/dashboard`。
- Success：展示请求日志列表、筛选条件、分页和详情 Sheet。

## 实现要点

- 新增 `src/server/api/routers/admin-request-log.ts`。
- 新增 `src/server/service/request-logs/`：
  - `record-request-log.ts`
  - `request-log-sanitizer.ts`
  - `request-log-risk.ts`
  - `request-log-query.ts`
- 新增 Drizzle schema `requestLog`，表名为 `system_request_log`。
- 新增页面路径 `src/app/dashboard/admin/request-logs/page.tsx`。
- 页面客户端组件放在 `src/app/dashboard/admin/request-logs/_components/`。
- 桌面表格使用 `src/components/data-table.tsx` 的共享 `DataTable`，内部必须基于 `@tanstack/react-table` 的 `useReactTable`、`getCoreRowModel` 和 `flexRender`。
- 分页控件使用 `src/components/data-pagination.tsx` 的共享 `DataPagination`；每页条数下拉支持 10、20、50，切换每页条数后回到第一页。
- Sidebar 管理分组新增「请求日志」入口。
- `proxy.ts` 只负责 requestId 和必要上下文传递，不在 proxy 中直接执行数据库写入。
- tRPC middleware 可记录 procedure 层请求，但必须避免把敏感 input 原文写入日志。
- Better Auth 相关请求只能记录安全摘要，不记录邮箱验证 token、重置 token、密码、验证码和 OAuth token。
- API Key 调用日志仍使用 `system_api_key_usage_log`；系统请求日志只做跨系统审计摘要，不重复完整 API Key 调用详情。
- 如果日志表不存在或写入失败，核心业务请求不应失败。
- 不运行 `pnpm db:generate`、`pnpm db:migrate` 或 `pnpm db:push`，除非用户明确要求执行数据库迁移命令。

## Playwright E2E 测试用例

测试环境使用 `prd/99-e2e-testing-method.md` 中定义的 Playwright + Testcontainers PostgreSQL。

| 用例 ID | 场景 | 前置数据 | 操作 | 预期结果 |
| --- | --- | --- | --- | --- |
| `admin-request-logs-001` | 非登录访问 | 无 session | 访问 `/dashboard/admin/request-logs` | 重定向 `/sign-in?redirectTo=%2Fdashboard%2Fadmin%2Frequest-logs` |
| `admin-request-logs-002` | 普通用户访问 | 普通用户 session | 访问页面 | 展示 forbidden 或跳转 `/dashboard` |
| `admin-request-logs-003` | 平台管理员查看空态 | admin session，日志表为空 | 访问页面 | 展示空态和筛选区 |
| `admin-request-logs-004` | 平台管理员查看列表 | seed 多条请求日志 | 访问页面 | 展示请求日志表格和摘要数据，默认每页最多 10 条 |
| `admin-request-logs-005` | 搜索用户邮箱 | seed 用户日志 | 输入用户邮箱搜索 | 仅展示匹配用户日志 |
| `admin-request-logs-006` | 按结果筛选 | seed 成功和失败日志 | 选择失败 | 仅展示失败请求 |
| `admin-request-logs-007` | 按风险筛选 | seed 高风险和低风险日志 | 选择高风险 | 仅展示高风险请求 |
| `admin-request-logs-008` | 查看详情 | seed 单条日志 | 点击日志行 | 打开详情 Sheet，展示 requestId、路径、结果、风险原因、完整 IP、完整 User-Agent 和脱敏请求体快照 |
| `admin-request-logs-009` | 复制 requestId | 打开详情 Sheet | 点击复制 requestId | 显示复制成功 toast |
| `admin-request-logs-010` | 导出权限 | admin session | 点击导出 | 不展示导出入口或返回无权限 |
| `admin-request-logs-011` | super_admin 导出 | super_admin session，seed 日志 | 点击导出 | 下载 CSV，包含完整 IP 和完整 User-Agent，默认不包含请求体快照 |
| `admin-request-logs-012` | 不展示敏感字段 | seed 含 token/query/body 原始数据的模拟日志 | 查看列表和详情 | 不展示 token、Authorization、cookie、密码、验证码、验证 token、重置 token |
| `admin-request-logs-013` | 切换每页条数 | seed 超过 20 条请求日志 | 打开每页条数下拉，选择 20 或 50 | 当前页回到第 1 页，列表按所选每页条数展示，服务端不允许超过 50 |

## 验收标准

- 平台管理员可以查看系统请求日志列表和详情。
- 普通用户、组织管理员和未登录用户不能访问。
- `super_admin` 可以导出当前筛选结果，`admin` 不能导出。
- 日志列表支持搜索、筛选、分页、空态、加载态和错误态。
- 日志列表默认每页 10 条，分页区支持切换每页 10、20、50 条；服务端限制每页最多 50 条。
- 日志表格和移动端日志列表有最大高度限制，数据较多时只滚动列表内容区，不撑高整个页面。
- 桌面表格表头固定，横向滚动条可见且不被分页区或外层卡片遮挡。
- 桌面表格使用 TanStack Table 渲染列和行。
- 搜索栏末尾提供手动刷新和定时刷新入口；定时刷新支持关闭、10 秒、30 秒、1 分钟和 5 分钟。
- 请求详情展示 requestId、路径、来源、操作者、组织上下文、结果、状态码、耗时、风险原因、完整 IP、完整 User-Agent 和脱敏请求体快照。
- 所有敏感字段均经过脱敏，不展示原始未脱敏请求体全文、Authorization header、cookie、session token、API Key、OAuth token、验证码 token、密码、邮箱验证 token 或密码重置 token。
- 日志写入失败不影响原请求响应。
- tRPC 请求日志不保存原始 input。
- API Key 调用详情仍以平台 API Key 使用日志为准，系统请求日志只保留审计摘要和关联 ID。
- 风险等级由服务端计算，前端不自行推断。
- 导出 CSV 使用与页面相同的权限和脱敏规则。
- 请求日志默认保留 90 天；超期清理策略需要在后续运维任务中实现。
