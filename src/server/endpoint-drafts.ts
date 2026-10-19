import { and, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { endpointDrafts, endpoints, stashes } from "@/db/schema";
import { requireEditor } from "./access";
import { HttpError } from "./http";

export const draftKeySchema = z.string().regex(/^(?:new|endpoint):[0-9a-f-]{36}(?::[0-9a-f-]{36})?$/i);
export const draftInputSchema = z.object({ revision: z.uuid(), writeOrder: z.number().int().min(1).max(2147483647), payload: z.string().max(120000, "This draft is too large to autosave. Save the endpoint directly.") });

async function checkScope(userId: string, projectId: string, key: string) {
  await requireEditor(userId, projectId);
  const [kind, id] = draftKeySchema.parse(key).split(":");
  if (!z.uuid().safeParse(id).success) throw new HttpError(400, "Invalid draft location");
  const table = kind === "new" ? stashes : endpoints;
  const [target] = await db.select({ id: table.id }).from(table).where(and(eq(table.id, id), eq(table.projectId, projectId))).limit(1);
  if (!target) throw new HttpError(404, "Draft location not found");
}

export async function getEndpointDraft(userId: string, projectId: string, key: string) {
  await checkScope(userId, projectId, key);
  const [draft] = await db.insert(endpointDrafts).values({ userId, projectId, key })
    .onConflictDoUpdate({ target: [endpointDrafts.userId, endpointDrafts.projectId, endpointDrafts.key], set: { key } }).returning();
  return { payload: draft.payload, revision: draft.revision, writeOrder: draft.writeOrder };
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
