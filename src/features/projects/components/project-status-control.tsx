"use client";

import { useState } from "react";
import { CircleCheck, Hourglass, type LucideIcon } from "lucide-react";
import { ConfirmStatusChange } from "@/components/confirm-status";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSetProjectStatus } from "@/features/projects/queries";
import { canEditContent } from "@/lib/permissions";
import type { ProjectRole, ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: {
  value: ProjectStatus;
  label: string;
  icon: LucideIcon;
  on: string;
  chip: string;
}[] = [
  {
    value: "in_progress",
    label: "In progress",
    icon: Hourglass,
    on: "data-[state=on]:border-stash-amber/40 data-[state=on]:bg-stash-amber/15 data-[state=on]:text-stash-amber",
    chip: "border-stash-amber/40 bg-stash-amber/15 text-stash-amber",
  },
  {
    value: "documented",
    label: "Documented",
    icon: CircleCheck,
    on: "data-[state=on]:border-stash-green/40 data-[state=on]:bg-stash-green/15 data-[state=on]:text-stash-green",
    chip: "border-stash-green/40 bg-stash-green/15 text-stash-green",
  },
];

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
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(
    null,
  );
  const from = OPTIONS.find((option) => option.value === status) ?? OPTIONS[0];
  const to = OPTIONS.find((option) => option.value === pendingStatus);

  return (
    <>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={status}
        disabled={!editable || setStatus.isPending}
        onValueChange={(value) => {
          if (!value || value === status) return;
          setPendingStatus(value as ProjectStatus);
        }}
        aria-label="Project status"
        className="gap-2 border-0 bg-transparent p-0 shadow-none"
      >
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              aria-label={option.label}
              className={cn("h-7 gap-1.5 rounded-full px-2.5 text-xs", option.on)}
            >
              <Icon className="size-3.5" />
              {option.label}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
      {!editable ? (
        <span className="text-xs text-muted-foreground">View only</span>
      ) : null}
      {to ? (
        <ConfirmStatusChange
          open
          onOpenChange={(open) => {
            if (!open) setPendingStatus(null);
          }}
          title="Change project status?"
          description={
            pendingStatus === "documented"
              ? "This marks the project as complete for everyone in the workspace."
              : "This marks the project as still being documented."
          }
          fromLabel={from.label}
          toLabel={to.label}
          fromClassName={from.chip}
          toClassName={to.chip}
          fromIcon={from.icon}
          toIcon={to.icon}
          pending={setStatus.isPending}
          confirmLabel={`Mark as ${to.label.toLowerCase()}`}
          onConfirm={() => {
            setStatus.mutate(
              { projectId, status: to.value },
              { onSettled: () => setPendingStatus(null) },
            );
          }}
        />
      ) : null}
    </>
  );
}
