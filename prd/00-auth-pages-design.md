# 00 认证页面设计说明

本设计覆盖 `prd/01-05` 的公开认证页面：

- `01-sign-in.md`：登录页
- `02-sign-up.md`：注册页
- `03-forgot-password.md`：忘记密码页
- `04-reset-password.md`：重置密码页
- `05-verify-email.md`：邮箱验证页

## 设计产物

Pencil/pencli 已导出以下页面设计图：

- 登录页：`prd/auth-designs/01-sign-in.png`
- 注册页：`prd/auth-designs/02-sign-up.png`
- 忘记密码页：`prd/auth-designs/03-forgot-password.png`
- 重置密码页：`prd/auth-designs/04-reset-password.png`
- 邮箱验证页：`prd/auth-designs/05-verify-email.png`

暗色主题设计图：

- 登录页：`prd/auth-designs-dark/01-sign-in.dark.png`
- 注册页：`prd/auth-designs-dark/02-sign-up.dark.png`
- 忘记密码页：`prd/auth-designs-dark/03-forgot-password.dark.png`
- 重置密码页：`prd/auth-designs-dark/04-reset-password.dark.png`
- 邮箱验证页：`prd/auth-designs-dark/05-verify-email.dark.png`

移动端 Pencil 画板已补充在 `prd/auth-design.pen`：

- 亮色：`Mobile 01 Sign In`、`Mobile 02 Sign Up`、`Mobile 03 Forgot Password`、`Mobile 04 Reset Password`、`Mobile 05 Verify Email`、`Mobile 05A Verify Email Success`、`Mobile 05B Verify Email Failed`
- 暗色：`Mobile Dark 01 Sign In`、`Mobile Dark 02 Sign Up`、`Mobile Dark 03 Forgot Password`、`Mobile Dark 04 Reset Password`、`Mobile Dark 05 Verify Email`、`Mobile Dark 05A Verify Email Success`、`Mobile Dark 05B Verify Email Failed`
- 全局动画主题切换组件：`Component - Global Animated Theme Toggle`

## 视觉方向

采用偏技术产品的后台登录体验，整体克制、清晰、信息密度适中。页面不做营销式大图，不使用装饰性渐变球；左侧整栏使用与身份认证和权限网络相关的插画图片背景，优先让用户快速完成身份相关动作。

桌面端采用左右分栏：

- 左侧品牌区：整块区域使用符合身份认证/权限管理主题的插画图片作为背景，`Lever Admin`、产品定位和能力点覆盖在背景之上。
- 右侧操作区：展示当前页面表单、状态提示和 OAuth 按钮。
- 页面右上角：提供全局主题切换图标按钮。

移动端实现时隐藏左侧品牌区，仅保留表单卡片、主题切换和必要的页面动作。

## 共享布局

所有 5 个页面使用同一个 `AuthLayout`：

- 外层使用 `min-h-screen bg-background text-foreground`。
- 桌面端使用两栏布局，左侧固定宽度，右侧自适应。
- 表单区域居中，最大宽度控制在 `430px - 480px`。
- 卡片使用 `bg-card`、`border-border`、`shadow-md`，圆角来自 `--radius`。
- 每个页面右上角都保留主题切换图标按钮，位置相对整个页面固定，而不是放在表单卡片内部。
- 忘记密码、重置密码、邮箱验证页面提供返回登录图标按钮；按钮固定在右侧操作区域左上角，与右上角主题切换按钮同高、同尺寸，不放在表单卡片内部。

移动端共享布局规则：

- 使用 390px 宽移动端画板作为设计基准，实际实现时适配 `max-width: 430px` 以内的小屏。
- 移动端隐藏左侧品牌区、整栏插画和品牌说明，只保留表单卡片、状态内容、主题切换和必要页面动作。
- 页面背景使用 `bg-background`，内容使用单列布局，横向安全边距为 24px。
- 表单卡片宽度填满安全区域，最大宽度不超过移动视口减去左右边距；卡片内边距比桌面端收敛，避免注册页和验证页溢出。
- 主题切换图标按钮固定在移动端页面右上角，尺寸 36px。
- 忘记密码、重置密码、邮箱验证及验证成功/失败页面的返回图标按钮固定在移动端页面左上角，尺寸 36px，并与主题切换按钮同高。
- 移动端不额外展示左侧插画的缩略版，避免挤压核心表单流程。

左侧整栏插画背景规则：

- 插画图片覆盖完整左侧区域，而不是只出现在底部局部区域。
- 每个页面使用一张不同的整栏插画图片，风格统一但主题不同。
- 图片内容使用抽象身份网络、权限节点、安全符号、邮箱、锁、验证等技术产品意象。
- 配色遵循主题蓝色 `--primary`、浅蓝背景和中性边框。
- 插画不包含文字、字母或界面标签，避免与品牌文案竞争。
- 品牌文案上方使用轻量半透明遮罩保证可读性。
- 移动端隐藏左侧插画和品牌说明。

每个页面的左侧插画需要有不同主题：

- 登录页：盾牌、会话节点、授权连接线，表达安全登录。
- 注册页：用户创建、资料卡片、账号节点，表达账号开通。
- 忘记密码页：邮件、密钥、重置 token，表达找回入口。
- 重置密码页：锁、重置环、密码字段，表达凭据更新。
- 邮箱验证页：邮件确认、绿色成功节点、验证回执，表达邮箱确认。

后续代码目录约束：

- 多页面共享组件放在 `src/app/(auth)/_components/`。
- 单页面专用组件放在各自页面 `_components/`。
- `page.tsx` 只负责路由组合、重定向、search params 传递。
- 每个组件文件不超过 500 行。

## 页面设计

### 01 登录页

设计图：`prd/auth-designs/01-sign-in.png`

表单结构：

- 标题：登录
- 描述：使用邮箱密码或 OAuth 进入控制台。
- 状态提示区：用于展示错误、封禁、邮箱未验证等提示。
- 邮箱输入框
- 密码输入框
- 忘记密码链接
- 主按钮：登录并进入应用
- OAuth 按钮：GitHub、Google
- 底部入口：还没有账号？创建账号

交互状态：

- `idle`：默认表单。
- `submitting`：禁用输入和按钮，主按钮展示加载状态。
- `error`：状态提示区展示中文错误。
- `email_unverified`：提示用户进入邮箱验证流程。
- `banned`：展示封禁提示，不暴露过多内部信息。

### 02 注册页

设计图：`prd/auth-designs/02-sign-up.png`

表单结构：

- 标题：创建账号
- 描述：创建身份管理控制台账号。
- 名称输入框
- 邮箱输入框
- 密码输入框
- 确认密码输入框
- 服务条款提示
- 主按钮：创建账号
- OAuth 注册按钮：GitHub 注册、Google 注册
- 底部入口：已有账号？返回登录

交互状态：

- 密码与确认密码不一致时在字段下方提示。
- 注册成功后根据邮箱验证策略进入 `/verify-email?status=pending` 或 `/app`。
- 错误提示保持克制，避免明确暴露邮箱是否已注册。

### 03 忘记密码页

设计图：`prd/auth-designs/03-forgot-password.png`

表单结构：

- 标题：忘记密码
- 描述：输入邮箱后，我们会发送重置链接。
- 统一成功提示区
- 邮箱输入框
- 主按钮：发送重置链接
- 冷却状态：例如 `58 秒后可重新发送`
- 页面左上角图标返回按钮：返回登录

交互状态：

- 提交后无论邮箱是否存在，都展示统一成功提示。
- 冷却时间内禁用重新发送。
- 提交期间禁用按钮，避免重复请求。

### 04 重置密码页

设计图：`prd/auth-designs/04-reset-password.png`

表单结构：

- 标题：重置密码
- 描述：设置一个新的登录密码。
- 异常状态区：token 缺失、过期或无效。
- 新密码输入框
- 确认新密码输入框
- 主按钮：更新密码
- 页面左上角图标返回按钮：返回登录
- 底部入口：链接无效？重新发送重置邮件

交互状态：

- 无 token 时直接展示异常状态和重新发送入口。
- token 存在时允许提交新密码。
- 重置成功后跳转 `/sign-in`。

### 05 邮箱验证页

设计图：`prd/auth-designs/05-verify-email.png`

页面结构：

- 标题：邮箱验证
- 描述：处理验证链接、待验证提醒和重新发送。
- 状态列表：
  - 验证中
  - 验证成功
  - 等待验证
  - 验证失败
- 主按钮：进入应用
- 次按钮：重新发送验证邮件
- 页面左上角图标返回按钮：返回登录

交互状态：

- `token` 存在时自动进入验证中状态。
- 验证成功后刷新 session 并允许进入 `/app`。
- 验证失败时提示 token 无效或过期。
- `status=pending` 时展示等待验证与重新发送入口。

## 主题切换方案

主题切换使用 `next-themes`，这是当前 Next.js + shadcn/ui 项目中最常用的实现方式。切换按钮做成全局通用组件，认证页只负责传入定位样式。

动画主题切换按钮规则：

- 组件路径：`src/components/theme-toggle.tsx`。
- 组件导出：`ThemeToggle`。
- 组件依赖：`next-themes`、`framer-motion`。
- 按钮尺寸保持 36px，圆形，认证页固定在页面右上角。
- 点击按钮时优先使用 View Transition API 做页面级主题揭示动画；认证页默认从右上角按钮位置展开。
- 默认动画参数：`variant="circle"`、`start="top-right"`、`blur=false`。
- 图标使用内联 SVG，并用 `framer-motion` 做 0.5s 的旋转过渡动画。
- 组件内部读取 `resolvedTheme`，点击后在 `light` 和 `dark` 之间切换。
- 如果浏览器不支持 `document.startViewTransition`，直接切换主题，同时保留按钮 SVG 动画。
- 组件内部通过 `createAnimation` 注入 `::view-transition-*` CSS，并通过 `useThemeToggle` 暴露切换逻辑。
- 组件支持 `className`，方便认证页、后续应用布局或设置页复用。

实现要点：

- 根布局的 `html` 使用 `suppressHydrationWarning`。
- 增加客户端 `ThemeProvider`，配置 `attribute="class"`。
- 默认主题使用 `system`，并启用系统主题跟随。
- 主题切换控件放在整个页面右上角，表现为单个图标按钮。
- 主题切换按钮在客户端 mounted 后再渲染当前主题图标，避免 hydration mismatch。
- 暗色模式需要使用独立的暗色插画背景，而不是简单压暗亮色插画。

建议实现结构：

- `src/app/_components/providers.tsx`：全局 Provider，包含 `ThemeProvider` 和 `TRPCReactProvider`。
- `src/components/theme-toggle.tsx`：全局动画主题切换按钮。
- `src/app/(auth)/_components/auth-layout.tsx`：认证页布局中使用全局 `ThemeToggle` 并传入固定定位样式。

## 主题 token

后续实现时使用以下主题变量覆盖 `src/styles/globals.css` 中现有颜色：

```css
:root {
  --background: oklch(1.00 0 0);
  --foreground: oklch(0.32 0 0);
  --card: oklch(1.00 0 0);
  --card-foreground: oklch(0.32 0 0);
  --popover: oklch(1.00 0 0);
  --popover-foreground: oklch(0.32 0 0);
  --primary: oklch(0.62 0.19 259.76);
  --primary-foreground: oklch(1.00 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.45 0.03 257.68);
  --muted: oklch(0.98 0 0);
  --muted-foreground: oklch(0.55 0.02 264.41);
  --accent: oklch(0.95 0.03 233.56);
  --accent-foreground: oklch(0.38 0.14 265.59);
  --destructive: oklch(0.64 0.21 25.39);
  --border: oklch(0.93 0.01 261.82);
  --input: oklch(0.93 0.01 261.82);
  --ring: oklch(0.62 0.19 259.76);
  --chart-1: oklch(0.62 0.19 259.76);
  --chart-2: oklch(0.55 0.22 262.96);
  --chart-3: oklch(0.49 0.22 264.43);
  --chart-4: oklch(0.42 0.18 265.55);
  --chart-5: oklch(0.38 0.14 265.59);
  --sidebar: oklch(0.98 0 0);
  --sidebar-foreground: oklch(0.14 0 0);
  --sidebar-primary: oklch(0.20 0 0);
  --sidebar-primary-foreground: oklch(0.98 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.20 0 0);
  --sidebar-border: oklch(0.92 0 0);
  --sidebar-ring: oklch(0.71 0 0);
  --font-sans: 'Geist', 'Geist Fallback', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
  --font-serif: Source Serif 4, serif;
  --font-mono: JetBrains Mono, monospace;
  --radius: 0.375rem;
  --shadow-2xs: 0 1px 3px 0px oklch(0.00 0 0 / 0.05);
  --shadow-xs: 0 1px 3px 0px oklch(0.00 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0px oklch(0.00 0 0 / 0.10), 0 1px 2px -1px oklch(0.00 0 0 / 0.10);
  --shadow: 0 1px 3px 0px oklch(0.00 0 0 / 0.10), 0 1px 2px -1px oklch(0.00 0 0 / 0.10);
  --shadow-md: 0 1px 3px 0px oklch(0.00 0 0 / 0.10), 0 2px 4px -1px oklch(0.00 0 0 / 0.10);
  --shadow-lg: 0 1px 3px 0px oklch(0.00 0 0 / 0.10), 0 4px 6px -1px oklch(0.00 0 0 / 0.10);
  --shadow-xl: 0 1px 3px 0px oklch(0.00 0 0 / 0.10), 0 8px 10px -1px oklch(0.00 0 0 / 0.10);
  --shadow-2xl: 0 1px 3px 0px oklch(0.00 0 0 / 0.25);
}

.dark {
  --background: oklch(0.20 0 0);
  --foreground: oklch(0.92 0 0);
  --card: oklch(0.27 0 0);
  --card-foreground: oklch(0.92 0 0);
  --popover: oklch(0.27 0 0);
  --popover-foreground: oklch(0.92 0 0);
  --primary: oklch(0.62 0.19 259.76);
  --primary-foreground: oklch(1.00 0 0);
  --secondary: oklch(0.27 0 0);
  --secondary-foreground: oklch(0.92 0 0);
  --muted: oklch(0.27 0 0);
  --muted-foreground: oklch(0.72 0 0);
  --accent: oklch(0.38 0.14 265.59);
  --accent-foreground: oklch(0.88 0.06 254.63);
  --destructive: oklch(0.64 0.21 25.39);
  --border: oklch(0.37 0 0);
  --input: oklch(0.37 0 0);
  --ring: oklch(0.62 0.19 259.76);
  --chart-1: oklch(0.71 0.14 254.69);
  --chart-2: oklch(0.62 0.19 259.76);
  --chart-3: oklch(0.55 0.22 262.96);
  --chart-4: oklch(0.49 0.22 264.43);
  --chart-5: oklch(0.42 0.18 265.55);
  --sidebar: oklch(0.21 0.01 285.56);
  --sidebar-foreground: oklch(0.99 0 0);
  --sidebar-primary: oklch(0.49 0.24 264.41);
  --sidebar-primary-foreground: oklch(0.99 0 0);
  --sidebar-accent: oklch(0.27 0.01 285.81);
  --sidebar-accent-foreground: oklch(0.99 0 0);
  --sidebar-border: oklch(1.00 0 0 / 10%);
  --sidebar-ring: oklch(0.55 0.02 285.76);
  --shadow-2xs: 0 1px 3px 0px oklch(0.00 0 0 / 0.05);
  --shadow-xs: 0 1px 3px 0px oklch(0.00 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0px oklch(0.00 0 0 / 0.10), 0 1px 2px -1px oklch(0.00 0 0 / 0.10);
  --shadow: 0 1px 3px 0px oklch(0.00 0 0 / 0.10), 0 1px 2px -1px oklch(0.00 0 0 / 0.10);
  --shadow-md: 0 1px 3px 0px oklch(0.00 0 0 / 0.10), 0 2px 4px -1px oklch(0.00 0 0 / 0.10);
  --shadow-lg: 0 1px 3px 0px oklch(0.00 0 0 / 0.10), 0 4px 6px -1px oklch(0.00 0 0 / 0.10);
  --shadow-xl: 0 1px 3px 0px oklch(0.00 0 0 / 0.10), 0 8px 10px -1px oklch(0.00 0 0 / 0.10);
  --shadow-2xl: 0 1px 3px 0px oklch(0.00 0 0 / 0.25);
}
```

## 实现确认项

确认设计后再进入代码实现，优先顺序如下：

1. 更新全局主题变量和 `next-themes` Provider。
2. 实现 `src/app/(auth)/_components/` 下的共享认证布局、主题切换、OAuth 按钮和状态提示组件。
3. 实现 5 个页面各自的 `_components`。
4. 接入 Better Auth 当前基础能力，暂不启用高级插件。
5. 运行 `pnpm typecheck`、`pnpm check`、`pnpm build`。
