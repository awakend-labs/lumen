# Lumen performance optimization completion record

Updated 21 October 2026. Local implementation and experiments cover the report's code-side recommendations. The user explicitly retained staging benchmarks and Cloudflare configuration/verification. No live database was modified and nothing was deployed.

## Required before deployment

Apply **drizzle/0010_faulty_venus.sql** with `pnpm db:migrate` against the intended database **before deploying this application**. Summary queries require its stored generated response-preview column. This migration was generated and tested locally, not applied to Neon. It backfills existing rows and stays synchronized on writes without application maintenance. Plan its table lock/rewrite on staging for a large database.

The installed OpenNext adapter rejects pinned Next.js 15.5.28 at its maintenance-support check. The framework was not upgraded and the check was not bypassed as a performance shortcut. Resolve compatibility and verify the exact Linux Worker build/preview before promotion. Passing a Next build does not establish Worker-runtime compatibility.

## Every report item

| Item | Local outcome | Platform/staging handoff |
| --- | --- | --- |
| B1 — Pipeline cleanup | Added existing-artifact preview/deploy/upload commands and typecheck. README specifies one install, one OpenNext build, then deployment of that artifact. Existing rebuild commands remain. | Set dashboard build to `pnpm run build:cloudflare` and deploy to `pnpm exec opennextjs-cloudflare deploy`. |
| B2 — Build cache | Isolated benchmark output preserves normal `.next/cache`; generated benchmark files are excluded from Git, lint, and TypeScript. | Verify Workers cache restore/save on consecutive builds and collect cold/warm logs. |
| B3 — Radix imports | Enabled Radix package import optimization. Builds and local dialog/tab/menu checks pass. | Smoke-test packaged Worker. |
| B4 — Local font | Bundled identical font subsets and official SIL license. Weight, Unicode coverage, fallback metrics, Latin preload, and immutable hashed-asset caching remain. | Verify static-asset headers. |
| B5 — Development bundler | Benchmarked both bundlers. Webpack remains default; Turbopack remains opt-in with `dev:turbo` because results were mixed and startup improvement did not reach 30%. Cloudflare binding emulation is development-only with `LUMEN_CF_DEV=1`. | Validate real bindings with preview. |
| B6 — Tailwind discovery | Restricted discovery to application source, retaining animation/shadcn imports. Scanner candidates fell from 4,830 to 3,560; this is not a CSS-size claim. | Check themes and responsive layouts. |
| B7 — Production Turbopack | One first run and three warm builds per bundler. Warm median total Next build: Webpack 33.12s, Turbopack 35.24s. Kept Webpack: the 20% adoption threshold was not met. No experimental persistent cache or minification shortcut. | Compare complete OpenNext packaging/upload and Worker performance on Linux before any future switch. |
| B8 — Quality checks | Retained built-in lint/type checks. All eight comparison builds included checks; no evidence justifies a bypass. Tests remain independently required. No ignore-errors flag was introduced. | Gate release on tests and the validated build of the same commit/environment. |
| R1 — Queries | Cancellation reaches list/summary, endpoint, and preference HTTP requests. Mutations refresh affected summaries/lists and rename/move/group/search dependencies. Deletes remove affected document caches. Invitation acceptance clears summary access failures. Cached search excludes failed summaries. Focus refresh and rollback remain. | Check two real tabs and membership revocation. |
| R2 — Shell hydration | SSR hydrates list/preferences outside AppShell using a fresh QueryClient per request and parallel reads. Tests verify user isolation, no serialized session token, and no added anonymous redirect. | Compare first content and server blocking time. |
| R3 — Editor | Form defaults initialize once. Route/Markdown previews, path synchronization, and body JSON subscribe separately. Parameter rows use narrow control subscriptions; response rows share status metadata and watch their own content/errors. Draft serialization occurs at the 600ms boundary with a change counter, synchronous current-value flushes, and revision/generation/queue guards. | Test recovery/publish/unload with real latency and two tabs. |
| R4 — Response reader | Hidden tabs do no response resolution. Example/schema formatting is memoized, TypeScript conversion runs on Copy, unchanged Markdown/JSON rendering is memoized, and auth labels no longer import settings. | Check large real schemas and shared errors. |
| R5 — Deferred code | Curl import, project error format, move, and rename editors load on demand. Triggers prewarm heavier dialogs where useful. A visible dialog shell handles loading; closing restores focus, including menu-origin dialogs. Motion uses m and LazyMotion/domAnimation with existing animations/reduced-motion policy. | Check first-open behavior and animations in the Worker. |
| R6 — SQL | SQL returns at most two stash previews per project; grouping is linear; project/owner creation uses an atomic Neon batch; reorders use one parameterized set update after existing permission/exact-ID checks. Timestamps and preview order remain. | Verify actual Neon transport/rollback under staging failures. |
| R7 — Summary/document split | Added an authorized summary route and separate summary keys. Navigation/lists/pickers/search/settings use explicit projections. Detail/edit hydrate one targeted authorized full document. Duplication explicitly fetches its full source. Saves keep full documents separate from summaries. The original full-project API remains. Generated preview metadata avoids repeatedly parsing large response JSON. | Apply migration; profile real RSC bytes and Worker CPU. |
| R8 — Search indexes | Added read-only staging-plan tooling requiring explicit staging connection/user variables. No speculative extension, index, trigger, or result-semantics change. The report requires staging plans before adopting indexes. | Run `benchmark:search`, including short searches. Add trigram indexing only if plans justify it; retain original residual predicates. |
| R9 — Worker placement | Evaluated as a platform/network experiment. Retained placement because local timings cannot establish an end-to-end benefit. | Compare a staging Smart Placement Worker from real user geographies and cold/warm Neon cases. |

## Local measurements

Raw results: [runtime](performance-runtime-results.json), [development bundlers](performance-dev-results.json), [production bundlers](performance-build-results.json), [Tailwind scanner](performance-css-results.json).

Runtime fixtures use the installed Neon Drizzle adapter backed by local in-memory PostgreSQL, synthetic response documents, and five measured warm reads after one warmup. They do not simulate network transport or Worker limits.

| Endpoints | Full project JSON | Summary JSON | Full read median | Summary read median |
| ---: | ---: | ---: | ---: | ---: |
| 50 | 899,167 B | 24,717 B | 25.00ms | 10.06ms |
| 500 | 9,055,919 B | 242,819 B | 183.05ms | 22.95ms |
| 2,000 | 36,411,921 B | 973,321 B | 271.25ms | 39.40ms |

The selected full endpoint is 17,856 bytes. At 2,000 endpoints, summary JSON is about 97.3% smaller; gzip sizes are 7,716,811 bytes versus 65,801 bytes. These are local fixture results, not promised production speedups. Earlier trials varied with machine activity; this table uses the final isolated run.

Development warm medians: startup Webpack 3.825s / Turbopack 3.465s; initial editor-related review route 6.549s / 3.867s; landing route 5.758s / 7.111s. These measure server startup/request/compilation, not browser HMR or authenticated route latency. They support keeping the default unchanged.

## Regression evidence

- Final suite: **114 tests passed** (100 before optimization).
- Final production Next build passed, including lint, types, static generation, and tracing. All four Webpack and four Turbopack comparison builds passed built-in checks.
- PostgreSQL migrations and authorization regressions pass. The real Neon Drizzle adapter was exercised against a local transactional transport to prove owner-insert rollback. This is not live HTTP failure injection.
- Summary/full equivalence verifies card metadata, automatic preview updates, absent heavy fields, precise JSON source retention, private/non-cacheable authorized reads, and access errors.
- Cache tests verify HTTP aborts, affected-project refreshes, save separation, deletion cleanup, rollback, and request-local shell hydration.
- Draft tests verify twenty typing changes produce one debounced snapshot, pagehide flushes current values, old in-flight saves cannot label new edits saved, and existing recovery/conflict/discard protections remain.
- Browser fixture: route preview/path synchronization, Markdown preview, custom JSON preservation after field edits, decimal spelling, unversioned duplication with full examples/contracts, response tabs/shared errors/TypeScript-copy success, saved view preferences, card previews, and deferred dialog loading/dismissal/focus restoration passed.
- Browser data and writes were simulated. No live endpoint was edited. The temporary fixture route was removed. `review:performance` recreates it locally; stop normally for cleanup. If forcibly terminated, remove generated `src/app/performance-regression-fixture/page.tsx` before building a release.
- `git diff --check` passes. No dependencies were installed, no lockfile update was needed, and no deployment was performed.

## Commands and release handoff

Use declared pnpm 10.5.2. This environment's pnpm 11 launcher attempted installation before scripts, so checks used `pnpm --config.verify-deps-before-run=false ...` with the existing installed tree.

- `pnpm benchmark:runtime`: isolated 50/500/2,000-endpoint fixtures and summary equivalence.
- `pnpm benchmark:css`: source-discovery candidate/scan comparison.
- `pnpm benchmark:dev` / `pnpm benchmark:build`: sequential experiments in ignored output directories. Run alone on an otherwise idle machine; source/OS/Node differences affect results.
- `pnpm review:performance`: temporary synthetic browser fixture on port 3117.
- `pnpm benchmark:search`: reads only; requires `LUMEN_STAGING_DATABASE_URL` and `LUMEN_STAGING_USER_ID`. Does not load production .env. Plans are saved to ignored `.next-performance/search-plans.json`.

For release: apply the migration, resolve Next/OpenNext support, run tests and a fresh Linux OpenNext build, preview that artifact, then check login/session expiry, roles/invitations/revocation, create/edit/duplicate/move/reorder, drafts/conflicts/unload, JSON/cURL, search/keyboard cancellation, mobile/light/dark/reduced motion, and cache privacy. Verify Cloudflare caching and staged network/placement measurements. These platform checks remain with the user as agreed.

Configuration was checked against installed Next 15 code and official [import optimization](https://nextjs.org/docs/15/app/api-reference/config/next-config-js/optimizePackageImports) and [Turbopack](https://nextjs.org/docs/15/app/api-reference/turbopack) documentation. The requested installed `node_modules/next/dist/docs/` directory is absent. [Motion bundle guidance](https://motion.dev/docs/react-reduce-bundle-size) and [Drizzle batch API](https://orm.drizzle.team/docs/batch-api) informed those changes.
