"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createProject,
  deleteProject,
  fetchProject,
  fetchProjects,
  setProjectStatusRequest,
  updateProject,
} from "@/features/projects/api";
import type { ProjectDetail, ProjectListItem, ProjectStatus } from "@/lib/types";
import type { ProjectInput } from "@/lib/validators";

export const projectKeys = {
  all: ["projects"] as const,
  detail: (projectId: string) => ["projects", projectId] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: fetchProjects,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => fetchProject(projectId),
    enabled: projectId.length > 0,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) => createProject(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
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
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
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
      await queryClient.cancelQueries({ queryKey: projectKeys.all });
      const previous = queryClient.getQueryData<ProjectListItem[]>(projectKeys.all);
      queryClient.setQueryData<ProjectListItem[]>(projectKeys.all, (current) =>
        current?.map((project) =>
          project.id === projectId ? { ...project, status } : project,
        ),
      );
      const detail = queryClient.getQueryData<ProjectDetail>(projectKeys.detail(projectId));
      if (detail) queryClient.setQueryData(projectKeys.detail(projectId), { ...detail, status });
      return { previous, detail };
    },
    onError: (error: Error, vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(projectKeys.all, context.previous);
      }
      if (context?.detail) queryClient.setQueryData(projectKeys.detail(vars.projectId), context.detail);
      toast.error(error.message);
    },
    onSuccess: () => toast.success("Project status updated"),
    onSettled: (_data, _error, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success("Project deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
