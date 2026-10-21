# Lumen

A clear home for the API you already ship.

Lumen is a documentation workspace. Sign in, open a project, and keep every route where the next person can find it: the path, the payload, and who is allowed to change the page.

- 📁 **Projects** hold one API, its base URL, and the people on it.
- 🎨 **Stashes** group related routes and wear a color so a section is easy to spot.
- 🧭 **Endpoints** record the method, path, version, parameters, a markdown description, and a JSON example.
- 📋 Browse them as cards or a compact list. Copy a cURL command, or paste one in to start a draft.
- 🔗 Send a link when someone should edit, or only read.

## Get going

You need [pnpm](https://pnpm.io) 10.5.2, Node.js 20.9 or newer, and a [Neon](https://neon.tech) Postgres URL. Lumen uses Next.js 16.4.2.

```bash
cp .env.example .env
pnpm install
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Mint a session secret and drop it in `BETTER_AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

| Variable | What it's for |
| --- | --- |
| `DATABASE_URL` | Neon connection string |
| `BETTER_AUTH_SECRET` | Signs session cookies |
| `BETTER_AUTH_URL` | Origin Better Auth calls home to |
| `NEXT_PUBLIC_APP_URL` | Origin used in invite links |

## The good stuff

- Browse endpoints as cards or a tight list. That choice sticks to your account.
- Paste a cURL command to draft an endpoint. Lumen reads it. It never runs it.
- Every endpoint page hands back a copyable cURL of its own.
- Owners invite editors or viewers with a link. Links expire after 7 days.
- Search is `Ctrl/Cmd K`, and it only sees projects you belong to.

## Scripts worth knowing

| Command | Does |
| --- | --- |
| `pnpm dev` | Local Next.js with Webpack |
| `pnpm dev:turbo` | Opt-in Turbopack development; ordinary `dev` remains available |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript validation |
| `pnpm build` | ESLint, then a production Webpack build with TypeScript validation |
| `pnpm test` | The small test suite |
| `pnpm db:generate` | Write a Drizzle migration |
| `pnpm db:migrate` | Apply migrations (your machine, not the Worker) |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm preview` | OpenNext build, then a local Workers preview |
| `pnpm deploy` | OpenNext build, then Cloudflare Workers |
| `pnpm build:cloudflare` | Build the Worker artifact once |
| `pnpm preview:built` | Preview the last successful Worker build |
| `pnpm deploy:built` | Deploy the last successful Worker build |
| `pnpm upload:built` | Upload the last successful Worker build |

Production runs on Cloudflare Workers via `@opennextjs/cloudflare`. Put `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `NEXT_PUBLIC_APP_URL` on the Worker. Point both URL vars at the live origin, then migrate the database from your machine before you ship schema changes.

Cloudflare Workers Builds already installs dependencies. Use `pnpm run build:cloudflare` as its build command and `pnpm exec opennextjs-cloudflare deploy` as its deploy command. Avoid an additional install in the build command or a second build in the deploy command. Verify build-cache restore/save messages on consecutive runs in the Cloudflare dashboard. These dashboard settings are not controlled by this repository.

Only use the `:built` commands after a successful build of the current source and build-time environment. Rebuild after either changes. Development and production explicitly retain Webpack; Next.js 16 otherwise defaults to Turbopack. The build script runs ESLint explicitly because Next.js 16 no longer runs it automatically; Next still validates TypeScript. Test `dev:turbo` before adopting it as your usual development command.

Ordinary Next development uses `.env` without starting Cloudflare binding emulation. When testing bindings, set `LUMEN_CF_DEV=1` in the process before running `pnpm dev`. Use OpenNext preview for actual Worker runtime validation.

The landing font is bundled in `public/fonts/plus-jakarta-sans` with its SIL Open Font License. Its existing weight, language subsets, Latin preload and fallback metrics are preserved; builds no longer download it from Google.

Project navigation loads endpoint summaries; detail/edit and duplication load complete endpoint documents separately. **Apply migration `0010_faulty_venus` with `pnpm db:migrate` before deploying this version.** It adds the generated response preview used by summary queries.

See [performance implementation and benchmark results](docs/performance-optimization-progress.md) for all report items, local verification, benchmark commands, and the remaining Cloudflare/staging checks. Next.js 16.4.2 passes OpenNext's maintenance-support check without a bypass. Verify the complete Worker build in Cloudflare's Linux environment before release; native Windows packaging can fail on symbolic-link permissions.
