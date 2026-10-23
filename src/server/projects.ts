import { and, asc, desc, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { apiGroups, endpointDrafts, endpoints, projectMembers, projects, stashes } from "@/db/schema";
import { validateGroup } from "./api-groups";
import { slugify } from "@/lib/slug";
import type {
  EndpointRecord,
  EndpointSummary,
  ProjectDetail,
  ProjectSummary,
  ProjectListItem,
  ProjectStashPreview,
  ProjectStatus,
} from "@/lib/types";
import type { EndpointInput, ProjectBaseUrlInput, ProjectInput } from "@/lib/validators";
import { requireEditor, requireOwner, touchProject } from "./access";
import { HttpError } from "./http";
import { canEditContent } from "@/lib/permissions";
import { prepareResponseDocs } from "./response-docs";

function savedDraftCleanup(userId: string, projectId: string, draft: NonNullable<EndpointInput["draft"]>) {
  return db.update(endpointDrafts).set({ payload: null, revision: crypto.randomUUID(), writeOrder: 0, updatedAt: new Date() })
    .where(and(eq(endpointDrafts.userId, userId), eq(endpointDrafts.projectId, projectId), eq(endpointDrafts.key, draft.key), eq(endpointDrafts.revision, draft.revision)));
}

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
  const { responsePreview, ...document } = row;
  void responsePreview; // Generated card metadata belongs only in summary responses.
  return {
    ...document,
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
      baseUrl: projects.baseUrl,
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
  const rankedPreviews = db.select({
    projectId: stashes.projectId,
    id: stashes.id,
    name: stashes.name,
    color: stashes.color,
    createdAt: stashes.createdAt,
    rank: sql<number>`row_number() over (partition by ${stashes.projectId} order by ${stashes.createdAt} desc, ${stashes.id} desc)`.as("preview_rank"),
  }).from(stashes).where(inArray(stashes.projectId, ids)).as("ranked_previews");
  const [stashCounts, endpointCounts, apiGroupCounts, previewRows] = await db.batch([db
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
      projectId: stashes.projectId,
      count: sql<number>`count(*)::int`,
    })
    .from(apiGroups)
    .innerJoin(stashes, eq(apiGroups.stashId, stashes.id))
    .where(inArray(stashes.projectId, ids))
    .groupBy(stashes.projectId),

  db
    .select({
      projectId: rankedPreviews.projectId,
      id: rankedPreviews.id,
      name: rankedPreviews.name,
      color: rankedPreviews.color,
    })
    .from(rankedPreviews)
    .where(sql`${rankedPreviews.rank} <= 2`)
    .orderBy(desc(rankedPreviews.createdAt), desc(rankedPreviews.id))]);

  const stashMap = new Map(stashCounts.map((row) => [row.projectId, row.count]));
  const endpointMap = new Map(
    endpointCounts.map((row) => [row.projectId, row.count]),
  );
  const apiGroupMap = new Map(
    apiGroupCounts.map((row) => [row.projectId, row.count]),
  );
  const previewMap = new Map<string, ProjectStashPreview[]>();
  for (const stash of previewRows) {
    const previews = previewMap.get(stash.projectId) ?? [];
    if (previews.length < 2) {
      previews.push({ id: stash.id, name: stash.name, color: stash.color ?? "slate" });
      previewMap.set(stash.projectId, previews);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    baseUrl: row.baseUrl,
    slug: row.slug,
    status: row.status,
    role: row.role,
    stashCount: stashMap.get(row.id) ?? 0,
    endpointCount: endpointMap.get(row.id) ?? 0,
    apiGroupCount: apiGroupMap.get(row.id) ?? 0,
    previewStashes: previewMap.get(row.id) ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function createProject(userId: string, input: ProjectInput) {
  const slug = await uniqueSlug(input.name);
  const description = input.description.trim() ? input.description.trim() : null;
  const projectId = crypto.randomUUID();
  const [[project]] = await db.batch([db
    .insert(projects)
    .values({
      id: projectId,
      name: input.name,
      description,
      baseUrl: input.baseUrl ?? "",
      slug,
      status: input.status ?? "in_progress",
      ownerId: userId,
    })
    .returning(), db.insert(projectMembers).values({
    projectId,
    userId,
    role: "owner",
  })]);

  if (!project) throw new HttpError(500, "Could not create the project");

  return project;
}

const endpointSummaryColumns = {
  id: endpoints.id, projectId: endpoints.projectId, stashId: endpoints.stashId,
  groupId: endpoints.groupId, name: endpoints.name, method: endpoints.method,
  path: endpoints.path, baseUrl: endpoints.baseUrl, version: endpoints.version,
  description: endpoints.description, tags: endpoints.tags, access: endpoints.access,
  isDeprecated: endpoints.isDeprecated, order: endpoints.order,
  createdAt: endpoints.createdAt, updatedAt: endpoints.updatedAt,
  firstResponse: endpoints.responsePreview,
};

export async function getProjectDetail(userId: string, projectId: string): Promise<ProjectDetail> {
  return getProjectData(userId, projectId, false);
}

export async function getProjectSummary(userId: string, projectId: string): Promise<ProjectSummary> {
  return getProjectData(userId, projectId, true);
}

function getProjectData(userId: string, projectId: string, summaryOnly: false): Promise<ProjectDetail>;
function getProjectData(userId: string, projectId: string, summaryOnly: true): Promise<ProjectSummary>;
async function getProjectData(
  userId: string,
  projectId: string,
  summaryOnly: boolean,
): Promise<ProjectDetail | ProjectSummary> {
  const [project] = await db
    .select({ ...getTableColumns(projects), role: projectMembers.role })
    .from(projects)
    .innerJoin(projectMembers, and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, userId)))
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) throw new HttpError(404, "Project not found");

  const [stashRows, endpointRows, groupRows] = await db.batch([db
    .select()
    .from(stashes)
    .where(eq(stashes.projectId, projectId))
    .orderBy(asc(stashes.order), asc(stashes.createdAt)),
  db
    .select(summaryOnly ? endpointSummaryColumns : getTableColumns(endpoints))
    .from(endpoints)
    .where(eq(endpoints.projectId, projectId))
    .orderBy(asc(endpoints.order), asc(endpoints.createdAt)),
  db.select({ id: apiGroups.id, stashId: apiGroups.stashId, name: apiGroups.name }).from(apiGroups)
    .innerJoin(stashes, eq(apiGroups.stashId, stashes.id)).where(eq(stashes.projectId, projectId))
    .orderBy(asc(apiGroups.createdAt), asc(apiGroups.id))]);

  const grouped = new Map<string, (EndpointSummary | EndpointRecord)[]>();
  for (const row of endpointRows) {
    const list = grouped.get(row.stashId) ?? [];
    // The full projection is used only by the retained full-document API.
    list.push(summaryOnly ? { ...row, firstResponse: "firstResponse" in row ? row.firstResponse : null, tags: row.tags ?? [], createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }
      : toEndpoint(row as typeof endpoints.$inferSelect));
    grouped.set(row.stashId, list);
  }

  const groupsByStash = new Map<string, typeof groupRows>();
  for (const group of groupRows) {
    const list = groupsByStash.get(group.stashId) ?? [];
    list.push(group);
    groupsByStash.set(group.stashId, list);
  }

  const stashRecords = stashRows.map((stash) => ({
    groups: groupsByStash.get(stash.id) ?? [],
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
    baseUrl: project.baseUrl,
    slug: project.slug,
    role: project.role,
    status: project.status,
    auth: project.auth,
    responseErrorFormat: project.responseErrorFormat,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    stashes: stashRecords,
  } as ProjectDetail | ProjectSummary;
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
      ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl } : {}),
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

export async function updateProjectBaseUrl(userId: string, projectId: string, input: ProjectBaseUrlInput) {
  await requireOwner(userId, projectId);
  const stashIds = [...new Set(input.stashIds)];
  if (stashIds.length) {
    const selected = await db.select({ id: stashes.id }).from(stashes)
      .where(and(eq(stashes.projectId, projectId), inArray(stashes.id, stashIds)));
    if (selected.length !== stashIds.length) {
      throw new HttpError(400, "Some selected stashes are no longer in this project. Reload and try again.");
    }
  }

  const saveProject = db.update(projects).set({ baseUrl: input.baseUrl, updatedAt: new Date() })
    .where(eq(projects.id, projectId)).returning({ baseUrl: projects.baseUrl });
  if (!stashIds.length) {
    const [project] = await saveProject;
    if (!project) throw new HttpError(404, "Project not found");
    return { ...project, updatedEndpointCount: 0 };
  }

  // Neon HTTP batches run in one transaction: the default and endpoint URLs save together.
  const [[project], updated] = await db.batch([
    saveProject,
    db.update(endpoints).set({
      baseUrl: input.baseUrl,
      // An open editor must detect this change instead of restoring the old URL on save.
      updatedAt: sql`greatest(date_trunc('milliseconds', clock_timestamp()), ${endpoints.updatedAt} + interval '1 millisecond')`,
    }).where(and(eq(endpoints.projectId, projectId), inArray(endpoints.stashId, stashIds)))
      .returning({ id: endpoints.id }),
  ]);
  if (!project) throw new HttpError(404, "Project not found");
  return { ...project, updatedEndpointCount: updated.length };
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
  const [stash] = await db
    .select({ id: stashes.id, projectId: stashes.projectId, baseUrl: projects.baseUrl, role: projectMembers.role })
    .from(stashes)
    .innerJoin(projects, eq(projects.id, stashes.projectId))
    .innerJoin(projectMembers, and(eq(projectMembers.projectId, stashes.projectId), eq(projectMembers.userId, userId)))
    .where(eq(stashes.id, input.stashId))
    .limit(1);
  if (!stash || stash.projectId !== projectId) {
    throw new HttpError(400, "Choose a stash in this project");
  }
  if (!canEditContent(stash.role)) throw new HttpError(403, "You don't have permission to do that");



  await validateGroup(input.stashId, input.groupId);
  const responses = await prepareResponseDocs(projectId, input.responses);
  const [[created]] = await db.batch([db
    .insert(endpoints)
    .values({
      stashId: input.stashId,
      groupId: input.groupId ?? null,
      projectId,
      name: input.name,
      method: input.method,
      path: input.path,
      baseUrl: input.baseUrl || stash.baseUrl,
      description: input.description,
      headers: input.headers,
      queryParams: input.queryParams,
      pathParams: input.pathParams,
      requestBody: input.requestBody ?? null,
      responses,
      tags: input.tags,
      version: input.version,
      access: input.access,
      isDeprecated: input.isDeprecated,
      order: sql`(select coalesce(max(sort_order), -1) + 1 from endpoints where stash_id = ${input.stashId})`,
    })
    .returning(), db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId)), ...(input.draft ? [savedDraftCleanup(userId, projectId, input.draft)] : [])]);

  if (!created) throw new HttpError(500, "Could not create the endpoint");
  return toEndpoint(created);
}

export async function getEndpoint(
  userId: string,
  projectId: string,
  endpointId: string,
) {
  const [row] = await db
    .select({ ...getTableColumns(endpoints), role: projectMembers.role })
    .from(endpoints)
    .innerJoin(projectMembers, and(eq(projectMembers.projectId, endpoints.projectId), eq(projectMembers.userId, userId)))
    .where(and(eq(endpoints.id, endpointId), eq(endpoints.projectId, projectId)))
    .limit(1);
  if (!row || row.projectId !== projectId) {
    throw new HttpError(404, "Endpoint not found");
  }
  const { role, ...endpoint } = row;
  return { endpoint: toEndpoint(endpoint), role };
}

export async function updateEndpoint(
  userId: string,
  projectId: string,
  endpointId: string,
  input: EndpointInput,
) {
  const [existing] = await db.select({ stashId: endpoints.stashId, role: projectMembers.role }).from(endpoints)
    .innerJoin(projectMembers, and(eq(projectMembers.projectId, endpoints.projectId), eq(projectMembers.userId, userId)))
    .where(and(eq(endpoints.id, endpointId), eq(endpoints.projectId, projectId))).limit(1);
  if (!existing) throw new HttpError(404, "Endpoint not found");
  if (!canEditContent(existing.role)) throw new HttpError(403, "You don't have permission to do that");
  if (input.groupId !== undefined && existing.stashId !== input.stashId) {
    throw new HttpError(409, "This endpoint moved to another stash. Reload before changing its group.");
  }
  await validateGroup(existing.stashId, input.groupId);
  const responses = await prepareResponseDocs(projectId, input.responses);
  if (!input.expectedUpdatedAt) {
    throw new HttpError(409, "This endpoint's saved version is missing. Reload it before saving.");
  }
  const [updated] = await db
    .update(endpoints)
    .set({
      ...(input.groupId !== undefined ? { groupId: input.groupId } : {}),
      name: input.name,
      method: input.method,
      path: input.path,
      baseUrl: input.baseUrl,
      description: input.description,
      headers: input.headers,
      queryParams: input.queryParams,
      pathParams: input.pathParams,
      requestBody: input.requestBody ?? null,
      responses,
      tags: input.tags,
      version: input.version,
      access: input.access,
      isDeprecated: input.isDeprecated,
      // Advance even when two saves arrive within the same millisecond.
      updatedAt: sql`greatest(date_trunc('milliseconds', clock_timestamp()), ${endpoints.updatedAt} + interval '1 millisecond')`,
    })
    .where(and(eq(endpoints.id, endpointId), eq(endpoints.projectId, projectId),
      sql`date_trunc('milliseconds', ${endpoints.updatedAt}) = ${input.expectedUpdatedAt}::timestamptz`))
    .returning();

  if (!updated || updated.projectId !== projectId) {
    throw new HttpError(409, "This endpoint was changed since you opened it. Your edits have not been saved. Reload the latest version before saving again.");
  }
  await db.batch([db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId)),
    ...(input.draft ? [savedDraftCleanup(userId, projectId, input.draft)] : [])]);
  return toEndpoint(updated);
}

export async function moveEndpointToGroup(
  userId: string,
  projectId: string,
  endpointId: string,
  input: { stashId: string; groupId: string | null; expectedUpdatedAt: string },
) {
  await requireEditor(userId, projectId);
  const { endpoint } = await getEndpoint(userId, projectId, endpointId);
  if (endpoint.stashId !== input.stashId) {
    throw new HttpError(409, "This endpoint moved to another stash. Reload before changing its group.");
  }
  await validateGroup(endpoint.stashId, input.groupId);
  const [moved] = await db.update(endpoints).set({
    groupId: input.groupId,
    updatedAt: sql`greatest(date_trunc('milliseconds', clock_timestamp()), ${endpoints.updatedAt} + interval '1 millisecond')`,
  }).where(and(
    eq(endpoints.id, endpointId),
    eq(endpoints.projectId, projectId),
    eq(endpoints.stashId, input.stashId),
    sql`date_trunc('milliseconds', ${endpoints.updatedAt}) = ${input.expectedUpdatedAt}::timestamptz`,
  )).returning();
  if (!moved) {
    throw new HttpError(409, "This endpoint was changed since you opened it. Reload the latest version before moving it again.");
  }
  await touchProject(projectId);
  return toEndpoint(moved);
}

export async function moveEndpoint(userId: string, projectId: string, endpointId: string, stashId: string) {
  await requireEditor(userId, projectId);
  const { endpoint } = await getEndpoint(userId, projectId, endpointId);
  const [destination] = await db.select({ id: stashes.id }).from(stashes)
    .where(and(eq(stashes.id, stashId), eq(stashes.projectId, projectId))).limit(1);
  if (!destination) throw new HttpError(400, "Choose a stash in this project");
  if (endpoint.stashId === stashId) return endpoint;
  const [[moved]] = await db.batch([
    db.update(endpoints).set({ stashId, groupId: null,
      order: sql`(select coalesce(max(sort_order), -1) + 1 from endpoints where stash_id = ${stashId})`,
      updatedAt: new Date(),
    }).where(and(eq(endpoints.id, endpointId), eq(endpoints.projectId, projectId))).returning(),
    db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId)),
  ]);
  if (!moved) throw new HttpError(404, "Endpoint not found");
  return toEndpoint(moved);
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
    await db.update(endpoints).set({
      order: sql`ordering.ordinality - 1`, updatedAt: new Date(),
    }).from(sql`unnest(ARRAY[${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)}]) WITH ORDINALITY AS ordering(id, ordinality)`)
      .where(and(eq(endpoints.id, sql`ordering.id`), eq(endpoints.projectId, projectId), eq(endpoints.stashId, stashId)));
  }
  await touchProject(projectId);
}
