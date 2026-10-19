"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InvitationPreview } from "@/lib/types";
import { acceptInvitation, fetchInvitation } from "@/features/invitations/api";

export function useInvitationPreview(token: string) {
  return useQuery({
    queryKey: ["invitation", token],
    queryFn: () => fetchInvitation(token),
    retry: false,
  });
}

export function useAcceptInvitation(token: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => acceptInvitation(token),
    onSuccess: (result) => {
      // A previously opened project may have a cached 404 from before joining.
      client.removeQueries({ queryKey: ["projects", result.projectId] });
      client.invalidateQueries({ queryKey: ["projects"], refetchType: "none" });
      client.invalidateQueries({ queryKey: ["members", result.projectId], refetchType: "none" });
      client.invalidateQueries({ queryKey: ["invitations", result.projectId], refetchType: "none" });
      client.setQueryData<InvitationPreview>(["invitation", token], current => current ? { ...current, status: "accepted" } : current);
      // Reload the destination so a prefetched no-access server layout is not reused.
      window.location.replace(`/projects/${result.projectId}`);
    },
  });
}
