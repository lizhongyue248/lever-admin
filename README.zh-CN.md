<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="public/logo-light.svg">
    <img alt="Lever Admin logo" src="public/logo.svg" width="96" height="96">
  </picture>
</p>

<h1 align="center">Lever Admin</h1>

<p align="center">
  基于 Better Auth 的轻量级身份、组织、权限和 API Key 管理后台。
</p>

<p align="center">
  <a href="README.md">English</a>
</p>

## 产品介绍

Lever Admin 是一个面向身份治理和访问管理的后台控制台。它围绕 Better Auth 原生能力构建，不追求大而全的通用业务后台，而是聚焦账号、会话、组织、成员、邀请、角色、安全设置、API Key、平台设置和请求审计日志。

项目采用 PRD 优先的开发方式。产品需求放在 `prd/`，页面级视觉设计使用 Pencil `.pen` 文件，代码实现通过 TypeScript、Biome、生产构建和 Playwright E2E 测试进行验证。

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
BETTER_AUTH_GITHUB_CLIENT_ID="your-github-client-id"
BETTER_AUTH_GITHUB_CLIENT_SECRET="your-github-client-secret"
```

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
