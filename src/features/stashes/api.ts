import { api } from "@/lib/api";
import type { StashStatus } from "@/lib/types";
import type { StashInput } from "@/lib/validators";

export function createStash(projectId: string, input: StashInput) {
  return api(`/api/projects/${projectId}/stashes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateStash(projectId: string, stashId: string, input: StashInput) {
  return api(`/api/projects/${projectId}/stashes/${stashId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function setStashStatusRequest(
  projectId: string,
  stashId: string,
  status: StashStatus,
) {
  return api(`/api/projects/${projectId}/stashes/${stashId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteStash(projectId: string, stashId: string) {
  return api(`/api/projects/${projectId}/stashes/${stashId}`, { method: "DELETE" });
}

export function reorderStashes(projectId: string, ids: string[]) {
  return api(`/api/projects/${projectId}/stashes/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ ids }),
  });
}
