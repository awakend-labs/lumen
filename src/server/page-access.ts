import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { requireEditor, requireReader, requireUser } from "./access";
import { HttpError } from "./http";
import { getEndpoint, getProjectSummary } from "./projects";

export async function requireProjectPageAccess(projectId: string, path: string, editor = false) {
  if (!z.uuid().safeParse(projectId).success) notFound();
  try {
    const user = await requireUser();
    return await (editor ? requireEditor : requireReader)(user.id, projectId);
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.status === 401) redirect(`/login?callbackUrl=${encodeURIComponent(path)}`);
      if (error.status === 404) notFound();
      if (error.status === 403) redirect(`/projects/${projectId}`);
    }
    throw error;
  }
}

export const loadProjectPage = cache(async (projectId: string) => {
  if (!z.uuid().safeParse(projectId).success) notFound();
  try {
    const user = await requireUser();
    return await getProjectSummary(user.id, projectId);
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.status === 401) redirect(`/login?callbackUrl=${encodeURIComponent(`/projects/${projectId}`)}`);
      if (error.status === 404) notFound();
    }
    throw error;
  }
});

export const loadEndpointPage = cache(async (projectId: string, endpointId: string) => {
  if (!z.uuid().safeParse(projectId).success || !z.uuid().safeParse(endpointId).success) notFound();
  try {
    const user = await requireUser();
    return await getEndpoint(user.id, projectId, endpointId);
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.status === 401) redirect(`/login?callbackUrl=${encodeURIComponent(`/projects/${projectId}/endpoints/${endpointId}`)}`);
      if (error.status === 404) notFound();
    }
    throw error;
  }
});

export async function loadStashPage(projectId: string, stashId: string) {
  if (!z.uuid().safeParse(stashId).success) notFound();
  const project = await loadProjectPage(projectId);
  const stash = project.stashes.find(stash => stash.id === stashId);
  if (!stash) notFound();
  return stash;
}
