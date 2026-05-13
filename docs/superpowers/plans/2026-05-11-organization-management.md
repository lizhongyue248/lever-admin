# Organization Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the current organization governance pages and the platform organization entry page according to `prd/10-dashboard-orgs-slug-settings.md` and `prd/15-dashboard-admin-orgs.md`.

**Architecture:** Better Auth continues to own organization, member, invitation, session, and admin identity data. Product-level tRPC routers add hierarchy, aggregation, authorization, and page-specific view models. App Router pages stay thin; route-local client components own interaction state such as tab dropdowns, tree expansion, filters, dialogs, and mutations.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, tRPC 11, Drizzle ORM, PostgreSQL, Better Auth organization/admin plugins, Tailwind CSS 4, shadcn/ui, Zod, Biome.

---

## Scope Decisions

- Implement product UI without a `team` concept.
- Do not expose Better Auth teams in navigation, routes, routers, forms, or labels.
- Keep existing `system_team`, `system_team_member`, and `session.activeTeamId` schema fields unless a separate migration decision removes them.
- Remove `teams: { enabled: true }` from Better Auth organization plugin configuration so new product behavior does not depend on teams.
- Use shadcn primitives for tree UI: `Collapsible`, `ScrollArea`, `Button`, and `Badge`.
- Mobile organization section switching uses a dropdown menu, not horizontal tabs.
- `创建子组织` appears only inside the organization structure card title row.
- `邀请成员` appears only inside the invitation search/filter card.
- Settings uses an organization information form plus danger rows with explanation text and buttons.

## File Map

### Server and Data

- Modify `src/server/better-auth/config.ts`: remove team enablement from the organization plugin.
- Modify `src/server/db/schema.ts`: add `organizationHierarchy` product table and relations.
- Modify `src/server/api/trpc.ts`: add `adminProcedure` helper for platform admin routes.
- Create `src/server/api/routers/org.ts`: current organization route procedures.
- Create `src/server/api/routers/admin-org.ts`: platform organization route procedures.
- Modify `src/server/api/root.ts`: register `org` and `adminOrg`.

### Shared Dashboard

- Modify `src/server/api/routers/dashboard.ts`: update shell/home links away from removed org/member/team routes.
- Modify `src/app/dashboard/_components/dashboard-sidebar.tsx`: move current organization into account settings; remove standalone organization group.
- Modify `src/app/dashboard/_components/types.ts`: no structural change expected, but compile after router output changes.

### UI Primitives

- Create `src/components/ui/collapsible.tsx`: shadcn/Radix collapsible wrapper.
- Create `src/components/ui/scroll-area.tsx`: shadcn/Radix scroll-area wrapper.

### Current Organization Routes

- Create `src/app/dashboard/orgs/[slug]/layout.tsx`
- Create `src/app/dashboard/orgs/[slug]/page.tsx`
- Create `src/app/dashboard/orgs/[slug]/information/page.tsx`
- Create `src/app/dashboard/orgs/[slug]/invite/page.tsx`
- Create `src/app/dashboard/orgs/[slug]/auth/page.tsx`
- Create `src/app/dashboard/orgs/[slug]/setting/page.tsx`
- Create `src/app/dashboard/orgs/[slug]/members/page.tsx` redirecting to `information`.
- Create `src/app/dashboard/orgs/[slug]/loading.tsx`
- Create `src/app/dashboard/orgs/[slug]/error.tsx`

### Current Organization Components

- Create `src/app/dashboard/orgs/[slug]/_components/org-section-switcher.tsx`
- Create `src/app/dashboard/orgs/[slug]/_components/organization-tree.tsx`
- Create `src/app/dashboard/orgs/[slug]/_components/org-overview-content.tsx`
- Create `src/app/dashboard/orgs/[slug]/_components/org-information-content.tsx`
- Create `src/app/dashboard/orgs/[slug]/_components/org-invite-content.tsx`
- Create `src/app/dashboard/orgs/[slug]/_components/org-auth-content.tsx`
- Create `src/app/dashboard/orgs/[slug]/_components/org-setting-content.tsx`
- Create `src/app/dashboard/orgs/[slug]/_components/org-dialogs.tsx`
- Create `src/app/dashboard/orgs/[slug]/_components/org-empty-state.tsx`
- Create `src/app/dashboard/orgs/[slug]/_lib/org-routes.ts`
- Create `src/app/dashboard/orgs/[slug]/_lib/org-format.ts`

### Platform Organization Routes

- Create `src/app/dashboard/admin/orgs/page.tsx`
- Create `src/app/dashboard/admin/orgs/loading.tsx`
- Create `src/app/dashboard/admin/orgs/error.tsx`
- Create `src/app/dashboard/admin/orgs/_components/admin-orgs-content.tsx`
- Create `src/app/dashboard/admin/orgs/_components/create-organization-dialog.tsx`

---

## API Contract

### `org` Router

- `org.getBySlug({ slug })`
  - Returns organization summary and current viewer role.
  - Allows organization members and platform admins.
- `org.management.getOverview({ slug })`
  - Returns stats, member growth points, security coverage, invitation summary, login risk summary, and recent events.
- `org.tree.list({ slug })`
  - Returns compact tree nodes for current organization subtree.
- `org.tree.createChild({ slug, parentOrganizationId, name, slug: childSlug })`
  - Creates child organization and hierarchy row.
- `org.node.member.list({ slug, nodeId, search, role, securityStatus, page, pageSize })`
  - Returns selected organization node members.
- `org.invitation.list({ slug, search, status, nodeId, page, pageSize })`
  - Returns invitation table rows.
- `org.member.invite({ slug, nodeId, email, role })`
  - Creates an invitation for the target organization node.
- `org.member.updateRole({ slug, memberId, role })`
  - Updates member role; cannot remove the last owner.
- `org.member.remove({ slug, memberId })`
  - Removes member; cannot remove the last owner.
- `org.session.list({ slug, nodeId, search, deviceType, riskStatus, page, pageSize })`
  - Returns member login activity without session tokens.
- `org.session.revoke({ slug, sessionId })`
  - Revokes a member session after permission check.
- `org.update({ slug, name, targetSlug, logo, parentOrganizationId })`
  - Updates organization form values.
- `org.delete({ slug, confirmSlug })`
  - Deletes or soft-deletes organization after confirmation.

### `adminOrg` Router

- `adminOrg.getOverview()`
  - Returns platform org totals and risk summary.
- `adminOrg.list({ search, status, size, sort, page, pageSize })`
  - Returns platform organization cards.
- `adminOrg.create({ name, slug, logo })`
  - Creates a top-level organization.
- `adminOrg.updateStatus({ organizationId, status })`
  - Platform status update.
- `adminOrg.delete({ organizationId, confirmSlug })`
  - Super admin destructive action.

---

## Task 1: Better Auth and Procedure Boundaries

**Files:**
- Modify: `src/server/better-auth/config.ts`
- Modify: `src/server/api/trpc.ts`

- [ ] **Step 1: Remove product dependency on Better Auth teams**

In `src/server/better-auth/config.ts`, change:

```ts
organization({
  requireEmailVerificationOnInvitation: true,
  teams: {
    enabled: true
  },
  sendInvitationEmail: async ({ email, invitation, organization }) => {
    console.info("[auth:organization-invitation]", {
      invitationId: invitation.id,
      organization: organization.name,
      to: email
    })
  }
})
```

to:

```ts
organization({
  requireEmailVerificationOnInvitation: true,
  sendInvitationEmail: async ({ email, invitation, organization }) => {
    console.info("[auth:organization-invitation]", {
      invitationId: invitation.id,
      organization: organization.name,
      to: email
    })
  }
})
```

- [ ] **Step 2: Add platform admin procedure**

In `src/server/api/trpc.ts`, add this after `protectedProcedure`:

```ts
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.session.user.role

  if (role !== "admin" && role !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要平台管理员权限。" })
  }

  return next({
    ctx: {
      ...ctx,
      session: {
        ...ctx.session,
        user: {
          ...ctx.session.user,
          role
        }
      }
    }
  })
})
```

- [ ] **Step 3: Verify**

Run:

```bash
pnpm typecheck
```

Expected: no type errors from `config.ts` or `trpc.ts`.

---

## Task 2: Organization Hierarchy Schema

**Files:**
- Modify: `src/server/db/schema.ts`

- [ ] **Step 1: Add hierarchy table after `organization`**

```ts
export const organizationHierarchy = createSystemTable(
  "organization_hierarchy",
  {
    organizationId: text("organization_id")
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    parentOrganizationId: text("parent_organization_id").references(() => organization.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    depth: integer("depth").default(0).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    status: text("status").default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [
    index("system_organization_hierarchy_parent_idx").on(table.parentOrganizationId),
    index("system_organization_hierarchy_path_idx").on(table.path),
    index("system_organization_hierarchy_status_idx").on(table.status)
  ]
)
```

- [ ] **Step 2: Update organization relations**

Change `organizationRelations` to include hierarchy:

```ts
export const organizationRelations = relations(organization, ({ many, one }) => ({
  hierarchy: one(organizationHierarchy, {
    fields: [organization.id],
    references: [organizationHierarchy.organizationId],
    relationName: "organizationHierarchyOrganization"
  }),
  invitations: many(invitation),
  members: many(member),
  teams: many(team)
}))
```

- [ ] **Step 3: Add hierarchy relations**

```ts
export const organizationHierarchyRelations = relations(organizationHierarchy, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationHierarchy.organizationId],
    references: [organization.id],
    relationName: "organizationHierarchyOrganization"
  }),
  parentOrganization: one(organization, {
    fields: [organizationHierarchy.parentOrganizationId],
    references: [organization.id],
    relationName: "organizationHierarchyParent"
  })
}))
```

- [ ] **Step 4: Migration checkpoint**

Do not run `pnpm db:generate`, `pnpm db:migrate`, or `pnpm db:push` until the user explicitly approves schema migration work. The code implementation can be planned first, but runtime database verification requires the hierarchy table.

---

## Task 3: Router Helpers and Current Organization Router

**Files:**
- Create: `src/server/api/routers/org.ts`
- Modify: `src/server/api/root.ts`

- [ ] **Step 1: Create router skeleton with authorization helpers**

Create `src/server/api/routers/org.ts`:

```ts
import { TRPCError } from "@trpc/server"
import { and, asc, desc, eq, gt, ilike, inArray, ne, or, sql } from "drizzle-orm"
import { z } from "zod"

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { invitation, member, organization, organizationHierarchy, session, user } from "@/server/db/schema"

const orgAdminRoles = ["owner", "admin"] as const
const platformAdminRoles = ["admin", "super_admin"] as const
const pageInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10)
})
const slugInput = z.object({ slug: z.string().min(1) })
const roleInput = z.enum(["owner", "admin", "member"])

const isOrgAdminRole = (role: string | null | undefined) => orgAdminRoles.some((item) => item === role)
const isPlatformAdminRole = (role: string | null | undefined) => platformAdminRoles.some((item) => item === role)

const requireOrgAccess = async (ctx: { db: typeof import("@/server/db").db; session: { user: { id: string; role?: string | null } } }, slug: string) => {
  const [org] = await ctx.db.select().from(organization).where(eq(organization.slug, slug)).limit(1)

  if (!org) {
    throw new TRPCError({ code: "NOT_FOUND", message: "组织不存在。" })
  }

  if (isPlatformAdminRole(ctx.session.user.role)) {
    return { canManage: true, isPlatformAdmin: true, org, role: "platform_admin" as const }
  }

  const [membership] = await ctx.db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, org.id), eq(member.userId, ctx.session.user.id)))
    .limit(1)

  if (!membership) {
    throw new TRPCError({ code: "FORBIDDEN", message: "无权访问该组织。" })
  }

  return { canManage: isOrgAdminRole(membership.role), isPlatformAdmin: false, org, role: membership.role }
}

const requireOrgAdmin = async (ctx: Parameters<typeof requireOrgAccess>[0], slug: string) => {
  const access = await requireOrgAccess(ctx, slug)

  if (!access.canManage) {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要组织管理员权限。" })
  }

  return access
}
```

- [ ] **Step 2: Add read procedures**

In the same router file:

```ts
export const orgRouter = createTRPCRouter({
  getBySlug: protectedProcedure.input(slugInput).query(async ({ ctx, input }) => {
    const access = await requireOrgAccess(ctx, input.slug)

    return {
      canManage: access.canManage,
      isPlatformAdmin: access.isPlatformAdmin,
      organization: access.org,
      role: access.role
    }
  }),

  management: createTRPCRouter({
    getOverview: protectedProcedure.input(slugInput).query(async ({ ctx, input }) => {
      const { org } = await requireOrgAccess(ctx, input.slug)
      const memberRows = await ctx.db.select({ userId: member.userId }).from(member).where(eq(member.organizationId, org.id))
      const memberUserIds = memberRows.map((item) => item.userId)
      const pendingInvitations = await ctx.db.select({ id: invitation.id }).from(invitation).where(and(eq(invitation.organizationId, org.id), eq(invitation.status, "pending")))
      const activeSessions = memberUserIds.length > 0 ? await ctx.db.select({ id: session.id }).from(session).where(and(inArray(session.userId, memberUserIds), gt(session.expiresAt, new Date()))) : []

      return {
        events: [],
        growth: [
          { label: "1月", value: Math.max(1, memberRows.length - 8) },
          { label: "2月", value: Math.max(1, memberRows.length - 5) },
          { label: "3月", value: Math.max(1, memberRows.length - 3) },
          { label: "4月", value: memberRows.length }
        ],
        organization: org,
        stats: {
          activeSessionCount: activeSessions.length,
          childOrganizationCount: 0,
          memberCount: memberRows.length,
          pendingInvitationCount: pendingInvitations.length,
          riskySessionCount: 0
        }
      }
    })
  }),

  tree: createTRPCRouter({
    list: protectedProcedure.input(slugInput).query(async ({ ctx, input }) => {
      const { org } = await requireOrgAccess(ctx, input.slug)

      return {
        selectedNodeId: org.id,
        nodes: [
          {
            depth: 0,
            id: org.id,
            invitationCount: 0,
            memberCount: 0,
            name: org.name,
            parentId: null,
            riskCount: 0,
            slug: org.slug,
            status: "active"
          }
        ]
      }
    })
  })
})
```

- [ ] **Step 3: Register router**

In `src/server/api/root.ts`:

```ts
import { orgRouter } from "@/server/api/routers/org"

export const appRouter = createTRPCRouter({
  dashboard: dashboardRouter,
  org: orgRouter,
  profile: profileRouter,
  security: securityRouter,
  session: sessionRouter
})
```

- [ ] **Step 4: Verify**

Run:

```bash
pnpm typecheck
```

Expected: `RouterOutputs["org"]` is available.

---

## Task 4: Router Mutations and Tables

**Files:**
- Modify: `src/server/api/routers/org.ts`

- [ ] **Step 1: Add member list**

Add inside `orgRouter`:

```ts
node: createTRPCRouter({
  member: createTRPCRouter({
    list: protectedProcedure
      .input(
        slugInput.extend({
          nodeId: z.string().min(1).optional(),
          role: roleInput.optional(),
          search: z.string().default(""),
          securityStatus: z.enum(["all", "normal", "risk"]).default("all")
        }).merge(pageInput)
      )
      .query(async ({ ctx, input }) => {
        const { org } = await requireOrgAccess(ctx, input.slug)
        const organizationId = input.nodeId ?? org.id
        const offset = (input.page - 1) * input.pageSize
        const search = `%${input.search.trim()}%`
        const where = and(
          eq(member.organizationId, organizationId),
          input.role ? eq(member.role, input.role) : undefined,
          input.search.trim() ? or(ilike(user.name, search), ilike(user.email, search)) : undefined
        )

        const rows = await ctx.db
          .select({
            email: user.email,
            joinedAt: member.createdAt,
            lastLoginAt: sql<Date | null>`max(${session.updatedAt})`,
            memberId: member.id,
            name: user.name,
            role: member.role,
            userId: user.id
          })
          .from(member)
          .innerJoin(user, eq(member.userId, user.id))
          .leftJoin(session, eq(session.userId, user.id))
          .where(where)
          .groupBy(member.id, user.id)
          .orderBy(desc(member.createdAt))
          .limit(input.pageSize)
          .offset(offset)

        return {
          items: rows.map((row) => ({ ...row, securityStatus: "normal" as const })),
          page: input.page,
          pageCount: 1
        }
      })
  })
})
```

- [ ] **Step 2: Add invitation list and invite mutation**

Add inside `orgRouter`:

```ts
invitation: createTRPCRouter({
  list: protectedProcedure
    .input(
      slugInput.extend({
        nodeId: z.string().min(1).optional(),
        search: z.string().default(""),
        status: z.enum(["all", "pending", "accepted", "rejected", "canceled", "expired"]).default("all")
      }).merge(pageInput)
    )
    .query(async ({ ctx, input }) => {
      const { org } = await requireOrgAccess(ctx, input.slug)
      const organizationId = input.nodeId ?? org.id
      const search = `%${input.search.trim()}%`

      const rows = await ctx.db
        .select({
          createdAt: invitation.createdAt,
          email: invitation.email,
          expiresAt: invitation.expiresAt,
          id: invitation.id,
          inviterEmail: user.email,
          inviterName: user.name,
          role: invitation.role,
          status: invitation.status
        })
        .from(invitation)
        .innerJoin(user, eq(invitation.inviterId, user.id))
        .where(
          and(
            eq(invitation.organizationId, organizationId),
            input.status === "all" ? undefined : eq(invitation.status, input.status),
            input.search.trim() ? or(ilike(invitation.email, search), ilike(user.name, search), ilike(user.email, search)) : undefined
          )
        )
        .orderBy(desc(invitation.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize)

      return { items: rows, page: input.page, pageCount: 1 }
    }),

  invite: protectedProcedure
    .input(slugInput.extend({ email: z.string().email(), nodeId: z.string().min(1).optional(), role: roleInput }))
    .mutation(async ({ ctx, input }) => {
      const { org } = await requireOrgAdmin(ctx, input.slug)
      const organizationId = input.nodeId ?? org.id

      await ctx.db.insert(invitation).values({
        email: input.email.toLowerCase(),
        id: crypto.randomUUID(),
        inviterId: ctx.session.user.id,
        organizationId,
        role: input.role,
        status: "pending"
      })

      return { invited: true }
    })
})
```

- [ ] **Step 3: Add settings procedures**

Add inside `orgRouter`:

```ts
update: protectedProcedure
  .input(
    slugInput.extend({
      logo: z.string().url().optional().or(z.literal("")),
      name: z.string().min(1),
      parentOrganizationId: z.string().min(1).optional(),
      targetSlug: z.string().min(1).regex(/^[a-z0-9-]+$/)
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { org } = await requireOrgAdmin(ctx, input.slug)

    const [existingSlugOwner] = await ctx.db.select({ id: organization.id }).from(organization).where(and(eq(organization.slug, input.targetSlug), ne(organization.id, org.id))).limit(1)

    if (existingSlugOwner) {
      throw new TRPCError({ code: "CONFLICT", message: "组织 slug 已存在。" })
    }

    const [updated] = await ctx.db
      .update(organization)
      .set({
        logo: input.logo || null,
        name: input.name,
        slug: input.targetSlug
      })
      .where(eq(organization.id, org.id))
      .returning()

    return { organization: updated }
  }),

delete: protectedProcedure.input(slugInput.extend({ confirmSlug: z.string().min(1) })).mutation(async ({ ctx, input }) => {
  const { org } = await requireOrgAdmin(ctx, input.slug)

  if (input.confirmSlug !== org.slug) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "请输入正确的组织 slug。" })
  }

  await ctx.db.delete(organization).where(eq(organization.id, org.id))

  return { deleted: true }
})
```

- [ ] **Step 4: Add organization session procedures**

Add inside `orgRouter`:

```ts
session: createTRPCRouter({
  list: protectedProcedure
    .input(
      slugInput.extend({
        deviceType: z.enum(["all", "desktop", "mobile", "unknown"]).default("all"),
        nodeId: z.string().min(1).optional(),
        riskStatus: z.enum(["all", "normal", "risk"]).default("all"),
        search: z.string().default("")
      }).merge(pageInput)
    )
    .query(async ({ ctx, input }) => {
      const { org } = await requireOrgAccess(ctx, input.slug)
      const organizationId = input.nodeId ?? org.id
      const memberRows = await ctx.db.select({ userId: member.userId }).from(member).where(eq(member.organizationId, organizationId))
      const memberUserIds = memberRows.map((item) => item.userId)

      if (memberUserIds.length === 0) {
        return { items: [], page: input.page, pageCount: 1 }
      }

      const search = `%${input.search.trim()}%`
      const rows = await ctx.db
        .select({
          email: user.email,
          id: session.id,
          ipAddress: session.ipAddress,
          lastActiveAt: session.updatedAt,
          name: user.name,
          userAgent: session.userAgent,
          userId: user.id
        })
        .from(session)
        .innerJoin(user, eq(session.userId, user.id))
        .where(and(inArray(session.userId, memberUserIds), gt(session.expiresAt, new Date()), input.search.trim() ? or(ilike(user.name, search), ilike(user.email, search)) : undefined))
        .orderBy(desc(session.updatedAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize)

      return {
        items: rows.map((row) => ({
          ...row,
          browserLabel: row.userAgent?.includes("Chrome") ? "Chrome" : "浏览器",
          deviceLabel: row.userAgent?.includes("Mac") ? "macOS" : row.userAgent?.includes("Windows") ? "Windows" : "未知设备",
          riskStatus: "normal" as const
        })),
        page: input.page,
        pageCount: 1
      }
    }),

  revoke: protectedProcedure.input(slugInput.extend({ sessionId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    await requireOrgAdmin(ctx, input.slug)
    const deleted = await ctx.db.delete(session).where(eq(session.id, input.sessionId)).returning({ id: session.id })

    if (deleted.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "会话不存在或已失效。" })
    }

    return { revoked: true }
  })
})
```

The `session.list` query intentionally does not select or return `session.token`.

- [ ] **Step 5: Verify**

Run:

```bash
pnpm typecheck
```

Expected: nested router names match the PRD names and compile.

---

## Task 5: Platform Organization Router

**Files:**
- Create: `src/server/api/routers/admin-org.ts`
- Modify: `src/server/api/root.ts`

- [ ] **Step 1: Create admin router**

Create `src/server/api/routers/admin-org.ts`:

```ts
import { TRPCError } from "@trpc/server"
import { desc, eq, ilike, or, sql } from "drizzle-orm"
import { z } from "zod"

import { adminProcedure, createTRPCRouter } from "@/server/api/trpc"
import { member, organization, organizationHierarchy } from "@/server/db/schema"

export const adminOrgRouter = createTRPCRouter({
  getOverview: adminProcedure.query(async ({ ctx }) => {
    const [orgCount] = await ctx.db.select({ value: sql<number>`count(*)::int` }).from(organization)
    const [memberCount] = await ctx.db.select({ value: sql<number>`count(*)::int` }).from(member)

    return {
      memberCount: memberCount?.value ?? 0,
      organizationCount: orgCount?.value ?? 0,
      riskySessionCount: 0,
      topLevelOrganizationCount: orgCount?.value ?? 0
    }
  }),

  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(12),
        search: z.string().default(""),
        status: z.enum(["all", "active", "disabled"]).default("all")
      })
    )
    .query(async ({ ctx, input }) => {
      const search = `%${input.search.trim()}%`
      const rows = await ctx.db
        .select({
          createdAt: organization.createdAt,
          id: organization.id,
          logo: organization.logo,
          memberCount: sql<number>`count(${member.id})::int`,
          name: organization.name,
          slug: organization.slug
        })
        .from(organization)
        .leftJoin(member, eq(member.organizationId, organization.id))
        .where(input.search.trim() ? or(ilike(organization.name, search), ilike(organization.slug, search)) : undefined)
        .groupBy(organization.id)
        .orderBy(desc(organization.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize)

      return {
        items: rows.map((row) => ({ ...row, childOrganizationCount: 0, riskCount: 0, status: "active" as const })),
        page: input.page,
        pageCount: 1
      }
    }),

  create: adminProcedure.input(z.object({ logo: z.string().url().optional().or(z.literal("")), name: z.string().min(1), slug: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.select({ id: organization.id }).from(organization).where(eq(organization.slug, input.slug)).limit(1)

    if (existing.length > 0) {
      throw new TRPCError({ code: "CONFLICT", message: "组织 slug 已存在。" })
    }

    const id = crypto.randomUUID()
    await ctx.db.insert(organization).values({ id, logo: input.logo || null, name: input.name, slug: input.slug })
    await ctx.db.insert(organizationHierarchy).values({ depth: 0, organizationId: id, parentOrganizationId: null, path: id, sortOrder: 0, status: "active" })

    return { id, slug: input.slug }
  })
})
```

- [ ] **Step 2: Register router**

In `src/server/api/root.ts`:

```ts
import { adminOrgRouter } from "@/server/api/routers/admin-org"

export const appRouter = createTRPCRouter({
  adminOrg: adminOrgRouter,
  dashboard: dashboardRouter,
  org: orgRouter,
  profile: profileRouter,
  security: securityRouter,
  session: sessionRouter
})
```

---

## Task 6: Sidebar and Dashboard Links

**Files:**
- Modify: `src/app/dashboard/_components/dashboard-sidebar.tsx`
- Modify: `src/server/api/routers/dashboard.ts`

- [ ] **Step 1: Move current organization into account settings**

In `DashboardSidebar`, replace static `navGroups` with a function that receives `data`.

```tsx
const getNavGroups = (data: DashboardShellData) => {
  const activeOrganization = data.organizations.find((item) => item.organizationId === data.activeOrganizationId) ?? data.organizations[0] ?? null

  return [
    {
      items: [{ href: "/dashboard", icon: LayoutDashboard, label: "工作台" }],
      label: "概览"
    },
    {
      items: [
        { href: "/dashboard/settings/profile", icon: Settings, label: "个人资料" },
        { href: "/dashboard/settings/security", icon: ShieldCheck, label: "安全设置" },
        { href: "/dashboard/settings/sessions", icon: UsersRound, label: "我的会话" },
        activeOrganization ? { href: `/dashboard/orgs/${activeOrganization.organizationSlug}`, icon: Building2, label: "当前组织" } : null
      ].filter((item): item is { badge?: string; href: string; icon: typeof LayoutDashboard; label: string } => item !== null),
      label: "账号设置"
    },
    {
      items: [
        { href: "/dashboard/admin", icon: LayoutDashboard, label: "管理概览" },
        { badge: "5", href: "/dashboard/admin/users", icon: UsersRound, label: "用户管理" },
        { href: "/dashboard/admin/orgs", icon: Building2, label: "平台组织" },
        { href: "/dashboard/admin/api-keys", icon: KeyRound, label: "API 密钥" }
      ],
      label: "管理"
    }
  ]
}
```

Then use:

```tsx
const navGroups = getNavGroups(data)
```

- [ ] **Step 2: Fix dashboard action links**

In `src/server/api/routers/dashboard.ts`, update stale links:

```ts
{ description: `${memberCount - twoFactorEnabledMembers} 位成员尚未开启 2FA`, href: `/dashboard/orgs/${activeMembership.organizationSlug}/information`, title: "未开启 2FA 成员" }
{ description: `${pendingInvitationCount} 个组织邀请等待处理`, href: `/dashboard/orgs/${activeMembership.organizationSlug}/invite`, title: "过期或撤销邀请" }
{ description: `${activeSessionCount} 个成员会话可供检查`, href: `/dashboard/orgs/${activeMembership.organizationSlug}/auth`, title: "异常会话待检查" }
```

- [ ] **Step 3: Verify**

Run:

```bash
pnpm typecheck
```

Expected: sidebar active state works for `/dashboard/orgs/[slug]` and `/dashboard/admin/orgs`.

---

## Task 7: shadcn Primitive Wrappers

**Files:**
- Create: `src/components/ui/collapsible.tsx`
- Create: `src/components/ui/scroll-area.tsx`

- [ ] **Step 1: Create collapsible wrapper**

```tsx
"use client"

import { Collapsible as CollapsiblePrimitive } from "radix-ui"

const Collapsible = CollapsiblePrimitive.Root
const CollapsibleTrigger = CollapsiblePrimitive.Trigger
const CollapsibleContent = CollapsiblePrimitive.Content

export { Collapsible, CollapsibleContent, CollapsibleTrigger }
```

- [ ] **Step 2: Create scroll area wrapper**

```tsx
"use client"

import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

const ScrollArea = ({ className, children, ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) => (
  <ScrollAreaPrimitive.Root className={cn("relative overflow-hidden", className)} data-slot="scroll-area" {...props}>
    <ScrollAreaPrimitive.Viewport className="size-full rounded-[inherit]" data-slot="scroll-area-viewport">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
)

const ScrollBar = ({ className, orientation = "vertical", ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.Scrollbar>) => (
  <ScrollAreaPrimitive.Scrollbar
    className={cn("flex touch-none select-none transition-colors", orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-px", orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-px", className)}
    orientation={orientation}
    {...props}
  >
    <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.Scrollbar>
)

export { ScrollArea, ScrollBar }
```

- [ ] **Step 3: Verify imports**

Run:

```bash
pnpm typecheck
```

If `radix-ui` aggregate import does not expose these primitives, install official packages and switch imports to `@radix-ui/react-collapsible` and `@radix-ui/react-scroll-area`.

---

## Task 8: Shared Organization Route Layout

**Files:**
- Create: `src/app/dashboard/orgs/[slug]/_lib/org-routes.ts`
- Create: `src/app/dashboard/orgs/[slug]/_components/org-section-switcher.tsx`
- Create: `src/app/dashboard/orgs/[slug]/layout.tsx`

- [ ] **Step 1: Define route tabs**

```ts
export const orgSections = [
  { key: "overview", href: (slug: string) => `/dashboard/orgs/${slug}`, label: "概览", segment: "" },
  { key: "information", href: (slug: string) => `/dashboard/orgs/${slug}/information`, label: "组织架构", segment: "information" },
  { key: "invite", href: (slug: string) => `/dashboard/orgs/${slug}/invite`, label: "邀请", segment: "invite" },
  { key: "auth", href: (slug: string) => `/dashboard/orgs/${slug}/auth`, label: "登录情况", segment: "auth" },
  { key: "setting", href: (slug: string) => `/dashboard/orgs/${slug}/setting`, label: "设置", segment: "setting" }
] as const

export type OrgSectionKey = (typeof orgSections)[number]["key"]
```

- [ ] **Step 2: Build desktop tabs plus mobile dropdown**

`org-section-switcher.tsx`:

```tsx
"use client"

import { Check, ChevronDown } from "lucide-react"
import Link from "next/link"
import { useSelectedLayoutSegment } from "next/navigation"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { orgSections } from "../_lib/org-routes"

const getActiveKey = (segment: string | null) => orgSections.find((section) => section.segment === (segment ?? ""))?.key ?? "overview"

export const OrgSectionSwitcher = ({ slug }: { slug: string }) => {
  const segment = useSelectedLayoutSegment()
  const active = getActiveKey(segment)
  const activeSection = orgSections.find((section) => section.key === active) ?? orgSections[0]

  return (
    <>
      <nav aria-label="组织管理分区" className="hidden rounded-lg border bg-card p-1 shadow-sm md:grid md:grid-cols-5">
        {orgSections.map((section) => (
          <Link
            aria-current={section.key === active ? "page" : undefined}
            className={cn("rounded-md px-4 py-2 text-center font-medium text-muted-foreground text-sm hover:bg-muted hover:text-foreground", section.key === active && "bg-primary/10 text-primary")}
            href={section.href(slug)}
            key={section.key}
          >
            {section.label}
          </Link>
        ))}
      </nav>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="flex w-full justify-between md:hidden" type="button" variant="outline">
            {activeSection.label}
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
          {orgSections.map((section) => (
            <DropdownMenuItem asChild key={section.key}>
              <Link className="flex items-center justify-between" href={section.href(slug)}>
                {section.label}
                {section.key === active ? <Check className="size-4" /> : null}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
```

- [ ] **Step 3: Build `[slug]` layout as the shared switcher owner**

`layout.tsx`:

```tsx
import type { ReactNode } from "react"

import { OrgSectionSwitcher } from "./_components/org-section-switcher"

const OrgSlugLayout = async ({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) => {
  const { slug } = await params

  return (
    <div className="space-y-5 text-[13px]">
      <OrgSectionSwitcher slug={slug} />
      {children}
    </div>
  )
}

export default OrgSlugLayout
```

This layout owns the shared route-backed section switcher for `/dashboard/orgs/[slug]`, `/information`, `/invite`, `/auth`, and `/setting`. Individual page files render only their tab content and do not wrap themselves in a duplicated shell.

- [ ] **Step 4: Verify layout**

Run:

```bash
pnpm typecheck
```

Expected: the shared layout compiles, and `useSelectedLayoutSegment()` drives the active desktop tab and mobile dropdown state.

```
Do not create an `OrgContentShell` component. The shared switcher belongs in `src/app/dashboard/orgs/[slug]/layout.tsx`.
```

---

## Task 9: Organization Tree and Information Page

**Files:**
- Create: `src/app/dashboard/orgs/[slug]/_components/organization-tree.tsx`
- Create: `src/app/dashboard/orgs/[slug]/_components/org-information-content.tsx`
- Create: `src/app/dashboard/orgs/[slug]/information/page.tsx`
- Create: `src/app/dashboard/orgs/[slug]/members/page.tsx`

- [ ] **Step 1: Build compact tree**

Use `Collapsible`, `ScrollArea`, `Button`, `Badge`, `ChevronRight`, `ChevronDown`, `FolderPlus`, and `TriangleAlert`. Row height must be `h-8`; depth indentation uses `style={{ paddingLeft: 8 + node.depth * 18 }}`.

The card title row must contain the icon button:

```tsx
<div className="mb-3 flex items-start justify-between gap-3">
  <div>
    <h2 className="font-semibold text-base">组织结构</h2>
    <p className="text-muted-foreground text-xs">展开、折叠并选择组织节点。</p>
  </div>
  <Button aria-label="创建子组织" onClick={onCreateChild} size="icon" title="创建子组织" type="button">
    <FolderPlus className="size-4" />
  </Button>
</div>
```

- [ ] **Step 2: Build information content**

`OrgInformationContent` should:

- render only the organization architecture tab content; the shared section switcher is already rendered by `src/app/dashboard/orgs/[slug]/layout.tsx`
- hold `selectedNodeId` in state
- query `api.org.node.member.list.useQuery`
- render desktop grid `lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]`
- render mobile stack with tree above member cards
- show image-style empty state when no node is selected
- keep disabled pagination visible when `pageCount === 1`

- [ ] **Step 3: Build route**

`information/page.tsx`:

```tsx
import { redirect } from "next/navigation"

import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"
import { OrgInformationContent } from "../_components/org-information-content"

const OrgInformationPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  const session = await getSession()

  if (!session?.user) {
    redirect(`/sign-in?redirectTo=${encodeURIComponent(`/dashboard/orgs/${slug}/information`)}`)
  }

  const tree = await api.org.tree.list({ slug })
  const selectedNodeId = tree.selectedNodeId ?? tree.nodes[0]?.id ?? null
  const members = selectedNodeId ? await api.org.node.member.list({ nodeId: selectedNodeId, page: 1, pageSize: 10, role: undefined, search: "", securityStatus: "all", slug }) : { items: [], page: 1, pageCount: 1 }

  return <OrgInformationContent initialMembers={members} slug={slug} tree={tree} />
}

export default OrgInformationPage
```

- [ ] **Step 4: Redirect old members route**

`members/page.tsx`:

```tsx
import { redirect } from "next/navigation"

const OrgMembersRedirectPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  redirect(`/dashboard/orgs/${slug}/information`)
}

export default OrgMembersRedirectPage
```

---

## Task 10: Overview, Invite, Auth, and Settings Pages

**Files:**
- Create: `src/app/dashboard/orgs/[slug]/page.tsx`
- Create: `src/app/dashboard/orgs/[slug]/invite/page.tsx`
- Create: `src/app/dashboard/orgs/[slug]/auth/page.tsx`
- Create: `src/app/dashboard/orgs/[slug]/setting/page.tsx`
- Create: `src/app/dashboard/orgs/[slug]/_components/org-overview-content.tsx`
- Create: `src/app/dashboard/orgs/[slug]/_components/org-invite-content.tsx`
- Create: `src/app/dashboard/orgs/[slug]/_components/org-auth-content.tsx`
- Create: `src/app/dashboard/orgs/[slug]/_components/org-setting-content.tsx`

- [ ] **Step 1: Overview**

Use `api.org.management.getOverview({ slug })`. The page file should only fetch data and render the overview content because `src/app/dashboard/orgs/[slug]/layout.tsx` already renders the shared section switcher.

```tsx
const OrgOverviewPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  const data = await api.org.management.getOverview({ slug })

  return <OrgOverviewContent data={data} slug={slug} />
}

export default OrgOverviewPage
```

- [ ] **Step 2: Invite**

`OrgInviteContent` must put the invite icon button inside the search card:

```tsx
<Card className="rounded-lg shadow-sm">
  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
    <Input aria-label="搜索邮箱或邀请人" className="min-w-0 flex-1" placeholder="搜索邮箱或邀请人" />
    <Select defaultValue="all">
      <SelectTrigger aria-label="邀请状态" className="w-full sm:w-36">
        <SelectValue placeholder="全部状态" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">全部状态</SelectItem>
        <SelectItem value="pending">待接受</SelectItem>
        <SelectItem value="expired">已过期</SelectItem>
      </SelectContent>
    </Select>
    <Select defaultValue="all">
      <SelectTrigger aria-label="目标组织" className="w-full sm:w-40">
        <SelectValue placeholder="全部组织" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">全部组织</SelectItem>
        <SelectItem value="current">当前组织</SelectItem>
      </SelectContent>
    </Select>
    <Button aria-label="邀请成员" onClick={() => setInviteOpen(true)} size="icon" title="邀请成员" type="button">
      <UserPlus className="size-4" />
    </Button>
  </CardContent>
</Card>
```

- [ ] **Step 3: Auth**

Use `api.org.session.list`. Render member, device system/browser, IP/location, last activity, and risk. Use `SessionDeviceIcon` style from `src/app/dashboard/settings/sessions/_components/session-device-icon.tsx` where useful. Do not expose `session.token`.

- [ ] **Step 4: Settings**

`OrgSettingContent` must render:

- form card with editable `name`, `slug`, `logo`, `parentOrganizationId`
- read-only fields for `organizationId`, `createdAt`, `path`
- footer buttons `重置` and `保存`
- danger card with rows `停用组织`, `转移父级组织`, `删除组织`
- each danger row includes title, explanation, and a button
- destructive actions open confirmation dialogs

Use Zod schema:

```ts
const orgSettingsSchema = z.object({
  logo: z.string().url().optional().or(z.literal("")),
  name: z.string().min(1, "请输入组织名称。"),
  parentOrganizationId: z.string().optional(),
  slug: z.string().min(1, "请输入 slug。").regex(/^[a-z0-9-]+$/, "slug 只能包含小写字母、数字和连字符。")
})
```

---

## Task 11: Platform Organization Page

**Files:**
- Create: `src/app/dashboard/admin/orgs/page.tsx`
- Create: `src/app/dashboard/admin/orgs/_components/admin-orgs-content.tsx`
- Create: `src/app/dashboard/admin/orgs/_components/create-organization-dialog.tsx`

- [ ] **Step 1: Server page**

```tsx
import { api } from "@/trpc/server"
import { AdminOrgsContent } from "./_components/admin-orgs-content"

const AdminOrgsPage = async () => {
  const [overview, organizations] = await Promise.all([api.adminOrg.getOverview(), api.adminOrg.list({ page: 1, pageSize: 12, search: "", status: "all" })])

  return <AdminOrgsContent initialOrganizations={organizations} overview={overview} />
}

export default AdminOrgsPage
```

- [ ] **Step 2: Client content**

Render search/filter toolbar, create organization dialog button, summary cards, and organization card grid. Clicking a card goes to `/dashboard/orgs/${organization.slug}`.

- [ ] **Step 3: Create organization dialog**

Use fields `name`, `slug`, and optional `logo`. On success, toast `组织已创建。`, close dialog, and route to `/dashboard/orgs/${slug}` or refresh the list.

---

## Task 12: Loading, Error, Empty, and Forbidden States

**Files:**
- Create: route-local `loading.tsx` and `error.tsx` files listed in File Map.
- Update all content components.

- [ ] **Step 1: Loading**

Each loading file renders card skeletons matching its page layout. Use `animate-pulse` blocks inside `Card`.

- [ ] **Step 2: Error**

Each error file is a client component with `reset()` and a retry button:

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const OrgError = ({ reset }: { error: Error; reset: () => void }) => (
  <Card className="rounded-lg">
    <CardContent className="space-y-3 p-6">
      <h2 className="font-semibold text-base">页面加载失败</h2>
      <p className="text-muted-foreground text-sm">请稍后重试，或返回工作台。</p>
      <Button onClick={reset} type="button">重试</Button>
    </CardContent>
  </Card>
)

export default OrgError
```

- [ ] **Step 3: Empty**

Tables show empty text and disabled pagination. Tree selected-member panel shows the image-style empty state when no node is selected.

---

## Task 13: Verification

**Files:**
- All touched files.

- [ ] **Step 1: Typecheck**

Run:

```bash
pnpm typecheck
```

Expected: exit code 0.

- [ ] **Step 2: Biome**

Run:

```bash
pnpm check
```

Expected: exit code 0.

- [ ] **Step 3: Build**

Run:

```bash
pnpm build
```

Expected: exit code 0.

- [ ] **Step 4: Manual routes**

Start:

```bash
pnpm dev
```

Check:

- `/dashboard/orgs/acme-identity`
- `/dashboard/orgs/acme-identity/information`
- `/dashboard/orgs/acme-identity/invite`
- `/dashboard/orgs/acme-identity/auth`
- `/dashboard/orgs/acme-identity/setting`
- `/dashboard/admin/orgs`

Expected:

- current organization appears under account settings in sidebar
- no standalone organization group appears
- desktop uses tab links
- mobile uses dropdown section switcher
- create child button is in organization structure card title row
- invite button is in invitation search card
- organization tree rows are compact and collapsible
- settings page uses a form and danger rows with explanations
- pagination controls remain visible even when disabled

---

## Migration Follow-Up

When the user approves database migration work, run:

```bash
pnpm db:generate
```

Review the generated migration before applying it. Then run the approved migration command for the target environment. Do not point E2E tests at a local development `DATABASE_URL`; E2E must use the Testcontainers database.
