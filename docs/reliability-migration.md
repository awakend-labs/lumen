# Endpoint reliability update

Run `pnpm db:migrate` against the intended database before deploying this update.
Migration `0007_odd_rhino.sql`:

- Adds private, per-editor endpoint drafts in Postgres, including incomplete forms and Base URLs. Drafts are not stored in browser storage.
- Enforces case-insensitive stash names within each project. Existing duplicate stashes are preserved: the earliest keeps its name and later duplicates receive the next available numeric suffix, such as `Temp (3)` when `Temp (2)` already exists. No endpoints or groups are removed.
- Changes request bodies and responses from JSONB to JSON so new saves retain object key order. Original ordering already lost in older JSONB values cannot be recovered; re-save those examples in the intended order.

The editor reports whether a draft is saved or could not be saved. Wait for “Draft saved” before closing the page for confirmed recovery. Publishing or discarding rotates the draft revision so late autosaves cannot restore it.

Local database tests cover migrations (including pre-existing duplicate names), Base URL persistence, JSON order, draft isolation, stale writes, and draft cleanup after creating/updating an endpoint. They do not measure production latency or reproduce Cloudflare Worker resource errors. Verify production request timing and failed-request CPU/memory in Workers Logs after deployment.
