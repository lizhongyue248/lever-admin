# Better Auth Table Prefix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split Better Auth-owned database tables from product-owned system tables by moving Better Auth physical table names from `system_*` to `auth_*`.

**Architecture:** Keep Drizzle export/model names unchanged (`user`, `session`, `organization`, `apikey`, etc.) so TypeScript call sites and Better Auth model names remain stable. Change only the physical PostgreSQL table prefix for Better Auth tables, explicitly pass the Drizzle schema to Better Auth's Drizzle adapter, and update raw SQL and PRD references that mention physical table names.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle ORM, PostgreSQL, Better Auth 1.6, tRPC, Playwright E2E helpers.

---

## Context

Current state:

- `src/server/db/schema.ts` defines `createSystemTable = pgTableCreator((name) => \`system_${name}\`)`.
- Better Auth tables and product extension tables both use `createSystemTable`.
- `src/server/better-auth/config.ts` calls `drizzleAdapter(db, { provider: "pg" })` without an explicit schema object.
- `drizzle.config.ts` has `tablesFilter: ["system_*"]`.
- Raw SQL references Better Auth tables in:
  - `src/server/api/routers/admin-org.ts`
  - `src/server/api/routers/admin-user.ts`
  - `e2e/helpers/db.ts`
- PRDs contain physical table names such as `system_user`, `system_session`, `system_member`, and `system_apikey`.

Target prefix policy:

- Better Auth-owned tables use `auth_*`.
- Product-owned tables keep `system_*`.
- TypeScript export names stay unchanged to reduce code churn.

Better Auth-owned tables:

| Drizzle export | Current table | Target table |
| --- | --- | --- |
| `user` | `system_user` | `auth_user` |
| `session` | `system_session` | `auth_session` |
| `account` | `system_account` | `auth_account` |
| `verification` | `system_verification` | `auth_verification` |
| `organization` | `system_organization` | `auth_organization` |
| `member` | `system_member` | `auth_member` |
| `invitation` | `system_invitation` | `auth_invitation` |
| `team` | `system_team` | `auth_team` |
| `teamMember` | `system_team_member` | `auth_team_member` |
| `twoFactor` | `system_two_factor` | `auth_two_factor` |
| `passkey` | `system_passkey` | `auth_passkey` |
| `apikey` | `system_apikey` | `auth_apikey` |

Product-owned tables that remain `system_*`:

- `system_platform_setting`
- `system_api_key_usage_log`
- `system_request_log`
- `system_organization_department`
- `system_organization_department_member`

Important migration constraint:

- Do not run `pnpm db:generate`, `pnpm db:migrate`, or `pnpm db:push` unless the user explicitly approves database migration work.
- The schema change should be implemented in code first, then verified with TypeScript/lint. Migration generation/application is a separate explicit step.

---

## File Map

- Modify `src/server/db/schema.ts`
  - Add `createAuthTable`.
  - Move Better Auth table definitions to `createAuthTable`.
  - Rename Better Auth indexes from `system_*` to `auth_*`.
  - Keep product extension tables on `createSystemTable`.
- Modify `src/server/better-auth/config.ts`
  - Import the Drizzle schema object.
  - Pass `schema` to `drizzleAdapter` so Better Auth maps model names to the current Drizzle table objects.
- Modify `drizzle.config.ts`
  - Change `tablesFilter` to include both `auth_*` and `system_*`.
- Modify raw SQL callers:
  - `src/server/api/routers/admin-org.ts`
  - `src/server/api/routers/admin-user.ts`
  - `e2e/helpers/db.ts`
- Modify descriptive source labels:
  - `src/server/api/routers/security.ts`
- Modify PRDs that name physical auth tables:
  - `prd/06-dashboard.md`
  - `prd/07-dashboard-settings-profile.md`
  - `prd/08-dashboard-settings-security.md`
  - `prd/09-dashboard-settings-sessions.md`
  - `prd/10-dashboard-orgs-slug-settings.md`
  - `prd/11-dashboard-admin.md`
  - `prd/14-dashboard-admin-api-keys.md`
  - `prd/15-dashboard-admin-orgs.md`
  - `prd/18-dashboard-admin-platform-settings.md`
  - `prd/99-e2e-testing-method.md`

---

### Task 1: Update Drizzle Table Creators And Auth Table Names

**Files:**

- Modify: `src/server/db/schema.ts`

- [ ] **Step 1: Add an auth table creator next to the existing system table creator**

Replace:

```ts
export const createSystemTable = pgTableCreator((name) => `system_${name}`)
```

With:

```ts
export const createAuthTable = pgTableCreator((name) => `auth_${name}`)
export const createSystemTable = pgTableCreator((name) => `system_${name}`)
```

- [ ] **Step 2: Move Better Auth table definitions to `createAuthTable`**

Replace these table factory calls:

```ts
export const user = createSystemTable("user", {
export const session = createSystemTable(
export const account = createSystemTable(
export const verification = createSystemTable(
export const organization = createSystemTable(
export const member = createSystemTable(
export const invitation = createSystemTable(
export const team = createSystemTable(
export const teamMember = createSystemTable(
export const twoFactor = createSystemTable(
export const passkey = createSystemTable(
export const apikey = createSystemTable(
```

With:

```ts
export const user = createAuthTable("user", {
export const session = createAuthTable(
export const account = createAuthTable(
export const verification = createAuthTable(
export const organization = createAuthTable(
export const member = createAuthTable(
export const invitation = createAuthTable(
export const team = createAuthTable(
export const teamMember = createAuthTable(
export const twoFactor = createAuthTable(
export const passkey = createAuthTable(
export const apikey = createAuthTable(
```

Do not change these product table factory calls:

```ts
export const organizationDepartment = createSystemTable(
export const organizationDepartmentMember = createSystemTable(
export const platformSetting = createSystemTable("platform_setting", {
export const apiKeyUsageLog = createSystemTable(
export const requestLog = createSystemTable(
```

- [ ] **Step 3: Rename Better Auth index names to match the new prefix**

Replace Better Auth-owned index names:

```ts
index("system_session_user_id_idx").on(table.userId)
index("system_account_user_id_idx").on(table.userId)
index("system_verification_identifier_idx").on(table.identifier)
uniqueIndex("system_organization_slug_idx").on(table.slug)
index("system_organization_status_idx").on(table.status)
index("system_member_organization_id_idx").on(table.organizationId)
index("system_member_user_id_idx").on(table.userId)
uniqueIndex("system_member_organization_user_idx").on(table.organizationId, table.userId)
index("system_invitation_organization_id_idx").on(table.organizationId)
index("system_invitation_email_idx").on(table.email)
index("system_invitation_status_idx").on(table.status)
index("system_invitation_department_id_idx").on(table.departmentId)
index("system_invitation_team_id_idx").on(table.teamId)
index("system_team_organization_id_idx").on(table.organizationId)
index("system_team_member_team_id_idx").on(table.teamId)
index("system_team_member_user_id_idx").on(table.userId)
uniqueIndex("system_team_member_team_user_idx").on(table.teamId, table.userId)
index("system_two_factor_secret_idx").on(table.secret)
index("system_two_factor_user_id_idx").on(table.userId)
index("system_passkey_user_id_idx").on(table.userId)
index("system_passkey_credential_id_idx").on(table.credentialID)
index("system_apikey_config_id_idx").on(table.configId)
index("system_apikey_reference_id_idx").on(table.referenceId)
index("system_apikey_key_idx").on(table.key)
```

With:

```ts
index("auth_session_user_id_idx").on(table.userId)
index("auth_account_user_id_idx").on(table.userId)
index("auth_verification_identifier_idx").on(table.identifier)
uniqueIndex("auth_organization_slug_idx").on(table.slug)
index("auth_organization_status_idx").on(table.status)
index("auth_member_organization_id_idx").on(table.organizationId)
index("auth_member_user_id_idx").on(table.userId)
uniqueIndex("auth_member_organization_user_idx").on(table.organizationId, table.userId)
index("auth_invitation_organization_id_idx").on(table.organizationId)
index("auth_invitation_email_idx").on(table.email)
index("auth_invitation_status_idx").on(table.status)
index("auth_invitation_department_id_idx").on(table.departmentId)
index("auth_invitation_team_id_idx").on(table.teamId)
index("auth_team_organization_id_idx").on(table.organizationId)
index("auth_team_member_team_id_idx").on(table.teamId)
index("auth_team_member_user_id_idx").on(table.userId)
uniqueIndex("auth_team_member_team_user_idx").on(table.teamId, table.userId)
index("auth_two_factor_secret_idx").on(table.secret)
index("auth_two_factor_user_id_idx").on(table.userId)
index("auth_passkey_user_id_idx").on(table.userId)
index("auth_passkey_credential_id_idx").on(table.credentialID)
index("auth_apikey_config_id_idx").on(table.configId)
index("auth_apikey_reference_id_idx").on(table.referenceId)
index("auth_apikey_key_idx").on(table.key)
```

- [ ] **Step 4: Run targeted search**

Run:

```bash
rg -n 'createSystemTable\("(user|session|account|verification|organization|member|invitation|team|team_member|two_factor|passkey|apikey)"|system_(session|account|verification|organization|member|invitation|team|team_member|two_factor|passkey|apikey)_(.*)_idx' src/server/db/schema.ts
```

Expected:

- No Better Auth table should still be created by `createSystemTable`.
- No Better Auth index names should still start with `system_`.
- Product index names such as `system_request_log_created_at_idx` and `system_organization_department_org_idx` remain.

---

### Task 2: Pass Explicit Schema To Better Auth Drizzle Adapter

**Files:**

- Modify: `src/server/better-auth/config.ts`

- [ ] **Step 1: Import the schema namespace**

Add this import:

```ts
import * as schema from "@/server/db/schema"
```

Keep the existing named import:

```ts
import { user as userTable } from "@/server/db/schema"
```

- [ ] **Step 2: Pass schema to the adapter**

Replace:

```ts
  database: drizzleAdapter(db, {
    provider: "pg"
  }),
```

With:

```ts
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
  }),
```

Reasoning:

- Better Auth model names stay `user`, `session`, `account`, and so on.
- Drizzle table objects now point those model names at physical `auth_*` tables.
- Passing `schema` makes the mapping explicit and matches Better Auth's Drizzle custom table-name guidance.

- [ ] **Step 3: Run targeted typecheck for this change**

Run:

```bash
pnpm typecheck
```

Expected:

- TypeScript accepts the adapter schema object.
- If Better Auth rejects extra non-auth schema keys, replace `schema` with a narrowed object:

```ts
const authSchema = {
  user: schema.user,
  session: schema.session,
  account: schema.account,
  verification: schema.verification,
  organization: schema.organization,
  member: schema.member,
  invitation: schema.invitation,
  team: schema.team,
  teamMember: schema.teamMember,
  twoFactor: schema.twoFactor,
  passkey: schema.passkey,
  apikey: schema.apikey
}
```

And then:

```ts
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema
  }),
```

---

### Task 3: Update Drizzle Kit Table Filter

**Files:**

- Modify: `drizzle.config.ts`

- [ ] **Step 1: Include both prefixes**

Replace:

```ts
  tablesFilter: ["system_*"]
```

With:

```ts
  tablesFilter: ["auth_*", "system_*"]
```

- [ ] **Step 2: Verify the config still typechecks**

Run:

```bash
pnpm typecheck
```

Expected:

- `drizzle.config.ts` still satisfies `Config`.

---

### Task 4: Update Runtime Raw SQL References

**Files:**

- Modify: `src/server/api/routers/admin-org.ts`
- Modify: `src/server/api/routers/admin-user.ts`
- Modify: `src/server/api/routers/security.ts`

- [ ] **Step 1: Replace raw SQL Better Auth table names in `admin-org.ts`**

Apply these replacements only in raw SQL string fragments:

```text
"system_session" -> "auth_session"
"system_member" -> "auth_member"
"system_invitation" -> "auth_invitation"
```

Do not replace product table names:

```text
"system_organization_department"
"system_request_log"
"system_api_key_usage_log"
```

- [ ] **Step 2: Replace raw SQL Better Auth table names in `admin-user.ts`**

Apply this replacement only in raw SQL string fragments:

```text
"system_session" -> "auth_session"
```

- [ ] **Step 3: Replace source labels in `security.ts`**

Replace user-facing/internal source labels:

```ts
source: "system_account.password/provider_id"
source: "system_user.two_factor_enabled + system_two_factor.verified"
source: "system_passkey"
source: "system_account.provider_id"
source: "system_session count"
```

With:

```ts
source: "auth_account.password/provider_id"
source: "auth_user.two_factor_enabled + auth_two_factor.verified"
source: "auth_passkey"
source: "auth_account.provider_id"
source: "auth_session count"
```

- [ ] **Step 4: Verify raw SQL scan**

Run:

```bash
rg -n '"system_(user|session|account|verification|organization|member|invitation|team|team_member|two_factor|passkey|apikey)"|system_(user|session|account|verification|organization|member|invitation|team|team_member|two_factor|passkey|apikey)\b' src -g '*.ts' -g '*.tsx'
```

Expected:

- No runtime source file references physical Better Auth tables with `system_*`.
- Product tables such as `system_organization_department` may remain.

---

### Task 5: Update E2E Database Helpers

**Files:**

- Modify: `e2e/helpers/db.ts`

- [ ] **Step 1: Replace Better Auth physical table names**

Apply these replacements:

```text
"system_user" -> "auth_user"
"system_session" -> "auth_session"
"system_account" -> "auth_account"
"system_verification" -> "auth_verification"
"system_organization" -> "auth_organization"
"system_member" -> "auth_member"
"system_invitation" -> "auth_invitation"
"system_apikey" -> "auth_apikey"
```

Do not replace:

```text
"system_organization_department"
"system_organization_department_member"
"system_request_log"
"system_api_key_usage_log"
"system_platform_setting"
```

- [ ] **Step 2: Verify helper scan**

Run:

```bash
rg -n '"system_(user|session|account|verification|organization|member|invitation|team|team_member|two_factor|passkey|apikey)"' e2e/helpers/db.ts
```

Expected:

- No matches.

- [ ] **Step 3: Keep quoted table names**

Confirm generated SQL still quotes physical table names:

```sql
update "auth_user" set "email_verified" = true where "email" = ${email}
```

Reasoning:

- Quoting remains useful because direct SQL helpers should not depend on PostgreSQL identifier normalization.

---

### Task 6: Update PRD Table Namespace References

**Files:**

- Modify: `prd/06-dashboard.md`
- Modify: `prd/07-dashboard-settings-profile.md`
- Modify: `prd/08-dashboard-settings-security.md`
- Modify: `prd/09-dashboard-settings-sessions.md`
- Modify: `prd/10-dashboard-orgs-slug-settings.md`
- Modify: `prd/11-dashboard-admin.md`
- Modify: `prd/14-dashboard-admin-api-keys.md`
- Modify: `prd/15-dashboard-admin-orgs.md`
- Modify: `prd/18-dashboard-admin-platform-settings.md`
- Modify: `prd/99-e2e-testing-method.md`

- [ ] **Step 1: Replace Better Auth table names in PRDs**

Apply this mapping in PRD prose:

```text
system_user -> auth_user
system_session -> auth_session
system_account -> auth_account
system_verification -> auth_verification
system_organization -> auth_organization
system_member -> auth_member
system_invitation -> auth_invitation
system_team -> auth_team
system_team_member -> auth_team_member
system_two_factor -> auth_two_factor
system_passkey -> auth_passkey
system_apikey -> auth_apikey
```

Do not change product-owned tables:

```text
system_request_log
system_api_key_usage_log
system_platform_setting
system_organization_department
system_organization_department_member
```

- [ ] **Step 2: Add namespace rule to E2E PRD**

In `prd/99-e2e-testing-method.md`, add this note near the direct database access section:

```md
- 数据库物理表前缀分层：
  - Better Auth 拥有的认证、会话、组织、成员、邀请、团队、2FA、Passkey 和 API Key 表使用 `auth_*`。
  - 平台自有扩展表使用 `system_*`。
  - 测试 helper 直接 SQL 必须使用当前物理表名，不能继续引用旧的 `system_user`、`system_session` 等历史名称。
```

- [ ] **Step 3: Verify PRD scan**

Run:

```bash
rg -n '`system_(user|session|account|verification|organization|member|invitation|team|team_member|two_factor|passkey|apikey)|"system_(user|session|account|verification|organization|member|invitation|team|team_member|two_factor|passkey|apikey)' prd -g '*.md'
```

Expected:

- No PRD references Better Auth physical tables with the old `system_*` prefix.
- Product table references remain.

---

### Task 7: Prepare Migration Guidance Without Applying It

**Files:**

- Modify: `prd/99-e2e-testing-method.md`
- Optional Create: `docs/superpowers/plans/2026-05-16-better-auth-table-prefix-migration-notes.md`

- [ ] **Step 1: Document the expected manual migration shape**

Add this migration note to the plan execution summary or a separate migration note document:

```sql
alter table if exists "system_user" rename to "auth_user";
alter table if exists "system_session" rename to "auth_session";
alter table if exists "system_account" rename to "auth_account";
alter table if exists "system_verification" rename to "auth_verification";
alter table if exists "system_organization" rename to "auth_organization";
alter table if exists "system_member" rename to "auth_member";
alter table if exists "system_invitation" rename to "auth_invitation";
alter table if exists "system_team" rename to "auth_team";
alter table if exists "system_team_member" rename to "auth_team_member";
alter table if exists "system_two_factor" rename to "auth_two_factor";
alter table if exists "system_passkey" rename to "auth_passkey";
alter table if exists "system_apikey" rename to "auth_apikey";
```

Add index rename statements if the generated migration does not handle index names:

```sql
alter index if exists "system_session_user_id_idx" rename to "auth_session_user_id_idx";
alter index if exists "system_account_user_id_idx" rename to "auth_account_user_id_idx";
alter index if exists "system_verification_identifier_idx" rename to "auth_verification_identifier_idx";
alter index if exists "system_organization_slug_idx" rename to "auth_organization_slug_idx";
alter index if exists "system_organization_status_idx" rename to "auth_organization_status_idx";
alter index if exists "system_member_organization_id_idx" rename to "auth_member_organization_id_idx";
alter index if exists "system_member_user_id_idx" rename to "auth_member_user_id_idx";
alter index if exists "system_member_organization_user_idx" rename to "auth_member_organization_user_idx";
alter index if exists "system_invitation_organization_id_idx" rename to "auth_invitation_organization_id_idx";
alter index if exists "system_invitation_email_idx" rename to "auth_invitation_email_idx";
alter index if exists "system_invitation_status_idx" rename to "auth_invitation_status_idx";
alter index if exists "system_invitation_department_id_idx" rename to "auth_invitation_department_id_idx";
alter index if exists "system_invitation_team_id_idx" rename to "auth_invitation_team_id_idx";
alter index if exists "system_team_organization_id_idx" rename to "auth_team_organization_id_idx";
alter index if exists "system_team_member_team_id_idx" rename to "auth_team_member_team_id_idx";
alter index if exists "system_team_member_user_id_idx" rename to "auth_team_member_user_id_idx";
alter index if exists "system_team_member_team_user_idx" rename to "auth_team_member_team_user_idx";
alter index if exists "system_two_factor_secret_idx" rename to "auth_two_factor_secret_idx";
alter index if exists "system_two_factor_user_id_idx" rename to "auth_two_factor_user_id_idx";
alter index if exists "system_passkey_user_id_idx" rename to "auth_passkey_user_id_idx";
alter index if exists "system_passkey_credential_id_idx" rename to "auth_passkey_credential_id_idx";
alter index if exists "system_apikey_config_id_idx" rename to "auth_apikey_config_id_idx";
alter index if exists "system_apikey_reference_id_idx" rename to "auth_apikey_reference_id_idx";
alter index if exists "system_apikey_key_idx" rename to "auth_apikey_key_idx";
```

- [ ] **Step 2: State the migration execution rule clearly**

Record this rule:

```md
本计划只完成代码和文档层面的前缀切换。实际数据库迁移必须由用户单独确认后执行，执行前需要备份数据库，并优先使用 rename 保留已有数据。
```

---

### Task 8: Verification

**Files:**

- Read-only verification across the repository.

- [ ] **Step 1: Scan runtime code for stale auth table names**

Run:

```bash
rg -n '"system_(user|session|account|verification|organization|member|invitation|team|team_member|two_factor|passkey|apikey)"|system_(user|session|account|verification|organization|member|invitation|team|team_member|two_factor|passkey|apikey)\b' src e2e -g '*.ts' -g '*.tsx'
```

Expected:

- No stale Better Auth `system_*` physical table references in runtime code or E2E helpers.
- Product-owned table names may still appear.

- [ ] **Step 2: Verify Drizzle schema table filters**

Run:

```bash
rg -n 'tablesFilter: \["auth_\*", "system_\*"\]' drizzle.config.ts
```

Expected:

- One match.

- [ ] **Step 3: Verify TypeScript**

Run:

```bash
pnpm typecheck
```

Expected:

- Command exits with code 0.

- [ ] **Step 4: Verify Biome**

Run:

```bash
pnpm check
```

Expected:

- Command exits with code 0.

- [ ] **Step 5: Build if typecheck and check pass**

Run:

```bash
pnpm build
```

Expected:

- Command exits with code 0.
- If build fails because the local database is unavailable during static/server evaluation, record the exact error and do not claim build success.

- [ ] **Step 6: Do not run migration commands without explicit approval**

Do not run these commands in this implementation pass unless the user asks for migration generation/application:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:push
```

---

## Risks And Review Points

- Existing databases will still contain `system_*` auth tables until a migration renames them.
- Starting the app after code changes but before database migration can fail because Better Auth will look for `auth_*`.
- Drizzle Kit may generate drop/create instead of rename if left fully automatic. Review any generated migration manually and convert to `ALTER TABLE ... RENAME TO ...` before applying.
- Product tables with foreign keys to auth tables should keep their product table names but point to renamed auth tables through Drizzle references.
- The current worktree already contains unrelated modified files. Implementation must edit in place and not revert user or previous-agent changes.

---

## Self-Review

- Spec coverage: The plan covers schema prefix split, Better Auth adapter mapping, Drizzle Kit table filter, raw SQL updates, E2E helper updates, PRD references, migration guidance, and verification.
- Placeholder scan: No placeholder markers are used.
- Type consistency: Drizzle export names remain unchanged, so existing imports keep working while physical table names change.
- Scope: This plan does not include executing database migrations; that is deliberately separated because the repository instructions require explicit user approval for migration commands.
