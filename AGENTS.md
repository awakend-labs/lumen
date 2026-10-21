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
- Prefer default browser text selection styling; do not add custom `::selection` highlight colors.
- Use only `rounded-sm` and `rounded-md` for border radius across the whole app (inputs, cards, buttons, dialogs); avoid larger radius utilities.
- Keep UI tweaks scoped to what the user asked for; do not restyle, shrink, or re-layout surrounding areas when only a small change (e.g. a gradient or spacing) is requested.

## Learned Workspace Facts

- Lumen is a Next.js 16 App Router API documentation app (projects, stashes, endpoints); scope is documentation only, not billing, marketplace, or AI features.
- Stack: TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zod, Better Auth, Neon PostgreSQL, and Drizzle ORM (Neon HTTP driver via `drizzle-orm/neon-http`; the DB client is created lazily so Cloudflare Worker env is populated first).
- Authentication is email and password only; Google OAuth is not used.
- Project invitations are copyable share links; outbound invite email is not implemented.
- Code is organized feature-first under `src/features/` with shared `src/db/`, `src/server/`, and `src/lib/`.
- Authenticated workspace UI uses a collapsible sidebar shell (`SidebarProvider`, `AppSidebar`) with inset main content and a sticky header.
- Endpoint grid/list view preference is stored in the `user_preferences` table and exposed via `/api/preferences`.
- Production deploy targets Cloudflare Workers using `@opennextjs/cloudflare` (`pnpm preview`, `pnpm deploy`, Wrangler); Drizzle migrations run locally via `pnpm db:migrate` (`drizzle-kit migrate`) against Neon, not in the Worker. Worker env must include secrets such as `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `NEXT_PUBLIC_APP_URL`.
- Project `baseUrl` is stored in Postgres on `projects`; owners set or change it in the create/edit dialog and on project settings (`ProjectBaseUrlSettings`); new endpoints default to this URL (each endpoint may override).
- Project status (`documented` or `in_progress`) is stored in the Postgres `projects.status` column, changed from the project page and create/edit dialog (dashboard cards show status read-only), and filterable on the dashboard.
- Stash status (`in_development`, `active`, `testing`, or `deprecated`) is stored in Postgres on `stashes.status` and is editable per stash.
- Endpoints have a `version` field (e.g. `v1`, `v2`) for route versioning, stored in Postgres on `endpoints.version`.
