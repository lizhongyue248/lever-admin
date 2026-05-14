# 14 平台 API Key 管理页

- 路由：`/dashboard/admin/api-keys`
- 详情路由：`/dashboard/admin/api-keys/[id]`
- 目标：为平台管理员统一查看、审计和治理所有用户与组织 API Key。

## 功能范围

平台 API Key 管理页负责平台级 API Key 治理。它面向平台 admin/super_admin，不面向普通用户。

本页不是普通用户创建自己 API Key 的入口。普通用户和平台管理员创建自己的个人 API Key，应使用 `16-dashboard-settings-api-keys.md` 定义的个人 API Key 页面。平台管理员在本页主要进行统一查看、筛选、禁用、删除和风险处理。

第一版默认不提供“替其他用户创建 API Key”的能力，避免绕过用户授权和审计边界。后续如需要管理员代创建，必须作为单独高危动作设计，要求明确确认、审计记录和一次性明文展示规则。

## 页面布局

- 整体布局继承 `06-dashboard.md` 的 DashboardLayout：
  - Sidebar、Topbar、左下角用户菜单、主题切换、面包屑与响应式行为均保持一致。
  - 本页只定义 Main 内容区域布局，不重复定义全局壳层。
- Main 内容区域：
  - 页面标题区展示「平台 API Key」和平台开放接口凭据治理说明。
  - 顶部统计卡片展示 API Key 总数、启用数量、即将过期数量、最近 24 小时使用数量和异常 Key 数量。
  - 表格卡片顶部同一行展示搜索框和状态筛选 `DropdownMenu`：
    - 搜索框支持按 API Key 名称、所属用户名称、用户邮箱、组织名称和安全前缀搜索。
    - 状态筛选用于切换全部、启用、停用、即将过期、高风险；第一版不展示所属类型、过期时间和创建时间等额外筛选控件。
  - 表格展示名称、所属类型、所属用户或组织、创建时间、过期时间、最后使用时间、风险、状态、操作。
  - 第一版不展示 API Key 权限范围列，不提供权限模板或 scope 管理；平台页重点展示 Key 归属、状态、过期、使用日志和风险。
  - 操作列使用紧凑图标按钮，优先展示日志图标按钮；点击日志图标打开使用日志 Sheet 或详情面板。
  - 其他操作使用图标按钮或溢出菜单承载，包括查看所属主体、禁用/启用、删除；所有图标按钮必须有 accessible label 和 tooltip。
  - 删除、禁用、启用均使用确认弹窗；删除属于高危操作。
  - 不展示 API Key 明文；只展示前缀、masked key 或 Better Auth API Key plugin 可安全展示的字段。
- 呈现方式：
  - 桌面端点击表格行打开右侧 API Key 详情 Sheet，Sheet 使用 shadcn/ui `Sheet`，不手写 drawer 基础交互。
  - Sheet 内容以调用日志为主体，基础信息与风险原因必须压缩为轻量摘要区，不使用大块详情卡挤占日志空间。基础摘要包含名称、masked key、所属主体、所属类型、状态、风险等级、过期时间和最后使用时间；完整风险解释可在详情页中展开。
  - Sheet 与完整详情页均提供「调用日志 / 图表统计」Tab：
    - 「调用日志」为默认 Tab，展示最近调用、成功/失败、路径、状态码、IP 摘要、User-Agent 摘要和失败原因。
    - 「图表统计」展示该 Key 最近 24 小时与最近 7 天的调用趋势、成功/失败分布、状态码分布、Top 路径、风险事件和平均耗时；图表只使用聚合数据，不展示完整 IP、完整 User-Agent、请求体或完整 API Key。
  - Sheet 顶部提供「打开完整详情页」入口，跳转 `/dashboard/admin/api-keys/[id]`。
  - 完整详情页复用同一详情数据、权限校验、日志查询、风险解释和高危操作，仅布局容器不同。
  - 移动端点击 API Key 卡片优先进入完整详情页，避免在窄屏中压缩复杂日志表。
  - 详情 Sheet 加载时使用骨架屏展示标题、基础信息和日志表格占位，不使用纯文本加载提示。

## 用户动作

- 查看平台全部 API Key。
- 搜索和筛选 API Key。
- 查看某个 API Key 的所属用户或组织。
- 点击表格行打开 API Key 详情 Sheet。
- 从详情 Sheet 跳转完整 API Key 详情页。
- 禁用或启用 API Key。
- 删除 API Key。
- 跳转到所属用户详情页或组织详情页。
- 查看 API Key 使用日志。
- 处理即将过期、长时间未使用或异常使用的 API Key。

## 接口与逻辑

- `admin.apiKey.list`：平台管理员分页查询所有 API Key，支持搜索、所属类型、所属用户/组织、状态、过期时间和排序。
- `admin.apiKey.get`：读取单个 API Key 的基础信息、所属主体、风险原因和最近使用摘要。
- `admin.apiKey.getOverview`：聚合 API Key 总数、启用数、即将过期数、最近使用数和风险数。
- `admin.apiKey.disable`：禁用指定 API Key，服务端校验平台管理员权限。
- `admin.apiKey.enable`：启用指定 API Key，服务端校验平台管理员权限。
- `admin.apiKey.delete`：删除指定 API Key，服务端校验平台管理员权限并要求二次确认。
- `admin.apiKey.listUsageLogs`：分页读取指定 API Key 的使用日志，支持时间范围、请求结果和接口路径筛选；服务端校验平台管理员权限。
- `admin.apiKey.getUsageStats`：读取指定 API Key 的聚合调用统计，用于详情中的「图表统计」Tab；服务端校验平台管理员权限，日志表不可用时返回空趋势和 0 统计。
- `Bearer/API Key auth`：服务端请求通过 Better Auth API Key plugin 校验 API Key 是否有效、启用、未过期；不得在管理页面暴露完整 key。开放接口通过统一 helper 获取 API Key 对应用户身份后，由具体接口按平台角色、组织成员角色、资源归属和业务规则做授权限制。

## Better Auth API Key 鉴权治理

- v1 权限策略：
  - 第一版暂不启用 API Key 级 permissions 管理，不在创建表单或平台页维护权限模板、权限勾选或自定义 scope。
  - API Key 只作为调用方身份凭据；开放接口允许 API Key 进入后，必须在接口层按创建者用户身份、平台角色、组织成员角色、资源归属和业务规则做授权限制。
  - 如 Better Auth `system_apikey.permissions` 字段存在，可保持为空对象或最小默认值；平台风险、日志和授权判断不得依赖该字段。
  - `metadata` 可保存备注、用途和创建来源，但不得作为鉴权依据。
- Key 创建：
  - 个人 Key 创建入口由 `16-dashboard-settings-api-keys.md` 管理；普通用户只能创建自己的用户级 Key。
  - 组织级 Key 后续应在组织设置页单独设计，创建时必须绑定 `configId="organization"` 与组织 `referenceId`。
  - 平台页第一版不代替用户或组织创建 Key，避免平台管理员绕过主体授权。
- 鉴权执行：
  - 产品层必须提供统一 helper，例如 `validateApiKeyAndLog({ request, routeName })`。
  - helper 负责从 header 读取 API Key，调用 Better Auth `auth.api.verifyApiKey` 校验 Key 是否有效、启用和未过期。
  - helper 返回 API Key、创建者用户和接口层授权所需上下文；每个开放接口必须自行校验所需平台角色、组织角色或资源归属。
  - 不建议第一版开启 Better Auth `enableSessionForAPIKeys`。Dashboard 页面继续使用用户 session，开放接口使用 API Key 独立鉴权，避免机器凭据与浏览器会话混淆。
- 平台治理：
  - 平台页应展示 Key 所属主体、类型、状态、过期时间、最近使用、使用异常和接口层拒绝原因。
  - 平台页应能通过日志识别接口层角色不足、Key 过期、Key 停用、限流和异常失败。
  - 长期有效、长期未使用、接口层 403 比例异常、所属主体异常和使用异常都应进入风险原因。

## API Key 调用日志实现规划

- 数据表：新增产品扩展表 `system_api_key_usage_log`，不改写 Better Auth `system_apikey` 的 secret 存储语义。
- 建议字段：
  - `id`：日志 ID。
  - `apiKeyId`：关联 `system_apikey.id`，用于查询某个 Key 的日志。
  - `configId`、`referenceId`：冗余保存 Key 所属类型和主体，便于平台筛选和接口层角色校验。
  - `keyPrefix`：保存安全前缀或 masked key 片段，方便删除 Key 后仍能审计，不保存完整 key 或 hash。
  - `method`、`path`、`routeName`：记录接口方法、路径和可选业务路由名。
  - `statusCode`、`success`、`errorCode`、`failureReason`：记录请求结果和失败原因。
  - `requestId`：关联服务端请求链路，便于排查。
  - `ipHash`、`ipCountry`、`ipRegion`：记录 IP 摘要和可选地域；不直接展示完整 IP，除非后续明确合规策略。
  - `userAgentHash`、`userAgentSummary`：记录 User-Agent 摘要。
  - `durationMs`：请求耗时。
  - `createdAt`：调用时间。
- 写入链路：
  - 在 API Key 鉴权入口增加统一包装层，例如 `validateApiKeyAndLog` 或 route handler/middleware 级 helper。
  - 统一包装层必须调用 Better Auth `auth.api.verifyApiKey` 校验 Key 有效性；接口层授权失败也必须进入同一日志链路。
  - 鉴权成功、鉴权失败、Key 停用、Key 过期、角色不足、资源归属不匹配、限流失败都写入日志。
  - 日志写入不得阻塞主请求：优先采用 fire-and-forget 的服务端异步写入；如果写入失败，只记录服务端错误日志，不影响业务响应。
  - 不记录请求体、Authorization header、完整 API Key、session token、OAuth token 或其他 secret。
- 查询链路：
  - 平台页面使用 `admin.apiKey.listUsageLogs` 查询任意 Key 日志，必须经过 `adminProcedure`。
  - 平台页面使用 `admin.apiKey.getUsageStats` 查询任意 Key 的聚合统计，必须经过 `adminProcedure`。
  - 支持按时间范围、成功/失败、状态码、接口路径、所属主体筛选。
  - 支持按失败原因筛选角色不足、资源归属不匹配、Key 停用、Key 过期、限流和无效 Key。
  - 日志详情使用 Sheet 展示，默认按 `createdAt desc` 分页。
  - 图表统计默认使用最近 7 天聚合数据，提供调用量趋势、失败率、状态码分布、Top 路径、风险事件和平均耗时。统计 Tab 不提供单条日志明细，点击 Top 路径、失败状态或风险事件时可回到日志 Tab 并带入筛选条件。
- 风险聚合：
  - 定时或查询时聚合最近 24 小时请求量、失败率、非常用地域、非常用路径和 7 日均值偏差。
  - 风险 badge 来自服务端统一计算结果，前端只负责展示原因和跳转日志。
- 保留策略：
  - 第一版默认保留 90 天日志。
  - 删除 API Key 不级联删除日志，日志保留 masked key、所属主体快照和删除状态，用于审计。

## 实现要点

- 本页必须使用 `adminProcedure` 校验平台管理员角色。
- 列表 Sheet 与 `/dashboard/admin/api-keys/[id]` 完整详情页必须复用同一个详情组件或同一组数据 hooks，避免权限、日志字段和风险解释不一致。
- 详情 Sheet 打开时保留列表搜索、筛选、分页和滚动位置；关闭后回到当前列表状态。
- 详情链接必须可复制和直接访问；刷新 Sheet 态链接时可恢复为完整详情页或重新打开 Sheet，但不得丢失 API Key 上下文。
- support 角色如存在，第一版只能只读查看，不允许启用、禁用或删除。
- 平台管理员可查看所有 `configId="user"` 和 `configId="organization"` 的 API Key 元数据。
- 第一版平台页不提供 API Key 权限范围管理；metadata 仅用于备注、用途和创建来源等非敏感展示信息。
- API Key 明文永不在本页展示；明文只允许在个人 API Key 创建成功后于 `16-dashboard-settings-api-keys.md` 页面一次性展示。
- 列表中只展示 key 前缀、`start`、`prefix` 或 masked key。
- 不暴露完整 session token、API Key secret 或 hash。
- 禁用 API Key 应立即使后续接口请求失败。
- 删除 API Key 必须二次确认，并记录审计事件。
- 风险判定使用服务端统一规则生成，不由前端自行推断：
  - 即将过期：`expiresAt` 存在且距离当前时间小于等于 30 天。
  - 已过期：`expiresAt` 早于当前时间，且 Key 尚未清理。
  - 长期未使用：`lastUsedAt` 为空或早于当前时间 90 天以上。
  - 长期有效：`expiresAt` 为空或超过 180 天。
  - 接口层拒绝异常：最近 24 小时因角色不足、组织成员角色不足或资源归属不匹配产生的 403 比例异常。
  - 所属主体异常：所属用户被封禁、删除、邮箱未验证，或所属组织已停用。
  - 使用异常：最近 24 小时请求量显著高于该 Key 过去 7 天均值、失败率异常、或出现非常用 IP/地区/接口路径。
- 使用日志需要产品层扩展表记录。Better Auth API Key plugin 可提供 Key 元数据和校验能力，但完整请求日志、IP 摘要、User-Agent 摘要、接口路径、响应状态、失败原因和风险事件需要在 API Key 校验中间件或网关层写入 `system_api_key_usage_log`。
- 使用日志默认保留最近 90 天；平台管理员可查看全站日志，support 角色如存在只能只读查看且不能看到敏感请求体。
- 使用日志属于产品扩展能力；如果日志表尚未创建、迁移未应用或日志查询临时不可用，`admin.apiKey.get`、`admin.apiKey.getOverview` 和 `admin.apiKey.listUsageLogs` 必须降级为空日志和 0 调用统计，不得影响平台 API Key 基础信息、风险中的非日志项和核心治理操作。
- 图表统计同样属于日志扩展能力；统计查询失败时展示空图表、0 调用和明确空态，不得阻断详情页打开。

## 通用工程约束

- Create T3 App: Next.js App Router, TypeScript, tRPC, Drizzle ORM, Tailwind CSS
- Better Auth: authentication, session, admin, organization, API Key plugin
- PostgreSQL: Better Auth API Key 表和必要的审计扩展表
- shadcn/ui + Zod: 表格、筛选、菜单、弹窗、表单校验
- Better Auth API Key plugin 的用户级和组织级配置必须开启 `enableMetadata`，平台页可读取备注、用途、创建来源等非敏感 metadata 辅助审计；不得读取或展示完整 key 与 hash。
- API Key 有效性校验必须基于 Better Auth `verifyApiKey`；业务授权由具体接口基于用户、角色、组织成员关系和资源归属完成，平台风险和日志不得把 metadata 当作授权事实来源。

## 验收标准

- 普通用户不能访问本页。
- 平台管理员可以查看全部用户和组织 API Key 元数据。
- 本页不提供普通用户自助创建 API Key 的入口。
- 本页不展示任何 API Key 明文。
- 平台页不展示或管理 API Key 权限范围；风险说明必须能解释过期、长期未使用、所属主体异常、接口层 403、限流或使用异常等触发原因。
- 搜索、筛选、分页、空态、加载态和错误态均有明确反馈。
- 操作列必须使用图标按钮或溢出菜单，并清楚支持「查看所属主体」「查看使用日志」「禁用/启用」「删除」四类动作。
- 风险 badge 必须能在详情或说明中解释触发原因。
- 平台管理员可以查看 API Key 使用日志；日志不包含完整 key、请求体密文、Authorization header 或其他 secret。
- 平台管理员可以在详情 Sheet 和完整详情页中通过 Tab 在调用日志与图表统计之间切换；默认进入调用日志。
- 平台管理员可以看到角色不足、资源归属不匹配、Key 停用、Key 过期、限流和无效 Key 等失败原因。
- 桌面端从列表打开详情 Sheet 时，列表状态不丢失；直接访问详情链接时仍可进入完整详情页。
- 禁用、启用和删除操作必须在服务端重新校验 session 和权限。
- 删除和禁用必须二次确认。
- support 角色不能执行高危操作。
