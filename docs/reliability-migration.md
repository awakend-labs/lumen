# Endpoint reliability update

Run `pnpm db:migrate` against the intended database before deploying this update.
Migration `0007_odd_rhino.sql`:

- Adds private, per-editor endpoint drafts in Postgres, including incomplete forms and Base URLs. Drafts are not stored in browser storage.
- Enforces case-insensitive stash names within each project. Existing duplicate stashes are preserved: the earliest keeps its name and later duplicates receive the next available numeric suffix, such as `Temp (3)` when `Temp (2)` already exists. No endpoints or groups are removed.
- Changes request bodies and responses from JSONB to JSON so new saves retain object key order. Original ordering already lost in older JSONB values cannot be recovered; re-save those examples in the intended order.

The editor reports whether a draft is saved or could not be saved. Wait for “Draft saved” before closing the page for confirmed recovery. Publishing or discarding rotates the draft revision so late autosaves cannot restore it.

Draft recovery runs in the background while the editor is usable. Saving an endpoint waits for the recovery check, so a saved draft cannot be stranded by an early publish. If typing starts before an older draft arrives, the user chooses between restoring it and keeping current edits; neither copy silently overwrites the other. Checking scope and retrieving/creating the draft revision use one database query.

Migration `0008_dazzling_rocket_raccoon.sql` adds an optional project Base URL, editable in the create/edit project dialog. Existing projects inherit a default only when all nonempty endpoint URLs agree. New endpoints start with this default and may override it. Existing endpoints retain their URLs.

The follow-up fixes restrict Settings and the members API to owners/editors, reconcile body-field required flags with the schema, and reject duplicate response status codes. Successful stash creation and invitation revocation update their cached lists immediately. Project pages receive authorized data in their server render, and Better Auth uses database joins for related user/account/session reads. Password verification is unchanged. These changes reduce request waterfalls; production timing must still be checked after deployment.

Local database tests cover migrations (including pre-existing duplicate names), Base URL persistence, JSON order, draft isolation, stale writes, and draft cleanup after creating/updating an endpoint. They do not measure production latency or reproduce Cloudflare Worker resource errors. Verify production request timing and failed-request CPU/memory in Workers Logs after deployment.
