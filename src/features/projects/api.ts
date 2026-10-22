import { api } from "@/lib/api";
import type { ProjectDetail, ProjectSummary, ProjectListItem, ProjectStatus } from "@/lib/types";
import type { ProjectBaseUrlInput, ProjectInput } from "@/lib/validators";

export function fetchProjects(signal?: AbortSignal) {
  return api<ProjectListItem[]>("/api/projects", { signal });
}

export function fetchProject(projectId: string, signal?: AbortSignal) {
  return api<ProjectDetail>(`/api/projects/${projectId}`, { signal });
}

export function fetchProjectSummary(projectId: string, signal?: AbortSignal) {
  return api<ProjectSummary>(`/api/projects/${projectId}/summary`, { signal });
}

export function createProject(input: ProjectInput) {
  return api("/api/projects", { method: "POST", body: JSON.stringify(input) });
}

export function updateProject(projectId: string, input: ProjectInput) {
  return api(`/api/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function setProjectStatusRequest(projectId: string, status: ProjectStatus) {
  return api(`/api/projects/${projectId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function updateProjectBaseUrl(projectId: string, input: ProjectBaseUrlInput) {
  return api<{ baseUrl: string; updatedEndpointCount: number }>(`/api/projects/${projectId}/base-url`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteProject(projectId: string) {
  return api(`/api/projects/${projectId}`, { method: "DELETE" });
}
