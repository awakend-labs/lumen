import { api } from "@/lib/api";
import type { InvitationRecord, MemberRecord } from "@/lib/types";
import type { InvitationInput } from "@/lib/validators";

export function fetchMembers(projectId: string) {
  return api<MemberRecord[]>(`/api/projects/${projectId}/members`);
}

export function fetchInvitations(projectId: string) {
  return api<InvitationRecord[]>(`/api/projects/${projectId}/invitations`);
}

export function createInvitation(projectId: string, input: InvitationInput) {
  return api<InvitationRecord>(`/api/projects/${projectId}/invitations`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function revokeInvitation(projectId: string, invitationId: string) {
  return api(`/api/projects/${projectId}/invitations/${invitationId}`, {
    method: "DELETE",
  });
}

export function updateMemberRole(
  projectId: string,
  memberId: string,
  role: "editor" | "viewer",
) {
  return api(`/api/projects/${projectId}/members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function removeMember(projectId: string, memberId: string) {
  return api(`/api/projects/${projectId}/members/${memberId}`, { method: "DELETE" });
}
