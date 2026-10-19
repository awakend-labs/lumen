import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { endpoints, projects, stashes } from "@/db/schema";
import { requireEditor, requireOwner, touchProject } from "./access";
import { HttpError } from "./http";
import { assertStashNameAvailable } from "./stashes";

export async function renameProject(userId: string, projectId: string, name: string) {
  await requireOwner(userId, projectId);
  const [record] = await db.update(projects)
    .set({ name, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning({ id: projects.id, name: projects.name });
  if (!record) throw new HttpError(404, "Project not found");
  return record;
}

export async function renameStash(userId: string, projectId: string, stashId: string, name: string) {
  await requireEditor(userId, projectId);
  await assertStashNameAvailable(projectId, name, stashId);
  const [record] = await db.update(stashes)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(stashes.id, stashId), eq(stashes.projectId, projectId)))
    .returning({ id: stashes.id, name: stashes.name });
  if (!record) throw new HttpError(404, "Stash not found");
  await touchProject(projectId);
  return record;
}

export async function renameEndpoint(userId: string, projectId: string, endpointId: string, name: string) {
  await requireEditor(userId, projectId);
  const [record] = await db.update(endpoints)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(endpoints.id, endpointId), eq(endpoints.projectId, projectId)))
    .returning({ id: endpoints.id, name: endpoints.name });
  if (!record) throw new HttpError(404, "Endpoint not found");
  await touchProject(projectId);
  return record;
}
