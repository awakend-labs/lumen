import { NextResponse } from "next/server";
import { and, eq, ilike, or, sql, asc } from "drizzle-orm";
import { db } from "@/db";
import { endpoints, projectMembers, projects, stashes } from "@/db/schema";
import { requireUser } from "@/server/access";
import { handle } from "@/server/http";

export function GET(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 120) ?? "";
    if (q.length < 2) return NextResponse.json([]);
    const term = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    const member = eq(projectMembers.userId, user.id);
    const [projectRows, stashRows, endpointRows] = await db.batch([
      db.select({ id: projects.id, name: projects.name }).from(projects)
        .innerJoin(projectMembers, eq(projectMembers.projectId, projects.id))
        .where(and(member, or(ilike(projects.name, term), ilike(projects.description, term))))
        .orderBy(asc(projects.name), asc(projects.id)).limit(20),
      db.select({ id: stashes.id, name: stashes.name, projectId: stashes.projectId, projectName: projects.name }).from(stashes)
        .innerJoin(projects, eq(projects.id, stashes.projectId))
        .innerJoin(projectMembers, eq(projectMembers.projectId, stashes.projectId))
        .where(and(member, or(ilike(stashes.name, term), ilike(stashes.description, term))))
        .orderBy(asc(stashes.name), asc(stashes.id)).limit(20),
      db.select({ id: endpoints.id, name: endpoints.name, path: endpoints.path, method: endpoints.method, version: endpoints.version, projectId: endpoints.projectId, projectName: projects.name, stashName: stashes.name }).from(endpoints)
        .innerJoin(projects, eq(projects.id, endpoints.projectId))
        .innerJoin(stashes, eq(stashes.id, endpoints.stashId))
        .innerJoin(projectMembers, eq(projectMembers.projectId, endpoints.projectId))
        .where(and(member, or(ilike(endpoints.name, term), ilike(endpoints.path, term), ilike(endpoints.description, term), ilike(sql<string>`array_to_string(${endpoints.tags}, ' ')`, term), ilike(sql<string>`${endpoints.method}::text || ' ' || ${endpoints.path}`, term))))
        .orderBy(asc(endpoints.name), asc(endpoints.id)).limit(30),
    ]);
    return NextResponse.json([
      ...projectRows.map(row => ({ id: row.id, kind: "Project", title: row.name, context: "Project", href: `/projects/${row.id}` })),
      ...stashRows.map(row => ({ id: row.id, kind: "Stash", title: row.name, context: row.projectName, href: `/projects/${row.projectId}/stashes/${row.id}` })),
      ...endpointRows.map(row => ({ id: row.id, kind: "Endpoint", title: row.name, context: `${row.projectName} / ${row.stashName} · ${row.method} ${row.path} · ${row.version}`, href: `/projects/${row.projectId}/endpoints/${row.id}` })),
    ]);
  });
}
