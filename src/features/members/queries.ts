"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createInvitation,
  fetchInvitations,
  fetchMembers,
  removeMember,
  revokeInvitation,
  updateMemberRole,
} from "@/features/members/api";
import type { InvitationRecord } from "@/lib/types";
import type { InvitationInput } from "@/lib/validators";

export const memberKeys = {
  list: (projectId: string) => ["members", projectId] as const,
  invites: (projectId: string) => ["invitations", projectId] as const,
};

export function useMembers(projectId: string, enabled = true) {
  return useQuery({
    queryKey: memberKeys.list(projectId),
    queryFn: () => fetchMembers(projectId),
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useInvitations(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: memberKeys.invites(projectId),
    queryFn: () => fetchInvitations(projectId),
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useInviteMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InvitationInput) => createInvitation(projectId, input),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: memberKeys.invites(projectId) });
    },
    onSuccess: async (invitation) => {
      await queryClient.cancelQueries({ queryKey: memberKeys.invites(projectId) });
      queryClient.setQueryData<InvitationRecord[]>(memberKeys.invites(projectId), current => [invitation, ...(current ?? []).filter(item => item.id !== invitation.id)]);
      await queryClient.invalidateQueries({ queryKey: memberKeys.invites(projectId) });
      toast.success("Invitation email sent");
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.invites(projectId) });
      toast.error(error.message);
    },
  });
}

export function useRevokeInvitation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(projectId, invitationId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: memberKeys.invites(projectId) });
    },
    onSuccess: async (_result, invitationId) => {
      await queryClient.cancelQueries({ queryKey: memberKeys.invites(projectId) });
      queryClient.setQueryData<InvitationRecord[]>(memberKeys.invites(projectId), current => current?.filter(invite => invite.id !== invitationId));
      queryClient.invalidateQueries({ queryKey: memberKeys.invites(projectId), refetchType: "none" });
      toast.success("Invitation revoked");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateMemberRole(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      role,
    }: {
      memberId: string;
      role: "editor" | "viewer";
    }) => updateMemberRole(projectId, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(projectId) });
      toast.success("Role updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRemoveMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeMember(projectId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(projectId) });
      toast.success("Member removed");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
