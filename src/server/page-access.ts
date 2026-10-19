import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requireEditor, requireReader, requireUser } from "./access";
import { HttpError } from "./http";
import { getProjectDetail } from "./projects";

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

export async function loadProjectPage(projectId: string) {
  if (!z.uuid().safeParse(projectId).success) notFound();
  try {
    const user = await requireUser();
    return await getProjectDetail(user.id, projectId);
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.status === 401) redirect(`/login?callbackUrl=${encodeURIComponent(`/projects/${projectId}`)}`);
      if (error.status === 404) notFound();
    }
    throw error;
  }
}
