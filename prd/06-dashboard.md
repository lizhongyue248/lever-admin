# 06 工作台首页

- 路由：`/dashboard`
- 目标：登录后的默认入口，根据当前用户身份提供个人或组织管理员视角的工作台。

## 功能范围

工作台首页负责登录后的默认入口，根据当前用户在活跃组织中的角色展示不同维度的概览。

- 非组织管理员：展示个人账号、安全、会话、邀请、所属组织和个人 API Key 等与自己相关的数据。
- 组织管理员：展示活跃组织（公司）的身份治理、安全覆盖、成员增长、邀请处理、部门治理和组织 API Key 风险等管理数据。
- 平台管理员进入 `/dashboard` 时默认仍优先展示个人或活跃组织视角；平台级统计放在 `/dashboard/admin`，避免工作台承载过多平台治理能力。

当前阶段不再保留静态测试页或示例数据。`/dashboard` 必须读取真实 session 和数据库聚合结果；没有数据时展示 0 值、空态或隐藏对应模块，不使用固定人物、固定事件、固定百分比或示例趋势。

## 页面布局

- DashboardLayout：Sidebar + Topbar + Main。
- Sidebar：
  - 桌面端固定在左侧，宽度约 `256px - 280px`，背景使用 `sidebar` 变量，右侧使用 `sidebar-border` 细边框。
  - 视觉设计中 Sidebar 背景色应与 Topbar 背景保持一致，避免左侧壳层和顶部壳层割裂。
  - 顶部展示 `Lever Admin` 品牌区，包含产品标识、产品名和简短状态点。
  - 中部为分组导航，参考 shadcn `Sidebar / SidebarGroup / SidebarMenu` 的信息密度和交互方式。
  - 导航分组建议：
    - 概览：工作台。
    - 账号设置：个人资料、安全设置、我的会话、API Keys；当当前用户存在活跃或默认组织，且在该组织内为 owner/admin 时，在该分组内追加当前组织入口。
    - 管理：按平台角色展示已实现的平台治理入口。普通 user/support 不展示管理分组；平台 admin 展示用户管理、平台组织和平台 API Key；平台 super_admin 额外展示请求日志和平台设置。
  - 当前导航项使用 `primary/10` 背景、`primary` 文本和左侧小色条高亮。
  - 暗黑主题下 Sidebar 使用与 Topbar 一致的中性黑色/炭灰底，不使用带蓝感的侧边栏底色；选中态使用 `sidebar-accent` 的中性底色，只保留 `primary` 左侧色条和重点文字。
  - 不单独展示「组织」分组；普通用户不展示当前组织入口。
  - 当前用户没有任何组织时不展示「当前组织」入口；当前用户仅为组织 member 时也不展示组织管理入口。
  - 带待处理数量的入口使用小型 badge，例如邀请数量、待审核成员数。
  - 左下角固定展示当前用户信息区，包含头像、名称、邮箱和展开图标。
  - 左下角用户信息区收起态不展示邮箱验证状态，避免把次要状态塞进全局壳层。
  - 用户信息区始终贴近 Sidebar 底部，不随 Main 内容滚动。
- 用户信息区：
  - 点击左下角用户信息区后弹出用户菜单。
  - 弹出方向优先从用户信息区正上方展开，避免遮挡底部边缘；移动端可改为底部抽屉。
  - 菜单宽度约 `320px`，使用 `DropdownMenu` 或 `Popover`，风格参考 shadcn profile dropdown。
  - 菜单顶部展示当前用户头像、名称、邮箱、邮箱验证状态。
  - 菜单中展示用户已加入的组织列表，包含组织名、角色、当前活跃标记，并可直接切换当前组织。
  - 当前组织使用 check 图标或 `当前` badge 标记。
  - 菜单底部提供个人资料、安全设置、退出登录等动作。
  - 退出登录使用 destructive 语义，但不使用过强的红色大面积背景。
- Topbar：
  - 顶部栏固定占据一行，位于 Sidebar 右侧、Main 上方，参考 shadcn dashboard shell 的顶部栏结构。
  - 高度约 `56px - 64px`，使用 `bg-card` 或 `background`，底部使用 `border-border` 细边框。
  - 左侧提供 Sidebar 折叠/展开图标按钮，桌面端用于折叠 Sidebar，移动端用于打开 Sidebar 抽屉。
  - 折叠按钮右侧使用竖向 `Separator` 与面包屑分隔。
  - 中部展示面包屑导航，例如：`首页 / 工作台`；进入设置或组织页面时展示对应层级，例如：`首页 / 设置 / 个人资料`。
  - 面包屑用于表达当前位置，不作为重复页面标题；当前页使用 `BreadcrumbPage` 样式。
  - 右侧展示全局通知图标按钮和主题切换图标按钮，通知图标位于主题切换左侧，二者尺寸保持一致。
  - 通知图标使用 Bell 类图标按钮；存在未读或待处理通知时，在图标右上角展示小型计数 badge，计数上限显示为 `99+`。
  - 点击通知图标后打开通知面板。桌面端使用右上角 Popover/Dropdown 面板，宽度约 `360px - 400px`；移动端使用从右侧或底部打开的 Sheet，避免窄屏遮挡内容。
  - 通知面板顶部展示「通知」标题和待处理状态；在第一版仅有派生邀请通知时，不展示「全部标为已读」。
  - 通知面板支持按类型分组或筛选，第一版至少包含「全部」「邀请」「安全」三个筛选项；未实现类型可以显示空态，不展示无功能入口。
  - 通知面板列表项展示通知类型、标题、简短描述、时间、状态 badge 和可用操作。
  - 组织邀请通知属于可操作通知，列表项必须展示组织名称、默认部门（可选）、邀请角色、邀请人、过期时间，并提供「接受」「拒绝」「详情」操作。
  - 通知面板底部可展示「查看全部通知」入口；第一版如不实现独立通知页，则不显示该入口。
  - 主题切换保持全局独立，不放入用户菜单。
  - 右侧除通知图标和主题切换外不放组织切换器、搜索框或顶部用户头像。
  - 第一版不展示语言切换；如后续需要国际化，语言入口应作为独立需求评审。
- Main：
  - 内容区左上角不再展示重复的导航名字。
  - 内容区顶部不放全局搜索框。
  - 内容区顶部不放组织切换器，组织切换统一放入左下角用户菜单。
  - Main 使用 `max-w-7xl` 宽度约束和 `px-4 / sm:px-6 / lg:px-8` 横向安全边距。
  - DashboardLayout 根容器固定在当前视口内，Main 是唯一垂直滚动容器；页面内容不得再触发浏览器级第二滚动条。
  - Main 内层容器和页面内容必须保留 `min-width: 0` 约束，长 URL、邮箱、密钥状态或表格内容不得撑出可视范围。
  - 内容区可以保留页面标题区，但标题属于页面内容本身，例如「工作台」和说明文案，不作为顶部导航栏。
  - Main 从 Topbar 下方开始，滚动时 Topbar 保持固定或 sticky，内容不被遮挡。
- 工作台视角：
  - `/dashboard` 必须根据当前 session、活跃组织和当前用户在活跃组织中的角色决定内容视角。
  - 当前用户是活跃组织 `owner` 或 `admin` 时，展示组织管理员工作台。
  - 当前用户不是活跃组织管理员、没有活跃组织、或仅为 `member/viewer` 时，展示个人工作台。
  - 切换活跃组织后，工作台视角和数据应随之刷新。
  - 两种视角共享 DashboardLayout，但 Main 内的数据维度、标题文案、图表和快捷操作不同。
  - 页面内容区不展示「当前身份」「个人视角」「管理员视角」这类显式身份标签；视角差异通过数据维度、卡片标题、快捷操作和右下角切换入口体现。
- 个人工作台 Main：
  - Main 内容区不展示「我的工作台」这类重复页面标题，直接从个人安全洞察主卡片开始。
  - 主视觉卡片展示个人安全健康分，维度包括邮箱验证、2FA、Passkey、活跃会话、第三方账号绑定；卡片内不展示身份健康类 badge。
  - 个人安全健康分不使用传统环状图，使用五维雷达图表达维度覆盖度；雷达图中心区域不放置任何卡片、块或文字。
  - 主视觉卡片的底部数量摘要固定放在卡片左下角，不放在右下角。
  - 风险行动队列展示与个人直接相关的事项，例如验证邮箱、开启 2FA、撤销异常会话、处理待加入组织邀请。
  - 当存在待处理组织邀请时，个人工作台不再额外插入独立邀请处理卡片；用户通过 Topbar 右侧通知图标查看并处理邀请，工作台内容区只在风险行动队列中保留「处理组织邀请」任务入口。
  - 图表区域展示个人登录与会话趋势、认证方式使用占比、个人 API Key 使用状态。
  - 列表区域展示最近登录记录、待处理邀请、最近账号安全事件。
  - 待处理邀请在通知面板中展示；列表区域如展示最近身份事件，只展示邀请摘要和状态，不重复承载接受/拒绝主操作。
  - 快捷入口包含个人资料、安全设置、我的会话、个人 API Keys、待处理邀请和创建组织引导；个人 API Keys 跳转 `16-dashboard-settings-api-keys.md` 定义的 `/dashboard/settings/api-keys`。
  - 创建组织引导打开创建组织弹窗，不跳转独立创建组织页面。
  - 个人工作台不展示视角切换按钮，因为非组织管理员没有可切换的组织管理视角。
- 组织管理员工作台 Main：
  - Main 内容区不展示「组织工作台」这类重复页面标题，当前活跃组织信息放入主视觉卡片或上下文标签中。
  - 主视觉卡片展示组织治理健康分，维度包括成员安全覆盖率、邀请处理、部门治理、异常会话、API Key 风险；卡片内不展示身份健康类 badge。
  - 组织治理健康分不使用传统环状图，统一使用五维雷达图表达成员、邀请、组织架构、会话和 API Key 的治理覆盖度；雷达图中心区域不放置任何卡片、块或文字。
  - 主视觉卡片的底部数量摘要固定放在卡片左下角，不放在右下角。
  - 风险行动队列展示组织管理员需要处理的事项，例如未验证邮箱成员、未开启 2FA 成员、过期邀请、异常会话、即将过期 API Key。
  - 图表区域展示组织成员增长、登录与会话趋势、认证方式覆盖率、部门成员分布。
  - 列表区域展示最近组织事件、最近成员变更、待处理邀请和高风险 API Key。
  - 快捷入口包含当前组织管理、邀请、部门架构和登录情况；未实现的组织 API Key 管理不展示入口。
  - 当当前登录用户存在待处理组织邀请时，通过 Topbar 通知图标展示和处理；组织管理员工作台内容区不再插入额外邀请卡片，避免管理视角和个人待办混杂。
  - 组织管理员可通过右下角悬浮图标按钮切换个人视角和组织管理员视角；按钮使用图标为主，悬停或聚焦时显示「切换视角」说明。
- 图表与卡片风格：
  - 首屏优先使用 `xl:grid-cols-12`，主视觉卡片占 `7-8` 列，风险行动队列占 `4-5` 列。
  - 中部洞察区使用 2 到 3 张图表卡片，避免一屏堆满传统 KPI。
  - 卡片风格参考 shadcn dashboard shell：`Card` 细边框、低阴影、紧凑 header、`primary/10` 图标底色、表格行清晰分隔。
  - 主内容卡片必须保留轻微外阴影，用于区分内容层级；阴影应克制，不使用强投影或漂浮感。
  - 图表用于解释身份治理状态，不做纯装饰；第一版可使用简化折线图、环形图或柱状图，但数据必须来自真实接口。暂无数据时展示 0 值趋势或空态，不使用静态占位数据。
- 主题与设计稿：
  - 工作台配色必须基于 `src/styles/globals.css` 中定义的语义 token，不单独发明脱离系统的配色。
  - 明亮主题使用 `:root` 下的 `background`、`foreground`、`card`、`muted`、`muted-foreground`、`accent`、`border`、`primary`、`chart-*`、`sidebar-*`。
  - 暗黑主题使用 `.dark` 下的同名 token，暗色背景应贴近 `--background: oklch(0.2 0 0)` 和 `--card: oklch(0.27 0 0)` 的中性炭灰体系，不使用额外的深蓝黑主题。
  - 图表颜色优先使用 `chart-1` 到 `chart-5`，强调按钮和选中态使用 `primary`，危险操作使用 `destructive`。
  - 图表不应直接大面积铺满最高对比的 `chart-*` 色值；应使用主题内弱底色作为 track，只在关键弧段、柱体和进度条中小面积使用 `primary` 或 `chart-*`，避免亮色主题出现异常深色块、暗色主题出现过多高亮色块。
  - 主体内容字体应比常规营销页更克制：卡片标题约 `16px`，说明和图例约 `11px - 12px`，任务项约 `12px`；仅健康分数字可以作为主视觉放大。
  - 权限分布等单图卡片中的图表应在卡片内容区域居中，避免贴左导致视觉重心偏移。
  - `prd/dashboard-design.pen` 需要包含 8 个画板：4 个桌面画板和 4 个移动端画板，分别覆盖个人视角明亮主题、个人视角暗黑主题、组织管理员视角明亮主题、组织管理员视角暗黑主题。
  - 8 个画板均不展示「当前身份」显式文字；组织管理员画板保留右下角悬浮切换视角图标，个人画板不展示该按钮。
  - 全局通知面板补充设计放在 `prd/dashboard-org-design.pen`，包含桌面明亮、桌面暗黑、移动明亮、移动暗黑四个画板，用于表达 Topbar 通知图标、通知计数 badge、通知面板和组织邀请接受/拒绝操作。

## 响应式布局

- 桌面端：Sidebar 常驻，用户信息区固定在 Sidebar 左下角，Topbar 固定在 Sidebar 右侧顶部，Main 占满剩余宽度。
- 平板端：Sidebar 可折叠，折叠后只显示图标；用户信息区保留头像入口；Topbar 左侧折叠按钮始终可见。
- 移动端：
  - Sidebar 默认隐藏，通过 Topbar 左侧折叠菜单按钮打开抽屉。
  - 用户菜单仍在 Sidebar 抽屉底部。
  - 主题切换按钮位于 Topbar 右侧。
  - 面包屑在窄屏可只展示上一级和当前页，避免挤压右侧主题按钮。
  - 内容网格改为单列，统计卡片两列或单列根据宽度自适应。

## 用户动作

- 查看当前个人账号状态或活跃组织治理状态。
- 点击左下角用户信息区打开用户菜单。
- 在用户菜单中点击退出登录按钮，调用 Better Auth 退出当前 session，并跳转 `/sign-in`。
- 在用户菜单中切换活跃组织。
- 根据活跃组织角色查看个人工作台或组织管理员工作台。
- 进入当前组织管理、安全、会话等页面。
- 点击 Topbar 右侧通知图标打开通知面板。
- 查看当前用户收到的通知，包括待处理组织邀请、安全提醒和系统状态。
- 在通知面板中接受或拒绝组织邀请。
- 从通知面板进入邀请详情页。
- 将普通通知标记为已读；仅在新增可持久化普通通知模型后启用。
- 有创建权限时通过弹窗创建组织。

## 接口与逻辑

- `dashboard.getOverview`：tRPC 聚合当前用户、活跃组织、当前组织角色，并返回当前工作台视角。
- `dashboard.getShell`：返回 Dashboard 壳层所需用户、通知、组织和导航权限数据。返回用户平台角色用于 Sidebar 菜单过滤；返回组织列表和当前组织角色用于判断是否展示「当前组织」入口。
- `notification.list`：读取当前登录用户的通知列表，支持 `type`、`status`、`page` 和 `pageSize`；第一版通知可由真实业务表聚合生成，组织邀请通知从 `auth_invitation` 派生，不额外复制邀请数据。
- `notification.getUnreadCount` 或 `dashboard.getShell` 内聚合：返回当前用户未读通知数和待处理通知数，用于 Topbar 通知图标 badge；不得暴露其他用户通知。
- `notification.markRead`：第一版仅有派生邀请通知时返回不支持标记已读；新增可持久化普通通知模型后用于将普通通知标记为已读。组织邀请这类待处理通知在接受或拒绝后自动从待处理列表移除。
- `notification.markAllRead`：第一版仅有派生邀请通知时返回不支持标记已读；新增可持久化普通通知模型后用于批量标记当前用户的非待处理普通通知。不能把 pending 邀请直接标记为已处理。
- `notification.invitation.accept`：从通知面板接受组织邀请，服务端校验邀请邮箱与当前登录邮箱一致；接受后创建组织成员关系，若邀请包含默认部门则创建部门成员归属，刷新 dashboard shell 并跳转 `/dashboard/orgs/[slug]`。
- `notification.invitation.reject`：从通知面板拒绝组织邀请，服务端校验邀请邮箱与当前登录邮箱一致；拒绝后更新邀请状态为 `rejected`，刷新通知列表。
- `dashboard.getPersonalOverview`：tRPC 聚合个人安全健康、个人会话、个人邀请、个人 API Key 和最近账号事件。
- `dashboard.getOrganizationOverview`：tRPC 聚合组织治理健康、成员安全覆盖、部门治理、邀请、组织会话趋势和组织 API Key 风险，要求当前用户是活跃组织 owner/admin。
- `auth.api.getSession`：服务端验证登录态并取得当前 session。
- `authClient.signOut`：客户端退出当前 session，成功后 `router.replace('/sign-in')` 并刷新路由缓存。
- `authClient.organization.setActive`：切换当前 session 的 activeOrganizationId。
- `org.create`：创建 organization，当前用户成为 owner，并设置为活跃组织。
- Dashboard 内 client-side tRPC query 失败时，通过全局 QueryClient 错误处理展示 toast，toast 内容优先使用后端 `TRPCError.message`。
- Dashboard 内 client-side tRPC mutation 失败且调用方没有提供本地 `onError` 时，通过全局 MutationCache 错误处理展示 toast；已有本地 `onError` 的 mutation 继续使用页面内定制提示，避免重复 toast。
- Dashboard 内 Server Component 调用 tRPC 失败时，通过路由段 `error.tsx` 展示可见错误卡片，并在客户端挂载后弹出同内容 toast。

### 工作台真实数据口径

工作台首页所有数字、图表、事件和行动队列必须来自真实数据源。第一版允许使用简化评分规则，但评分规则必须在服务端集中定义，并在 PRD 中可解释；不允许在前端写死展示百分比、固定柱状图高度、固定最近事件或固定“风险为 0”。

个人视角数据来源：

- 健康分雷达图：
  - 邮箱维度来自 `auth_user.email_verified`，已验证为 `100`，未验证为 `20`。
  - 2FA 维度来自 `auth_user.two_factor_enabled` 与 `auth_two_factor.verified`，已启用且已验证为 `100`，否则为 `0`。
  - Passkey 维度来自 `auth_passkey` 当前用户记录数，大于 0 为 `100`，否则为 `0`。
  - 会话维度来自 `auth_session` 当前用户未过期会话数，`<= 3` 为 `100`，每超出一个会话扣 `10`，最低 `20`。
  - 第三方账号维度来自 `auth_account.provider_id` 中非 credential provider 的绑定数量，大于 0 为 `100`，否则为 `0`；不得使用固定 `80`。
- 登录方式画像改为“可用登录方式”。数据来自 `auth_account`、`auth_passkey` 和 `auth_user.two_factor_enabled`，按真实可用方式计数展示：邮箱密码、OAuth provider、Passkey。没有任何可统计方式时展示空态，不显示固定 `58/31/11`。
- 设备足迹或登录趋势优先来自 `system_request_log` 中当前用户最近 30 天的登录、会话和 Dashboard 访问审计记录；如果请求日志尚未采集或为空，则展示真实空态和当前 `auth_session` 活跃会话数量，不使用固定柱状图高度。
- 个人 API Key 状态来自 `auth_apikey` 和 `system_api_key_usage_log`：
  - 总数：当前用户 `config_id='user'`、`reference_id=当前用户 ID` 的 key 数。
  - 30 天内使用：最近 30 天存在使用日志的 key 数。
  - 即将过期：`expires_at` 在未来 30 天内的启用 key 数。
  - 高风险 Scope：第一版如 API Key scope 尚未结构化定义，则不展示该行；不得写死 `0 个高权限 Scope`。
- 最近身份事件来自 `system_request_log`、`auth_invitation` 和 `system_api_key_usage_log` 的真实记录聚合：
  - 登录/会话事件来自请求日志或 session 更新时间。
  - 邀请事件来自当前用户邮箱对应的 invitation。
  - API Key 事件来自当前用户 key 的使用日志。
  - 无记录时展示“暂无最近身份事件”空态，不展示固定 “Chrome · 上海 · 12 分钟前” 等示例事件。

组织管理员视角数据来源：

- 组织治理健康分：
  - 成员安全覆盖率来自组织成员对应 `auth_user.email_verified`、`auth_user.two_factor_enabled`、`auth_two_factor.verified` 和 `auth_passkey` 覆盖率。
  - 邀请处理来自 `auth_invitation` 当前组织 pending/expired 数量；无待处理和过期邀请为 `100`，有待处理时按数量扣分，最低 `20`。
  - 部门治理来自 `system_organization_department`、`auth_member` 和 `system_organization_department_member`：有部门且未分配成员占比越低分数越高；无部门但有成员时显示需要完善组织架构，不使用固定 `82`。
  - 会话维度来自组织成员未过期 `auth_session` 数量和 `system_request_log` 风险请求；无高风险且会话数量不异常为高分，存在高风险请求或超量会话按规则扣分。
  - API Key 风险来自组织级 `auth_apikey` 与 `system_api_key_usage_log`，统计禁用、即将过期、失败率高或高风险使用记录。
- 权限分布来自 `auth_member.role` 按 `owner`、`admin`、`member` 真实计数展示；当前没有 viewer 角色时不得展示 viewer 固定占比。
- 团队/部门结构卡片来自 `system_organization_department` 与 `system_organization_department_member`，展示最大部门、空部门、未分配成员等真实摘要；无部门时展示空态和进入组织架构页的入口，不使用固定气泡和“研发团队偏大”文案。
- 最近组织事件来自 `system_request_log`、`auth_invitation`、`auth_member.created_at`、`system_organization_department.created_at` 和组织级 API Key 使用日志聚合；无记录时展示空态。
- 风险行动队列的每一项都必须带真实 `count` 和来源。若某项当前数据源不可用，应隐藏该项或显示“暂无可评估数据”，不得使用序号 `1/2` 作为 count。

根路由数据处理：

- `/` 不允许继续展示“首页访问测试成功”开发期页面。
- 未登录访问 `/` 时进入 `/sign-in` 或公开介绍页；第一版推荐重定向 `/sign-in`。
- 已登录访问 `/` 时重定向 `/dashboard`。
- 旧 `/app` 路由继续重定向 `/dashboard`，不展示单独测试内容。

## 实现要点

- `/dashboard` 路由段必须使用 `src/app/dashboard/layout.tsx` 作为统一 DashboardLayout，Sidebar、Topbar、左下角用户菜单、主题切换和移动端 Sidebar 抽屉都在 layout 层实现；`/dashboard/page.tsx` 只实现工作台首页 Main 内容。
- 07-15 的 `/dashboard/**` 页面默认继承同一个 DashboardLayout，只描述和实现自己的 Main 内容区域。
  - `16-dashboard-settings-api-keys.md` 同样继承 DashboardLayout，并在账号设置分组中追加个人 API Keys 入口。
- 06 首版代码结构：
  - `src/app/dashboard/layout.tsx`：服务端读取 session 和 `dashboard.getShell`，未登录重定向 `/sign-in?redirectTo=%2Fdashboard`。
  - `src/app/dashboard/page.tsx`：服务端读取 `dashboard.getHome`，只渲染首页 Main 内容。
  - `src/app/dashboard/_components/dashboard-shell.tsx`：组合 Sidebar、Topbar 和 Main 内容容器。
  - `src/app/dashboard/_components/dashboard-sidebar.tsx`：桌面与移动端复用的主导航和左下角用户入口。
  - `src/app/dashboard/_components/dashboard-topbar.tsx`：折叠菜单栏图标、面包屑和右侧主题切换。
  - `src/app/dashboard/_components/dashboard-notification-menu.tsx`：Topbar 通知图标、计数 badge、通知面板、通知筛选和通知操作。
  - `src/app/dashboard/_components/dashboard-user-menu.tsx`：用户信息、邮箱验证状态、组织切换和退出登录。
  - `src/app/dashboard/_components/create-organization-dialog.tsx`：创建组织弹窗，供工作台引导、用户菜单或平台组织管理入口复用。
  - `src/app/dashboard/_components/dashboard-home-content.tsx`：个人/组织管理员首页内容。
  - `src/app/dashboard/_components/health-radar-chart.tsx`：雷达图组件，图表中心不放置文字或卡片。
  - `src/server/api/routers/dashboard.ts`：工作台聚合 API 和组织切换 mutation。
  - `src/server/api/routers/notification.ts`：当前用户通知聚合、组织邀请通知接受/拒绝；在仅有派生邀请通知时，标记已读接口返回不支持。
- 该页使用 Server Component 获取初始数据。
- 未登录 redirect('/sign-in')。
- 登录后的默认入口从 `/app` 调整为 `/dashboard`，旧 `/app` 路由保留并重定向到 `/dashboard`。
- 左下角用户信息区展示当前用户头像、名称、邮箱，并在菜单中展示邮箱验证状态、组织列表、组织切换和退出登录按钮。
- 组织管理员视角必须做服务端权限校验，不能只依赖前端角色判断。
- 非组织管理员不能看到组织级成员安全覆盖、组织 API Key 风险、组织会话趋势等管理数据。
- 无组织时在工作台展示轻量创建组织或等待邀请引导；创建组织使用弹窗，不跳转到独立组织页面。
- 邮箱未验证时在页面顶部展示提醒条。
- 06 首版正式启用 Better Auth `admin`、`organization`、`twoFactor`、`passkey`、`apiKey` 插件；公司内部部门层级由产品层扩展表支撑，不提供额外分组管理入口。
- Better Auth 插件导致的 Drizzle schema 变更直接同步到 `src/server/db/schema.ts`，开发环境使用 `pnpm db:push` 推送 schema，不执行 `pnpm db:generate` 和 `pnpm db:migrate`。
- 首页接口第一版优先使用 Better Auth/Drizzle 可直接取得的数据；如果组织、Passkey、2FA、API Key 暂无数据，展示真实空态或 0 值，不使用脱离接口结构的前端假数据。
- 全局通知系统第一版优先支持业务聚合通知，不强制新增通用通知表；组织邀请通知从 invitation 表派生，后续需要站内消息、公告或审计通知时再新增 `system_notification` 表。
- 组织邀请通知与 `/invite/[id]` 使用同一套服务端接受/拒绝逻辑；通知面板是快捷入口，不另建独立邀请处理模型。
- 邀请通知只展示当前登录用户邮箱对应的 pending 邀请；过期、已取消、已接受、已拒绝的邀请不进入待处理通知列表，但可在邀请接受页展示对应终态。
- 通知面板中的普通通知只有在新增可持久化 `system_notification` 表后才展示“标记已读”或“全部标为已读”；如果第一版仅包含从业务表派生的邀请通知，则不展示这两个操作，也不实现只返回成功但不落库的占位 mutation。
- 待处理邀请不能仅标记已读来替代业务处理，必须接受、拒绝、过期或取消后才离开待处理集合。
- 个人 API Key 自助创建与管理由 `16-dashboard-settings-api-keys.md` 承载；平台级 API Key 统一治理由 `14-dashboard-admin-api-keys.md` 承载，工作台首页只展示摘要和跳转。
- `apiKey` 插件按当前安装版本使用默认数据库存储；`enableSessionForAPIKeys` 仅属于单个 API Key 配置项且带生产安全风险，06 首版不启用 API Key 模拟 session 能力。
- `src/server/db/schema.ts` 维护 Better Auth 插件表：`organization`、`member`、`invitation`、`twoFactor`、`passkey`、`apikey`，实际数据库表名继续使用 `system_*` 前缀；公司内部部门层级使用产品扩展表维护。
- Dashboard 路由段提供通用错误展示组件；权限不足、未找到资源、服务端聚合失败等 tRPC 异常必须把后端错误信息展示给用户，不能只显示“请稍后重试”。

## 通用工程约束

- Create T3 App: Next.js App Router, TypeScript, tRPC, Drizzle ORM, Tailwind CSS
- Better Auth: authentication, session, admin, organization, passkey, 2FA, API key plugins
- PostgreSQL: Better Auth tables plus optional product-specific extension tables
- shadcn/ui + @tanstack/react-form + Zod: forms, tables, dialogs, validation

## 公共组件使用

- 本页第一版不使用共享 `DataTable` 或 `DataPagination`，因为工作台首页以概览卡片、图表和短列表为主，没有标准分页表格。
- 如后续最近事件或风险队列扩展为可分页表格，应优先使用 `98-common-components.md` 中定义的共享表格和分页组件。

## 验收标准

- 页面在未授权、加载、空数据、错误、成功状态下均有明确反馈。
- tRPC 抛出的权限、校验或业务错误必须有用户可见提示；Server Component 错误展示错误卡片并弹出 toast，client-side query/mutation 错误通过全局 toast 兜底。
- Topbar 右侧必须展示通知图标按钮，且位于主题切换按钮左侧。
- 当前用户存在未读或待处理通知时，通知图标必须展示计数 badge。
- 点击通知图标后必须打开通知面板；桌面端为右上角面板，移动端为 Sheet 或等效可用面板。
- 当前用户存在 pending 组织邀请时，通知面板必须展示可见邀请通知，并可直接接受或拒绝。
- 邀请通知中必须区分公司和默认部门，部门只作为加入后的归属信息展示，不作为独立组织入口。
- 接受邀请后 Sidebar 用户菜单组织列表必须在刷新后包含新组织；拒绝邀请后该通知从工作台列表移除。
- 所有敏感动作必须在服务端重新校验 session 和权限。
- Sidebar 必须根据角色过滤菜单：无组织或组织 member 不显示「当前组织」；user/support 不显示管理分组；admin 显示基础平台治理入口；super_admin 显示完整平台治理入口。
- 表单字段均有客户端和服务端校验。
- 高危操作必须二次确认。
