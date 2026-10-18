import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { endpoints, projectMembers, projects, stashes } from "@/db/schema";
import { slugify } from "@/lib/slug";
import type {
  EndpointRecord,
  ProjectDetail,
  ProjectListItem,
  ProjectStatus,
  StashRecord,
} from "@/lib/types";
import type { EndpointInput, ProjectInput } from "@/lib/validators";
import { requireEditor, requireOwner, requireReader, touchProject } from "./access";
import { HttpError } from "./http";

async function uniqueSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  let attempt = 1;
  while (true) {
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);
    if (!existing) return slug;
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
}

function toEndpoint(row: typeof endpoints.$inferSelect): EndpointRecord {
  return {
    ...row,
    method: row.method,
    headers: row.headers ?? [],
    queryParams: row.queryParams ?? [],
    pathParams: row.pathParams ?? [],
    requestBody: row.requestBody ?? null,
    responses: row.responses ?? [],
    tags: row.tags ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listProjects(userId: string): Promise<ProjectListItem[]> {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      slug: projects.slug,
      status: projects.status,
      role: projectMembers.role,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .where(eq(projectMembers.userId, userId))
    .orderBy(desc(projects.updatedAt));

  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const [stashCounts, endpointCounts, previewRows] = await db.batch([db
    .select({
      projectId: stashes.projectId,
      count: sql<number>`count(*)::int`,
    })
    .from(stashes)
    .where(inArray(stashes.projectId, ids))
    .groupBy(stashes.projectId),
  db
    .select({
      projectId: endpoints.projectId,
      count: sql<number>`count(*)::int`,
    })
    .from(endpoints)
    .where(inArray(endpoints.projectId, ids))
    .groupBy(endpoints.projectId),

  db
    .select({
      projectId: endpoints.projectId,
      method: endpoints.method,
      path: endpoints.path,
      updatedAt: endpoints.updatedAt,
    })
    .from(endpoints)
    .where(inArray(endpoints.projectId, ids))]);

  const stashMap = new Map(stashCounts.map((row) => [row.projectId, row.count]));
  const endpointMap = new Map(
    endpointCounts.map((row) => [row.projectId, row.count]),
  );



  const previewMap = new Map<
    string,
    { method: (typeof previewRows)[number]["method"]; path: string }[]
  >();
  for (const projectId of ids) {
    const projectEndpoints = previewRows
      .filter((row) => row.projectId === projectId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 3)
      .map((row) => ({ method: row.method, path: row.path }));
    previewMap.set(projectId, projectEndpoints);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    slug: row.slug,
    status: row.status,
    role: row.role,
    stashCount: stashMap.get(row.id) ?? 0,
    endpointCount: endpointMap.get(row.id) ?? 0,
    previewEndpoints: previewMap.get(row.id) ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function createProject(userId: string, input: ProjectInput) {
  const slug = await uniqueSlug(input.name);
  const description = input.description.trim() ? input.description.trim() : null;
  const [project] = await db
    .insert(projects)
    .values({
      name: input.name,
      description,
      slug,
      status: input.status ?? "in_progress",
      ownerId: userId,
    })
    .returning();

  if (!project) throw new HttpError(500, "Could not create the project");

  await db.insert(projectMembers).values({
    projectId: project.id,
    userId,
    role: "owner",
  });

  return project;
}

export async function getProjectDetail(
  userId: string,
  projectId: string,
): Promise<ProjectDetail> {
  const member = await requireReader(userId, projectId);
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) throw new HttpError(404, "Project not found");

  const [stashRows, endpointRows] = await db.batch([db
    .select()
    .from(stashes)
    .where(eq(stashes.projectId, projectId))
    .orderBy(asc(stashes.order), asc(stashes.createdAt)),
  db
    .select()
    .from(endpoints)
    .where(eq(endpoints.projectId, projectId))
    .orderBy(asc(endpoints.order), asc(endpoints.createdAt))]);

  const grouped = new Map<string, EndpointRecord[]>();
  for (const row of endpointRows) {
    const list = grouped.get(row.stashId) ?? [];
    list.push(toEndpoint(row));
    grouped.set(row.stashId, list);
  }

  const stashRecords: StashRecord[] = stashRows.map((stash) => ({
    id: stash.id,
    projectId: stash.projectId,
    name: stash.name,
    description: stash.description,
    color: stash.color ?? "slate",
    status: stash.status,
    order: stash.order,
    createdAt: stash.createdAt.toISOString(),
    updatedAt: stash.updatedAt.toISOString(),
    endpoints: grouped.get(stash.id) ?? [],
  }));

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    slug: project.slug,
    role: member.role,
    status: project.status,
    auth: project.auth,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    stashes: stashRecords,
  };
}

export async function updateProject(
  userId: string,
  projectId: string,
  input: ProjectInput,
) {
  await requireOwner(userId, projectId);
  const description = input.description.trim() ? input.description.trim() : null;
  const [project] = await db
    .update(projects)
    .set({
      name: input.name,
      description,
      // Only change status when the caller sends it, so renames don't reset it.
      ...(input.status ? { status: input.status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning();
  if (!project) throw new HttpError(404, "Project not found");
  return project;
}

export async function setProjectStatus(
  userId: string,
  projectId: string,
  status: ProjectStatus,
) {
  await requireEditor(userId, projectId);
  const [project] = await db
    .update(projects)
    .set({ status, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning({ id: projects.id, status: projects.status });
  if (!project) throw new HttpError(404, "Project not found");
  return project;
}

export async function deleteProject(userId: string, projectId: string) {
  await requireOwner(userId, projectId);
  await db.delete(projects).where(eq(projects.id, projectId));
}

export async function createEndpoint(
  userId: string,
  projectId: string,
  input: EndpointInput,
) {
  await requireEditor(userId, projectId);
  const [stash] = await db
    .select({ id: stashes.id, projectId: stashes.projectId })
    .from(stashes)
    .where(eq(stashes.id, input.stashId))
    .limit(1);
  if (!stash || stash.projectId !== projectId) {
    throw new HttpError(400, "Choose a stash in this project");
  }



  const [[created]] = await db.batch([db
    .insert(endpoints)
    .values({
      stashId: input.stashId,
      projectId,
      name: input.name,
      method: input.method,
      path: input.path,
      description: input.description,
      headers: input.headers,
      queryParams: input.queryParams,
      pathParams: input.pathParams,
      requestBody: input.requestBody ?? null,
      responses: input.responses,
      tags: input.tags,
      version: input.version,
      access: input.access,
      isDeprecated: input.isDeprecated,
      order: sql`(select coalesce(max(sort_order), -1) + 1 from endpoints where stash_id = ${input.stashId})`,
    })
    .returning(), db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId))]);

  if (!created) throw new HttpError(500, "Could not create the endpoint");
  return toEndpoint(created);
}

export async function getEndpoint(
  userId: string,
  projectId: string,
  endpointId: string,
) {
  const member = await requireReader(userId, projectId);
  const [row] = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.id, endpointId))
    .limit(1);
  if (!row || row.projectId !== projectId) {
    throw new HttpError(404, "Endpoint not found");
  }
  return { endpoint: toEndpoint(row), role: member.role };
}

export async function updateEndpoint(
  userId: string,
  projectId: string,
  endpointId: string,
  input: EndpointInput,
) {
  await requireEditor(userId, projectId);
  const [stash] = await db
    .select({ id: stashes.id, projectId: stashes.projectId })
    .from(stashes)
    .where(eq(stashes.id, input.stashId))
    .limit(1);
  if (!stash || stash.projectId !== projectId) {
    throw new HttpError(400, "Choose a stash in this project");
  }

  const [[updated]] = await db.batch([db
    .update(endpoints)
    .set({
      stashId: input.stashId,
      name: input.name,
      method: input.method,
      path: input.path,
      description: input.description,
      headers: input.headers,
      queryParams: input.queryParams,
      pathParams: input.pathParams,
      requestBody: input.requestBody ?? null,
      responses: input.responses,
      tags: input.tags,
      version: input.version,
      access: input.access,
      isDeprecated: input.isDeprecated,
      updatedAt: new Date(),
    })
    .where(and(eq(endpoints.id, endpointId), eq(endpoints.projectId, projectId)))
    .returning(), db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId))]);

  if (!updated || updated.projectId !== projectId) {
    throw new HttpError(404, "Endpoint not found");
  }
  return toEndpoint(updated);
}

export async function deleteEndpoint(
  userId: string,
  projectId: string,
  endpointId: string,
) {
  await requireEditor(userId, projectId);
  const [existing] = await db
    .select({ id: endpoints.id })
    .from(endpoints)
    .where(and(eq(endpoints.id, endpointId), eq(endpoints.projectId, projectId)))
    .limit(1);
  if (!existing) throw new HttpError(404, "Endpoint not found");
  await db.delete(endpoints).where(eq(endpoints.id, endpointId));
  await touchProject(projectId);
}

export async function reorderEndpoints(
  userId: string,
  projectId: string,
  stashId: string,
  ids: string[],
) {
  await requireEditor(userId, projectId);
  const rows = await db
    .select({ id: endpoints.id })
    .from(endpoints)
    .where(and(eq(endpoints.stashId, stashId), eq(endpoints.projectId, projectId)));
  const existing = new Set(rows.map((row) => row.id));
  if (new Set(ids).size !== ids.length || ids.length !== existing.size || ids.some((id) => !existing.has(id))) {
    throw new HttpError(400, "Endpoint order is out of date");
  }

  if (ids.length) {
    const updates = ids.map((id, index) => db.update(endpoints).set({ order: index, updatedAt: new Date() }).where(and(eq(endpoints.id, id), eq(endpoints.projectId, projectId))));
    await db.batch([updates[0], ...updates.slice(1)]);
  }
  await touchProject(projectId);
}
