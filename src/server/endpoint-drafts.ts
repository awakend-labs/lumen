import { and, eq, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { endpointDrafts, endpoints, projectMembers, stashes } from "@/db/schema";
import { canEditContent } from "@/lib/permissions";
import type { ProjectRole } from "@/lib/types";
import { HttpError } from "./http";

export const draftKeySchema = z.string().regex(/^(?:new|endpoint):[0-9a-f-]{36}(?::[0-9a-f-]{36})?$/i);
export const draftInputSchema = z.object({ revision: z.uuid(), writeOrder: z.number().int().min(1).max(2147483647), payload: z.string().max(120000, "This draft is too large to autosave. Save the endpoint directly.") });

function scopeQuery(userId: string, projectId: string, key: string) {
  const [kind, id] = draftKeySchema.parse(key).split(":");
  if (!z.uuid().safeParse(id).success) throw new HttpError(400, "Invalid draft location");
  const table = kind === "new" ? stashes : endpoints;
  return db.select({ projectId: table.projectId, role: projectMembers.role }).from(table)
    .innerJoin(projectMembers, and(eq(projectMembers.projectId, table.projectId), eq(projectMembers.userId, userId)))
    .where(and(eq(table.id, id), eq(table.projectId, projectId))).limit(1);
}

async function checkScope(userId: string, projectId: string, key: string) {
  const [target] = await scopeQuery(userId, projectId, key);
  if (!target) throw new HttpError(404, "Draft location not found");
  if (!canEditContent(target.role)) throw new HttpError(403, "You don't have permission to do that");
}

export async function getEndpointDraft(userId: string, projectId: string, key: string) {
  // Authorize the location and retrieve/create its revision in one database trip.
  // A viewer never enters the INSERT, and another editor's draft is never selected.
  const result = await db.execute<{ role: ProjectRole; payload: string | null; revision: string | null; write_order: number | null }>(sql`
    with target(project_id, role) as (${scopeQuery(userId, projectId, key)}), saved as (
      insert into endpoint_drafts (user_id, project_id, draft_key)
      select ${userId}, target.project_id, ${key} from target where role in ('owner', 'editor')
      on conflict (user_id, project_id, draft_key) do update set draft_key = excluded.draft_key
      returning payload, revision, write_order
    )
    select target.role, saved.payload, saved.revision, saved.write_order from target left join saved on true
  `);
  const draft = result.rows[0];
  if (!draft) throw new HttpError(404, "Draft location not found");
  if (!canEditContent(draft.role)) throw new HttpError(403, "You don't have permission to do that");
  if (!draft.revision || draft.write_order === null) throw new HttpError(500, "Could not load the draft");
  return { payload: draft.payload, revision: draft.revision, writeOrder: draft.write_order };
}

export async function saveEndpointDraft(userId: string, projectId: string, key: string, input: z.infer<typeof draftInputSchema>) {
  await checkScope(userId, projectId, key);
  let payload;
  try { payload = JSON.parse(input.payload); } catch { throw new HttpError(400, "Invalid draft data"); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new HttpError(400, "Invalid draft data");
  const [draft] = await db.update(endpointDrafts).set({ payload: input.payload, writeOrder: input.writeOrder, updatedAt: new Date() })
    .where(and(eq(endpointDrafts.userId, userId), eq(endpointDrafts.projectId, projectId), eq(endpointDrafts.key, key), eq(endpointDrafts.revision, input.revision), lt(endpointDrafts.writeOrder, input.writeOrder))).returning({ revision: endpointDrafts.revision });
  if (!draft) throw new HttpError(409, "This draft changed in another tab. Reload before editing it.");
  return draft;
}

export async function clearEndpointDraft(userId: string, projectId: string, key: string, revision: string) {
  await checkScope(userId, projectId, key);
  const [draft] = await db.update(endpointDrafts).set({ payload: null, revision: crypto.randomUUID(), writeOrder: 0, updatedAt: new Date() })
    .where(and(eq(endpointDrafts.userId, userId), eq(endpointDrafts.projectId, projectId), eq(endpointDrafts.key, key), eq(endpointDrafts.revision, revision))).returning({ revision: endpointDrafts.revision });
  if (!draft) throw new HttpError(409, "This draft changed in another tab. Reload before editing it.");
  return draft;
}
