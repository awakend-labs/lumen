import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { endpoints, stashes } from "@/db/schema";
import type { StashStatus } from "@/lib/types";
import type { StashInput } from "@/lib/validators";
import { requireEditor, touchProject } from "./access";
import { HttpError } from "./http";

export async function createStash(
  userId: string,
  projectId: string,
  input: StashInput,
) {
  await requireEditor(userId, projectId);
  const [last] = await db
    .select({ order: stashes.order })
    .from(stashes)
    .where(eq(stashes.projectId, projectId))
    .orderBy(desc(stashes.order))
    .limit(1);

  const [created] = await db
    .insert(stashes)
    .values({
      projectId,
      name: input.name,
      description: input.description.trim() ? input.description.trim() : null,
      color: input.color,
      status: input.status ?? "in_development",
      order: (last?.order ?? -1) + 1,
    })
    .returning();

  if (!created) throw new HttpError(500, "Could not create the stash");
  await touchProject(projectId);
  return created;
}

export async function updateStash(
  userId: string,
  projectId: string,
  stashId: string,
  input: StashInput,
) {
  await requireEditor(userId, projectId);
  const [updated] = await db
    .update(stashes)
    .set({
      name: input.name,
      description: input.description.trim() ? input.description.trim() : null,
      color: input.color,
      ...(input.status ? { status: input.status } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(stashes.id, stashId), eq(stashes.projectId, projectId)))
    .returning();
  if (!updated) throw new HttpError(404, "Stash not found");
  await touchProject(projectId);
  return updated;
}

export async function setStashStatus(
  userId: string,
  projectId: string,
  stashId: string,
  status: StashStatus,
) {
  await requireEditor(userId, projectId);
  const [updated] = await db
    .update(stashes)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(stashes.id, stashId), eq(stashes.projectId, projectId)))
    .returning({ id: stashes.id, status: stashes.status });
  if (!updated) throw new HttpError(404, "Stash not found");
  await touchProject(projectId);
  return updated;
}

export async function deleteStash(
  userId: string,
  projectId: string,
  stashId: string,
) {
  await requireEditor(userId, projectId);
  const [existing] = await db
    .select({ id: stashes.id })
    .from(stashes)
    .where(and(eq(stashes.id, stashId), eq(stashes.projectId, projectId)))
    .limit(1);
  if (!existing) throw new HttpError(404, "Stash not found");
  await db.delete(stashes).where(eq(stashes.id, stashId));
  await touchProject(projectId);
}

export async function reorderStashes(
  userId: string,
  projectId: string,
  ids: string[],
) {
  await requireEditor(userId, projectId);
  const rows = await db
    .select({ id: stashes.id })
    .from(stashes)
    .where(eq(stashes.projectId, projectId));
  const existing = new Set(rows.map((row) => row.id));
  if (ids.length !== existing.size || ids.some((id) => !existing.has(id))) {
    throw new HttpError(400, "Stash order is out of date");
  }

  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx
        .update(stashes)
        .set({ order: index, updatedAt: new Date() })
        .where(eq(stashes.id, id));
    }
  });
  await touchProject(projectId);
}

export async function stashEndpointIds(projectId: string, stashId: string) {
  const rows = await db
    .select({ id: endpoints.id, projectId: endpoints.projectId })
    .from(endpoints)
    .where(eq(endpoints.stashId, stashId));
  if (rows.some((row) => row.projectId !== projectId)) {
    throw new HttpError(404, "Stash not found");
  }
  return rows.map((row) => row.id);
}
