import type { ProjectRole } from "@/lib/types";

export function canRead(role: ProjectRole | null | undefined) {
  return role === "owner" || role === "editor" || role === "viewer";
}

export function canEditContent(role: ProjectRole | null | undefined) {
  return role === "owner" || role === "editor";
}

export function canManageProject(role: ProjectRole | null | undefined) {
  return role === "owner";
}
