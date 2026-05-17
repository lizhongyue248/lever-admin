<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="public/logo-light.svg">
    <img alt="Lever Admin logo" src="public/logo.svg" width="96" height="96">
  </picture>
</p>

<h1 align="center">Lever Admin</h1>

<p align="center">
  基于 Create T3 技术栈构建，并结合 Better Auth、tRPC、Drizzle ORM 的轻量级身份、组织和 API Key 管理后台。
</p>

<p align="center">
  <strong>一个 AI 原生工程实践展示：由 AI agent 在明确的产品规范、编码规范和验证规范下完成设计、实现、审查和文档编写。</strong>
</p>

<p align="center">
  <a href="README.md">English</a>
</p>

## AI 原生工程实践

Lever Admin 不只是一个管理后台产品，也是一个展示 AI agent 如何在工程边界内构建真实代码库的实践样例。项目基础遵循 [Create T3 App](https://create.t3.gg/) 的技术路线：以类型安全为核心，使用 Next.js、TypeScript、tRPC、Tailwind CSS，并在本项目中结合 Drizzle 和 Better Auth 完成身份治理产品。

本仓库通过以下方式让 AI 开发过程可追踪、可审查：

- 产品意图先沉淀到 `prd/`。
- 页面级 UI 先通过 Pencil `.pen` 设计文件完成设计和确认，再进入编码。
- 实现过程遵循 `AGENTS.md`、PRD 验收标准、编码规范和限定范围内的验证命令。
- 共享 UI、认证、表格、设置、日志和存储能力优先沉淀为项目内可复用模式，而不是一次性生成代码。
- AI 辅助开发完成后，应该留下更清晰的需求、更准确的设计、类型安全的代码和可复现的验证结果。
- E2E 测试也是 AI 工作流的一部分：AI agent 会编写和维护 Playwright 用例，通过 Testcontainers PostgreSQL 构造真实认证数据，增加覆盖率采集，并运行与人工维护者一致的验证命令。

本工作流使用和参考的 AI / MCP 工具：

- [Create T3 App](https://create.t3.gg/)：作为项目类型安全全栈架构的基础参考。
- [Pencil documentation](https://docs.pen.dev/)：用于 `.pen` 设计文件和 design-as-code 工作流。
- [Superpowers](https://claude.com/plugins/superpowers)：用于结构化 AI 工程流程，包括需求澄清、规划、TDD、系统化调试和代码审查。
- [Better Auth MCP plugin](https://better-auth.com/docs/plugins/mcp)：用于 Better Auth MCP/OAuth 集成参考。
- [shadcn/ui MCP server](https://ui.shadcn.com/docs/registry/mcp)：用于 registry-aware 的组件发现和安装。

## 产品介绍

Lever Admin 是一个面向身份治理和访问管理的后台控制台。它围绕 Better Auth 原生能力构建，不追求大而全的通用业务后台，而是聚焦账号、会话、组织、成员、邀请、角色、安全设置、API Key、平台设置和请求审计日志。

项目采用 PRD 优先的开发方式。产品需求放在 `prd/`，页面级视觉设计使用 Pencil `.pen` 文件，代码实现通过 TypeScript、Biome、生产构建和 Playwright E2E 测试进行验证。

AI 生成的 E2E 覆盖被视为产品验收证据，而不是附属任务。当 AI agent 修改用户流程时，需要同步更新对应的 Playwright 场景，使用 Testcontainers PostgreSQL 数据库运行，并通过 `pnpm test:e2e:coverage` 保留覆盖率采集能力。

## 产品截图

<table>
  <tr>
    <td width="50%">
      <strong>认证入口</strong><br>
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="prd/auth-designs-dark/01-sign-in.dark.png">
        <img alt="Lever Admin 登录页面" src="prd/auth-designs/01-sign-in.png">
      </picture>
    </td>
    <td width="50%">
      <strong>平台用户</strong><br>
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="prd/dashboard-admin-design-export/12-admin-users-list-dark-desktop.png">
        <img alt="Lever Admin 平台用户页面" src="prd/dashboard-admin-design-export/12-admin-users-list-light-desktop.png">
      </picture>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <strong>组织管理</strong><br>
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="prd/dashboard-org-design-export/10-dashboard-orgs-information-desktop-dark.png">
        <img alt="Lever Admin 组织管理页面" src="prd/dashboard-org-design-export/10-dashboard-orgs-information-desktop-light.png">
      </picture>
    </td>
    <td width="50%">
      <strong>API Key 管理</strong><br>
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="prd/dashboard-api-key-design-export/14-dashboard-admin-api-keys-desktop-dark.png">
        <img alt="Lever Admin API Key 管理页面" src="prd/dashboard-api-key-design-export/14-dashboard-admin-api-keys-desktop-light.png">
      </picture>
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <strong>账号安全</strong><br>
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="prd/dashboard-design-export/08-dashboard-settings-security-desktop-dark.png">
        <img alt="Lever Admin 账号安全设置页面" src="prd/dashboard-design-export/08-dashboard-settings-security-desktop-light.png">
      </picture>
    </td>
  </tr>
</table>

## 使用场景

- 为 SaaS 产品搭建内部 IAM 管理后台。
- 管理用户账号、平台角色、封禁状态、会话和安全状态。
- 管理组织、成员、邀请、活跃组织和组织级治理能力。
- 提供个人和平台级 API Key 管理能力。
- 在后台配置邮件服务和文件存储服务，并支持测试。
- 收集系统请求日志，用于审计、风险评估和问题排查。
- 作为 Better Auth + Drizzle + tRPC 的工程参考实现。

## 产品范围

当前产品重点：

- 公开认证流程：登录、注册、邮箱验证、忘记密码、重置密码、OAuth 入口和二次验证流程。
- 账号安全：个人资料、会话、安全设置、2FA、Passkey 和 OAuth 账号绑定。
- 平台管理：用户、组织、API Key、平台设置和系统请求日志。
- 组织管理：组织设置、成员、邀请、角色和组织上下文。
- 开发者认证：个人和平台级 API Key 管理。
- 运维配置：邮件服务配置、存储服务配置和测试动作。

## 技术栈

- 技术基础：[Create T3 App](https://create.t3.gg/) 风格的类型安全全栈 TypeScript 架构
- 框架：Next.js 16 App Router、React 19、TypeScript strict mode
- API：tRPC 11、TanStack Query
- 认证：Better Auth 1.6+、Drizzle adapter 和相关插件
- 数据库：PostgreSQL、Drizzle ORM、Drizzle Kit
- UI：Tailwind CSS 4、shadcn/ui primitives、Radix UI、lucide-react
- 表单和校验：`@tanstack/react-form`、Zod
- 表格：TanStack Table
- 邮件和存储：Nodemailer、Resend、AWS S3 兼容 SDK
- 测试：Playwright E2E、Testcontainers PostgreSQL、Playwright coverage instrumentation
- 工具链：pnpm、Biome、`@t3-oss/env-nextjs`

## 目录结构

```txt
prd/                      产品需求、页面规格和 Pencil 设计
src/app/                  Next.js App Router 路由
src/app/(auth)/           公开认证页面
src/app/dashboard/        登录后的 Dashboard 壳层和页面
src/components/           全局共享产品组件
src/components/ui/        shadcn/ui 基础组件
src/server/api/           tRPC routers 和 middleware
src/server/better-auth/   Better Auth 服务端配置和辅助方法
src/server/db/            Drizzle schema 和数据库连接
src/server/service/       邮件、存储、平台设置等产品服务
e2e/                      Playwright E2E 测试和 Testcontainers 配置
public/                   静态资源，包括 logo 和 favicon
```

## 快速开始

安装依赖：

```bash
pnpm install
```

创建本地环境变量文件：

```bash
cp .env.example .env
```

至少配置：

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/lever-admin"
BETTER_AUTH_SECRET="your-local-secret"
BETTER_AUTH_URL="http://localhost:4000"
```

OAuth provider 是可选配置。只有同时配置某个 provider 的 client ID 和 client secret 时，登录页和注册页才会展示该 provider，例如 `BETTER_AUTH_GITHUB_CLIENT_ID` + `BETTER_AUTH_GITHUB_CLIENT_SECRET`、`BETTER_AUTH_GOOGLE_CLIENT_ID` + `BETTER_AUTH_GOOGLE_CLIENT_SECRET` 或 `BETTER_AUTH_WECHAT_CLIENT_ID` + `BETTER_AUTH_WECHAT_CLIENT_SECRET`。

本地开发推送数据库结构：

```bash
pnpm db:push
```

启动开发服务：

```bash
pnpm dev
```

访问：

```txt
http://localhost:4000
```

## 常用命令

```bash
pnpm dev              # 启动 Next.js 开发服务，端口 4000
pnpm build            # 生产构建
pnpm start            # 启动生产服务
pnpm preview          # 构建并启动生产服务

pnpm typecheck        # TypeScript 校验
pnpm check            # Biome lint 和格式检查
pnpm check:write      # 应用安全的 Biome 修复

pnpm db:push          # 直接推送 Drizzle schema，仅开发环境使用
pnpm db:generate      # 生成 Drizzle migration 文件
pnpm db:migrate       # 执行 migrations
pnpm db:studio        # 打开 Drizzle Studio

pnpm test:e2e         # 使用 Testcontainers PostgreSQL 运行 Playwright E2E
pnpm test:e2e:ui      # 打开 Playwright UI 模式
pnpm test:e2e:coverage # 运行 E2E 覆盖率采集
pnpm verify:e2e       # typecheck + check + build + E2E
```

Playwright E2E 测试使用 Testcontainers PostgreSQL，运行 `pnpm test:e2e` 前需要先启动 Docker。

## 产品文档

产品行为的事实来源是 `prd/`。

- 修改页面前先阅读对应 PRD。
- 修改行为、布局、路由、接口契约、校验或用户可见状态时，同步更新对应 PRD。
- 页面级 UI 变化应先更新对应 Pencil `.pen` 设计并确认后再编码。
- 公共组件规范见 `prd/98-common-components.md`。
- E2E 测试规范见 `prd/99-e2e-testing-method.md`。

## AI 开发与 Vibe Coding 流程

Lever Admin 很适合使用 AI 辅助开发，但前提是产品意图、设计边界和工程验证要保持清晰。

推荐流程：

1. 用产品语言描述意图。
   先说清楚用户问题、权限模型、数据来源、页面状态和验收标准。

2. 新增或更新 PRD。
   PRD 是产品想法、设计、实现和测试之间的契约。

3. 使用 Pencil 设计 UI 变化。
   页面级 UI 工作需要更新 `prd/` 中对应的 `.pen` 文件，并在实现前确认布局。

4. 让 AI agent 先规划实现。
   好的计划应该列出文件、数据结构、接口、UI 状态、测试和验证命令。

5. 小步实现，方便审查。
   每次变更尽量聚焦在对应页面、router、service、schema 或共享组件上。

6. 用真实命令验证。
   至少运行 `pnpm typecheck` 和 `pnpm check`。涉及路由、metadata、服务端逻辑或生产构建时运行 `pnpm build`。涉及用户流程时运行对应 Playwright 用例。

7. 回到 PRD 做验收。
   代码能编译不等于完成；还要确认行为、UI 状态、权限和验收标准都匹配 PRD。

本项目中的 Vibe Coding 不是随手生成代码，而是“快速迭代 + 产品锚点”：

- 人负责方向、取舍和最终验收。
- AI 负责阅读代码、更新 PRD/设计、规划、实现和验证。
- 重要 UI 或行为变更完成后，应该留下更清晰的 PRD，而不只是代码。
- 敏感能力必须包含服务端鉴权、输入校验和可见失败状态。
- 表格、表单和工作流应优先复用项目已有模式，再考虑新增抽象。

Agent 工作规则见 `AGENTS.md`。

## 验证清单

提交 PR 或交接分支前建议运行：

```bash
pnpm typecheck
pnpm check
pnpm build
```

涉及完整用户流程时运行：

```bash
pnpm test:e2e
```

需要查看覆盖率时运行：

```bash
pnpm test:e2e:coverage
```

## License

本项目使用 [Apache License 2.0](LICENSE) 开源许可。
