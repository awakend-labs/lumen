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
import type { EndpointRecord, ProjectSummary, ProjectListItem, StashStatus } from "@/lib/types";
import type { StashInput } from "@/lib/validators";

export function useCreateStash(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StashInput) => createStash(projectId, input),
    onMutate: () => Promise.all([
      queryClient.cancelQueries({ queryKey: projectKeys.all, exact: true }),
      queryClient.cancelQueries({ queryKey: projectKeys.summary(projectId), exact: true }),
    ]),
    onSuccess: (stash) => {
      queryClient.setQueryData<ProjectSummary>(projectKeys.summary(projectId), current => current ? { ...current, stashes: [...current.stashes, { ...stash, groups: [], endpoints: [] }] } : current);
      queryClient.setQueryData<ProjectListItem[]>(projectKeys.all, current => current?.map(project => project.id === projectId ? {
        ...project, stashCount: project.stashCount + 1, updatedAt: stash.updatedAt,
        previewStashes: [{ id: stash.id, name: stash.name, color: stash.color }, ...project.previewStashes].slice(0, 3),
      } : project));
      queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true, refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: projectKeys.summary(projectId), exact: true, refetchType: "none" });
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
      queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true });
      queryClient.invalidateQueries({ queryKey: projectKeys.summary(projectId), exact: true });
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
      await queryClient.cancelQueries({ queryKey: projectKeys.summary(projectId) });
      const previous = queryClient.getQueryData<ProjectSummary>(projectKeys.summary(projectId));
      if (previous) {
        queryClient.setQueryData<ProjectSummary>(projectKeys.summary(projectId), {
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
        queryClient.setQueryData(projectKeys.summary(projectId), context.previous);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true });
      queryClient.invalidateQueries({ queryKey: projectKeys.summary(projectId), exact: true });
    },
  });
}

export function useDeleteStash(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stashId: string) => deleteStash(projectId, stashId),
    onSuccess: (_result, stashId) => {
      queryClient.removeQueries({ queryKey: ["endpoints", projectId], predicate: query => (query.state.data as { endpoint?: EndpointRecord } | undefined)?.endpoint?.stashId === stashId });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true });
      queryClient.invalidateQueries({ queryKey: projectKeys.summary(projectId), exact: true });
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
      await queryClient.cancelQueries({ queryKey: projectKeys.summary(projectId) });
      const previous = queryClient.getQueryData<ProjectSummary>(
        projectKeys.summary(projectId),
      );
      if (previous) {
        const byId = new Map(previous.stashes.map((stash) => [stash.id, stash]));
        queryClient.setQueryData<ProjectSummary>(projectKeys.summary(projectId), {
          ...previous,
          stashes: ids
            .map((id) => byId.get(id))
            .filter((stash): stash is ProjectSummary["stashes"][number] => Boolean(stash)),
        });
      }
      return { previous };
    },
    onError: (error: Error, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(projectKeys.summary(projectId), context.previous);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true });
      queryClient.invalidateQueries({ queryKey: projectKeys.summary(projectId), exact: true });
    },
  });
}
