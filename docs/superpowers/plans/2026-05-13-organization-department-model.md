# Organization Department Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old organization-hierarchy implementation with a company-owned department tree for `/dashboard/orgs/[slug]` and platform organization management.

**Architecture:** Better Auth `organization`, `member`, and `invitation` remain the source of truth for companies, membership, and invitations. Product tables model internal departments and optional department membership without creating extra Better Auth organizations or slugs. tRPC returns department-oriented view models so UI labels, tree interactions, and admin statistics no longer mention child organizations.

**Tech Stack:** Next.js App Router, React 19, tRPC 11, Drizzle ORM, PostgreSQL, Better Auth organization plugin, shadcn/ui, Zod, Playwright E2E.

---

### Task 1: Test Contract

**Files:**
- Modify: `e2e/helpers/db.ts`
- Modify: `e2e/specs/dashboard-admin-orgs.spec.ts`
- Modify: `e2e/specs/dashboard-org-invitations.spec.ts`
- Create: `e2e/specs/dashboard-org-departments.spec.ts`

- [ ] Replace `seedOrganizationTree` with `seedOrganizationWithDepartments`, which creates one company and one internal department.
- [ ] Update platform organization tests to expect department counts and no child organization cards.
- [ ] Add an organization architecture test that opens the add-department dialog, creates a department, and sees the new node in the tree.
- [ ] Update invitation tests to seed departments and keep the invitation status badge assertion.

### Task 2: Department Schema

**Files:**
- Modify: `src/server/db/schema.ts`

- [ ] Remove the product `organizationHierarchy` export and relations.
- [ ] Add `organizationDepartment` with `organizationId`, `parentDepartmentId`, `name`, `path`, `depth`, `sortOrder`, `status`, `managerUserId`, and `description`.
- [ ] Add `organizationDepartmentMember` with `organizationId`, `departmentId`, `memberId`, and timestamps.
- [ ] Add relations from organization to departments and from members to department memberships.

### Task 3: tRPC Refactor

**Files:**
- Modify: `src/server/api/routers/org.ts`
- Modify: `src/server/api/routers/admin-org.ts`

- [ ] Replace `org.tree` and `org.node.member` with department-backed aliases and contracts: `org.department.list`, `org.department.create`, and `org.department.member.list`.
- [ ] Keep temporary UI-compatible aliases for existing route components only where needed during the refactor.
- [ ] Calculate overview and platform counts from `system_organization_department`.
- [ ] Invite into the company only; optional `departmentId` is product metadata for default department display.
- [ ] Set invitation expiration on creation and cancel previous pending duplicates for the same email/company.

### Task 4: UI Refactor

**Files:**
- Modify: `src/app/dashboard/orgs/[slug]/_components/organization-tree.tsx`
- Modify: `src/app/dashboard/orgs/[slug]/_components/org-information-content.tsx`
- Modify: `src/app/dashboard/orgs/[slug]/_components/org-invite-content.tsx`
- Modify: `src/app/dashboard/orgs/[slug]/_components/org-overview-content.tsx`
- Modify: `src/app/dashboard/orgs/[slug]/_components/org-setting-content.tsx`
- Modify: `src/app/dashboard/admin/orgs/_components/admin-orgs-content.tsx`

- [ ] Rename user-facing copy from child organization to department.
- [ ] Replace the placeholder toast with a real add-department dialog.
- [ ] Select the company root or a department and load members for the chosen scope.
- [ ] Keep compact collapsible tree rows and disabled pagination controls.
- [ ] Show department counts on admin cards and summary cards.

### Task 5: Verification

**Files:**
- All touched files.

- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm check`.
- [ ] Run `pnpm build`.
- [ ] Run targeted Playwright E2E if Docker/Testcontainers is available.

### Migration Note

Do not run local `pnpm db:generate`, `pnpm db:migrate`, or `pnpm db:push` in the development database unless the user explicitly approves it. Playwright global setup may continue to run `pnpm db:push` against the isolated Testcontainers database.
