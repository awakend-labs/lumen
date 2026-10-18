"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { acceptInvitation, fetchInvitation } from "@/features/invitations/api";

export function useInvitationPreview(token: string) {
  return useQuery({
    queryKey: ["invitation", token],
    queryFn: () => fetchInvitation(token),
    retry: false,
  });
}

export function useAcceptInvitation(token: string) {
  return useMutation({
    mutationFn: () => acceptInvitation(token),
  });
}
