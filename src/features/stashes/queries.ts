"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { projectKeys } from "@/features/projects/queries";
import {
  createStash,
  deleteStash,
  reorderStashes,
  setStashStatusRequest,
  updateStash,
} from "@/features/stashes/api";
import type { ProjectDetail, StashStatus } from "@/lib/types";
import type { StashInput } from "@/lib/validators";

export function useCreateStash(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StashInput) => createStash(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      toast.success("Stash created");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateStash(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stashId, input }: { stashId: string; input: StashInput }) =>
      updateStash(projectId, stashId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      toast.success("Stash updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useSetStashStatus(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stashId, status }: { stashId: string; status: StashStatus }) =>
      setStashStatusRequest(projectId, stashId, status),
    onMutate: async ({ stashId, status }) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.detail(projectId) });
      const previous = queryClient.getQueryData<ProjectDetail>(projectKeys.detail(projectId));
      if (previous) {
        queryClient.setQueryData<ProjectDetail>(projectKeys.detail(projectId), {
          ...previous,
          stashes: previous.stashes.map((stash) =>
            stash.id === stashId ? { ...stash, status } : stash,
          ),
        });
      }
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(projectKeys.detail(projectId), context.previous);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

export function useDeleteStash(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stashId: string) => deleteStash(projectId, stashId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      toast.success("Stash deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useReorderStashes(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => reorderStashes(projectId, ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.detail(projectId) });
      const previous = queryClient.getQueryData<ProjectDetail>(
        projectKeys.detail(projectId),
      );
      if (previous) {
        const byId = new Map(previous.stashes.map((stash) => [stash.id, stash]));
        queryClient.setQueryData<ProjectDetail>(projectKeys.detail(projectId), {
          ...previous,
          stashes: ids
            .map((id) => byId.get(id))
            .filter((stash): stash is ProjectDetail["stashes"][number] => Boolean(stash)),
        });
      }
      return { previous };
    },
    onError: (error: Error, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(projectKeys.detail(projectId), context.previous);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}
