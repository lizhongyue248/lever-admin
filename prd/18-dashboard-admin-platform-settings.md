# 18 平台设置页

- 路由：`/dashboard/admin/settings`
- 目标：为平台超级管理员提供平台级运行配置入口，第一版聚焦邮件服务配置、文件存储配置和对应连通性测试。
- 设计稿：`prd/dashboard-platform-settings-design.pen`

## 功能范围

平台设置页负责管理会影响整个平台运行行为的配置。第一版开放邮件服务配置和文件存储配置，后续可在同一页面追加安全策略、登录策略、通知策略等平台级设置。

第一版包含：

- 邮件服务 provider 配置：`console`、`resend`、`smtp`。
- 发件人配置：邮件 From 显示名称和邮箱。
- Resend API Key 配置。
- SMTP 主机、端口、用户名、密码、TLS/SSL 配置。
- 保存配置。
- 发送测试邮件。
- 文件存储 provider 配置：`local`、`s3`。
- 本地上传目录配置。
- S3 兼容协议配置：endpoint、region、bucket、access key、secret key、force path style、public base URL。
- 保存文件存储配置。
- 上传测试文件，验证当前已保存配置是否可写入、读取公开 URL 或内部 URL，并在测试后清理测试对象。

第一版不包含：

- 任意 key/value 可视化编辑器。
- 邮件发送日志列表。
- 邮件模板编辑器。
- 多租户或组织级邮件配置。
- 队列、重试、投递状态追踪和 webhook 回执。
- 文件管理器、素材库、历史文件列表、裁剪编辑器或批量上传。
- 组织级或用户级独立存储配置。

## 页面布局

- 整体布局继承 `06-dashboard.md` 的 DashboardLayout：
  - Sidebar、Topbar、左下角用户菜单、主题切换、面包屑与响应式行为均保持一致。
  - 本页只定义 Main 内容区域布局，不重复定义全局壳层。
- Sidebar 管理分组新增「平台设置」入口，位于「平台 API Key」之后。
- Main 内容区域：
  - 页面标题区展示「平台设置」和说明文案。
  - 当前版本展示「邮件服务」和「文件存储」两个设置卡片。
  - 邮件服务卡片内包含 provider、发件人、Resend、SMTP、测试邮件和安全提示。
  - 保存配置按钮位于邮件配置表单底部，测试邮件操作位于同一卡片的测试区域。
  - 文件存储卡片位于邮件服务卡片下方，包含 provider、连接参数、访问 URL、上传限制提示和上传测试。
  - 文件存储保存配置按钮位于文件存储表单底部，上传测试操作位于同一卡片的测试区域。
  - 后续平台设置按同一页面继续追加独立设置卡片，不在当前版本做统计区或平台概览区。
  - 桌面端卡片内部可使用左右布局组织表单与测试区域；移动端卡片内部改为单列。
  - 页面自身不创建额外滚动容器，滚动只发生在 Dashboard Main 区域，避免浏览器滚动条和内容区滚动条同时出现。
  - 设置卡片、双列表单和测试区域必须使用最小宽度约束，长 URL、Endpoint、Bucket、Access Key 状态文案和测试对象 key 不得撑出卡片边界。

## 用户动作

- 查看当前邮件服务配置状态。
- 切换邮件 provider。
- 填写或更新邮件服务配置。
- 保存邮件服务配置。
- 向指定邮箱发送测试邮件。
- 查看当前文件存储配置状态。
- 切换文件存储 provider。
- 填写或更新文件存储配置。
- 保存文件存储配置。
- 上传测试文件，验证本地目录或 S3 bucket 可写。
- 在保存失败、配置缺失或测试发送失败时查看明确但不泄露敏感值的错误提示。

## 权限与安全

- 页面仅面向平台级配置管理。
- `super_admin` 可以访问、保存配置和发送测试邮件。
- `super_admin` 可以保存文件存储配置和执行上传测试。
- `admin` 不允许修改邮件服务配置；第一版可直接禁止访问本页并返回 forbidden 状态。
- 普通用户、support、组织管理员不能访问。
- 所有查询和修改必须使用服务端 tRPC procedure 重新校验平台角色，不能依赖隐藏 UI。
- 敏感字段包括：
  - `email.resend.apiKey`
  - `email.smtp.password`
  - `storage.s3.accessKeyId`
  - `storage.s3.secretAccessKey`
- 敏感字段保存后不向客户端回显明文，只返回 `configured: true/false`。
- 敏感字段表单使用密码输入框；留空提交表示不覆盖已有敏感值，显式点击「清除」才删除。
- 测试邮件不能展示完整 provider 密钥、SMTP 密码、session token 或认证链接。
- 上传测试不能展示 S3 secret、access key、服务器绝对路径中的敏感片段或临时签名 token。
- 生产环境不允许使用 `console` provider 作为真实邮件通道；保存为 `console` 时服务端应阻止，或至少在生产环境发送时拒绝并返回配置错误。
- 本地上传 provider 只能写入服务端显式允许的目录。服务端必须解析并校验目录，禁止 `..`、项目根外非允许路径、系统根目录和危险目录。
- 上传后的公开 URL 只能由服务端根据配置生成，客户端不能传入最终存储路径。

## 数据模型

新增通用平台配置表 `system_platform_setting`，采用受控 key/value 模型。页面不提供任意 key 编辑能力，只通过受控 schema 读写邮件配置 key。

表字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `key` | text primary key | 配置键，例如 `email.provider` |
| `value` | text | 配置值；敏感值可存加密后的字符串 |
| `updatedBy` | text nullable | 最后修改人 user id |
| `createdAt` | timestamp | 创建时间 |
| `updatedAt` | timestamp | 更新时间 |

第一版邮件配置 key：

| Key | 类型 | 示例 | 说明 |
| --- | --- | --- | --- |
| `email.provider` | enum | `console` | `console`、`resend`、`smtp` |
| `email.from` | string | `Lever Admin <no-reply@example.com>` | 发件人 |
| `email.resend.apiKey` | secret string | masked | Resend API Key |
| `email.smtp.host` | string | `smtp.gmail.com` | SMTP host |
| `email.smtp.port` | number | `587` | SMTP port |
| `email.smtp.user` | string | `user@example.com` | SMTP 用户名 |
| `email.smtp.password` | secret string | masked | SMTP 密码 |
| `email.smtp.secure` | boolean | `false` | 是否使用 secure SMTP |

第一版文件存储配置 key：

| Key | 类型 | 示例 | 说明 |
| --- | --- | --- | --- |
| `storage.provider` | enum | `local` | `local`、`s3` |
| `storage.local.path` | string | `./uploads` | 本地上传根目录，服务端解析为安全绝对路径 |
| `storage.publicBaseUrl` | string | `https://cdn.example.com/uploads` | 文件公开访问基础 URL；本地开发可为空并使用内部下载路由 |
| `storage.s3.endpoint` | string | `https://s3.amazonaws.com` | S3 兼容 endpoint；AWS S3 可为空走 SDK 默认 |
| `storage.s3.region` | string | `ap-east-1` | S3 region |
| `storage.s3.bucket` | string | `lever-admin` | S3 bucket |
| `storage.s3.accessKeyId` | secret string | masked | S3 access key id |
| `storage.s3.secretAccessKey` | secret string | masked | S3 secret access key |
| `storage.s3.forcePathStyle` | boolean | `false` | MinIO/R2 等兼容服务可开启 |

## 需要接入上传配置的地方

代码与 PRD 扫描后，第一批需要支持上传配置的入口如下：

| 位置 | 当前状态 | 处理方式 |
| --- | --- | --- |
| `/dashboard/settings/profile` 个人头像 | 当前代码只支持填写头像 URL，PRD 明确“文件上传后置” | 改为支持上传头像文件；上传成功后把返回 URL 写入 `system_user.image`，保留手动 URL 作为可选高级输入 |
| `/dashboard/orgs/[slug]/setting` 组织 Logo | 当前代码只支持填写 Logo URL，PRD 已要求设置页字段可使用上传入口 | 改为支持上传组织 Logo；上传成功后把返回 URL 写入 `system_organization.logo`，保留手动 URL 作为可选高级输入 |

暂不接入上传配置的地方：

- Auth 页插画、PRD 导出图片和设计稿资源属于仓库静态资源，不走运行时上传配置。
- 请求日志导出 CSV 是浏览器下载，不是服务端上传。
- 邮件模板、API Key、组织邀请和会话管理当前没有文件上传入口。

## 配置读取优先级

- 邮件服务运行时优先读取数据库配置。
- 数据库没有配置时，允许回退到当前环境变量，确保本地开发、E2E 和首次部署不会因为配置表为空而无法启动。
- 保存过数据库邮件配置后，运行时使用数据库值作为最终配置。
- `.env.example` 仍保留邮件相关变量作为启动兜底和首次迁移说明；设置页不单独展示环境变量兜底卡片。
- 文件存储运行时优先读取数据库配置。
- 数据库没有文件存储配置时，默认使用本地上传 provider，目录为服务端安全默认目录，例如项目数据目录下的 `uploads/`。
- 文件存储配置不依赖环境变量作为页面可见兜底；如部署方需要通过环境变量指定首次默认值，只能作为服务端启动默认值，不在页面展示。

## 接口与逻辑

- `adminPlatformSetting.getEmailSettings`
  - `super_admin` 查询当前邮件配置。
  - 返回 provider、from、非敏感字段和敏感字段是否已配置。
- `adminPlatformSetting.updateEmailSettings`
  - `super_admin` 保存邮件配置。
  - 使用 Zod 校验 provider 对应必填项：
    - `console`：需要 `email.from`；生产环境不可启用。
    - `resend`：需要 `email.from` 和已配置的 Resend API Key。
    - `smtp`：需要 `email.from`、host、port、user、password。
  - 敏感字段留空时保留原值。
  - 敏感字段显式清除时删除对应 key。
- `adminPlatformSetting.sendTestEmail`
  - `super_admin` 输入测试收件人邮箱后发送测试邮件。
  - 使用当前已保存配置发送，不使用未保存的表单状态。
  - 测试邮件 subject 包含「Lever Admin 测试邮件」。
  - 测试邮件正文说明 provider、发送时间和操作者邮箱，不包含密钥或内部 token。
- `adminPlatformSetting.getStorageSettings`
  - `super_admin` 查询当前文件存储配置。
  - 返回 provider、非敏感字段和敏感字段是否已配置。
- `adminPlatformSetting.updateStorageSettings`
  - `super_admin` 保存文件存储配置。
  - 使用 Zod 校验 provider 对应必填项：
    - `local`：需要本地上传目录。
    - `s3`：需要 bucket、region 或 endpoint、access key、secret key；兼容服务可配置 `forcePathStyle`。
  - 敏感字段留空时保留原值。
  - 敏感字段显式清除时删除对应 key。
- `adminPlatformSetting.testStorageUpload`
  - `super_admin` 使用当前已保存配置上传一个小型测试文件。
  - 测试文件由服务端生成，不接受用户上传任意测试文件内容。
  - 测试流程写入 `platform-settings/test-<timestamp>.txt`，验证写入成功后删除测试对象。
  - 返回 provider、对象 key、测试时间和可安全展示的访问 URL 或成功状态。

## 文件存储集成

- 新增统一上传服务 `src/server/service/storage`，对业务侧暴露 `putObject`、`deleteObject`、`getPublicUrl` 等受控接口。
- 本地 provider 将文件写入配置目录下的业务前缀，例如 `avatars/`、`organization-logos/`，并通过受控下载路由或公开基础 URL 生成访问地址。
- S3 provider 使用 S3 兼容协议写入 bucket，不在业务代码中直接依赖具体云厂商。
- 个人头像和组织 Logo 上传必须调用统一上传服务，不在页面组件中直接处理本地路径或 S3 参数。
- 上传服务必须限制文件大小、MIME 类型和扩展名：
  - 头像与 Logo 第一版只允许 `image/png`、`image/jpeg`、`image/webp`、`image/svg+xml`。
  - 默认最大文件大小为 2 MB；后续如需可在同一设置页追加限制项。
- 上传成功后只把最终 URL 或对象引用写入业务表，不把文件二进制存入数据库。

## 邮件服务集成

- `src/server/service/email` 的统一发送入口继续为所有认证和组织邀请邮件提供服务。
- 邮箱验证、密码重置和组织邀请仍调用统一 `sendEmail({ to, subject, html, text })`。
- `sendEmail` 内部从平台配置服务获取邮件 provider 配置。
- Provider 实现仍然只负责发送，不拼接业务模板。
- 如果数据库配置不完整，发送入口应返回可定位的服务端错误；忘记密码等敏感流程前端仍保持原有防枚举文案。
- `prd/17-email-service.md` 需要在实现时同步更新为「数据库配置优先，环境变量兜底」。

## 表单校验与反馈

- Provider 使用分段控制或选择器。
- `from` 必填，必须符合邮件 From 语义；第一版可用字符串校验，至少不能为空。
- Resend 模式下 API Key 必须已配置。
- SMTP 模式下 host、port、user、password 必须已配置。
- port 必须为正整数。
- secure 使用开关。
- 保存成功显示 toast。
- 保存失败显示错误提示，不暴露密钥明文。
- 发送测试邮件成功显示 toast，并可在邮件服务卡片内展示本次操作反馈。
- 发送测试邮件失败显示 provider 和错误类型的安全文案，例如「SMTP 连接失败，请检查主机、端口和凭据」。
- 文件存储 provider 使用分段控制或选择器。
- Local 模式下上传路径必填，输入框旁展示“服务端路径”说明，不要求 public base URL。
- S3 模式下 bucket 必填；endpoint、region 根据 provider 组合校验，至少需要满足 S3 SDK 可连接配置。
- S3 access key 和 secret access key 使用密码输入框；保存后不回显明文。
- 已保存的 S3 access key 和 secret access key 可通过显式清除按钮删除；留空且未清除时保留原敏感值。
- 上传测试成功显示 toast，并在文件存储卡片内展示最近一次测试状态。
- 上传测试失败展示安全错误文案，例如「本地目录不可写」或「S3 凭据校验失败」，不暴露完整密钥或内部堆栈。

## 页面状态

- Loading：展示设置页骨架屏。
- Empty：配置表为空时展示邮件服务和文件存储表单默认值，以及未配置敏感字段状态。
- Error：配置读取失败时展示错误卡片和重试入口。
- Forbidden：非 `super_admin` 访问时展示无权限状态或服务端重定向到 `/dashboard`。
- Success：展示当前配置和已配置敏感字段状态。

## 实现要点

- 新增 `src/server/api/routers/admin-platform-setting.ts`，使用 `adminProcedure` 后再校验 `role === "super_admin"`。
- 新增 `src/server/service/platform-settings/`，封装受控 key/value 读取、写入、默认值和邮件配置解析。
- 新增或扩展 `src/server/service/email`，让 provider 配置从平台设置服务解析得到。
- 新增 `src/server/service/storage`，让头像、组织 Logo 和上传测试统一读取平台文件存储配置。
- 新增页面路径 `src/app/dashboard/admin/settings/page.tsx`。
- 页面客户端组件放在 `src/app/dashboard/admin/settings/_components/`。
- 新增 PRD 对应的 E2E 文件 `e2e/specs/18-dashboard-admin-platform-settings.spec.ts`。
- 不提供任意 key/value 管理 UI；所有 key 必须由服务端 schema 显式允许。
- 不运行 `pnpm db:generate`、`pnpm db:migrate` 或 `pnpm db:push`，除非用户明确要求执行数据库迁移命令。

## Playwright E2E 测试用例

测试环境使用 `prd/99-e2e-testing-method.md` 中定义的 Playwright + Testcontainers PostgreSQL。

| 用例 ID | 场景 | 前置数据 | 操作 | 预期结果 |
| --- | --- | --- | --- | --- |
| `admin-platform-settings-001` | 非登录访问 | 无 session | 访问 `/dashboard/admin/settings` | 重定向 `/sign-in?redirectTo=%2Fdashboard%2Fadmin%2Fsettings` |
| `admin-platform-settings-002` | 非 super_admin 访问 | 建立普通 admin 或 user session | 访问 `/dashboard/admin/settings` | 展示 forbidden 或跳转 `/dashboard` |
| `admin-platform-settings-003` | super_admin 查看空配置 | 建立 super_admin session，配置表为空 | 访问页面 | 展示邮件服务表单默认值和未配置敏感字段状态 |
| `admin-platform-settings-004` | 保存 console 配置 | super_admin session，测试环境 | 选择 `console`，填写 From，保存 | `system_platform_setting` 写入 `email.provider` 和 `email.from`，页面显示保存成功 |
| `admin-platform-settings-005` | 保存 resend 配置 | super_admin session | 选择 `resend`，填写 From 和 API Key，保存 | 数据库写入 provider/from/apiKey，API Key 不回显明文，仅显示已配置 |
| `admin-platform-settings-006` | 保存 smtp 配置 | super_admin session | 选择 `smtp`，填写 host、port、user、password、secure，保存 | 数据库写入 SMTP 配置，password 不回显明文，仅显示已配置 |
| `admin-platform-settings-007` | 敏感字段留空不覆盖 | 已有 Resend API Key | 保存 Resend 配置但 API Key 留空 | 原 API Key 保留，页面仍显示已配置 |
| `admin-platform-settings-008` | 发送测试邮件成功 | 已保存 console provider | 输入测试收件人并发送 | 页面提示测试邮件已发送，服务端日志包含测试邮件元数据 |
| `admin-platform-settings-009` | 发送测试邮件校验 | super_admin session | 测试收件人为空或格式错误后提交 | 页面展示校验错误，不发送请求 |
| `admin-platform-settings-010` | 配置不完整时测试失败 | provider 为 smtp 但缺少 host 或 password | 发送测试邮件 | 页面展示安全错误文案，不暴露敏感值 |
| `admin-platform-settings-011` | 查看默认文件存储配置 | 建立 super_admin session，配置表为空 | 访问页面 | 展示 Local provider、默认上传目录和上传测试入口 |
| `admin-platform-settings-012` | 保存本地上传配置 | super_admin session | 选择 Local，填写上传路径并保存 | 数据库写入 `storage.provider=local` 和 `storage.local.path`，页面提示保存成功 |
| `admin-platform-settings-013` | 保存 S3 上传配置 | super_admin session | 选择 S3，填写 bucket、region、endpoint、access key、secret key 并保存 | 数据库写入 S3 配置，密钥不回显明文，仅显示已配置 |
| `admin-platform-settings-014` | S3 敏感字段留空不覆盖 | 已有 S3 凭据 | 保存 S3 配置但 access key/secret 留空 | 原凭据保留，页面仍显示已配置 |
| `admin-platform-settings-015` | 上传测试成功 | 已保存可写 Local 或 S3 配置 | 点击上传测试 | 服务端写入并清理测试对象，页面显示测试成功 |
| `admin-platform-settings-016` | 上传测试失败 | 配置为不可写本地目录或错误 S3 凭据 | 点击上传测试 | 页面展示安全错误文案，不暴露内部路径细节或密钥 |

## 验收标准

- 平台设置页有独立 PRD 和 pencli 设计确认后再编码。
- Sidebar 管理分组包含平台设置入口。
- 页面只能由 `super_admin` 修改邮件配置、文件存储配置、发送测试邮件和执行上传测试。
- 新增配置表采用受控 key/value 模型，不暴露任意 key 编辑能力。
- 邮件服务运行时优先读取数据库配置，数据库为空时回退环境变量。
- 文件存储运行时优先读取数据库配置，数据库为空时使用安全本地默认配置。
- 敏感配置保存后不向客户端回显明文。
- 测试邮件使用已保存配置发送，并有成功、失败、校验和 loading 状态。
- 上传测试使用已保存配置执行，并有成功、失败、校验和 loading 状态。
- 个人头像和组织 Logo 上传通过统一文件存储服务，不直接在业务页面读取 S3 或本地路径配置。
- 认证邮件、密码重置邮件和组织邀请邮件继续通过统一邮件服务发送。
- 页面在 loading、empty、error、forbidden、success 状态下均有明确反馈。
- 所有敏感动作必须在服务端重新校验 session 和权限。
- 表单字段均有客户端和服务端校验。
