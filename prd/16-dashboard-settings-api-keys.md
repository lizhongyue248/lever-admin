# 16 个人 API Key 管理页

- 路由：`/dashboard/settings/api-keys`
- 详情路由：`/dashboard/settings/api-keys/[id]`
- 目标：让所有登录用户创建和管理自己的个人 API Key，用于 CLI、服务端脚本或开放接口请求。

## 功能范围

个人 API Key 管理页负责当前登录用户自己的 API Key 自助管理。普通用户、组织管理员和平台管理员都可以使用本页创建自己的 API Key。

本页只管理当前用户个人 Key，不展示其他用户 Key，不提供平台级统一治理能力。平台管理员查看和治理全站 API Key，应使用 `14-dashboard-admin-api-keys.md` 定义的平台 API Key 管理页。

第一版只支持用户级 API Key，即 Better Auth API Key plugin 中 `configId="user"`、`referenceId=currentUser.id` 的 Key。组织级 API Key 后续如需要，应单独设计组织设置页入口。

## 页面布局

- 整体布局继承 `06-dashboard.md` 的 DashboardLayout：
  - Sidebar、Topbar、左下角用户菜单、主题切换、面包屑与响应式行为均保持一致。
  - 本页只定义 Main 内容区域布局，不重复定义全局壳层。
- Sidebar：
  - 在「账号设置」分组中追加「API Keys」入口，位于「我的会话」之后。
  - 所有登录用户均可看到该入口。
- Main 内容区域：
  - 页面标题区展示「API Keys」和个人开发者凭据说明；创建 API Key 使用图标按钮放在标题区最右侧，图标按钮必须有 accessible label 和 tooltip。
  - 顶部不展示独立的 API Key 用途说明卡。
  - 表格卡片顶部同一行展示名称搜索框和状态筛选 `DropdownMenu`；第一版不展示过期时间等额外筛选控件。
  - 创建成功后，在表格上方展示一次性结果条，包含新生成的 API Key 明文、复制按钮和「仅显示一次」说明；该结果条不作为页面顶部独立说明卡。
  - 表格展示名称、创建时间、过期时间、最后使用时间、状态、操作。
  - 创建弹窗包含名称、有效天数和可选备注：
    - 表单样式参考 `dashboard-org-design.pen` 中组织表单的结构，使用明确的字段 Label、输入说明和底部操作区。
    - 有效天数为可选字段；不填写表示永久有效，填写 1-365 的整数天数后，表单下方必须实时展示预计过期时间。
    - 第一版暂不提供 API Key 权限模板、权限勾选或自定义 scope 输入。
    - API Key 在 v1 只作为调用方身份凭据；接口层根据 Key 对应用户、平台角色、组织成员角色和业务上下文自行做授权限制。
  - 操作列使用紧凑图标按钮，优先展示日志图标按钮；点击日志图标打开使用日志 Sheet 或详情面板。
  - 其他操作使用图标按钮或溢出菜单承载，包括禁用/启用、删除；所有图标按钮必须有 accessible label 和 tooltip。
  - 删除、禁用、启用均使用确认弹窗；删除属于高危操作。
- 呈现方式：
  - 桌面端点击表格行打开右侧个人 API Key 详情 Sheet，Sheet 使用 shadcn/ui `Sheet`，不手写 drawer 基础交互。
  - Sheet 内容以调用日志为主体，基础信息必须压缩为轻量摘要区，不使用大块详情卡挤占日志空间。基础摘要包含名称、masked key、状态、过期时间、最后使用时间和当前用户归属；更详细字段放在完整详情页或展开信息中。
  - Sheet 与完整详情页均提供「调用日志 / 图表统计」Tab：
    - 「调用日志」为默认 Tab，展示当前用户可见的最近调用、成功/失败、路径、状态码、IP 摘要和 User-Agent 摘要。
    - 「图表统计」展示该 Key 最近 24 小时与最近 7 天的调用趋势、成功/失败分布、状态码分布、Top 路径和平均耗时；图表只使用聚合数据，不展示完整 IP、完整 User-Agent、请求体或完整 API Key。
  - Sheet 顶部提供「打开完整详情页」入口，跳转 `/dashboard/settings/api-keys/[id]`。
  - 完整详情页复用同一详情数据、归属校验、日志查询和高危操作，仅布局容器不同。
  - 移动端点击 API Key 卡片优先进入完整详情页，避免在窄屏中压缩复杂日志表。
  - 详情 Sheet 加载时使用骨架屏展示标题、基础信息和日志表格占位，不使用纯文本加载提示。

## 用户动作

- 创建自己的 API Key。
- 复制新生成的 API Key 明文。
- 查看自己的 API Key 列表。
- 点击表格行打开 API Key 详情 Sheet。
- 从详情 Sheet 跳转完整 API Key 详情页。
- 按名称、状态、过期时间筛选。
- 禁用或重新启用自己的 API Key。
- 删除自己的 API Key。
- 查看 API Key 的最近使用时间和状态。
- 查看自己的 API Key 使用日志。

## 接口与逻辑

- `apiKey.listMine`：列出当前登录用户自己的 API Key，强制过滤 `configId="user"` 和 `referenceId=currentUser.id`。
- `apiKey.getMine`：读取当前用户自己的单个 API Key 基础信息、状态和最近使用摘要。
- `apiKey.createMine`：调用 Better Auth API Key plugin 创建当前用户个人 Key，明文只返回一次；第一版不接收权限范围、权限模板或自定义 scope，metadata 只保存备注、用途等非敏感展示信息。`expiresInDays` 可为空，空值表示永久有效；填写时必须是 1-365 的整数天数。
- `apiKey.disableMine`：禁用当前用户自己的 API Key，服务端校验归属。
- `apiKey.enableMine`：启用当前用户自己的 API Key，服务端校验归属。
- `apiKey.deleteMine`：删除当前用户自己的 API Key，服务端校验归属并要求二次确认。
- `apiKey.listMyUsageLogs`：分页读取当前用户自己 API Key 的使用日志，服务端强制校验 Key 归属。
- `apiKey.getMyUsageStats`：读取当前用户自己 API Key 的聚合调用统计，用于详情中的「图表统计」Tab；服务端强制校验 Key 归属，日志表不可用时返回空趋势和 0 统计。
- `Bearer/API Key auth`：服务端请求通过 Better Auth API Key plugin 校验 API Key 是否有效、启用、未过期。开放接口使用统一鉴权 helper 获取 API Key 对应的用户身份后，由接口业务逻辑按用户身份、平台角色、组织成员角色和资源归属做授权限制。

## API Key 鉴权与角色限制

- v1 暂不启用 API Key 级 permissions：
  - 创建 API Key 时不展示权限模板、权限勾选或自定义 scope。
  - 不把 UI 选择写入 Better Auth `permissions` 作为开放接口授权依据。
  - 如 Better Auth API Key plugin 需要 permissions 字段，可保持为空对象或最小默认值；产品层不得依赖它做业务授权。
- API Key 身份语义：
  - 个人 Key 代表创建者本人发起机器请求。
  - 开放接口在校验 API Key 有效后，应取得创建者用户 ID，并复用现有平台角色、组织成员角色、资源归属和业务规则判断是否允许访问。
  - 个人 Key 不因为“是 API Key”而天然获得组织写权限或平台管理员权限；接口必须重新做角色判断。
- 统一鉴权 helper：
  - 新增统一服务端 helper，例如 `validateApiKeyAndLog({ request, routeName })`。
  - helper 必须从请求 header 读取 API Key，调用 Better Auth `auth.api.verifyApiKey` 校验 key 状态、过期时间、启用状态和归属。
  - helper 返回 API Key、创建者用户和可用于接口层授权的上下文；具体接口自行检查所需角色或资源权限。
  - 接口层拒绝访问时，应返回 403 并写入调用日志，失败原因使用 `role_forbidden`、`org_role_forbidden` 或业务明确的错误码。
- 不建议第一版开启 `enableSessionForAPIKeys`：
  - API Key 应走独立的开放接口鉴权链路，不应混入 Dashboard 用户 session。
  - 需要用户会话的后台页面继续使用 Better Auth session；需要机器调用的接口使用 API Key。

## API Key 调用日志实现规划

- 与 `14-dashboard-admin-api-keys.md` 使用同一张 `system_api_key_usage_log` 表和同一套写入链路。
- 当前用户页面只允许查询 `configId="user"` 且 `referenceId=currentUser.id` 的 Key 日志。
- 查询接口 `apiKey.listMyUsageLogs` 必须先校验 Key 归属当前用户，再返回日志分页。
- 统一鉴权 helper 必须记录 API Key 校验结果；接口层角色不足、Key 停用、Key 过期、限流失败和无效 Key 都应写入日志。
- 日志 Sheet 默认展示最近 90 天记录，字段包括调用时间、请求方法、接口路径、请求结果、状态码、IP 摘要、User-Agent 摘要和失败原因。
- 图表统计默认使用最近 7 天聚合数据，提供调用量趋势、失败率、状态码分布、Top 路径和平均耗时。统计 Tab 不提供单条日志明细，点击 Top 路径或失败状态时可回到日志 Tab 并带入筛选条件。
- 个人页面不展示其他用户、组织 Key、完整 IP、完整 User-Agent、Authorization header、请求体或完整 API Key。
- 当 API Key 已删除时，个人页面不再展示该 Key 的管理入口；如需要保留个人审计记录，只显示 masked key 和历史日志，不允许继续操作。

## 实现要点

- 本页使用 protected procedure，只要求登录，不要求平台管理员权限。
- 列表 Sheet 与 `/dashboard/settings/api-keys/[id]` 完整详情页必须复用同一个详情组件或同一组数据 hooks，避免归属校验、日志字段和操作状态不一致。
- 详情 Sheet 打开时保留列表搜索、筛选、分页和滚动位置；关闭后回到当前列表状态。
- 详情链接必须可复制和直接访问；刷新 Sheet 态链接时可恢复为完整详情页或重新打开 Sheet，但不得丢失 API Key 上下文。
- 所有查询和 mutation 必须服务端强制校验 API Key 归属当前用户。
- 管理员在本页创建的是自己的个人 Key，不是替其他用户创建。
- API Key 明文只在创建成功后展示一次；列表和后续详情中只展示前缀、`start`、`prefix` 或 masked key。
- 第一版不做 API Key 权限范围配置；开放接口在 API Key 校验通过后，必须在接口层按用户身份、平台角色、组织成员角色和资源归属做授权限制。
- 创建表单的有效天数不填时创建永久有效 Key；填写有效天数时，必须在提交前展示明确的预计过期时间。
- 创建结果条放在表格上方，关闭前应提供复制按钮和「仅显示一次」安全提示。
- 刷新页面、关闭弹窗或离开页面后不能再次查看明文。
- 删除和禁用都需要确认。
- 禁用 API Key 应立即使后续接口请求失败。
- 使用日志需要产品层扩展表记录。当前用户只能查看自己的 Key 日志，日志字段包含时间、接口路径、请求结果、响应状态、IP 摘要、User-Agent 摘要和失败原因；不得展示完整 key、Authorization header、请求体 secret 或其他用户日志。
- 使用日志属于产品扩展能力；如果日志表尚未创建、迁移未应用或日志查询临时不可用，`apiKey.getMine` 和 `apiKey.listMyUsageLogs` 必须降级为空日志和 0 统计，不得影响 API Key 基础信息详情、禁用、启用和删除等核心管理能力。
- 图表统计同样属于日志扩展能力；统计查询失败时展示空图表、0 调用和明确空态，不得阻断详情页打开。
- 错误提示应说明操作失败原因，但不得泄露其他用户 Key 是否存在。

## 通用工程约束

- Create T3 App: Next.js App Router, TypeScript, tRPC, Drizzle ORM, Tailwind CSS
- Better Auth: authentication, session, API Key plugin
- PostgreSQL: Better Auth API Key 表
- shadcn/ui + Zod: 表格、筛选、菜单、弹窗、表单校验
- Better Auth API Key plugin 的用户级配置必须开启 `enableMetadata`，用于保存创建备注、用途等非敏感展示信息；metadata 不作为授权依据。
- API Key 校验必须基于 Better Auth `verifyApiKey` 判断 key 有效性；业务访问控制在接口层基于用户、角色、组织成员关系和资源归属完成，不依赖 masked key、metadata 或前端隐藏字段。

## 验收标准

- 所有登录用户都可以访问本页。
- 未登录用户访问时跳转 `/sign-in?redirectTo=%2Fdashboard%2Fsettings%2Fapi-keys`。
- 用户只能看到和管理自己的 API Key。
- 创建 API Key 成功后明文只展示一次，并提供复制按钮。
- 一次性结果条必须位于表格上方，并显示「仅显示一次」说明；关闭结果条后无法再次查看明文。
- API Key 列表只展示 masked key 或安全前缀。
- 创建表单不展示权限范围、权限模板或自定义 scope。
- 有效天数为空时创建成功的 API Key 在列表中过期时间显示「不过期」；填写有效天数时表单实时显示预计过期时间。
- 开放接口使用 API Key 访问时，必须先校验 Key 有效性，再由接口层按角色和资源归属限制访问；角色不足时请求失败并写入使用日志。
- 操作列必须使用图标按钮或溢出菜单，并清楚支持「查看使用日志」「禁用/启用」「删除」三类动作。
- 用户可以查看自己的 API Key 使用日志，但不能查看其他用户或组织 Key 日志。
- 用户可以在详情 Sheet 和完整详情页中通过 Tab 在调用日志与图表统计之间切换；默认进入调用日志。
- 桌面端从列表打开详情 Sheet 时，列表状态不丢失；直接访问详情链接时仍可进入完整详情页。
- 搜索、筛选、分页、空态、加载态和错误态均有明确反馈。
- 禁用、启用和删除操作必须在服务端重新校验 session 和 Key 归属。
- 删除和禁用必须二次确认。
