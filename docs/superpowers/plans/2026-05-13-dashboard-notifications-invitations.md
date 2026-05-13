# Dashboard Notification Center And Invitation Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global dashboard notification center, with organization invitations implemented as the first actionable notification type.

**Architecture:** Treat notifications as a unified aggregation layer, not an invitation-specific feature and not a new persisted message table in the first version. `notification.list` returns one common notification envelope with `type`, `status`, `source`, and `actions`; pending organization invitations are only one `type: "invitation"` source backed by `system_invitation`, while later security or system messages can use the same envelope without changing the Topbar UI contract.

**Tech Stack:** Next.js 16 App Router, React 19, tRPC 11, TanStack Query, Drizzle ORM, Better Auth-backed tables, shadcn-style local UI components, Playwright E2E.

---

## File Structure

- Create `src/server/api/lib/invitations.ts`: shared invitation lookup, authorization, accept, reject, and department assignment logic.
- Create `src/server/api/routers/notification.ts`: current-user notification aggregation, common notification envelope, and type-specific action namespaces.
- Modify `src/server/api/root.ts`: register `notification`.
- Modify `src/server/api/routers/dashboard.ts`: include notification counts in `dashboard.getShell`.
- Create `src/app/dashboard/_components/dashboard-notification-menu.tsx`: Topbar Bell button, desktop dropdown, mobile Sheet, type filters, generic notification list rendering, and invitation-specific actions only when the source supports them.
- Modify `src/app/dashboard/_components/dashboard-topbar.tsx`: render notification menu left of theme toggle.
- Create `src/app/invite/[id]/page.tsx`: invitation detail route with login redirect and state handling.
- Create `src/app/invite/[id]/_components/invitation-confirmation-card.tsx`: client actions for accepting/rejecting from detail page.
- Modify `src/app/dashboard/orgs/[slug]/_components/org-invite-content.tsx`: invalidate notification/shell queries after invite mutation and keep status badges.
- Modify `e2e/helpers/db.ts`: add helpers for membership/invitation assertions.
- Create `e2e/specs/dashboard-notifications-invitations.spec.ts`: end-to-end notification and invitation acceptance coverage.
- Update PRDs only if implementation meaning changes from current `prd/06-dashboard.md`, `prd/10A-organization-invitation-accept.md`, or `prd/10-dashboard-orgs-slug-settings.md`.

---

### Task 1: Shared Invitation Server Logic

**Files:**
- Create: `src/server/api/lib/invitations.ts`

- [ ] **Step 1: Add the shared helper file**

Create `src/server/api/lib/invitations.ts` with these exports and signatures:

```ts
import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"

import { ORGANIZATION_ROLE_MEMBER, ORGANIZATION_ROLES } from "@/lib/const"
import type { db } from "@/server/db"
import { invitation, member, organization, organizationDepartment, organizationDepartmentMember, session, user } from "@/server/db/schema"

type Db = typeof db

type InvitationContext = {
  db: Db
  session: {
    session?: {
      id: string
    }
    user: {
      email: string
      id: string
    }
  }
}

export const getEffectiveInvitationStatus = (status: string, expiresAt: Date | null) => {
  if (status === "pending" && expiresAt && expiresAt < new Date()) {
    return "expired" as const
  }

  return status
}

export const getInvitationForCurrentUser = async (ctx: InvitationContext, invitationId: string) => {
  const [row] = await ctx.db
    .select({
      createdAt: invitation.createdAt,
      departmentId: invitation.departmentId,
      departmentName: organizationDepartment.name,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      id: invitation.id,
      inviterEmail: user.email,
      inviterName: user.name,
      organizationId: organization.id,
      organizationLogo: organization.logo,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      role: invitation.role,
      status: invitation.status
    })
    .from(invitation)
    .innerJoin(organization, eq(invitation.organizationId, organization.id))
    .innerJoin(user, eq(invitation.inviterId, user.id))
    .leftJoin(organizationDepartment, eq(invitation.departmentId, organizationDepartment.id))
    .where(eq(invitation.id, invitationId))
    .limit(1)

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "邀请不存在。" })
  }

  if (row.email.toLowerCase() !== ctx.session.user.email.toLowerCase()) {
    throw new TRPCError({ code: "FORBIDDEN", message: "当前账号不是该邀请的接收人。" })
  }

  return {
    ...row,
    effectiveStatus: getEffectiveInvitationStatus(row.status, row.expiresAt)
  }
}

export const acceptInvitationForCurrentUser = async (ctx: InvitationContext, invitationId: string) => {
  const target = await getInvitationForCurrentUser(ctx, invitationId)

  if (target.effectiveStatus !== "pending") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "该邀请已失效，不能接受。" })
  }

  if (!ORGANIZATION_ROLES.some((role) => role === target.role)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "邀请角色无效。" })
  }

  const [existingMember] = await ctx.db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.organizationId, target.organizationId), eq(member.userId, ctx.session.user.id)))
    .limit(1)

  const memberId = existingMember?.id ?? crypto.randomUUID()

  if (!existingMember) {
    await ctx.db.insert(member).values({
      id: memberId,
      organizationId: target.organizationId,
      role: target.role || ORGANIZATION_ROLE_MEMBER,
      userId: ctx.session.user.id
    })
  }

  if (target.departmentId) {
    const [existingDepartmentMembership] = await ctx.db
      .select({ id: organizationDepartmentMember.id })
      .from(organizationDepartmentMember)
      .where(and(eq(organizationDepartmentMember.departmentId, target.departmentId), eq(organizationDepartmentMember.memberId, memberId)))
      .limit(1)

    if (!existingDepartmentMembership) {
      await ctx.db.insert(organizationDepartmentMember).values({
        departmentId: target.departmentId,
        id: crypto.randomUUID(),
        memberId,
        organizationId: target.organizationId
      })
    }
  }

  await ctx.db.update(invitation).set({ status: "accepted" }).where(eq(invitation.id, target.id))

  if (ctx.session.session?.id) {
    await ctx.db.update(session).set({ activeOrganizationId: target.organizationId }).where(eq(session.id, ctx.session.session.id))
  }

  return {
    invitationId: target.id,
    organizationSlug: target.organizationSlug,
    status: "accepted" as const
  }
}

export const rejectInvitationForCurrentUser = async (ctx: InvitationContext, invitationId: string) => {
  const target = await getInvitationForCurrentUser(ctx, invitationId)

  if (target.effectiveStatus !== "pending") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "该邀请已失效，不能拒绝。" })
  }

  await ctx.db.update(invitation).set({ status: "rejected" }).where(eq(invitation.id, target.id))

  return {
    invitationId: target.id,
    organizationSlug: target.organizationSlug,
    status: "rejected" as const
  }
}
```

- [ ] **Step 2: Run typecheck and fix import/type issues**

Run:

```bash
pnpm typecheck
```

Expected before router integration: either PASS, or a narrow TypeScript error from `typeof db` import shape. If `typeof db` causes an import issue, replace the `type Db = typeof db` line with:

```ts
type Db = typeof import("@/server/db").db
```

- [ ] **Step 3: Commit**

```bash
git add src/server/api/lib/invitations.ts
git commit -m "feat: add invitation processing helpers"
```

---

### Task 2: Notification Router And Shell Counts

**Files:**
- Create: `src/server/api/routers/notification.ts`
- Modify: `src/server/api/root.ts`
- Modify: `src/server/api/routers/dashboard.ts`

- [ ] **Step 1: Create notification router**

Create `src/server/api/routers/notification.ts`. The router must expose a generic notification contract; invitation rows are mapped into that contract instead of becoming the whole notification model:

```ts
import { and, asc, eq, gt, sql } from "drizzle-orm"
import { z } from "zod"

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { acceptInvitationForCurrentUser, getEffectiveInvitationStatus, getInvitationForCurrentUser, rejectInvitationForCurrentUser } from "@/server/api/lib/invitations"
import { invitation, organization, organizationDepartment, user } from "@/server/db/schema"

const notificationTypeInput = z.enum(["all", "invitation", "security", "system"]).default("all")

const toInvitationNotification = (row: {
  createdAt: Date
  departmentName: string | null
  email: string
  expiresAt: Date | null
  id: string
  inviterEmail: string
  inviterName: string
  organizationName: string
  organizationSlug: string
  role: string
  status: string
}) => ({
  actions: ["accept", "reject", "detail"] as const,
  createdAt: row.createdAt,
  description: `${row.departmentName ? `${row.departmentName} · ` : ""}${row.role} · ${row.inviterName || row.inviterEmail}`,
  detailHref: `/invite/${row.id}`,
  id: `invitation:${row.id}`,
  invitation: {
    departmentName: row.departmentName,
    email: row.email,
    expiresAt: row.expiresAt,
    id: row.id,
    inviterEmail: row.inviterEmail,
    inviterName: row.inviterName,
    organizationName: row.organizationName,
    organizationSlug: row.organizationSlug,
    role: row.role,
    status: getEffectiveInvitationStatus(row.status, row.expiresAt)
  },
  source: {
    invitationId: row.id,
    kind: "organizationInvitation" as const
  },
  status: "pending" as const,
  title: `${row.organizationName} 邀请你加入`,
  type: "invitation" as const,
  unread: true
})

export const notificationRouter = createTRPCRouter({
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ value: sql<number>`count(*)::int` })
      .from(invitation)
      .where(and(eq(invitation.email, ctx.session.user.email.toLowerCase()), eq(invitation.status, "pending"), gt(invitation.expiresAt, new Date())))

    return {
      pendingCount: row?.value ?? 0,
      unreadCount: row?.value ?? 0
    }
  }),

  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(20).default(10),
        type: notificationTypeInput
      })
    )
    .query(async ({ ctx, input }) => {
      const invitationRows =
        input.type === "all" || input.type === "invitation"
          ? await ctx.db
              .select({
                createdAt: invitation.createdAt,
                departmentId: invitation.departmentId,
                departmentName: organizationDepartment.name,
                email: invitation.email,
                expiresAt: invitation.expiresAt,
                id: invitation.id,
                inviterEmail: user.email,
                inviterName: user.name,
                organizationName: organization.name,
                organizationSlug: organization.slug,
                role: invitation.role,
                status: invitation.status
              })
              .from(invitation)
              .innerJoin(organization, eq(invitation.organizationId, organization.id))
              .innerJoin(user, eq(invitation.inviterId, user.id))
              .leftJoin(organizationDepartment, eq(invitation.departmentId, organizationDepartment.id))
              .where(and(eq(invitation.email, ctx.session.user.email.toLowerCase()), eq(invitation.status, "pending"), gt(invitation.expiresAt, new Date())))
              .orderBy(asc(invitation.expiresAt))
              .limit(input.pageSize)
              .offset((input.page - 1) * input.pageSize)
          : []

      const items = invitationRows.map(toInvitationNotification)

      return {
        items,
        page: input.page,
        pageCount: Math.max(1, Math.ceil(items.length / input.pageSize))
      }
    }),

  markAllRead: protectedProcedure.mutation(async () => ({ marked: true })),
  markRead: protectedProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ input }) => ({ id: input.id, marked: true })),

  invitation: createTRPCRouter({
    getMine: protectedProcedure.input(z.object({ invitationId: z.string().min(1) })).query(async ({ ctx, input }) => getInvitationForCurrentUser(ctx, input.invitationId)),
    accept: protectedProcedure.input(z.object({ invitationId: z.string().min(1) })).mutation(async ({ ctx, input }) => acceptInvitationForCurrentUser(ctx, input.invitationId)),
    reject: protectedProcedure.input(z.object({ invitationId: z.string().min(1) })).mutation(async ({ ctx, input }) => rejectInvitationForCurrentUser(ctx, input.invitationId))
  })
})
```

The `markRead` and `markAllRead` procedures are intentionally no-ops in the first version because all implemented notifications are pending invitations. They still exist to keep the client contract generic; when ordinary persisted security/system notifications are added later, these procedures should update those ordinary notification records and must not mark pending invitations as handled.

- [ ] **Step 2: Register router in root**

Modify `src/server/api/root.ts`:

```ts
import { notificationRouter } from "@/server/api/routers/notification"
```

Add it inside `appRouter`:

```ts
notification: notificationRouter,
```

- [ ] **Step 3: Add shell notification count**

In `src/server/api/routers/dashboard.ts`, inside `getShell`, compute pending invitations after memberships:

```ts
const [pendingNotificationCount] = await ctx.db
  .select({ value: sql<number>`count(*)::int` })
  .from(invitation)
  .where(and(eq(invitation.email, ctx.session.user.email.toLowerCase()), eq(invitation.status, "pending"), gt(invitation.expiresAt, new Date())))
```

Add to the returned object:

```ts
notifications: {
  pendingCount: pendingNotificationCount?.value ?? 0,
  unreadCount: pendingNotificationCount?.value ?? 0
},
```

Also add `gt` to the `drizzle-orm` import in this file.

- [ ] **Step 4: Run checks**

```bash
pnpm typecheck
pnpm check
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

```bash
git add src/server/api/routers/notification.ts src/server/api/root.ts src/server/api/routers/dashboard.ts
git commit -m "feat: expose dashboard notifications"
```

---

### Task 3: Topbar Notification Menu UI

**Files:**
- Create: `src/app/dashboard/_components/dashboard-notification-menu.tsx`
- Modify: `src/app/dashboard/_components/dashboard-topbar.tsx`

- [ ] **Step 1: Create the notification menu component**

Create `src/app/dashboard/_components/dashboard-notification-menu.tsx`. It should:

- Render a `Bell` icon button with an absolute count badge.
- Use `DropdownMenu` on `md` and larger screens.
- Use `Sheet` on small screens.
- Query `api.notification.list.useQuery({ type, page: 1, pageSize: 10 })`.
- Query `api.notification.getUnreadCount.useQuery(undefined, { initialData })`.
- Render all notification items through the common notification envelope.
- Only call `api.notification.invitation.accept.useMutation` and `reject.useMutation` when `item.source.kind === "organizationInvitation"`.
- Invalidate `notification.list`, `notification.getUnreadCount`, `dashboard.getShell`, `dashboard.getHome`, and `org.invitation.list` on success.

Use this structure:

```tsx
"use client"

import { Bell, Check, ExternalLink, Loader2, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { api, type RouterOutputs } from "@/trpc/react"

type NotificationType = "all" | "invitation" | "security" | "system"
type NotificationCounts = RouterOutputs["notification"]["getUnreadCount"]
type NotificationList = RouterOutputs["notification"]["list"]
type NotificationItem = NotificationList["items"][number]

type DashboardNotificationMenuProps = {
  initialCounts: NotificationCounts
}

const filters: { label: string; value: NotificationType }[] = [
  { label: "全部", value: "all" },
  { label: "邀请", value: "invitation" },
  { label: "安全", value: "security" }
]

const formatCount = (count: number) => (count > 99 ? "99+" : count.toString())

export const DashboardNotificationMenu = ({ initialCounts }: DashboardNotificationMenuProps) => {
  const [type, setType] = useState<NotificationType>("all")
  const [mobileOpen, setMobileOpen] = useState(false)
  const counts = api.notification.getUnreadCount.useQuery(undefined, { initialData: initialCounts })
  const list = api.notification.list.useQuery({ page: 1, pageSize: 10, type })
  const count = counts.data.pendingCount || counts.data.unreadCount

  const trigger = (
    <Button aria-label={count > 0 ? `通知，${count} 个待处理` : "通知"} className="relative" size="icon" type="button" variant="ghost">
      <Bell className="size-5" />
      {count > 0 ? (
        <span className="-top-1 -right-1 absolute flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-medium text-[10px] text-destructive-foreground leading-4">
          {formatCount(count)}
        </span>
      ) : null}
    </Button>
  )

  return (
    <>
      <div className="hidden md:block">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[380px] p-0" sideOffset={10}>
            <NotificationPanel items={list.data?.items ?? []} loading={list.isLoading} onFilterChange={setType} selectedType={type} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="md:hidden">
        <Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
          <SheetTrigger asChild>{trigger}</SheetTrigger>
          <SheetContent className="max-h-[86dvh] rounded-t-2xl p-0" side="bottom">
            <SheetHeader className="sr-only">
              <SheetTitle>通知</SheetTitle>
              <SheetDescription>查看和处理账号通知</SheetDescription>
            </SheetHeader>
            <NotificationPanel items={list.data?.items ?? []} loading={list.isLoading} onActionComplete={() => setMobileOpen(false)} onFilterChange={setType} selectedType={type} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

const NotificationPanel = ({
  items,
  loading,
  onActionComplete,
  onFilterChange,
  selectedType
}: {
  items: NotificationItem[]
  loading: boolean
  onActionComplete?: () => void
  onFilterChange: (type: NotificationType) => void
  selectedType: NotificationType
}) => (
  <div className="flex max-h-[520px] flex-col">
    <div className="flex items-center justify-between border-b px-4 py-3">
      <div>
        <div className="font-semibold text-sm">通知</div>
        <div className="text-muted-foreground text-xs">处理邀请、安全和系统提醒</div>
      </div>
      <Button size="sm" type="button" variant="ghost">
        全部标为已读
      </Button>
    </div>
    <div className="flex gap-2 border-b px-4 py-3">
      {filters.map((filter) => (
        <Button className="h-7 rounded-full px-3 text-xs" key={filter.value} onClick={() => onFilterChange(filter.value)} size="sm" type="button" variant={selectedType === filter.value ? "default" : "outline"}>
          {filter.label}
        </Button>
      ))}
    </div>
    <div className="min-h-48 overflow-y-auto p-3">
      {loading ? <div className="flex items-center justify-center py-10 text-muted-foreground text-sm"><Loader2 className="mr-2 size-4 animate-spin" />加载通知中</div> : null}
      {!loading && items.length === 0 ? <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground text-sm">暂无通知。</div> : null}
      <div className="space-y-2">
        {items.map((item) => (
          <NotificationListItem item={item} key={item.id} onActionComplete={onActionComplete} />
        ))}
      </div>
    </div>
  </div>
)

const NotificationListItem = ({ item, onActionComplete }: { item: NotificationItem; onActionComplete?: () => void }) => {
  const utils = api.useUtils()
  const accept = api.notification.invitation.accept.useMutation({
    onSuccess: async (result) => {
      toast.success("已接受组织邀请。")
      await Promise.all([utils.notification.list.invalidate(), utils.notification.getUnreadCount.invalidate(), utils.dashboard.getShell.invalidate(), utils.dashboard.getHome.invalidate()])
      onActionComplete?.()
      window.location.href = `/dashboard/orgs/${result.organizationSlug}`
    }
  })
  const reject = api.notification.invitation.reject.useMutation({
    onSuccess: async () => {
      toast.success("已拒绝组织邀请。")
      await Promise.all([utils.notification.list.invalidate(), utils.notification.getUnreadCount.invalidate(), utils.dashboard.getShell.invalidate(), utils.dashboard.getHome.invalidate(), utils.org.invitation.list.invalidate()])
      onActionComplete?.()
    }
  })

  const isInvitation = item.source.kind === "organizationInvitation"
  const invitation = isInvitation ? item.invitation : null

  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary text-sm">{item.type === "invitation" ? "邀" : "通"}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate font-medium text-sm">{item.title}</div>
            <Badge variant={item.status === "pending" ? "secondary" : "outline"}>{item.status === "pending" ? "待处理" : "已读"}</Badge>
          </div>
          <div className="mt-1 text-muted-foreground text-xs">{item.description}</div>
          {invitation?.expiresAt ? <div className="mt-1 text-amber-600 text-xs dark:text-amber-400">{new Date(invitation.expiresAt).toLocaleDateString()} 前处理</div> : null}
        </div>
      </div>
      {invitation ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button disabled={accept.isPending || reject.isPending} onClick={() => accept.mutate({ invitationId: invitation.id })} size="sm" type="button">
            <Check className="size-4" />接受
          </Button>
          <Button disabled={accept.isPending || reject.isPending} onClick={() => reject.mutate({ invitationId: invitation.id })} size="sm" type="button" variant="outline">
            <X className="size-4" />拒绝
          </Button>
          <Button asChild size="sm" type="button" variant="outline">
            <Link href={item.detailHref}><ExternalLink className="size-4" />详情</Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
```

Remove unused imports after writing; Biome will organize.

- [ ] **Step 2: Wire into Topbar**

Modify `src/app/dashboard/_components/dashboard-topbar.tsx`:

```tsx
import { DashboardNotificationMenu } from "./dashboard-notification-menu"
```

Replace the final theme toggle with:

```tsx
<div className="flex items-center gap-1">
  <DashboardNotificationMenu initialCounts={data.notifications} />
  <ThemeToggle blur start="top-right" variant="circle" />
</div>
```

- [ ] **Step 3: Run checks**

```bash
pnpm typecheck
pnpm check
```

Expected: both commands pass. If `DropdownMenu` closes when clicking action buttons too early, keep it for desktop because actions use mutations immediately; mobile closes through `onActionComplete`.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/_components/dashboard-notification-menu.tsx src/app/dashboard/_components/dashboard-topbar.tsx
git commit -m "feat: add dashboard notification menu"
```

---

### Task 4: Invitation Detail Page

**Files:**
- Create: `src/app/invite/[id]/page.tsx`
- Create: `src/app/invite/[id]/_components/invitation-confirmation-card.tsx`

- [ ] **Step 1: Create the server page**

Create `src/app/invite/[id]/page.tsx`:

```tsx
import { redirect } from "next/navigation"

import { api } from "@/trpc/server"
import { auth } from "@/server/better-auth"
import { headers } from "next/headers"

import { InvitationConfirmationCard } from "./_components/invitation-confirmation-card"

type InvitePageProps = {
  params: Promise<{ id: string }>
}

const InvitePage = async ({ params }: InvitePageProps) => {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    redirect(`/sign-in?redirectTo=${encodeURIComponent(`/invite/${id}`)}`)
  }

  const invitation = await api.notification.invitation.getMine({ invitationId: id })

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/45 px-4 py-10">
      <InvitationConfirmationCard invitation={invitation} />
    </main>
  )
}

export default InvitePage
```

This page uses the `notification.invitation.getMine` query defined in Task 2.

- [ ] **Step 2: Create the client confirmation card**

Create `src/app/invite/[id]/_components/invitation-confirmation-card.tsx`:

```tsx
"use client"

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { api, type RouterOutputs } from "@/trpc/react"

type InvitationDetail = RouterOutputs["notification"]["invitation"]["getMine"]

export const InvitationConfirmationCard = ({ invitation }: { invitation: InvitationDetail }) => {
  const router = useRouter()
  const utils = api.useUtils()
  const disabled = invitation.effectiveStatus !== "pending"
  const accept = api.notification.invitation.accept.useMutation({
    onSuccess: async (result) => {
      toast.success("已接受组织邀请。")
      await Promise.all([utils.notification.list.invalidate(), utils.notification.getUnreadCount.invalidate(), utils.dashboard.getShell.invalidate(), utils.dashboard.getHome.invalidate()])
      router.replace(`/dashboard/orgs/${result.organizationSlug}`)
      router.refresh()
    }
  })
  const reject = api.notification.invitation.reject.useMutation({
    onSuccess: async () => {
      toast.success("已拒绝组织邀请。")
      await Promise.all([utils.notification.list.invalidate(), utils.notification.getUnreadCount.invalidate(), utils.dashboard.getShell.invalidate(), utils.dashboard.getHome.invalidate()])
      router.replace("/dashboard")
      router.refresh()
    }
  })

  return (
    <Card className="w-full max-w-lg shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>组织邀请</CardTitle>
          <Badge variant={disabled ? "secondary" : "default"}>{disabled ? "不可处理" : "待处理"}</Badge>
        </div>
        <CardDescription>{invitation.organizationName} 邀请你加入公司。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <InfoRow label="组织" value={invitation.organizationName} />
        <InfoRow label="默认部门" value={invitation.departmentName ?? "未指定"} />
        <InfoRow label="角色" value={invitation.role} />
        <InfoRow label="邀请人" value={invitation.inviterName || invitation.inviterEmail} />
        <InfoRow label="接收邮箱" value={invitation.email} />
        <InfoRow label="过期时间" value={invitation.expiresAt ? new Date(invitation.expiresAt).toLocaleString() : "未设置"} />
      </CardContent>
      <CardFooter className="flex flex-col gap-2 sm:flex-row">
        <Button className="w-full" disabled={disabled || accept.isPending || reject.isPending} onClick={() => accept.mutate({ invitationId: invitation.id })} type="button">
          {accept.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          接受邀请
        </Button>
        <Button className="w-full" disabled={disabled || accept.isPending || reject.isPending} onClick={() => reject.mutate({ invitationId: invitation.id })} type="button" variant="outline">
          拒绝邀请
        </Button>
      </CardFooter>
    </Card>
  )
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/60 px-3 py-2">
    <span className="text-muted-foreground">{label}</span>
    <span className="min-w-0 truncate font-medium">{value}</span>
  </div>
)
```

- [ ] **Step 3: Run checks**

```bash
pnpm typecheck
pnpm check
```

Expected: both commands pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/invite/[id]/page.tsx src/app/invite/[id]/_components/invitation-confirmation-card.tsx src/server/api/routers/notification.ts
git commit -m "feat: add organization invitation detail page"
```

---

### Task 5: Invite Flow Cache Refresh And Table Consistency

**Files:**
- Modify: `src/app/dashboard/orgs/[slug]/_components/org-invite-content.tsx`

- [ ] **Step 1: Invalidate notification data after sending an invitation**

In the existing `invite` mutation `onSuccess`, ensure it includes:

```ts
await Promise.all([
  invitations.refetch(),
  departments.refetch(),
  utils.notification.list.invalidate(),
  utils.notification.getUnreadCount.invalidate(),
  utils.dashboard.getShell.invalidate(),
  utils.dashboard.getHome.invalidate()
])
```

Keep the existing toast, dialog close, and email reset behavior.

- [ ] **Step 2: Verify status badge mapping**

Confirm `invitationStatusMeta` includes exactly:

```ts
const invitationStatusMeta = {
  accepted: { label: "已接受", variant: "secondary" as const },
  canceled: { label: "已取消", variant: "outline" as const },
  expired: { label: "已过期", variant: "destructive" as const },
  pending: { label: "待接受", variant: "default" as const },
  rejected: { label: "已拒绝", variant: "secondary" as const }
}
```

- [ ] **Step 3: Run checks**

```bash
pnpm typecheck
pnpm check
```

Expected: both commands pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/orgs/[slug]/_components/org-invite-content.tsx
git commit -m "fix: refresh notification state after invitations"
```

---

### Task 6: E2E Coverage

**Files:**
- Modify: `e2e/helpers/db.ts`
- Create: `e2e/specs/dashboard-notifications-invitations.spec.ts`

- [ ] **Step 1: Add DB helpers**

Append to `e2e/helpers/db.ts`:

```ts
export const addOrganizationMemberByEmail = async ({ email, organizationId, role = "owner" }: { email: string; organizationId: string; role?: string }) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ id: string }[]>`
      select "id"
      from "system_user"
      where "email" = ${email}
      limit 1
    `
    const userId = rows[0]?.id

    if (!userId) {
      throw new Error(`Cannot add missing user to organization: ${email}`)
    }

    await sql`
      insert into "system_member" ("id", "organization_id", "user_id", "role", "created_at")
      values (${`member-${organizationId}-${userId}`}, ${organizationId}, ${userId}, ${role}, now())
      on conflict ("organization_id", "user_id") do update set "role" = excluded."role"
    `
  } finally {
    await sql.end()
  }
}

export const getMemberByEmailAndOrganization = async ({ email, organizationId }: { email: string; organizationId: string }) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ id: string; role: string }[]>`
      select member."id", member."role"
      from "system_member" member
      inner join "system_user" app_user on app_user."id" = member."user_id"
      where app_user."email" = ${email}
        and member."organization_id" = ${organizationId}
      limit 1
    `

    return rows[0] ?? null
  } finally {
    await sql.end()
  }
}

export const getInvitationStatusByEmail = async ({ email, organizationId }: { email: string; organizationId: string }) => {
  const sql = createE2eSql()

  try {
    const rows = await sql<{ status: string }[]>`
      select "status"
      from "system_invitation"
      where "email" = ${email}
        and "organization_id" = ${organizationId}
      order by "created_at" desc
      limit 1
    `

    return rows[0]?.status ?? null
  } finally {
    await sql.end()
  }
}
```

- [ ] **Step 2: Add E2E spec**

Create `e2e/specs/dashboard-notifications-invitations.spec.ts`:

```ts
import { expect, test } from "@playwright/test"

import { createVerifiedUser, signInViaUi } from "../helpers/auth-flows"
import { addOrganizationMemberByEmail, getInvitationStatusByEmail, getMemberByEmailAndOrganization, seedOrganizationWithDepartments } from "../helpers/db"

test.describe("dashboard notifications and organization invitations", () => {
  test("invited user can see and accept an organization invitation from the Topbar notification menu", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed organization flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "notification-admin")
    const invitedEmail = await createVerifiedUser(page, "notification-invited")
    const slug = `notification-org-${Date.now()}`
    const { rootId } = await seedOrganizationWithDepartments({
      departmentName: "通知产品部",
      rootName: "Notification Org E2E",
      rootSlug: slug
    })
    await addOrganizationMemberByEmail({ email: adminEmail, organizationId: rootId, role: "owner" })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goto(`/dashboard/orgs/${slug}/invite`)
    await page.getByRole("button", { name: "邀请成员" }).click()
    await page.getByRole("dialog", { name: "邀请成员" }).getByLabel("邮箱").fill(invitedEmail)
    await page.getByRole("button", { name: "发送邀请" }).click()
    await expect(page.getByRole("row").filter({ hasText: invitedEmail }).getByText("待接受")).toBeVisible()

    await page.context().clearCookies()
    await page.goto("/sign-in")
    await signInViaUi(page, { email: invitedEmail })
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.getByRole("button", { name: /通知/ }).click()
    await expect(page.getByText("Notification Org E2E 邀请你加入")).toBeVisible()
    await page.getByRole("button", { name: "接受" }).click()
    await expect(page).toHaveURL(new RegExp(`/dashboard/orgs/${slug}`), { timeout: 15_000 })

    await expect.poll(() => getInvitationStatusByEmail({ email: invitedEmail, organizationId: rootId })).toBe("accepted")
    await expect.poll(() => getMemberByEmailAndOrganization({ email: invitedEmail, organizationId: rootId })).not.toBeNull()
  })

  test("invitation detail page redirects unauthenticated users and lets invited users reject", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "DB-backed organization flow only needs one browser project")

    const adminEmail = await createVerifiedUser(page, "invite-detail-admin")
    const invitedEmail = await createVerifiedUser(page, "invite-detail-target")
    const slug = `invite-detail-org-${Date.now()}`
    const { rootId } = await seedOrganizationWithDepartments({
      departmentName: "详情产品部",
      rootName: "Invite Detail Org E2E",
      rootSlug: slug
    })
    await addOrganizationMemberByEmail({ email: adminEmail, organizationId: rootId, role: "owner" })

    await page.goto("/sign-in")
    await signInViaUi(page, { email: adminEmail })
    await page.goto(`/dashboard/orgs/${slug}/invite`)
    await page.getByRole("button", { name: "邀请成员" }).click()
    await page.getByRole("dialog", { name: "邀请成员" }).getByLabel("邮箱").fill(invitedEmail)
    await page.getByRole("button", { name: "发送邀请" }).click()

    const invitationId = await page.getByRole("row").filter({ hasText: invitedEmail }).getAttribute("data-invitation-id")
    expect(invitationId).toBeTruthy()

    await page.context().clearCookies()
    await page.goto(`/invite/${invitationId}`)
    await expect(page).toHaveURL(/\/sign-in\?redirectTo=/)
    await signInViaUi(page, { email: invitedEmail })
    await expect(page).toHaveURL(new RegExp(`/invite/${invitationId}`))
    await page.getByRole("button", { name: "拒绝邀请" }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect.poll(() => getInvitationStatusByEmail({ email: invitedEmail, organizationId: rootId })).toBe("rejected")
  })
})
```

If the existing table row does not expose `data-invitation-id`, add it in `OrgInviteContent` on the `<TableRow>`:

```tsx
<TableRow data-invitation-id={item.id} key={item.id}>
```

- [ ] **Step 3: Run targeted E2E**

Run:

```bash
pnpm test:e2e -- e2e/specs/dashboard-notifications-invitations.spec.ts --project=chromium
```

Expected: both tests pass. If Docker/Testcontainers is not running, record the exact failure and still run `pnpm typecheck` and `pnpm check`.

- [ ] **Step 4: Commit**

```bash
git add e2e/helpers/db.ts e2e/specs/dashboard-notifications-invitations.spec.ts src/app/dashboard/orgs/[slug]/_components/org-invite-content.tsx
git commit -m "test: cover dashboard invitation notifications"
```

---

### Task 7: Final Verification And PRD Check

**Files:**
- Verify: `prd/06-dashboard.md`
- Verify: `prd/10A-organization-invitation-accept.md`
- Verify: `prd/10-dashboard-orgs-slug-settings.md`

- [ ] **Step 1: Verify PRD alignment**

Check that implementation matches these PRD commitments:

- The notification center is generic; organization invitations are one notification type, not the whole notification system.
- Topbar Bell is left of theme toggle.
- Badge displays pending invitation count.
- Desktop opens a right-aligned notification panel.
- Mobile opens a Sheet.
- Invitation item shows organization, department, role, inviter, expiry, accept, reject, details.
- Accept/reject logic is shared with `/invite/[id]`.
- Departments are displayed only as company-internal default affiliation.

- [ ] **Step 2: Run final checks**

```bash
pnpm typecheck
pnpm check
pnpm build
```

Expected: all pass.

- [ ] **Step 3: Run existing related E2E**

```bash
pnpm test:e2e -- e2e/specs/dashboard-org-invitations.spec.ts e2e/specs/dashboard-notifications-invitations.spec.ts --project=chromium
```

Expected: all pass when Docker/Testcontainers is available.

- [ ] **Step 4: Commit final PRD adjustments only if needed**

If the implementation required PRD wording changes:

```bash
git add prd/06-dashboard.md prd/10A-organization-invitation-accept.md prd/10-dashboard-orgs-slug-settings.md
git commit -m "docs: align invitation notification requirements"
```

If no PRD changes were needed, do not create a docs-only commit.

---

## Self-Review

- Spec coverage: The plan covers a generic notification center contract, notification count, notification listing, Topbar Bell UI, desktop panel, mobile Sheet, invitation accept/reject as one actionable notification type, `/invite/[id]`, department display, cache refresh, and E2E verification.
- Placeholder scan: No `TBD`, `TODO`, or vague implementation placeholders remain. Optional PRD update is explicitly conditional on implementation drift.
- Type consistency: Router names used by UI and page are `notification.getUnreadCount`, `notification.list`, `notification.invitation.getMine`, `notification.invitation.accept`, and `notification.invitation.reject`; these are defined in Task 2 and consumed in Tasks 3 and 4.
