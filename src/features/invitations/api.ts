import { api } from "@/lib/api";
import type { InvitationPreview } from "@/lib/types";

export function fetchInvitation(token: string) {
  return api<InvitationPreview>(`/api/invitations/${token}`);
}

export function acceptInvitation(token: string) {
  return api<{ projectId: string }>(`/api/invitations/${token}/accept`, {
    method: "POST",
  });
}
