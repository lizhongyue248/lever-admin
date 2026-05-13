# AGENTS.md

This file provides guidance to Codex and other coding agents when working in this repository.

## Product Source of Truth

- Product requirements live in `prd/`.
- Each file in `prd/` describes one page, including scope, layout, user actions, interfaces, server logic, implementation notes, and acceptance criteria.
- Before implementing or changing a page, read the matching PRD file first.
- Every behavior, layout, route, interface, or interaction change must update the matching PRD in the same work session.
- Any page-level layout, route, interaction, or user-visible UI change must be designed in pencli first and confirmed by the user before coding begins.
- If implementation details conflict with a PRD, prefer the PRD and call out the conflict before making broad architecture changes.
- Keep the first version focused on the identity and permission management product described in `prd/`.

## Product Scope

Build `lever-admin`, a lightweight identity, organization, permission, and API key management admin system.

The product should focus on Better Auth-native capabilities:

- Authentication: sign in, sign up, email verification, password reset, OAuth, Magic Link or OTP where specified.
- Account security: password change, sessions, 2FA, passkeys, linked OAuth accounts.
- Admin user management: user list, user detail, role changes, banning, unbanning, password reset, session revocation, impersonation where specified.
- Organization management: organizations, active organization, members, invitations, roles.
- Team management: teams inside organizations and team membership.
- Developer auth: API key management and bearer/JWT-oriented access where specified.

Out of scope for the first version unless the user explicitly asks:

- Menu management
- Dictionary management
- File center
- Scheduled jobs
- Workflow
- CRM, ERP, mall, MES, AI, IoT, reporting, payment, or map business modules

## Commands

```bash
# Development
pnpm dev              # Start Next.js dev server
pnpm build            # Production build
pnpm start            # Start production server
pnpm preview          # Build and start production server

# Type checking and linting
pnpm typecheck        # TypeScript validation
pnpm check            # Biome lint + format check
pnpm check:write      # Apply safe Biome fixes
pnpm check:unsafe     # Apply Biome unsafe fixes

# E2E testing
pnpm test:e2e         # Playwright E2E with Testcontainers PostgreSQL
pnpm test:e2e:ui      # Open Playwright UI mode
pnpm test:e2e:headed  # Run Playwright with visible browser
pnpm verify:e2e       # typecheck + check + build + E2E

# Database
pnpm db:generate      # Generate Drizzle migration files; do not run during dependency/config prep
pnpm db:migrate       # Apply migrations
pnpm db:push          # Push schema directly, dev only
pnpm db:studio        # Open Drizzle Studio
```

Playwright E2E tests are configured under `e2e/`. They use Testcontainers PostgreSQL, so Docker must be running before `pnpm test:e2e`. E2E tests must use the Testcontainers database and must not point at the local development `DATABASE_URL`.

## Current Tech Stack

The repository is a Create T3-style Next.js application:

- React 19
- Next.js 16 App Router
- TypeScript strict mode
- tRPC 11
- TanStack Query
- PostgreSQL
- Drizzle ORM and Drizzle Kit
- Better Auth 1.3+
- Tailwind CSS 4
- Biome
- Zod
- `@t3-oss/env-nextjs`

Important: this repository currently uses Drizzle, not Prisma. If a PRD mentions Prisma, treat that as product-level planning language and follow the existing Drizzle setup unless the user explicitly asks to migrate ORM.

During dependency/configuration prep work, do not run `pnpm db:generate`, `pnpm db:migrate`, or `pnpm db:push` unless the user explicitly asks.

## Key Directories

- `prd/` — page-level PRDs. Read these first.
- `src/app/` — Next.js routes. Server Components by default. Page-local components go in `_components/`.
- `src/app/(auth)/_components/` — components shared by multiple public auth pages, such as auth layout shells, shared panels, shared OAuth controls, and shared status UI.
- `src/app/(auth)/<route>/_components/` — components used by only one public auth page, such as a route-specific form or page-specific state component.
- `src/app/api/auth/[...all]/` — Better Auth route handler.
- `src/app/api/trpc/` — tRPC route handler.
- `src/server/api/` — tRPC context, middleware, root router, and routers.
- `src/server/db/` — Drizzle schema and database connection.
- `src/server/better-auth/` — Better Auth config, server helpers, and client.
- `src/trpc/` — tRPC React Query and RSC helpers.
- `src/styles/` — global styles.
- `src/env.js` — Zod-validated environment variables.

## Architecture Rules

### Better Auth

- Better Auth owns authentication, sessions, organization, admin, passkey, 2FA, and API key features.
- Keep Better Auth handlers under `/api/auth/[...all]`.
- Use Better Auth server APIs for session validation in Server Components, Route Handlers, and tRPC context.
- Use official Better Auth plugins instead of custom auth logic.
- When a plugin requires server and client configuration, configure both sides.
- After schema-affecting Better Auth changes, update Drizzle schema and migrations consistently.

Expected plugins, depending on the PRD page:

- Admin
- Organization
- API Key
- Two-Factor Authentication
- Passkey
- Magic Link
- Email OTP
- Generic OAuth
- JWT or Bearer

### tRPC

- tRPC owns product-level aggregation, admin screens, dashboard data, and application-specific server procedures.
- Prefer small, typed procedures over broad multi-purpose handlers.
- Do not duplicate Better Auth internals in tRPC. Wrap or aggregate only when the UI needs product-specific behavior.

### Authorization

- Every protected tRPC procedure must validate session server-side.
- Every admin procedure must validate platform role server-side.
- Every organization procedure must validate organization membership server-side.
- Every organization admin or owner action must validate the user's organization role server-side.
- Middleware/proxy may be used for optimistic redirects only. Do not rely on cookie existence as authorization.
- Never rely on hidden UI alone for security.

## Page Implementation Rules

Each page should follow its matching PRD and include:

- Loading, empty, error, forbidden, and success states.
- Zod validation for inputs.
- Server-side authorization for every sensitive action.
- Confirmation dialogs for destructive or high-risk actions.
- Toast feedback for user-triggered mutations.
- Accessible labels, focus states, and keyboard-friendly controls.

Layout expectations:

- Public auth pages use an auth-focused layout.
- Authenticated pages use an app layout with topbar, sidebar, and main content.
- Tables should support search, filtering, pagination, and empty states when the PRD asks for them.
- Mobile views must remain usable. Sidebars should collapse into drawers and dense tables should become responsive lists or cards.

### Public Auth Pages

- Implement `prd/01-sign-in.md` through `prd/05-verify-email.md` from `prd/00-auth-pages-design.md`.
- Use `src/app/(auth)/` as the route group for public auth pages.
- Shared auth components belong in `src/app/(auth)/_components/`.
- Page-specific auth components belong in each page's `_components/` directory.
- Keep `page.tsx` focused on route composition, server redirects, and search param wiring.
- Use `@tanstack/react-form` for auth forms and Zod for validation. Do not introduce `react-hook-form`.
- The left auth illustration is a full-height desktop-only image background. Use distinct light and dark assets per page from `public/auth/`.
- Theme switching uses `next-themes` with `attribute="class"`, `defaultTheme="system"`, and `enableSystem`.
- Keep the theme toggle fixed at the page top-right, outside the form card.
- Do not enable Better Auth advanced plugins until matching Drizzle schema and migrations are ready.
- Do not run `pnpm db:generate`, `pnpm db:migrate`, or `pnpm db:push` while implementing these pages unless the user explicitly asks.

## Coding Rules

### Arrow Functions Only

Do not use the `function` keyword.

```typescript
const fetchData = async (): Promise<Data> => {
  return await loadData()
}

export default () => {
  return <main>Page</main>
}
```

### Avoid `any` and `unknown`

Use interfaces, inferred types, generics, discriminated unions, and tRPC-derived types.

```typescript
import { type RouterOutputs } from "@/trpc/react"

type UserRow = RouterOutputs["admin"]["user"]["list"]["items"][number]
```

### Formatting

- Use Biome, not Prettier.
- Do not add `.prettierrc`.
- Let Biome organize imports and formatting.
- Keep imports ordered by tooling.

### Components

- Search existing components before creating new ones.
- Prefer shadcn/ui components from `src/components/ui` for common UI primitives before writing custom implementations.
- If a needed shadcn/ui primitive is missing, install or add that component instead of hand-rolling the primitive.
- Components shared by several pages within one route group belong in that route group's `_components/` directory. For example, components shared by `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, and `/verify-email` belong in `src/app/(auth)/_components/`.
- Components used by only one page belong in that page's own `_components/` directory. For example, login-only components belong in `src/app/(auth)/sign-in/_components/`.
- Global reusable components belong in `src/components/` only when they are intentionally usable across unrelated product areas.
- Do not put all page logic into `page.tsx`. Keep `page.tsx` focused on route-level composition, redirects, and search param wiring; move forms, stateful client logic, and page-specific UI into components.
- Keep each component file under 500 lines. Split large files by responsibility before they become hard to review.
- Prefer lucide-react icons only after adding the dependency or confirming it exists.

### Forms and Tables

- Use the libraries already installed unless the user asks to add another dependency.
- Validate form inputs with Zod.
- For tables, prefer TanStack Table if added; otherwise keep simple typed table components until the dependency is introduced.

## Data and Security Rules

- API keys must show plaintext only once immediately after creation.
- Store and display only masked API key values after creation.
- Do not expose full session tokens to the client.
- Banning a user should revoke active sessions when the PRD requires it.
- High-risk operations include deleting users, deleting organizations, banning users, resetting passwords, revoking all sessions, disabling 2FA, deleting passkeys, and impersonation.
- Error messages should be useful but should not leak sensitive account existence details.

## Development Workflow

- Read the relevant PRD before implementing.
- For any page change, use pencli to update or create the relevant design in `prd/`, ask the user to confirm it, and only then implement the code.
- Update the relevant PRD whenever you change product behavior, page layout, routes, API calls, validation, redirects, or user-visible states.
- Keep changes scoped to the requested page or module.
- Follow existing project conventions.
- Add or update tests if tests are introduced for the touched area.
- Run relevant verification before claiming completion.

## Verification Expectations

Before reporting work as complete, run the relevant checks:

- `pnpm typecheck`
- `pnpm check`
- `pnpm build` when practical or when routing/build behavior changed

If a command cannot be run, state exactly why.

## Environment Variables

Copy `.env.example` to `.env`.

Common variables:

- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Better Auth secret
- `BETTER_AUTH_GITHUB_CLIENT_ID` / `BETTER_AUTH_GITHUB_CLIENT_SECRET` — GitHub OAuth credentials when GitHub login is enabled

## Documentation

- Keep product requirements in `prd/`.
- If implementation intentionally differs from a PRD, update the PRD or add a clear implementation note.
- Prefer concise inline comments for non-obvious code. Avoid comments that restate the code.
