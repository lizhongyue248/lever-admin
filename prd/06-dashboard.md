# 06 工作台首页

- 路由：`/dashboard`
- 目标：登录后的默认入口，根据当前用户身份提供个人或组织管理员视角的工作台。

## 功能范围

工作台首页负责登录后的默认入口，根据当前用户在活跃组织中的角色展示不同维度的概览。

- 非组织管理员：展示个人账号、安全、会话、邀请、所属组织和个人 API Key 等与自己相关的数据。
- 组织管理员：展示活跃组织的身份治理、安全覆盖、成员增长、邀请处理、团队和组织 API Key 风险等管理数据。
- 平台管理员进入 `/dashboard` 时默认仍优先展示个人或活跃组织视角；平台级统计放在 `/dashboard/admin`，避免工作台承载过多平台治理能力。

当前阶段先提供临时测试页，用于验证登录后 `/dashboard` 可访问、服务端 session 可读取，以及退出登录流程可用。完整工作台聚合能力后续再按本 PRD 扩展。

## 页面布局

- DashboardLayout：Sidebar + Topbar + Main。
- Sidebar：
  - 桌面端固定在左侧，宽度约 `256px - 280px`，背景使用 `sidebar` 变量，右侧使用 `sidebar-border` 细边框。
  - 视觉设计中 Sidebar 背景色应与 Topbar 背景保持一致，避免左侧壳层和顶部壳层割裂。
  - 顶部展示 `Lever Admin` 品牌区，包含产品标识、产品名和简短状态点。
  - 中部为分组导航，参考 shadcn `Sidebar / SidebarGroup / SidebarMenu` 的信息密度和交互方式。
  - 导航分组建议：
    - 概览：工作台。
    - 账号设置：个人资料、安全设置、我的会话。
    - 组织：组织管理、创建组织、成员、团队。
    - 管理：后台概览、用户管理、API 密钥。
  - 当前导航项使用 `primary/10` 背景、`primary` 文本和左侧小色条高亮。
  - 暗黑主题下 Sidebar 使用与 Topbar 一致的中性黑色/炭灰底，不使用带蓝感的侧边栏底色；选中态使用 `sidebar-accent` 的中性底色，只保留 `primary` 左侧色条和重点文字。
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
  - 右侧展示全局主题切换图标按钮，尺寸与认证页保持一致。
  - 主题切换保持全局独立，不放入用户菜单。
  - 右侧除主题切换外不放组织切换器、搜索框或顶部用户头像。
  - 第一版不展示语言切换；如后续需要国际化，语言入口应作为独立需求评审。
- Main：
  - 内容区左上角不再展示重复的导航名字。
  - 内容区顶部不放全局搜索框。
  - 内容区顶部不放组织切换器，组织切换统一放入左下角用户菜单。
  - Main 使用 `max-w-7xl` 宽度约束和 `px-4 / sm:px-6 / lg:px-8` 横向安全边距。
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
  - 图表区域展示个人登录与会话趋势、认证方式使用占比、个人 API Key 使用状态。
  - 列表区域展示最近登录记录、待处理邀请、最近账号安全事件。
  - 快捷入口包含个人资料、安全设置、我的会话、我的组织、创建组织。
  - 个人工作台不展示视角切换按钮，因为非组织管理员没有可切换的组织管理视角。
- 组织管理员工作台 Main：
  - Main 内容区不展示「组织工作台」这类重复页面标题，当前活跃组织信息放入主视觉卡片或上下文标签中。
  - 主视觉卡片展示组织治理健康分，维度包括成员安全覆盖率、邀请处理、团队治理、异常会话、API Key 风险；卡片内不展示身份健康类 badge。
  - 组织治理健康分不使用传统环状图，统一使用五维雷达图表达成员、邀请、团队、会话和 API Key 的治理覆盖度；雷达图中心区域不放置任何卡片、块或文字。
  - 主视觉卡片的底部数量摘要固定放在卡片左下角，不放在右下角。
  - 风险行动队列展示组织管理员需要处理的事项，例如未验证邮箱成员、未开启 2FA 成员、过期邀请、异常会话、即将过期 API Key。
  - 图表区域展示组织成员增长、登录与会话趋势、认证方式覆盖率、团队成员分布。
  - 列表区域展示最近组织事件、最近成员变更、待处理邀请和高风险 API Key。
  - 快捷入口包含成员管理、团队管理、组织设置、API Key 管理。
  - 组织管理员可通过右下角悬浮图标按钮切换个人视角和组织管理员视角；按钮使用图标为主，悬停或聚焦时显示「切换视角」说明。
- 图表与卡片风格：
  - 首屏优先使用 `xl:grid-cols-12`，主视觉卡片占 `7-8` 列，风险行动队列占 `4-5` 列。
  - 中部洞察区使用 2 到 3 张图表卡片，避免一屏堆满传统 KPI。
  - 卡片风格参考 shadcn dashboard shell：`Card` 细边框、低阴影、紧凑 header、`primary/10` 图标底色、表格行清晰分隔。
  - 图表用于解释身份治理状态，不做纯装饰；第一版可使用简化折线图、环形图、柱状图或静态占位。
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
- 进入组织、成员、安全、会话等页面。
- 接受或拒绝邀请。

## 接口与逻辑

- `dashboard.getOverview`：tRPC 聚合当前用户、活跃组织、当前组织角色，并返回当前工作台视角。
- `dashboard.getPersonalOverview`：tRPC 聚合个人安全健康、个人会话、个人邀请、个人 API Key 和最近账号事件。
- `dashboard.getOrganizationOverview`：tRPC 聚合组织治理健康、成员安全覆盖、团队、邀请、组织会话趋势和组织 API Key 风险，要求当前用户是活跃组织 owner/admin。
- `auth.api.getSession`：服务端验证登录态并取得当前 session。
- `authClient.signOut`：客户端退出当前 session，成功后 `router.replace('/sign-in')` 并刷新路由缓存。
- `authClient.organization.setActive`：切换当前 session 的 activeOrganizationId。

## 实现要点

- `/dashboard` 路由段必须使用 `src/app/dashboard/layout.tsx` 作为统一 DashboardLayout，Sidebar、Topbar、左下角用户菜单、主题切换和移动端 Sidebar 抽屉都在 layout 层实现；`/dashboard/page.tsx` 只实现工作台首页 Main 内容。
- 07-18 的 `/dashboard/**` 页面默认继承同一个 DashboardLayout，只描述和实现自己的 Main 内容区域。
- 06 首版代码结构：
  - `src/app/dashboard/layout.tsx`：服务端读取 session 和 `dashboard.getShell`，未登录重定向 `/sign-in?redirectTo=%2Fdashboard`。
  - `src/app/dashboard/page.tsx`：服务端读取 `dashboard.getHome`，只渲染首页 Main 内容。
  - `src/app/dashboard/_components/dashboard-shell.tsx`：组合 Sidebar、Topbar 和 Main 内容容器。
  - `src/app/dashboard/_components/dashboard-sidebar.tsx`：桌面与移动端复用的主导航和左下角用户入口。
  - `src/app/dashboard/_components/dashboard-topbar.tsx`：折叠菜单栏图标、面包屑和右侧主题切换。
  - `src/app/dashboard/_components/dashboard-user-menu.tsx`：用户信息、邮箱验证状态、组织切换和退出登录。
  - `src/app/dashboard/_components/dashboard-home-content.tsx`：个人/组织管理员首页内容。
  - `src/app/dashboard/_components/health-radar-chart.tsx`：雷达图组件，图表中心不放置文字或卡片。
  - `src/server/api/routers/dashboard.ts`：工作台聚合 API 和组织切换 mutation。
- 该页使用 Server Component 获取初始数据。
- 未登录 redirect('/sign-in')。
- 登录后的默认入口从 `/app` 调整为 `/dashboard`，旧 `/app` 路由保留并重定向到 `/dashboard`。
- 左下角用户信息区展示当前用户头像、名称、邮箱，并在菜单中展示邮箱验证状态、组织列表、组织切换和退出登录按钮。
- 组织管理员视角必须做服务端权限校验，不能只依赖前端角色判断。
- 非组织管理员不能看到组织级成员安全覆盖、组织 API Key 风险、组织会话趋势等管理数据。
- 无组织时展示创建组织引导。
- 邮箱未验证时在页面顶部展示提醒条。
- 06 首版正式启用 Better Auth `admin`、`organization`、`twoFactor`、`passkey`、`apiKey` 插件；其中 organization 启用 teams，用于支撑后续 10-18 页面。
- Better Auth 插件导致的 Drizzle schema 变更直接同步到 `src/server/db/schema.ts`，开发环境使用 `pnpm db:push` 推送 schema，不执行 `pnpm db:generate` 和 `pnpm db:migrate`。
- 首页接口第一版优先使用 Better Auth/Drizzle 可直接取得的数据；如果组织、Passkey、2FA、API Key 暂无数据，展示真实空态或 0 值，不使用脱离接口结构的前端假数据。
- `apiKey` 插件按当前安装版本使用默认数据库存储；`enableSessionForAPIKeys` 仅属于单个 API Key 配置项且带生产安全风险，06 首版不启用 API Key 模拟 session 能力。
- `src/server/db/schema.ts` 维护 Better Auth 插件表：`organization`、`member`、`invitation`、`team`、`teamMember`、`twoFactor`、`passkey`、`apikey`，实际数据库表名继续使用 `system_*` 前缀。

## 通用工程约束

- Create T3 App: Next.js App Router, TypeScript, tRPC, Drizzle ORM, Tailwind CSS
- Better Auth: authentication, session, admin, organization, team, passkey, 2FA, API key plugins
- PostgreSQL: Better Auth tables plus optional product-specific extension tables
- shadcn/ui + React Hook Form + Zod: forms, tables, dialogs, validation

## 验收标准

- 页面在未授权、加载、空数据、错误、成功状态下均有明确反馈。
- 所有敏感动作必须在服务端重新校验 session 和权限。
- 表单字段均有客户端和服务端校验。
- 高危操作必须二次确认。
