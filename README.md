# Lumen

Lumen is a API documentation app backed by Postgres. You organize a project's endpoints into colored stashes, browse them as cards or a compact list, and invite editors or viewers with a shareable link.

## Stack

- Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui
- TanStack Query, Zod, Better Auth
- PostgreSQL on Neon, Drizzle ORM (lazy Neon HTTP driver)

## Setup

1. Create a Neon project and copy the Postgres connection string.
2. Copy the environment file and fill it in:

```bash
cp .env.example .env
```

3. Generate an auth secret and put it in `BETTER_AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

On macOS or Linux you can use `openssl rand -base64 32` instead.

4. Install dependencies, apply the database migrations, and start the app:

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string |
| `BETTER_AUTH_SECRET` | Signs session cookies |
| `BETTER_AUTH_URL` | Origin Better Auth uses for callbacks |
| `NEXT_PUBLIC_APP_URL` | Origin used when building invitation links |

## Scripts

- `pnpm dev` starts the app (Next.js dev server)
- `pnpm build` creates a standard Next.js production build
- `pnpm preview` builds with OpenNext and runs the app in the Workers runtime locally
- `pnpm deploy` builds with OpenNext and deploys to Cloudflare Workers (requires Wrangler login)
- `pnpm lint` runs ESLint
- `pnpm db:generate` writes a new Drizzle migration from the schema
- `pnpm db:migrate` applies migrations (run locally or in CI, not on the Worker)
- `pnpm db:studio` opens Drizzle Studio

## cURL requests

Choose **Import cURL** in a project or stash, or on the new endpoint form. Paste a single Bash-style cURL command, review the extracted fields, choose a stash, and save the endpoint. Importing never executes the command. Common authentication headers, cookies, and token query values become placeholders.

Imports support HTTP methods, headers, query and path parameters, JSON, URL-encoded forms, literal multipart fields, and plain-text bodies. Unsupported flags, multiple URLs, and file references show an error instead of importing an incomplete request.

Every endpoint viewer includes a copyable **cURL** request generated from its saved fields and project authentication settings. Set **Server URL** when creating or editing an endpoint to use your actual host; otherwise replace `https://api.example.com` in the command. Generated commands use Bash/zsh quoting and `YOUR_` placeholders for missing examples and credentials. Migration `0005_endpoint_curl_server_url` adds the optional server URL.

## Deploy on Cloudflare Workers

Lumen uses [@opennextjs/cloudflare](https://opennext.js.org/cloudflare/get-started). Do **not** deploy with `pnpm build` alone.

### One-time: local preview

```bash
cp .dev.vars.example .dev.vars
# Fill in the same values as .env (use http://localhost:8787 for auth URLs when using preview)
pnpm preview
```

OpenNext works best on macOS/Linux or WSL; on Windows, use WSL if preview fails.

### Connect GitHub (Workers Builds)

In the Cloudflare dashboard when creating the app from `awakend-labs/lumen`:

| Setting | Value |
| --- | --- |
| Package manager | `pnpm` |
| Build command | `pnpm install && pnpm exec opennextjs-cloudflare build` |
| Deploy command | `pnpm exec opennextjs-cloudflare deploy` |

Add **Variables and secrets** (Production and Build):

| Variable | Secret |
| --- | --- |
| `DATABASE_URL` | Yes — Neon `postgresql://…` connection string (required at runtime; missing values break sign-up) |
| `BETTER_AUTH_SECRET` | Yes |
| `BETTER_AUTH_URL` | No — `https://<your-worker>.workers.dev` or custom domain |
| `NEXT_PUBLIC_APP_URL` | No — same as `BETTER_AUTH_URL` |

After the first deploy, set both URL variables to the live origin and redeploy so sign-in and invite links work.

Run `pnpm db:migrate` against your Neon database from your machine when the schema changes; migrations are not run during Worker deploy.

### CLI deploy

```bash
pnpm exec wrangler login
pnpm deploy
```

Set secrets in the dashboard or with `wrangler secret put DATABASE_URL` (and `BETTER_AUTH_SECRET`). Plain vars can go in the dashboard or `wrangler.jsonc` `[vars]` (avoid committing secrets).

Optional: enable R2 incremental cache — see [OpenNext caching](https://opennext.js.org/cloudflare/caching).

## Using Lumen

Sign up with email and password. Create a project, add stashes, and document endpoints with methods, parameters, markdown descriptions, and JSON examples. The grid and list toggle is saved on your account in the database.

Project owners can invite an editor or a viewer from project settings. Lumen shows a link to copy. The invited person signs in with that email and accepts at `/invite/[token]`. Invitations expire after 7 days.

Owners manage the project. Editors change stashes and endpoints. Viewers can read.

The "Try it" panel on an endpoint is a placeholder and does not send a request.

## Endpoint documentation improvements

- Duplicate from endpoint actions to open a prefilled new form; update the name or version and method/path before saving.
- Workspace search (Ctrl/Cmd K) searches only projects the signed-in user belongs to.
- Project settings define Bearer/JWT, API key, or Basic authentication documentation. Each endpoint declares public, authenticated, or admin-only access. This documents the external API; it does not change Lumen membership roles.
- Parameter and body fields support type, enum, default, format, and min/max. Detail pages show field tables alongside JSON schemas and examples.
- Both {id} and :id route placeholders create required path fields. Spaces, fragments, and query strings are rejected in paths.
- Names are unique within a project/version (case insensitive); method + canonical path is unique within a project/version, including across stashes.
- Unsaved forms warn on refresh, closing the tab, Cancel, and link navigation. Drafts are not persisted.

### Migration

Run pnpm db:migrate locally before deploying this version. The new migration adds project auth and endpoint access, and unique endpoint indexes. Existing duplicate names/routes must be resolved first; the migration intentionally does not delete or rename documentation. Never run migrations inside a Worker.
