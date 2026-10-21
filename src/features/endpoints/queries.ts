"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  deleteEndpoint,
  fetchEndpoint,
  reorderEndpoints,
  saveEndpoint,
} from "@/features/endpoints/api";
import { projectKeys } from "@/features/projects/queries";
import type { ProjectSummary } from "@/lib/types";
import type { EndpointInput } from "@/lib/validators";
import { toEndpointSummary } from "@/lib/endpoint-summary";

export const endpointKeys = {
  detail: (projectId: string, endpointId: string) =>
    ["endpoints", projectId, endpointId] as const,
};

export function useEndpoint(projectId: string, endpointId: string) {
  return useQuery({
    queryKey: endpointKeys.detail(projectId, endpointId),
    queryFn: ({ signal }) => fetchEndpoint(projectId, endpointId, signal),
    enabled: projectId.length > 0 && endpointId.length > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: "always",
    retry: (count, error) => count < 1 && (!(error instanceof ApiError) || error.status >= 500),
  });
}

export function useSaveEndpoint(projectId: string, endpointId?: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (input: EndpointInput) => saveEndpoint(projectId, input, endpointId),
    onMutate: () => Promise.all([
      queryClient.cancelQueries({ queryKey: projectKeys.summary(projectId), exact: true }),
      ...(endpointId ? [queryClient.cancelQueries({ queryKey: endpointKeys.detail(projectId, endpointId), exact: true })] : []),
    ]),
    onSuccess: (endpoint) => {
      const project = queryClient.getQueryData<ProjectSummary>(projectKeys.summary(projectId));
      if (project) queryClient.setQueryData(endpointKeys.detail(projectId, endpoint.id), { endpoint, role: project.role });
      if (project) queryClient.setQueryData<ProjectSummary>(projectKeys.summary(projectId), {
        ...project, stashes: project.stashes.map(stash => ({ ...stash,
          endpoints: stash.id === endpoint.stashId
            ? [...stash.endpoints.filter(item => item.id !== endpoint.id), toEndpointSummary(endpoint)].sort((a, b) => a.order - b.order)
            : stash.endpoints.filter(item => item.id !== endpoint.id),
        })),
      });
      queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true, refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: projectKeys.summary(projectId), exact: true, refetchType: "none" });
      toast.success(endpointId ? "Endpoint updated" : "Endpoint created");
      router.replace(`/projects/${projectId}/endpoints/${endpoint.id}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteEndpoint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (endpointId: string) => deleteEndpoint(projectId, endpointId),
    onMutate: async (endpointId) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.summary(projectId) });
      const previous = queryClient.getQueryData<ProjectSummary>(
        projectKeys.summary(projectId),
      );
      if (previous) {
        queryClient.setQueryData<ProjectSummary>(projectKeys.summary(projectId), {
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
        queryClient.setQueryData(projectKeys.summary(projectId), context.previous);
      }
      toast.error(error.message);
    },
    onSuccess: (_result, endpointId) => {
      queryClient.removeQueries({ queryKey: endpointKeys.detail(projectId, endpointId), exact: true });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      toast.success("Endpoint deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.summary(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true });
    },
  });
}

export function useReorderEndpoints(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stashId, ids }: { stashId: string; ids: string[] }) =>
      reorderEndpoints(projectId, stashId, ids),
    onMutate: async ({ stashId, ids }) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.summary(projectId) });
      const previous = queryClient.getQueryData<ProjectSummary>(
        projectKeys.summary(projectId),
      );
      if (previous) {
        queryClient.setQueryData<ProjectSummary>(projectKeys.summary(projectId), {
          ...previous,
          stashes: previous.stashes.map((stash) => {
            if (stash.id !== stashId) return stash;
            const byId = new Map(stash.endpoints.map((endpoint) => [endpoint.id, endpoint]));
            return {
              ...stash,
              endpoints: ids
                .map((id) => byId.get(id))
                .filter((endpoint): endpoint is NonNullable<typeof endpoint> => Boolean(endpoint)),
            };
          }),
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
      queryClient.invalidateQueries({ queryKey: projectKeys.summary(projectId) });
    },
  });
}
