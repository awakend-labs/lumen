# Lumen

Lumen is a local-first API documentation app. You organize a project's endpoints into colored stashes, browse them as cards or a compact list, and invite editors or viewers with a shareable link.

## Stack

- Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui
- TanStack Query, Zod, Better Auth
- PostgreSQL on Neon, Drizzle ORM (Neon WebSocket pool, so Better Auth can use transactions)

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

- `pnpm dev` starts the app
- `pnpm build` creates a production build
- `pnpm lint` runs ESLint
- `pnpm db:generate` writes a new Drizzle migration from the schema
- `pnpm db:migrate` applies migrations
- `pnpm db:studio` opens Drizzle Studio

## Using Lumen

Sign up with email and password. Create a project, add stashes, and document endpoints with methods, parameters, markdown descriptions, and JSON examples. The grid and list toggle is saved on your account in the database.

Project owners can invite an editor or a viewer from project settings. Lumen shows a link to copy. The invited person signs in with that email and accepts at `/invite/[token]`. Invitations expire after 7 days.

Owners manage the project. Editors change stashes and endpoints. Viewers can read.

The "Try it" panel on an endpoint is a placeholder and does not send a request.
