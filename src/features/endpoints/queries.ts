"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deleteEndpoint,
  fetchEndpoint,
  reorderEndpoints,
  saveEndpoint,
} from "@/features/endpoints/api";
import { projectKeys } from "@/features/projects/queries";
import type { EndpointRecord, ProjectDetail } from "@/lib/types";
import type { EndpointInput } from "@/lib/validators";

export const endpointKeys = {
  detail: (projectId: string, endpointId: string) =>
    ["endpoints", projectId, endpointId] as const,
};

export function useEndpoint(projectId: string, endpointId: string) {
  return useQuery({
    queryKey: endpointKeys.detail(projectId, endpointId),
    queryFn: () => fetchEndpoint(projectId, endpointId),
  });
}

export function useSaveEndpoint(projectId: string, endpointId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EndpointInput) => saveEndpoint(projectId, input, endpointId),
    onSuccess: (endpoint) => {
      const project = queryClient.getQueryData<ProjectDetail>(projectKeys.detail(projectId));
      if (project) queryClient.setQueryData(endpointKeys.detail(projectId, endpoint.id), { endpoint, role: project.role });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success(endpointId ? "Endpoint updated" : "Endpoint created");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteEndpoint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (endpointId: string) => deleteEndpoint(projectId, endpointId),
    onMutate: async (endpointId) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.detail(projectId) });
      const previous = queryClient.getQueryData<ProjectDetail>(
        projectKeys.detail(projectId),
      );
      if (previous) {
        queryClient.setQueryData<ProjectDetail>(projectKeys.detail(projectId), {
          ...previous,
          stashes: previous.stashes.map((stash) => ({
            ...stash,
            endpoints: stash.endpoints.filter((endpoint) => endpoint.id !== endpointId),
          })),
        });
      }
      return { previous };
    },
    onError: (error: Error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(projectKeys.detail(projectId), context.previous);
      }
      toast.error(error.message);
    },
    onSuccess: () => toast.success("Endpoint deleted"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useReorderEndpoints(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stashId, ids }: { stashId: string; ids: string[] }) =>
      reorderEndpoints(projectId, stashId, ids),
    onMutate: async ({ stashId, ids }) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.detail(projectId) });
      const previous = queryClient.getQueryData<ProjectDetail>(
        projectKeys.detail(projectId),
      );
      if (previous) {
        queryClient.setQueryData<ProjectDetail>(projectKeys.detail(projectId), {
          ...previous,
          stashes: previous.stashes.map((stash) => {
            if (stash.id !== stashId) return stash;
            const byId = new Map(stash.endpoints.map((endpoint) => [endpoint.id, endpoint]));
            return {
              ...stash,
              endpoints: ids
                .map((id) => byId.get(id))
                .filter((endpoint): endpoint is EndpointRecord => Boolean(endpoint)),
            };
          }),
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
