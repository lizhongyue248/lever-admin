# CLAUDE.md

This repository uses `AGENTS.md` as the canonical Codex-readable project instruction file.

Claude Code should follow the same guidance:

- Read `prd/` before implementing any page.
- Keep the first version focused on Better Auth-native identity, organization, permission, team, and API key management.
- Use the current stack: React 19, Next.js 16 App Router, TypeScript, tRPC 11, TanStack Query, PostgreSQL, Drizzle ORM, Better Auth 1.6+, Tailwind CSS 4, Biome, and Zod.
- This project uses Drizzle, not Prisma. Do not migrate ORM unless the user explicitly asks.
- During dependency/configuration prep work, do not run `pnpm db:generate`, `pnpm db:migrate`, or `pnpm db:push` unless the user explicitly asks.
- Use `pnpm typecheck` and `pnpm check` as the primary verification commands.
- For full project rules, read `AGENTS.md`.
