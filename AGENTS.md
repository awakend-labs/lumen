<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Learned User Preferences

- Do not persist app-related state in the browser; Postgres is the source of truth for projects, collaboration data, and user preferences (display-only theme via next-themes is fine).
- Use pnpm for installs, scripts, and CI-style commands in this repo.
- Use yellow as the primary accent on soft charcoal surfaces in dark mode and white surfaces in light mode (avoid pure black backgrounds).
- Prefer modern, polished UI with icons and accent colors wherever they fit.

## Learned Workspace Facts

- Lumen is a Next.js 15 App Router API documentation app (projects, stashes, endpoints); scope is documentation only, not billing, marketplace, or AI features.
- Stack: TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zod, Better Auth, Neon PostgreSQL, and Drizzle ORM (Neon HTTP driver via `drizzle-orm/neon-http`; the DB client is created lazily so Cloudflare Worker env is populated first).
- Authentication is email and password only; Google OAuth is not used.
- Project invitations are copyable share links; outbound invite email is not implemented.
- Code is organized feature-first under `src/features/` with shared `src/db/`, `src/server/`, and `src/lib/`.
- Endpoint grid/list view preference is stored in the `user_preferences` table and exposed via `/api/preferences`.
- Production deploy targets Cloudflare Workers using `@opennextjs/cloudflare` (`pnpm preview`, `pnpm deploy`, Wrangler).
- Drizzle migrations run from the local machine via `pnpm db:migrate` (`drizzle-kit migrate`) against Neon, not inside the Worker.
- Cloudflare Worker env must have its own secrets (e.g. `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`); a missing variable there caused sign-up 500 errors in production.
- Project status (`documented` or `in_progress`) is stored in the Postgres `projects.status` column, toggled from project cards, and filterable on the dashboard.
- Stash status (`in_development`, `active`, `testing`, or `deprecated`) is stored in Postgres on `stashes.status` and is editable per stash.
- Endpoints have a `version` field (e.g. `v1`, `v2`) for route versioning, stored in Postgres on `endpoints.version`.
