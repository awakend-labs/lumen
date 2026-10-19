import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { apiGroups, stashes } from "@/db/schema";
import { requireEditor, touchProject } from "./access";
import { HttpError } from "./http";

export async function validateGroup(stashId: string, groupId: string | null | undefined) {
  if (!groupId) return;
  const [group] = await db.select({ id: apiGroups.id }).from(apiGroups)
    .where(and(eq(apiGroups.id, groupId), eq(apiGroups.stashId, stashId))).limit(1);
  if (!group) throw new HttpError(400, "Choose an API group in this stash");
}

export async function saveApiGroup(userId: string, projectId: string, stashId: string, name: string, groupId?: string) {
  await requireEditor(userId, projectId);
  const [stash] = await db.select({ id: stashes.id }).from(stashes)
    .where(and(eq(stashes.id, stashId), eq(stashes.projectId, projectId))).limit(1);
  if (!stash) throw new HttpError(404, "Stash not found");
  const [group] = groupId
    ? await db.update(apiGroups).set({ name, updatedAt: new Date() })
      .where(and(eq(apiGroups.id, groupId), eq(apiGroups.stashId, stashId))).returning()
    : await db.insert(apiGroups).values({ stashId, name }).returning();
  if (!group) throw new HttpError(404, "API group not found");
  await touchProject(projectId);
  return group;
}

export async function deleteApiGroup(userId: string, projectId: string, stashId: string, groupId: string) {
  await requireEditor(userId, projectId);
  const [stash] = await db.select({ id: stashes.id }).from(stashes)
    .where(and(eq(stashes.id, stashId), eq(stashes.projectId, projectId))).limit(1);
  if (!stash) throw new HttpError(404, "Stash not found");
  // The foreign key moves endpoints to Ungrouped without deleting documentation.
  const [deleted] = await db.delete(apiGroups)
    .where(and(eq(apiGroups.id, groupId), eq(apiGroups.stashId, stashId))).returning();
  if (!deleted) throw new HttpError(404, "API group not found");
  await touchProject(projectId);
}
