# 99 端到端测试方法

本文档定义 `lever-admin` 第一阶段自动化测试方案：只使用 Playwright 做端到端测试，并通过 Testcontainers 提供第三方依赖。

## 测试目标

- 使用真实浏览器验证用户可见流程。
- 使用 Testcontainers PostgreSQL 提供隔离数据库，避免污染本地开发库。
- 不使用 Vitest、Jest 或组件测试作为第一阶段测试层。
- 不 mock Better Auth 和数据库；允许通过测试 helper seed 数据。

## 技术栈

已安装开发依赖：

```bash
pnpm add -D @playwright/test testcontainers @testcontainers/postgresql
pnpm exec playwright install chromium
```

核心工具：

- `@playwright/test`：端到端测试运行器和浏览器自动化。
- `testcontainers`：测试生命周期内启动和停止容器。
- `@testcontainers/postgresql`：启动 PostgreSQL 测试数据库。
- `drizzle-kit push`：把当前 Drizzle schema 推送到测试数据库。

## 目录结构

当前结构：

```txt
e2e/
  global-setup.ts
  helpers/
    auth-flows.ts
    db.ts
    test-data.ts
  specs/
    00-auth-pages-design.spec.ts
    01-sign-in.spec.ts
    01A-sign-in-2fa.spec.ts
    02-sign-up.spec.ts
    03-forgot-password.spec.ts
    04-reset-password.spec.ts
    05-verify-email.spec.ts
    06-dashboard.spec.ts
    07-dashboard-settings-profile.spec.ts
    08-dashboard-settings-security.spec.ts
    09-dashboard-settings-sessions.spec.ts
    10-dashboard-orgs-slug-settings.spec.ts
    10A-organization-invitation-accept.spec.ts
    12-dashboard-admin-users.spec.ts
    13-dashboard-admin-users-id.spec.ts
    15-dashboard-admin-orgs.spec.ts
playwright.config.ts
```

## 运行脚本

`package.json` 已提供：

```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:headed": "playwright test --headed",
  "test:e2e:debug": "playwright test --debug",
  "verify:e2e": "pnpm typecheck && pnpm check && pnpm build && pnpm test:e2e"
}
```

Playwright 当前限制为 `workers: 4`。拆分为 PRD 一一对应的多个 spec 文件后，若完全按机器核心数并行，Next.js dev server 首次编译和 Better Auth 接口在本地容易出现非业务性的超时噪音；限制并发可以让 E2E 更稳定。

## 结果与录屏

- Playwright HTML 报告通过 `pnpm exec playwright show-report` 查看。
- Trace 配置为 `retain-on-failure`，仅失败用例保留交互回放。
- Video 配置为 `retain-on-failure`，仅失败用例保留执行录屏。
- 失败录屏通常位于 `test-results/<test-name>/video.webm`，也可以在 HTML 报告中直接查看。
- 通过的测试不会保留录屏，避免生成目录过大。

## 环境启动流程

Playwright 不使用内置 `webServer` 启动 Next.js，因为 `DATABASE_URL` 需要等待 Testcontainers PostgreSQL 启动后动态生成。

`global-setup.ts` 负责：

1. 启动 PostgreSQL Testcontainer。
2. 从容器读取动态连接串并生成 `DATABASE_URL`。
3. 设置测试环境变量：
   - `NODE_ENV=test`
   - `DATABASE_URL=<testcontainer url>`
   - `BETTER_AUTH_SECRET=<fixed test secret>`
   - `BETTER_AUTH_URL=http://127.0.0.1:<test port>`
   - `E2E_NEXT_DIST_DIR=.next-e2e`
   - OAuth 相关变量使用测试占位值。
4. 执行 `pnpm db:push`，把 Drizzle schema 推送到测试数据库。
5. 使用相同环境变量启动 Next.js 测试服务。
   - 当前使用 `pnpm exec next dev --hostname 127.0.0.1 --port <test port>`，避免 `pnpm dev -- --hostname` 在 Windows 下被 Next.js 误解析为项目目录。
   - E2E dev server 使用 `.next-e2e` 作为独立 distDir，避免和本地 `pnpm dev` 抢占 `.next/dev` 锁。
6. 轮询等待 `http://127.0.0.1:<test port>` 可访问。
7. 返回 teardown 函数，测试结束后停止 Next.js 进程并停止 PostgreSQL 容器。

## 数据策略

- 每个测试文件或测试用例使用唯一邮箱，例如 `e2e-${Date.now()}-${workerIndex}@example.com`。
- 测试 helper 可以直接写入 Better Auth 相关表：
  - `auth_user`
  - `auth_account`
  - `auth_session`
  - `auth_verification`
- 数据库物理表前缀分层：
  - Better Auth 拥有的认证、会话、组织、成员、邀请、团队、2FA、Passkey 和 API Key 表使用 `auth_*`。
  - 平台自有扩展表使用 `system_*`。
  - 测试 helper 直接 SQL 必须使用当前物理表名，不能继续引用旧的认证表名前缀。
- 直接 SQL 访问 `auth_user` 时必须使用双引号引用表名，例如 `"auth_user"`，避免 PostgreSQL 将 `auth_user` 当作关键字/系统标识解析。
- 已验证用户 seed：
  - `auth_user.email_verified=true`
  - `auth_account.provider_id="credential"`
  - `auth_account.password` 使用 Better Auth 兼容的密码哈希或通过 Better Auth API 创建。
- 未验证用户 seed：
  - `auth_user.email_verified=false`
  - 用于验证登录后跳转 `/verify-email?status=pending&email=<encoded-email>`。
- reset password 和 verify email token 优先通过 Better Auth API 或服务端行为生成；如果直接写 `auth_verification`，必须保持 token 字段、过期时间和 Better Auth 校验逻辑一致。

## 测试分组

测试文件命名必须和对应 PRD 一一对应，便于从 Playwright 报告反查需求来源：

- `prd/00-auth-pages-design.md` -> `e2e/specs/00-auth-pages-design.spec.ts`
- `prd/01-sign-in.md` -> `e2e/specs/01-sign-in.spec.ts`
- `prd/01A-sign-in-2fa.md` -> `e2e/specs/01A-sign-in-2fa.spec.ts`
- `prd/02-sign-up.md` -> `e2e/specs/02-sign-up.spec.ts`
- `prd/03-forgot-password.md` -> `e2e/specs/03-forgot-password.spec.ts`
- `prd/04-reset-password.md` -> `e2e/specs/04-reset-password.spec.ts`
- `prd/05-verify-email.md` -> `e2e/specs/05-verify-email.spec.ts`
- `prd/06-dashboard.md` -> `e2e/specs/06-dashboard.spec.ts`
- `prd/07-dashboard-settings-profile.md` -> `e2e/specs/07-dashboard-settings-profile.spec.ts`
- `prd/08-dashboard-settings-security.md` -> `e2e/specs/08-dashboard-settings-security.spec.ts`
- `prd/09-dashboard-settings-sessions.md` -> `e2e/specs/09-dashboard-settings-sessions.spec.ts`
- `prd/10-dashboard-orgs-slug-settings.md` -> `e2e/specs/10-dashboard-orgs-slug-settings.spec.ts`
- `prd/10A-organization-invitation-accept.md` -> `e2e/specs/10A-organization-invitation-accept.spec.ts`
- `prd/12-dashboard-admin-users.md` -> `e2e/specs/12-dashboard-admin-users.spec.ts`
- `prd/13-dashboard-admin-users-id.md` -> `e2e/specs/13-dashboard-admin-users-id.spec.ts`
- `prd/14-dashboard-admin-api-keys.md` -> `e2e/specs/14-dashboard-admin-api-keys.spec.ts`
- `prd/15-dashboard-admin-orgs.md` -> `e2e/specs/15-dashboard-admin-orgs.spec.ts`
- `prd/16-dashboard-settings-api-keys.md` -> `e2e/specs/16-dashboard-settings-api-keys.spec.ts`

其中 `14-dashboard-admin-api-keys.spec.ts` 和 `16-dashboard-settings-api-keys.spec.ts` 当前如页面尚未实现，可以暂不创建空 spec；补测试时必须使用同名编号文件，或把用例加入已有同名编号文件。暂未实现或暂未覆盖的其他 PRD 同样不创建空 spec。

### `00-auth-pages-design.spec.ts`

覆盖公共认证页设计规范：

- 主题切换。
- 桌面端品牌插画区可见。
- 移动端品牌插画区隐藏，返回按钮和主题切换按钮可用。

### `01-sign-in.spec.ts`

覆盖登录页：

- `/sign-in`

重点验证：

- 页面 200 可访问。
- 核心标题、输入框、按钮和入口可见。
- 空表单校验。
- 未知账号登录失败。
- 已验证用户登录进入 `/dashboard`。
- `redirectTo` 登录后回跳。
- 未验证用户登录进入邮箱验证页。
- 忘记密码和注册入口跳转。

### `02-sign-up.spec.ts`

覆盖注册页：

- `/sign-up`

重点验证：

- 核心标题、输入框、按钮和入口可见。
- 必填、邮箱格式、密码确认校验。
- 注册成功后创建未验证用户并进入待验证。
- 重复邮箱注册显示“该邮箱已注册，请直接登录。”，并且不创建重复用户。
- 已登录用户访问注册页重定向 `/dashboard`。
- 返回登录入口跳转。

### `03-forgot-password.spec.ts`

覆盖忘记密码页：

- `/forgot-password`

重点验证：

- 不存在邮箱统一成功提示。
- 存在邮箱统一成功提示。
- 邮箱必填和格式校验。
- 成功提交后按钮进入冷却状态。
- 返回登录入口跳转。

### `04-reset-password.spec.ts`

覆盖重置密码页：

- `/reset-password`

当前已覆盖：

- 无 token 访问展示链接无效状态和重新发送重置邮件入口。

### `05-verify-email.spec.ts`

覆盖邮箱验证页：

- `/verify-email?status=pending`
- `/verify-email?status=failed`

当前已覆盖：

- 待验证状态。
- 验证失败状态。

## 选择器规范

优先使用用户可感知选择器：

- `page.getByRole("heading", { name: "登录" })`
- `page.getByLabel("邮箱")`
- `page.getByRole("button", { name: "登录并进入应用" })`
- `page.getByRole("link", { name: "返回登录" })`

当图标按钮没有可见文本时，必须有可访问名称：

- 主题切换按钮：`aria-label="切换主题"`
- 返回按钮：`aria-label="返回登录"`
- 页面主标题必须是可访问 heading，当前公共认证页卡片标题渲染为 `h1`，以支持 `getByRole("heading", { name })`。
- 当标签存在包含关系时使用精确匹配，例如 `page.getByLabel("密码", { exact: true })`，避免同时匹配“确认密码”。

避免使用脆弱选择器：

- 不依赖 Tailwind class。
- 不依赖内部 DOM 层级。
- 不依赖随机生成 ID。

## CI 要求

- CI runner 必须支持 Docker。
- CI 运行前执行 `pnpm install`。
- 首次安装 Playwright 浏览器：`pnpm exec playwright install --with-deps`。
- CI 推荐执行：

```bash
pnpm verify:e2e
```

## 生成目录

Playwright 会生成以下目录，均不属于源码：

- `playwright-report/`
- `test-results/`
- `blob-report/`
- `.next-e2e/`

这些目录必须加入 `.gitignore`、Biome ignore 和 `tsconfig.json` exclude，避免报告文件进入 lint、format 或 TypeScript 检查。

## 第一阶段验收

- `pnpm test:e2e` 可以自动启动 PostgreSQL 容器和 Next.js 测试服务。
- 测试结束后容器和服务进程被清理。
- `prd/01-sign-in.md` 到 `prd/05-verify-email.md` 中列出的公开页面和基础认证用例被覆盖。
- 测试运行不依赖本地 `.env` 中的开发数据库。
- 不运行或污染本地开发数据库。
