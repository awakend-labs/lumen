"use client";

import { CircleCheck, Hourglass } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSetProjectStatus } from "@/features/projects/queries";
import { canEditContent } from "@/lib/permissions";
import type { ProjectRole, ProjectStatus } from "@/lib/types";

export function ProjectStatusControl({
  projectId,
  status,
  role,
}: {
  projectId: string;
  status: ProjectStatus;
  role: ProjectRole;
}) {
  const setStatus = useSetProjectStatus();
  const editable = canEditContent(role);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        Status
      </span>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={status}
        disabled={!editable || setStatus.isPending}
        onValueChange={(value) => {
          if (!value || value === status) return;
          setStatus.mutate({ projectId, status: value as ProjectStatus });
        }}
        aria-label="Project status"
        className="rounded-lg bg-muted/40 p-1"
      >
        <ToggleGroupItem
          value="in_progress"
          aria-label="In progress"
          className="gap-1.5 px-3 text-xs data-[state=on]:bg-stash-amber/15 data-[state=on]:text-stash-amber"
        >
          <Hourglass className="size-3.5" />
          In progress
        </ToggleGroupItem>
        <ToggleGroupItem
          value="documented"
          aria-label="Documented"
          className="gap-1.5 px-3 text-xs data-[state=on]:bg-stash-green/15 data-[state=on]:text-stash-green"
        >
          <CircleCheck className="size-3.5" />
          Documented
        </ToggleGroupItem>
      </ToggleGroup>
      {!editable ? (
        <span className="text-xs text-muted-foreground">Only owners and editors can change status.</span>
      ) : null}
    </div>
  );
}
