---
name: Lumen API Docs Build
overview: Scaffold Lumen as a Next.js 15 App Router app with Neon/Drizzle/Better Auth, then build auth, Project > Stash > Endpoint CRUD, Grid/List views, and collaboration with roles.
todos:
  - id: scaffold
    content: Scaffold Next.js 15 + TS + Tailwind + ESLint, init shadcn/ui, install deps, set up next-themes and providers
    status: completed
  - id: db-auth
    content: Define Drizzle schema (Better Auth + app tables with indexes), Neon client, drizzle config, generate and commit migrations
    status: completed
  - id: better-auth
    content: Configure Better Auth with Drizzle adapter, API route, client, middleware protection, login/signup pages
    status: completed
  - id: projects
    content: "Projects CRUD: dashboard cards, create/edit/delete dialogs, skeletons and empty states"
    status: completed
  - id: stashes
    content: Stashes CRUD with color, drag-to-reorder (dnd-kit, optimistic), stash pages
    status: completed
  - id: endpoints
    content: Endpoint CRUD with full Zod form, markdown preview, JSON examples, Grid/List views with persisted toggle, detail sheet/page with copy buttons and Try-it placeholder
    status: completed
  - id: collab
    content: "Members and invitations: invite form, pending list, revoke, accept flow at /invite/[token], role enforcement everywhere"
    status: completed
  - id: polish
    content: Dark/light visual polish, Framer Motion micro-interactions, error/not-found pages, README and .env.example, lint and build verification
    status: completed
isProject: false
---

# Lumen: Build Plan

The target directory `Z:\AwakendLabs\lumen` is empty, so this is a greenfield scaffold. Work proceeds in phases, and each phase leaves the app runnable.

## Stack and scaffold

- `npx create-next-app@latest` with TypeScript, Tailwind, ESLint, App Router, `src/` dir, and `pnpm`.
- Run `npx shadcn@latest init` (New York style, CSS variables). Add components: button, card, input, label, form, dialog, sheet, dropdown-menu, badge, tabs, table, skeleton, sonner, select, textarea, tooltip, avatar, separator, switch.
- Add deps: `@tanstack/react-query`, `zod`, `lucide-react`, `next-themes`, `framer-motion`, `react-markdown` + `remark-gfm` (description preview), `@dnd-kit/core` + `@dnd-kit/sortable` (stash reorder), `drizzle-orm`, `@neondatabase/serverless`, `better-auth`. Dev deps: `drizzle-kit`, `dotenv`.

## Folder structure (features-based)

- `src/db/` : `index.ts` (Neon HTTP client + drizzle), `schema/auth.ts` (Better Auth tables), `schema/app.ts` (projects, stashes, endpoints, project_members, invitations), `schema/index.ts`.
- `src/lib/auth.ts` (betterAuth with drizzleAdapter, `nextCookies()` plugin), `src/lib/auth-client.ts`, `src/lib/validators/*.ts` (Zod), `src/lib/permissions.ts` (role checks).
- `src/features/projects`, `features/stashes`, `features/endpoints`, `features/members`, `features/invitations`: each has `api.ts` (fetch wrappers), `queries.ts` (TanStack hooks), `components/`.
- `src/app/api/auth/[...all]/route.ts` and `src/app/api/...` route handlers, or Server Actions for mutations.
- `src/middleware.ts` for protecting `/dashboard` and `/projects/*`.

## Database (Drizzle + Neon)

- Better Auth tables generated via `npx @better-auth/cli generate --output src/db/schema/auth.ts` (user, session, account, verification).
- App tables: `projects` (id uuid, name, description, slug unique, ownerId FK user, timestamps), `stashes` (projectId FK cascade, name, description, color, order int, timestamps; index on projectId+order), `endpoints` (stashId + projectId FK cascade, name, method enum, path, description, headers/queryParams/pathParams/requestBody/responses jsonb, tags text[], isDeprecated, order, timestamps; indexes on stashId, projectId), `project_members` (unique projectId+userId, role enum owner|editor|viewer, invitedBy), `invitations` (projectId, email, role, token unique, expiresAt, status enum pending|accepted|expired; index on token and projectId).
- `drizzle.config.ts`, `npm run db:generate` and `db:migrate`. Migrations committed under `drizzle/`.

## Auth

- Better Auth email + password, session cookies, `nextCookies()` plugin for server actions.
- Pages `/login`, `/signup` with react-hook-form + Zod, premium split layout, subtle Framer Motion.
- Google OAuth only if chosen in the question above.
- Middleware redirects unauthenticated users; `/` redirects to `/dashboard` or `/login`.

## Projects, Stashes, Endpoints

- Authorization is enforced server-side in every route handler via `permissions.ts`: owner (all), editor (stashes/endpoints CRUD), viewer (read).
- `/dashboard`: project cards with skeletons and an empty state. Create/edit/delete in dialogs.
- `/projects/[projectId]`: stash sections with color accents, drag-to-reorder stashes (dnd-kit, optimistic update), endpoint count, Grid/List toggle (stored in `localStorage` via a small hook; the preference is persisted).
- `/projects/[projectId]/stashes/[stashId]`: endpoints for that stash, Grid/List toggle, create/edit endpoint.
- Endpoint form: a single Zod schema covering every field. Headers, query/path params, and responses use field arrays. Request body and response bodies use JSON textareas validated with `JSON.parse` plus a Zod refinement. Description is markdown with a live preview tab.
- Endpoint detail: a right-side `Sheet` (URL `?endpoint=<id>` so it is shareable), or the dedicated page `/projects/[projectId]/endpoints/[endpointId]`. It shows headers, params, body, responses with status-code badges, copy buttons, and a disabled "Try it" panel marked as a placeholder.
- Method colors: GET blue, POST green, PUT/PATCH amber, DELETE red, OPTIONS/HEAD neutral.

## Collaboration

- `/projects/[projectId]/settings`: members list with role changes and removal (owner only), plus invite form (email + role Editor/Viewer).
- Invitation token = `crypto.randomUUID()` plus 7-day expiry. Delivery follows the choice above (copyable link and/or Resend).
- `/invite/[token]`: if signed out, redirect to login with a return URL. On accept, validate the token, email match, and expiry, then insert into `project_members` and mark the invite accepted.
- Pending invitations list with revoke action.

## TanStack Query

- A global `QueryClient` in a providers file (ThemeProvider, QueryClientProvider, Toaster, TooltipProvider).
- Query keys per feature. Mutations use optimistic updates for stash reorder, endpoint reorder, and endpoint delete. Others invalidate.

## Theming and polish

- next-themes with `attribute="class"`, system default, and a toggle in the header. Tailwind v4 CSS variables tuned for a calm palette in both light and dark modes.
- Skeletons on every loading state, helpful empty states with a primary action, error boundaries (`error.tsx`) and `not-found.tsx`.

## Deliverables

- `.env.example`: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, plus `RESEND_API_KEY` / `RESEND_FROM` and Google vars if chosen.
- README: create a Neon project, copy the connection string, generate the secret with `openssl rand -base64 32`, run `pnpm install`, `pnpm db:migrate`, `pnpm dev`.
- Verification: `pnpm lint`, `pnpm build`, and a manual smoke test of signup, create project, stash, endpoint, invite, and accept.

## Caveats

- A working Neon connection string is needed to run migrations and smoke tests. The build can be scaffolded and type-checked without it.
- "Try it" is UI only, per the spec.
