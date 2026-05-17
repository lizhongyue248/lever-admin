<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="public/logo-light.svg">
    <img alt="Lever Admin logo" src="public/logo.svg" width="96" height="96">
  </picture>
</p>

<h1 align="center">Lever Admin</h1>

<p align="center">
  A lightweight identity, organization, permission, and API key management admin system powered by Better Auth.
</p>

<p align="center">
  <a href="README.zh-CN.md">中文文档</a>
</p>

## Overview

Lever Admin is an admin console for teams that need a focused control plane for authentication and access management. It is built around Better Auth-native capabilities instead of generic business modules, so the first product surface stays close to identity governance: accounts, sessions, organizations, members, invitations, roles, security settings, API keys, platform settings, and request audit logs.

The project follows a PRD-first workflow. Product requirements live in `prd/`, page-level UI is designed with Pencil `.pen` files, and implementation is verified with TypeScript, Biome, production builds, and Playwright E2E tests.

## Use Cases

- Build an internal IAM admin console for a SaaS product.
- Manage user accounts, platform roles, bans, sessions, and security state.
- Manage organizations, members, invitations, active organizations, and organization-level governance.
- Provide self-service and platform-level API key management.
- Configure platform email and file storage providers from the admin UI.
- Collect request logs for audit, risk review, and operational troubleshooting.
- Use the repository as a Better Auth + Drizzle + tRPC reference implementation.

## Product Scope

Current product focus:

- Public auth flows: sign in, sign up, email verification, password reset, OAuth entry points, and 2FA flow.
- Account security: profile, sessions, password/security settings, 2FA, passkeys, and linked OAuth accounts where supported.
- Platform administration: users, organizations, API keys, platform settings, and system request logs.
- Organization management: organization settings, members, invitations, roles, and organization context.
- Developer auth: user and platform API key management.
- Operational settings: email service configuration, storage provider configuration, and test actions.

## Tech Stack

- Framework: Next.js 16 App Router, React 19, TypeScript strict mode
- API: tRPC 11, TanStack Query
- Auth: Better Auth 1.6+ with Drizzle adapter and plugins
- Database: PostgreSQL, Drizzle ORM, Drizzle Kit
- UI: Tailwind CSS 4, shadcn/ui primitives, Radix UI, lucide-react
- Forms and validation: `@tanstack/react-form`, Zod
- Tables: TanStack Table
- Email and storage: Nodemailer, Resend, AWS S3-compatible SDK
- Testing: Playwright E2E, Testcontainers PostgreSQL, Playwright coverage instrumentation
- Tooling: pnpm, Biome, `@t3-oss/env-nextjs`

## Repository Map

```txt
prd/                      Product requirements, page specs, and Pencil designs
src/app/                  Next.js App Router routes
src/app/(auth)/           Public authentication pages
src/app/dashboard/        Authenticated dashboard shell and pages
src/components/           Shared product components
src/components/ui/        shadcn/ui primitives
src/server/api/           tRPC routers and middleware
src/server/better-auth/   Better Auth server config and helpers
src/server/db/            Drizzle schema and database connection
src/server/service/       Product services such as email, storage, and settings
e2e/                      Playwright E2E tests and Testcontainers setup
public/                   Static assets, including logo and favicon files
```

## Getting Started

Install dependencies:

```bash
pnpm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Set at least:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/lever-admin"
BETTER_AUTH_SECRET="your-local-secret"
BETTER_AUTH_URL="http://localhost:4000"
BETTER_AUTH_GITHUB_CLIENT_ID="your-github-client-id"
BETTER_AUTH_GITHUB_CLIENT_SECRET="your-github-client-secret"
```

Push the schema in local development:

```bash
pnpm db:push
```

Start the development server:

```bash
pnpm dev
```

Open:

```txt
http://localhost:4000
```

## Common Commands

```bash
pnpm dev              # Start Next.js dev server on port 4000
pnpm build            # Production build
pnpm start            # Start production server
pnpm preview          # Build and start production server

pnpm typecheck        # TypeScript validation
pnpm check            # Biome lint and format check
pnpm check:write      # Apply safe Biome fixes

pnpm db:push          # Push Drizzle schema directly, dev only
pnpm db:generate      # Generate Drizzle migration files
pnpm db:migrate       # Apply migrations
pnpm db:studio        # Open Drizzle Studio

pnpm test:e2e         # Run Playwright E2E with Testcontainers PostgreSQL
pnpm test:e2e:ui      # Open Playwright UI mode
pnpm test:e2e:coverage # Run E2E coverage instrumentation
pnpm verify:e2e       # typecheck + check + build + E2E
```

Playwright E2E tests use Testcontainers PostgreSQL. Docker must be running before `pnpm test:e2e`.

## Product Documentation

The source of truth for product behavior is `prd/`.

- Read the matching PRD before changing a page.
- Update the matching PRD when changing behavior, layout, routes, API contracts, validation, or user-visible states.
- Use Pencil `.pen` files for page-level visual changes before coding.
- Keep shared component rules in `prd/98-common-components.md`.
- Keep E2E testing rules in `prd/99-e2e-testing-method.md`.

## AI Development and Vibe Coding Workflow

Lever Admin is designed to work well with AI-assisted development while keeping product intent and engineering quality explicit.

Recommended workflow:

1. Describe the intent in product language.
   Start with the user problem, permission model, data source, expected states, and acceptance criteria.

2. Update or create the PRD.
   The PRD is the contract between the product idea, the design, the implementation, and the tests.

3. Design visual changes with Pencil.
   For page-level UI work, update the related `.pen` file in `prd/` and confirm the layout before implementation.

4. Ask the AI agent for an implementation plan.
   A good plan should name files, data changes, API changes, UI states, tests, and verification commands.

5. Implement in small, reviewable steps.
   Keep changes scoped to the relevant page, router, service, schema, or shared component.

6. Verify with real commands.
   At minimum run `pnpm typecheck` and `pnpm check`. Run `pnpm build` for routing, metadata, server, or production-impacting changes. Run relevant Playwright specs for user flows.

7. Review the result against the PRD.
   The work is not complete just because the code compiles. It should match the product behavior, UI states, permissions, and acceptance criteria.

Vibe coding in this project means fast human-AI iteration with a product anchor:

- Human sets direction, trade-offs, and acceptance.
- AI explores the codebase, updates PRDs/designs, proposes plans, implements, and verifies.
- Every substantial UI or behavior change should leave behind a clearer PRD, not just code.
- Every sensitive feature should include server-side authorization, validation, and visible failure states.
- Every table, form, and workflow should reuse established project patterns before adding new abstractions.

Agent-specific working rules are documented in `AGENTS.md`.

## Verification Checklist

Before opening a PR or handing off a branch:

```bash
pnpm typecheck
pnpm check
pnpm build
```

For flow-level changes:

```bash
pnpm test:e2e
```

For coverage inspection:

```bash
pnpm test:e2e:coverage
```

## License

Licensed under the [Apache License 2.0](LICENSE).
