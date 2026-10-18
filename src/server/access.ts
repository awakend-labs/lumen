import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { projectMembers, projects } from "@/db/schema";
import { auth } from "@/lib/auth";
import { canEditContent, canManageProject, canRead } from "@/lib/permissions";
import type { ProjectRole } from "@/lib/types";
import { HttpError } from "./http";

export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new HttpError(401, "Sign in to continue");
  }
  return session.user;
}

export async function getMembership(userId: string, projectId: string) {
  const [member] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .limit(1);
  return member ?? null;
}

async function requireRole(
  userId: string,
  projectId: string,
  allowed: (role: ProjectRole) => boolean,
) {
  const member = await getMembership(userId, projectId);
  if (!member || !allowed(member.role)) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!project || !member) {
      throw new HttpError(404, "Project not found");
    }
    throw new HttpError(403, "You don't have permission to do that");
  }
  return member;
}

export function requireReader(userId: string, projectId: string) {
  return requireRole(userId, projectId, canRead);
}

export function requireEditor(userId: string, projectId: string) {
  return requireRole(userId, projectId, canEditContent);
}

export function requireOwner(userId: string, projectId: string) {
  return requireRole(userId, projectId, canManageProject);
}

export async function touchProject(projectId: string) {
  await db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(eq(projects.id, projectId));
}
