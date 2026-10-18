import { api } from "@/lib/api";
import type { ProjectDetail, ProjectListItem, ProjectStatus } from "@/lib/types";
import type { ProjectInput } from "@/lib/validators";

export function fetchProjects() {
  return api<ProjectListItem[]>("/api/projects");
}

export function fetchProject(projectId: string) {
  return api<ProjectDetail>(`/api/projects/${projectId}`);
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

export function deleteProject(projectId: string) {
  return api(`/api/projects/${projectId}`, { method: "DELETE" });
}
