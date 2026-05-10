# 07 Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/dashboard/settings/profile` as a real personal profile page matching the 07 Pencil prototype, with authenticated data loading and profile update support.

**Architecture:** The page inherits the existing `/dashboard` layout, so implementation only touches the Main content, profile API, and route-aware breadcrumbs/navigation. Server Components fetch initial profile data through tRPC server callers; a client form performs validated updates through tRPC mutations and refreshes the route on success.

**Tech Stack:** Next.js App Router, React 19, TypeScript, tRPC 11, Drizzle ORM, Better Auth user table, Zod, Tailwind CSS 4, shadcn/ui components, Playwright E2E.

---

## File Structure

- Create `src/server/api/routers/profile.ts`
  - Owns `profile.get` and `profile.update`.
  - Reads/writes `system_user` through Drizzle.
  - Uses `protectedProcedure`.
  - Keeps validation in one shared server-side Zod schema.

- Modify `src/server/api/root.ts`
  - Register `profile: profileRouter`.

- Modify `src/app/dashboard/_components/dashboard-topbar.tsx`
  - Make breadcrumbs route-aware using `usePathname`.
  - `/dashboard` shows `首页 / 工作台`.
  - `/dashboard/settings/profile` shows `首页 / 设置 / 个人资料`.

- Modify `src/app/dashboard/_components/dashboard-sidebar.tsx`
  - Make active nav item route-aware using `usePathname`.
  - `个人资料` should be active on `/dashboard/settings/profile`, not `工作台`.

- Create `src/app/dashboard/settings/profile/page.tsx`
  - Server Component.
  - Calls `api.profile.get()`.
  - Renders `ProfilePageContent`.

- Create `src/app/dashboard/settings/profile/_components/profile-page-content.tsx`
  - Presentational layout for the 07 desktop/mobile design.
  - Contains page title, main form card, profile completeness, identity info, and save rules cards.

- Create `src/app/dashboard/settings/profile/_components/profile-form.tsx`
  - Client Component.
  - Owns controlled form state, validation display, save/cancel behavior, toast, pending state, and mutation call.

- Create `e2e/specs/07-dashboard-settings-profile.spec.ts`
  - Auth redirect test.
  - Render test.
  - Update name/avatar URL test.
  - Validation test.
  - Mobile render test.

- Modify `prd/07-dashboard-settings-profile.md`
  - Clarify implemented route structure, API names, and that the 07 prototype has 4 Pencil frames: desktop light/dark and mobile light/dark.

---

## Data Contract

`profile.get` returns:

```ts
type ProfileGetOutput = {
  user: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image: string | null
    createdAt: Date
    updatedAt: Date
  }
  stats: {
    completeness: number
    organizationCount: number
    activeSessionCount: number
  }
}
```

`profile.update` input:

```ts
const profileUpdateSchema = z.object({
  image: z.string().url("头像 URL 必须是有效链接。").max(2048).or(z.literal("")).transform((value) => value || null),
  name: z.string().trim().min(2, "名称至少 2 个字符。").max(32, "名称不能超过 32 个字符。")
})
```

`profile.update` returns the updated user fields.

Completeness scoring:

- Base: `50`
- Email verified: `+20`
- Name present and valid: `+15`
- Image present: `+15`
- Clamp to `0-100`

---

## Task 1: Add Profile API

**Files:**
- Create: `src/server/api/routers/profile.ts`
- Modify: `src/server/api/root.ts`

- [ ] Create `profileUpdateSchema` in `src/server/api/routers/profile.ts`.

- [ ] Implement `profile.get`:
  - Use `ctx.session.user.id`.
  - Query `user` by id.
  - Count `member` rows by user id.
  - Count `session` rows by user id.
  - Return user and stats.
  - Throw `NOT_FOUND` if user is missing.

- [ ] Implement `profile.update`:
  - Validate name and image.
  - Update `system_user.name`, `system_user.image`, `system_user.updated_at`.
  - Return updated user fields.
  - Do not allow email or role mutation.

- [ ] Register router in `src/server/api/root.ts`:

```ts
import { profileRouter } from "@/server/api/routers/profile"

export const appRouter = createTRPCRouter({
  dashboard: dashboardRouter,
  profile: profileRouter
})
```

- [ ] Run:

```bash
pnpm typecheck
```

Expected: no TypeScript errors.

---

## Task 2: Make Dashboard Chrome Route-Aware

**Files:**
- Modify: `src/app/dashboard/_components/dashboard-topbar.tsx`
- Modify: `src/app/dashboard/_components/dashboard-sidebar.tsx`

- [ ] In `dashboard-topbar.tsx`, import `usePathname` from `next/navigation`.

- [ ] Add a breadcrumb helper:

```ts
const getBreadcrumbs = (pathname: string) => {
  if (pathname === "/dashboard/settings/profile") {
    return ["首页", "设置", "个人资料"]
  }

  if (pathname === "/dashboard/settings/security") {
    return ["首页", "设置", "安全设置"]
  }

  if (pathname === "/dashboard/settings/sessions") {
    return ["首页", "设置", "我的会话"]
  }

  return ["首页", "工作台"]
}
```

- [ ] Render breadcrumb segments from the helper. Last segment uses stronger foreground text.

- [ ] In `dashboard-sidebar.tsx`, add `"use client"` if not already present, import `usePathname`, and compute active state:

```ts
const pathname = usePathname()
const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
```

- [ ] Verify `/dashboard/settings/profile` highlights `个人资料` and topbar shows `首页 / 设置 / 个人资料`.

---

## Task 3: Build Profile Page Shell

**Files:**
- Create: `src/app/dashboard/settings/profile/page.tsx`
- Create: `src/app/dashboard/settings/profile/_components/profile-page-content.tsx`

- [ ] Create `page.tsx` as a Server Component:

```tsx
import { api } from "@/trpc/server"
import { ProfilePageContent } from "./_components/profile-page-content"

const ProfilePage = async () => {
  const data = await api.profile.get()

  return <ProfilePageContent data={data} />
}

export default ProfilePage
```

- [ ] Create `ProfilePageContent` with:
  - Title: `个人资料`
  - Description: `维护你的基础身份信息。邮箱和用户 ID 作为身份凭证暂不支持在此页面修改。`
  - Responsive grid: `xl:grid-cols-[minmax(0,730px)_320px]`
  - Left card: account profile form.
  - Right stack: completeness, identity info, save rules.
  - Mobile: single column.

- [ ] Use existing shadcn components:
  - `Card`, `CardHeader`, `CardContent`, `CardTitle`
  - `Button`
  - `Input`
  - `Label`
  - `Badge`
  - `Avatar`, `AvatarFallback`, `AvatarImage`
  - `Progress` if already available; otherwise use a small styled div track.

---

## Task 4: Build Client Profile Form

**Files:**
- Create: `src/app/dashboard/settings/profile/_components/profile-form.tsx`
- Modify: `src/app/dashboard/settings/profile/_components/profile-page-content.tsx`

- [ ] `ProfileForm` props:

```ts
type ProfileFormProps = {
  user: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image: string | null
    createdAt: Date
  }
}
```

- [ ] Use local state:
  - `name`
  - `image`
  - `errors`

- [ ] On save:
  - Validate with a client-side equivalent schema.
  - Call `api.profile.update.useMutation()`.
  - Show success toast: `个人资料已更新。`
  - Call `router.refresh()`.

- [ ] On cancel:
  - Reset `name` and `image` to initial props.

- [ ] Field behavior:
  - `名称`: editable.
  - `邮箱`: readonly, with `已验证` or `未验证` badge.
  - `头像 URL`: editable.
  - `用户 ID`: readonly.
  - `创建时间`: readonly, formatted as `yyyy-MM-dd HH:mm`.

- [ ] Disabled states:
  - Save button disabled while pending.
  - Cancel button disabled while pending.

---

## Task 5: Add E2E Tests

**Files:**
- Create: `e2e/specs/07-dashboard-settings-profile.spec.ts`

- [ ] Test anonymous redirect:

```ts
test("redirects anonymous users to sign in with profile redirect target", async ({ page }) => {
  await page.goto("/dashboard/settings/profile")
  await expect(page).toHaveURL(/\/sign-in\?redirectTo=%2Fdashboard%2Fsettings%2Fprofile/)
})
```

- [ ] Test authenticated render:
  - Create verified user.
  - Sign in.
  - Visit `/dashboard/settings/profile`.
  - Assert title `个人资料`.
  - Assert card title `账号档案`.
  - Assert current email is visible.
  - Assert sidebar active `个人资料`.
  - Assert breadcrumb `首页 / 设置 / 个人资料`.

- [ ] Test update:
  - Fill `名称` with `李明 E2E`.
  - Fill `头像 URL` with `https://example.com/avatar.png`.
  - Click `保存资料`.
  - Assert toast `个人资料已更新。`.
  - Reload.
  - Assert `李明 E2E` remains visible.

- [ ] Test validation:
  - Fill `名称` with `A`.
  - Click `保存资料`.
  - Assert `名称至少 2 个字符。`.

- [ ] Test mobile:
  - Run only on `mobile-chrome`.
  - Sign in.
  - Visit `/dashboard/settings/profile`.
  - Assert `个人资料`, `账号档案`, and `资料完整度` visible.

---

## Task 6: Update PRD Notes

**Files:**
- Modify: `prd/07-dashboard-settings-profile.md`

- [ ] Add implementation note:
  - Route uses `src/app/dashboard/settings/profile/page.tsx`.
  - API uses `profile.get` and `profile.update`.
  - Email is readonly in first version.
  - Avatar upload is not included; only avatar URL is editable.
  - Pencil prototype frames are:
    - `07 / Profile / Light / Desktop`
    - `07 / Profile / Dark / Desktop`
    - `07 / Profile / Light / Mobile`
    - `07 / Profile / Dark / Mobile`

---

## Task 7: Verification

**Files:**
- All changed files.

- [ ] Run:

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] Run:

```bash
pnpm check
```

Expected: exits 0.

- [ ] Run:

```bash
pnpm test:e2e e2e\specs\07-dashboard-settings-profile.spec.ts --project=chromium --project=mobile-chrome
```

Expected: all 07 tests pass; browser-project skips are intentional where specified.

- [ ] Run:

```bash
pnpm build
```

Expected: exits 0 and `/dashboard/settings/profile` appears as a dynamic app route.

---

## Self-Review

- Spec coverage: covers route, inherited dashboard layout, profile form, readonly email/user ID, save/cancel actions, tRPC APIs, validation, success feedback, mobile layout, and tests.
- Placeholder scan: no TODO/TBD placeholders.
- Type consistency: router name is `profile`, page uses `api.profile.get`, mutation uses `api.profile.update`, and E2E file matches PRD number `07`.
