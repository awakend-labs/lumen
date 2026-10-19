"use client";

import { CircleCheck, Hourglass } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSetProjectStatus } from "@/features/projects/queries";
import { canEditContent } from "@/lib/permissions";
import type { ProjectRole, ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-wrap items-center gap-2">
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
        className="rounded-sm border border-border/70 bg-muted/30 p-0.5"
      >
        <ToggleGroupItem
          value="in_progress"
          aria-label="In progress"
          className={cn(
            "h-7 gap-1.5 rounded-sm px-2.5 text-xs",
            "data-[state=on]:border-stash-amber/40 data-[state=on]:bg-stash-amber/15 data-[state=on]:text-stash-amber",
          )}
        >
          <Hourglass className="size-3.5" />
          In progress
        </ToggleGroupItem>
        <ToggleGroupItem
          value="documented"
          aria-label="Documented"
          className={cn(
            "h-7 gap-1.5 rounded-sm px-2.5 text-xs",
            "data-[state=on]:border-stash-green/40 data-[state=on]:bg-stash-green/15 data-[state=on]:text-stash-green",
          )}
        >
          <CircleCheck className="size-3.5" />
          Documented
        </ToggleGroupItem>
      </ToggleGroup>
      {!editable ? (
        <span className="text-xs text-muted-foreground">View only</span>
      ) : null}
    </div>
  );
}
