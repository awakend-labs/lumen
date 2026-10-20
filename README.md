# Lumen

A clear home for the API you already ship.

Lumen is a documentation workspace. Sign in, open a project, and keep every route where the next person can find it: the path, the payload, and who is allowed to change the page.

- 📁 **Projects** hold one API, its base URL, and the people on it.
- 🎨 **Stashes** group related routes and wear a color so a section is easy to spot.
- 🧭 **Endpoints** record the method, path, version, parameters, a markdown description, and a JSON example.
- 📋 Browse them as cards or a compact list. Copy a cURL command, or paste one in to start a draft.
- 🔗 Send a link when someone should edit, or only read.

## Get going

You need [pnpm](https://pnpm.io), Node, and a [Neon](https://neon.tech) Postgres URL.

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
| `pnpm dev` | Local Next.js |
| `pnpm lint` | ESLint |
| `pnpm test` | The small test suite |
| `pnpm db:generate` | Write a Drizzle migration |
| `pnpm db:migrate` | Apply migrations (your machine, not the Worker) |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm preview` | OpenNext build, then a local Workers preview |
| `pnpm deploy` | OpenNext build, then Cloudflare Workers |

Production runs on Cloudflare Workers via `@opennextjs/cloudflare`. Put `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `NEXT_PUBLIC_APP_URL` on the Worker. Point both URL vars at the live origin, then migrate the database from your machine before you ship schema changes.
