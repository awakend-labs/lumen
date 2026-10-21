import type { ProjectSummary, ProjectListItem } from "./types";
export type WorkspaceSearchResult = { id: string; kind: string; title: string; context: string; href: string };

export function searchCachedWorkspace(query: string, projects: ProjectListItem[], details: ProjectSummary[]): WorkspaceSearchResult[] {
  const q = query.trim().toLowerCase(); if (q.length < 2) return [];
  const matches = (...values: string[]) => values.some(value => value.toLowerCase().includes(q));
  const results: WorkspaceSearchResult[] = projects.filter(project => matches(project.name, project.description ?? "")).map(project => ({ id: project.id, kind: "Project", title: project.name, context: "Project", href: `/projects/${project.id}` }));
  for (const project of details) {
    if (matches(project.name, project.description ?? "")) results.push({ id: project.id, kind: "Project", title: project.name, context: "Project", href: `/projects/${project.id}` });
    for (const stash of project.stashes) {
      if (matches(stash.name, stash.description ?? "")) results.push({ id: stash.id, kind: "Stash", title: stash.name, context: project.name, href: `/projects/${project.id}/stashes/${stash.id}` });
      for (const endpoint of stash.endpoints) if (matches(endpoint.name, endpoint.path, endpoint.description, endpoint.tags.join(" "), `${endpoint.method} ${endpoint.path}`, endpoint.version)) results.push({ id: endpoint.id, kind: "Endpoint", title: endpoint.name, context: `${project.name} / ${stash.name} · ${endpoint.method} ${endpoint.path}${endpoint.version ? ` · ${endpoint.version}` : ""}`, href: `/projects/${project.id}/endpoints/${endpoint.id}` });
    }
  }
  return [...new Map(results.map(result => [`${result.kind}:${result.id}`, result])).values()].slice(0, 70);
}
