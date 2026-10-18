<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Learned User Preferences

- Do not persist app-related state in the browser; Postgres is the source of truth for projects, collaboration data, and user preferences (display-only theme via next-themes is fine).
- Use pnpm for installs, scripts, and CI-style commands in this repo.

## Learned Workspace Facts

- Lumen is a Next.js 15 App Router API documentation app (projects, stashes, endpoints); scope is documentation only, not billing, marketplace, or AI features.
- Stack: TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zod, Better Auth, Neon PostgreSQL, and Drizzle ORM (Neon WebSocket pool for Better Auth transactions).
- Authentication is email and password only; Google OAuth is not used.
- Project invitations are copyable share links; outbound invite email is not implemented.
- Code is organized feature-first under `src/features/` with shared `src/db/`, `src/server/`, and `src/lib/`.
- Endpoint grid/list view preference is stored in the `user_preferences` table and exposed via `/api/preferences`.
- Production deploy targets Cloudflare Workers using `@opennextjs/cloudflare` (`pnpm preview`, `pnpm deploy`, Wrangler); run Drizzle migrations outside the Worker.
