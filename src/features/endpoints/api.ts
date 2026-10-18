import { api } from "@/lib/api";
import type { EndpointRecord, ProjectRole } from "@/lib/types";
import type { EndpointInput } from "@/lib/validators";

export function fetchEndpoint(projectId: string, endpointId: string) {
  return api<{ endpoint: EndpointRecord; role: ProjectRole }>(
    `/api/projects/${projectId}/endpoints/${endpointId}`,
  );
}

export function saveEndpoint(
  projectId: string,
  input: EndpointInput,
  endpointId?: string,
) {
  return api<EndpointRecord>(
    endpointId
      ? `/api/projects/${projectId}/endpoints/${endpointId}`
      : `/api/projects/${projectId}/endpoints`,
    {
      method: endpointId ? "PATCH" : "POST",
      body: JSON.stringify(input),
    },
  );
}

export function deleteEndpoint(projectId: string, endpointId: string) {
  return api(`/api/projects/${projectId}/endpoints/${endpointId}`, {
    method: "DELETE",
  });
}

export function reorderEndpoints(projectId: string, stashId: string, ids: string[]) {
  return api(`/api/projects/${projectId}/endpoints/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ stashId, ids }),
  });
}
