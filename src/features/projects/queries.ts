"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  createProject,
  deleteProject,
  fetchProjectSummary,
  fetchProjects,
  setProjectStatusRequest,
  updateProject,
  updateProjectBaseUrl,
} from "@/features/projects/api";
import type { ProjectSummary, ProjectListItem, ProjectStatus } from "@/lib/types";
import type { ProjectBaseUrlInput, ProjectInput } from "@/lib/validators";

export const projectKeys = {
  all: ["projects"] as const,
  detail: (projectId: string) => ["projects", projectId] as const,
  summary: (projectId: string) => ["project-summary", projectId] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: ({ signal }) => fetchProjects(signal),
    refetchOnWindowFocus: true,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectKeys.summary(projectId),
    queryFn: ({ signal }) => fetchProjectSummary(projectId, signal),
    enabled: projectId.length > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: "always",
    retry: (count, error) => count < 1 && (!(error instanceof ApiError) || error.status >= 500),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) => createProject(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true });
      toast.success("Project created");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) => updateProject(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true });
      queryClient.invalidateQueries({ queryKey: projectKeys.summary(projectId) });
      toast.success("Project updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useSetProjectStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, status }: { projectId: string; status: ProjectStatus }) =>
      setProjectStatusRequest(projectId, status),
    onMutate: async ({ projectId, status }) => {
      // Optimistic update so the toggle feels instant; rolled back on error.
      await Promise.all([
        queryClient.cancelQueries({ queryKey: projectKeys.all, exact: true }),
        queryClient.cancelQueries({ queryKey: projectKeys.summary(projectId), exact: true }),
      ]);
      const previous = queryClient.getQueryData<ProjectListItem[]>(projectKeys.all);
      queryClient.setQueryData<ProjectListItem[]>(projectKeys.all, (current) =>
        current?.map((project) =>
          project.id === projectId ? { ...project, status } : project,
        ),
      );
      const detail = queryClient.getQueryData<ProjectSummary>(projectKeys.summary(projectId));
      if (detail) queryClient.setQueryData(projectKeys.summary(projectId), { ...detail, status });
      return { previous, detail };
    },
    onError: (error: Error, vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(projectKeys.all, context.previous);
      }
      if (context?.detail) queryClient.setQueryData(projectKeys.summary(vars.projectId), context.detail);
      toast.error(error.message);
    },
    onSuccess: () => toast.success("Project status updated"),
    onSettled: (_data, _error, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true });
      queryClient.invalidateQueries({ queryKey: projectKeys.summary(projectId) });
    },
  });
}

export function useUpdateProjectBaseUrl(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectBaseUrlInput) => updateProjectBaseUrl(projectId, input),
    onSuccess: async (result, input) => {
      const stashIds = new Set(input.stashIds);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true }),
        queryClient.invalidateQueries({ queryKey: projectKeys.summary(projectId), exact: true }),
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId), exact: true }),
        queryClient.invalidateQueries({
          queryKey: ["endpoints", projectId],
          predicate: query => {
            const data = query.state.data as { endpoint?: { stashId: string } } | undefined;
            return Boolean(data?.endpoint && stashIds.has(data.endpoint.stashId));
          },
        }),
      ]);
      toast.success(result.updatedEndpointCount
        ? `Base URL updated for ${result.updatedEndpointCount} endpoint${result.updatedEndpointCount === 1 ? "" : "s"}`
        : "Project base URL updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onSuccess: (_result, projectId) => {
      queryClient.removeQueries({ queryKey: projectKeys.summary(projectId), exact: true });
      queryClient.removeQueries({ queryKey: projectKeys.detail(projectId), exact: true });
      queryClient.removeQueries({ queryKey: ["endpoints", projectId] });
      queryClient.removeQueries({ queryKey: ["members", projectId] });
      queryClient.removeQueries({ queryKey: ["invitations", projectId] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true });
      toast.success("Project deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
