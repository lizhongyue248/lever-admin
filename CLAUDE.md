# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev              # Start dev server with Turbo
pnpm build            # Production build
pnpm start            # Start production server

# Type checking & linting
pnpm typecheck        # TypeScript validation (tsc --noEmit)
pnpm check            # Biome lint + format check
pnpm check:write      # Auto-fix with Biome (safe fixes only)
pnpm check:unsafe     # Auto-fix with Biome (including unsafe fixes)

# Database
pnpm db:generate      # Generate Drizzle migration files
pnpm db:migrate       # Apply migrations to the database
pnpm db:push          # Push schema directly (dev only, skips migrations)
pnpm db:studio        # Open Drizzle Studio UI
```

There are no automated tests. Type checking (`pnpm typecheck`) and linting (`pnpm check`) are the primary validation tools. Run `pnpm check:write` before committing.

## Tech Stack

- **Frontend:** React 19, Next.js 16 (App Router), shadcn/ui, Tailwind CSS 4, Motion 12
- **State:** Zustand (global), TanStack Query (server cache)
- **API:** tRPC 11 (primary, type-safe), REST endpoints (secondary, OpenAPI-documented)
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Better Auth 1.3+ with API Key plugin
- **Forms:** @tanstack/react-form
- **Tables:** @tanstack/react-table
- **Maps:** Baidu Maps 3D (@baidumap/mapv-three, Three.js)
- **Code quality:** Biome (lint + format), TypeScript strict mode

## Architecture

### Dual API Layer

Two parallel API layers serve different scenarios:

1. **tRPC (primary)** — type-safe RPC for internal client-server communication
   - Routers in `src/server/api/routers/`
   - Used by Next.js UI components
   - Client: `api.project.page.useQuery()`
   - Server (RSC prefetch): `api.project.page.prefetch()`

2. **REST (secondary)** — OpenAPI-documented HTTP endpoints for external integrations
   - In `src/app/api/` (Next.js route handlers)
   - Accessed by external clients via API Key auth
   - Documented in `public/openapi/openapi.json` and `API.md`

**Both layers delegate to the same service layer** (`src/server/service/`) — never duplicate business logic in routers.

### Request Flow

```
Client (browser / external)
  ↓
tRPC Router / REST Route Handler
  ↓
Zod validation
  ↓
Auth middleware (Better Auth session / API Key)
  ↓
Service layer (business logic)
  ↓
Drizzle ORM → PostgreSQL
```

For RSC: `src/trpc/server.ts` pre-fetches via `HydrateClient` and `prefetch*` helpers; the client rehydrates from cache without a second network request.

### Key Directories

- `src/app/` — Next.js routes. Server Components by default; `_components/` holds page-local Client Components.
- `src/server/api/routers/` — tRPC routers. `trpc.ts` defines context, middleware, `publicProcedure`/`protectedProcedure`. `root.ts` combines all routers.
- `src/server/service/` — Business logic (`project-service.ts`, `route-service.ts`, `task-service.ts`, etc.)
- `src/server/db/` — Drizzle schema (`schema.ts`) and connection pool (`index.ts`). All tables prefixed `time-line_`.
- `src/server/better-auth/` — Auth config (`config.ts` with API Key plugin), server session helper, client-side auth client.
- `src/trpc/` — tRPC/React Query wiring: `react.tsx` (provider + hooks + type exports), `server.ts` (RSC helpers), `query-client.ts`.
- `src/stores/` — Zustand stores. `application-store.tsx` holds global state (`currentProjectId`, `projectList`, `currentRoutes`, `selectedRouteId`, `mapEngine`). Only `currentProjectId` is persisted to localStorage.
- `src/components/` — Shared components (must include usage docs). `src/components/ui/` holds shadcn/ui base components.
- `src/utils/` — Constants, enum mappings, coordinate transforms, GeoJSON helpers, waypoint field definitions.
- `src/env.js` — Zod-validated environment variables via `@t3-oss/env-nextjs`.

### Enum Constants Pattern

All status enums follow this three-file pattern:

```typescript
// src/utils/constants.ts
export const TASK_STATUS_PENDING = "PENDING" as const
export const TASK_STATUS_VALUES = [TASK_STATUS_PENDING, ...] as const
export type TaskStatusType = (typeof TASK_STATUS_VALUES)[number]

// src/server/db/schema.ts
export const taskStatusEnum = pgEnum("task_status", TASK_STATUS_VALUES)

// src/utils/enum-mapping.ts
export const TASK_STATUS_MAP: Record<TaskStatusType, string> = { PENDING: "待处理" }
```

Never use magic strings; always reference constants.

## Mandatory Coding Rules

These rules are enforced by Biome and project convention — no exceptions.

### Arrow Functions Only

The `function` keyword is **banned** everywhere in this codebase.

```typescript
// ✅ Correct
const fetchData = async (): Promise<Data> => {
  return await fetch('/api/data').then(res => res.json())
}
const HomePage = () => <div>Home</div>

// ❌ Banned
function fetchData() { ... }
function HomePage() { ... }
```

Next.js App Router pages export default arrow functions:

```typescript
export default () => {
  return <main>Page</main>
}
```

### No `any` / `unknown` Types

Use interfaces, generics, or union types instead:

```typescript
// ✅ Correct
interface User { id: string; name: string }
type Status = 'success' | 'error' | 'loading'

// ❌ Banned
const x: any = ...
const y: unknown = ...
```

### tRPC Type Imports

Always derive types from the tRPC client — never hand-write parallel interfaces:

```typescript
import { type RouterOutputs } from "@/trpc/react"
type ProjectData = RouterOutputs["project"]["page"]["data"][number]
```

### Biome Formatting

- Max line width: 180 characters
- Semicolons: only when syntactically required (`asNeeded`)
- Trailing commas: **banned** everywhere
- Indentation: spaces only (no tabs)
- Import order: third-party libraries → local modules → styles (auto-organized)

### Component Organization

- Before creating a component, search `src/components/` to avoid duplication.
- If a component may be reused across pages → place in `src/components/` with usage docs.
- If a component is page-local → place in the page's `_components/` directory.

### Library Requirements

| Purpose | Required | Banned alternatives |
|---------|----------|---------------------|
| UI components | shadcn/ui | Ant Design, MUI, Chakra UI |
| Forms | @tanstack/react-form | react-hook-form, Formik |
| Tables | @tanstack/react-table | other table libs |
| Auth | better-auth | NextAuth, Auth.js, Clerk |
| Icons | lucide-react (check `src/components/ui/` first) | FontAwesome, Material Icons |
| Package manager | pnpm | npm, yarn |

### Error Handling

All async operations must use try/catch. Uncaught Promise rejections are banned. Validate inputs with Zod schemas (defined in `src/server/validations.ts`).

### Documentation

- Key logic: `//` inline comments; complex functions: JSDoc
- REST API changes: update `public/openapi/openapi.json` with Chinese field descriptions
- No separate markdown docs — all documentation lives as code comments
- This project uses **Biome**, not Prettier — do not create `.prettierrc`

## Authentication

Better Auth handles sessions. `createTRPCContext` (in `src/server/api/trpc.ts`) fetches the session via `auth.api.getSession`; it is available as `ctx.session`. `protectedProcedure` throws `UNAUTHORIZED` when no session exists. API Keys (when `enableSessionForAPIKeys: true`) automatically create sessions; default rate limit is 1000 requests/day per key.

## Mobile-First Design

Detect responsive behavior via `use-mobile.ts` hook (breakpoint: 768px / `md`). On mobile use drawer patterns (Vaul) for Sheet/Dialog; on desktop use overlays and popovers.

## Environment Variables

Copy `.env.example` to `.env`. Required:
- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — session signing secret
- `BETTER_AUTH_GITHUB_CLIENT_ID` / `BETTER_AUTH_GITHUB_CLIENT_SECRET` — GitHub OAuth credentials
